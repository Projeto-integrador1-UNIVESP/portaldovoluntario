import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage from "@/pages/HomePage";
import { TESE } from "@/lib/copy";

/**
 * A home antiga lia `data!.ongs` sem olhar `isError`, e o hook engolia o erro
 * do Supabase: sem rede ela dizia "Nenhuma ONG cadastrada ainda". Estes
 * testes prendem os estados de erro, o pedido do hero e a linha do tempo.
 */

const banco = vi.hoisted(() => ({
  tabelas: {} as Record<string, { data: unknown; error: unknown }>,
  rpcs: {} as Record<string, { data: unknown; error: unknown }>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const resposta = (tabela: string) => banco.tabelas[tabela] ?? { data: [], error: null };

  const criar = (tabela: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => {
        const r = resposta(tabela);
        const lista = Array.isArray(r.data) ? r.data : [];
        return Promise.resolve({ data: lista[0] ?? null, error: r.error });
      },
      then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve(resposta(tabela)).then(ok, falha),
    };
    return builder;
  };

  return {
    supabase: {
      from: (tabela: string) => criar(tabela),
      rpc: (nome: string) => Promise.resolve(banco.rpcs[nome] ?? { data: [], error: null }),
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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const pedidoDePao = {
  id: "n1",
  nome: "pão",
  tipo: "item",
  unidade: "kg",
  meta: 100,
  arrecadado: 23,
  urgencia: 3,
  prazo: null,
  id_projeto: "p1",
};

const projeto = {
  id: "p1",
  slug: "padaria-solidaria",
  nome_projeto: "Padaria solidária",
  id_ong: "o1",
  // A consulta da última confirmação embute a ONG pela chave estrangeira.
  ongs: { nome: "Casa de Apoio Esperança", slug: "casa-de-apoio" },
  causa: "Alimentação",
  capa_url: null,
  img_url: null,
};

const ong = {
  id: "o1",
  slug: "casa-de-apoio",
  nome: "Casa de Apoio Esperança",
  descricao: null,
  missao: "Acolher famílias na zona leste.",
  cidade: "São Paulo",
  estado: "SP",
  causas: ["Alimentação"],
  img_url: null,
  logo_url: null,
  img_capa: null,
  capa_url: null,
  verificada_em: "2026-01-10T00:00:00Z",
};

const comDados = () => {
  banco.tabelas = {
    necessidades: { data: [pedidoDePao], error: null },
    projetos: { data: [projeto], error: null },
    ongs: { data: [ong], error: null },
  };
};

describe("HomePage", () => {
  beforeEach(() => {
    banco.tabelas = {};
    banco.rpcs = {};
  });

  it("mostra erro com tentar de novo quando os pedidos não carregam, sem derrubar a página", async () => {
    banco.tabelas = { necessidades: { data: null, error: { message: "network" } } };
    renderizar();

    const erros = await screen.findAllByText(/Não foi possível carregar/i);
    expect(erros.length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Tentar novamente/i }).length).toBeGreaterThan(0);

    // Erro nunca vira estado vazio nem mostra o texto técnico.
    expect(screen.queryByText(/Nenhuma ONG cadastrada/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nenhum pedido aberto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/network/i)).not.toBeInTheDocument();

    // O resto da página continua de pé.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Projeto Integrador da Univesp/i)).toBeInTheDocument();
  });

  it("mostra o pedido mais urgente com o que falta, e a ação do card é marinho", async () => {
    comDados();
    const { container } = renderizar();

    // No card flutuante do hero e no destaque da lista.
    const faltam = await screen.findAllByText(/Faltam 77 kg/i);
    expect(faltam.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Doar para este pedido/i).length).toBeGreaterThan(0);
    expect(container.querySelector(".text-cta")).toBeNull();
  });

  it("sem confirmação, a linha do tempo mostra um exemplo marcado e a tese uma vez", async () => {
    comDados();
    banco.rpcs = { get_confirmacoes_projeto: { data: null, error: { message: "fail" } } };
    renderizar();

    expect(await screen.findByText("Exemplo")).toBeInTheDocument();
    expect(screen.getAllByText(TESE)).toHaveLength(1);
    expect(screen.getByText(/Simone doou/i)).toBeInTheDocument();
  });

  it("com confirmação, mostra a doação real, só o primeiro nome e quanto a barra subiu", async () => {
    comDados();
    banco.rpcs = {
      get_confirmacoes_projeto: {
        data: [
          {
            id: "d1",
            status: "confirmada",
            anonima: false,
            doador_nome: "Simone Alves",
            necessidade_nome: "pão",
            necessidade_unidade: "kg",
            quantidade: 10,
            valor: 0,
            data_doacao: "2026-09-08T12:00:00Z",
            confirmada_em: "2026-09-11T12:00:00Z",
          },
        ],
        error: null,
      },
    };
    renderizar();

    expect(await screen.findByText(/Simone doou/i)).toBeInTheDocument();
    expect(screen.queryByText(/Alves/)).not.toBeInTheDocument();
    expect(screen.queryByText("Exemplo")).not.toBeInTheDocument();
    expect(screen.getByText(/3 dias depois/i)).toBeInTheDocument();
    // 23 kg de 100 hoje; antes desta doação de 10 kg eram 13%.
    expect(screen.getByText("13%")).toBeInTheDocument();
    expect(screen.getAllByText(/Recebimento confirmado/i).length).toBeGreaterThan(0);
    // A confirmação é do mesmo projeto do pedido do hero: o card mostra o selo.
    expect(screen.getByText(/Última confirmação em/)).toBeInTheDocument();
  });
});
