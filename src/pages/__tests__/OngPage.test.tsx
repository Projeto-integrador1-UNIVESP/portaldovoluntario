import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Import estático de propósito: carregar a página dentro do teste gastava o
// orçamento de tempo dele com transformação de módulo, e a suíte inteira
// rodando em paralelo estourava o timeout.
import OngPage from "@/pages/OngPage";

/**
 * O perfil da ONG existia sem mostrar as necessidades dela — justamente o que
 * a plataforma tem de diferente. Estes testes prendem isso e os dois sinais de
 * confiança: CNPJ presente e CNPJ ausente.
 */

const banco = vi.hoisted(() => ({
  respostas: {} as Record<string, unknown>,
  taxaConfirmacao: [] as unknown[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const resposta = (tabela: string) =>
    banco.respostas[tabela] ?? { data: [], error: null };

  const criar = (tabela: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      order: () => builder,
      maybeSingle: () => Promise.resolve(resposta(tabela)),
      then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve(resposta(tabela)).then(ok, falha),
    };
    return builder;
  };

  return {
    supabase: {
      from: (tabela: string) => criar(tabela),
      // A reputação vem de uma RPC agregada: contar doação linha a linha
      // voltaria zerado pela RLS justamente para o visitante anônimo.
      rpc: (nome: string) =>
        Promise.resolve(
          nome === "get_taxa_confirmacao_ong"
            ? { data: banco.taxaConfirmacao ?? [], error: null }
            : { data: [], error: null },
        ),
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, role: null, profile: null, signOut: vi.fn() }),
}));

const renderizar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={["/ongs/casa-de-apoio"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/ongs/:slug" element={<OngPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const ongBase = {
  id: "ong-1",
  slug: "casa-de-apoio",
  nome: "Casa de Apoio Esperança",
  cnpj: "12345678000199",
  descricao: null,
  missao: "Acolher famílias em situação de rua.",
  cidade: "São Paulo",
  estado: "SP",
  logradouro: null,
  telefone: "11987654321",
  site: null,
  instagram: null,
  img_url: null,
  img_capa: null,
  logo_url: null,
  capa_url: null,
  causas: ["Assistência social"],
  verificada_em: "2026-01-10T00:00:00Z",
  fundada_em: "2014-03-01",
  area_atuacao: null,
  endereco_entrega: null,
  horarios_recebimento: null,
};

const comDados = (ong: Record<string, unknown>) => ({
  ongs: { data: ong, error: null },
  projetos: {
    data: [
      {
        id: "p1",
        slug: "inverno-sem-frio",
        nome_projeto: "Inverno sem frio",
        descricao: "Agasalhos para as famílias atendidas.",
        img_url: null,
        capa_url: null,
        data_fim: null,
        cidade: "São Paulo",
      },
    ],
    error: null,
  },
  necessidades: {
    data: [
      {
        id: "n1",
        nome: "Cobertores",
        tipo: "item",
        unidade: "cobertores",
        meta: 100,
        arrecadado: 32,
        urgencia: 3,
        prazo: null,
        id_projeto: "p1",
      },
      // Meta batida: sai do destaque, mas continua contando como confirmado.
      {
        id: "n2",
        nome: "Leite",
        tipo: "item",
        unidade: "litros",
        meta: 20,
        arrecadado: 20,
        urgencia: 1,
        prazo: null,
        id_projeto: "p1",
      },
    ],
    error: null,
  },
});

describe("OngPage", () => {
  beforeEach(() => {
    banco.respostas = {};
  });

  it("destaca o que falta e deixa o CTA de doar alcançável", async () => {
    banco.respostas = comDados(ongBase);
    renderizar();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Casa de Apoio Esperança" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Faltam 68 cobertores")).toBeInTheDocument();
    // A meta já atingida não aparece como pedido aberto.
    expect(screen.queryByText(/Faltam 0 litros/)).not.toBeInTheDocument();

    // Desktop e barra fixa do celular: o botão existe sem rolar até o fim.
    expect(screen.getAllByRole("link", { name: /Doar para esta ONG/i }).length).toBeGreaterThan(0);

    expect(screen.getByText("12.345.678/0001-99")).toBeInTheDocument();
    expect(screen.getByText(/ONG verificada/)).toBeInTheDocument();
    // `arrecadado` só sobe com confirmação da ONG: 32 + 20.
    expect(screen.getByText("52")).toBeInTheDocument();
  });

  it("orienta a confirmar pelo contato quando não há CNPJ", async () => {
    banco.respostas = comDados({ ...ongBase, cnpj: null });
    renderizar();

    expect(await screen.findByText(/CNPJ ainda não informado/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmar para quem o valor vai/i)).toBeInTheDocument();
  });

  it("separa link inválido de falha de carregamento", async () => {
    banco.respostas = { ongs: { data: null, error: null } };
    renderizar();
    expect(await screen.findByText("ONG não encontrada")).toBeInTheDocument();
  });

  it("oferece tentar de novo quando a leitura falha", async () => {
    banco.respostas = { ongs: { data: null, error: { message: "network" } } };
    renderizar();

    expect(
      await screen.findByText(/Não foi possível carregar esta organização/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
  });
});
