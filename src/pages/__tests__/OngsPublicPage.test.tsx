import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Import estático de propósito: carregar a página dentro do teste gastava o
// orçamento de tempo dele com transformação de módulo, e a suíte inteira
// rodando em paralelo estourava o timeout.
import OngsPublicPage from "@/pages/OngsPublicPage";

/**
 * A listagem de ONGs não tinha carregando nem erro: piscava o estado vazio
 * antes de os dados chegarem. Estes testes prendem os três estados.
 */

const banco = vi.hoisted(() => ({
  respostas: {} as Record<string, unknown>,
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
          <OngsPublicPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const ong = {
  id: "ong-1",
  slug: "casa-de-apoio",
  nome: "Casa de Apoio Esperança",
  descricao: null,
  missao: "Acolher famílias em situação de rua na zona leste.",
  cidade: "São Paulo",
  estado: "SP",
  img_url: null,
  logo_url: null,
  img_capa: null,
  capa_url: null,
  verificada_em: "2026-01-10T00:00:00Z",
};

describe("OngsPublicPage", () => {
  beforeEach(() => {
    banco.respostas = {};
  });

  it("mostra carregando em vez de piscar o estado vazio", async () => {
    // A resposta nunca resolve: é exatamente a janela em que a tela antiga
    // exibia "Nenhuma ONG cadastrada ainda".
    banco.respostas = { ongs: new Promise(() => {}) };
    renderizar();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma ONG cadastrada ainda/i)).not.toBeInTheDocument();
  });

  it("lista a ONG com cidade, selo e quantos pedidos abertos tem", async () => {
    banco.respostas = {
      ongs: { data: [ong], error: null },
      projetos: { data: [{ id: "p1", id_ong: "ong-1" }], error: null },
      necessidades: {
        data: [
          { id_projeto: "p1", meta: 100, arrecadado: 32 },
          { id_projeto: "p1", meta: 50, arrecadado: 10 },
          // Meta batida não é pedido aberto.
          { id_projeto: "p1", meta: 20, arrecadado: 20 },
        ],
        error: null,
      },
    };
    renderizar();

    expect(await screen.findByText("Casa de Apoio Esperança")).toBeInTheDocument();
    expect(screen.getByText(/São Paulo, SP/)).toBeInTheDocument();
    // Texto único do selo em todo o produto, via `SeloVerificada`.
    expect(screen.getByText("ONG verificada")).toBeInTheDocument();
    expect(screen.getByText("2 pedidos abertos")).toBeInTheDocument();
  });

  it("oferece tentar de novo quando a leitura falha", async () => {
    banco.respostas = { ongs: { data: null, error: { message: "network" } } };
    renderizar();

    expect(
      await screen.findByText(/Não foi possível carregar as organizações/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
    // Erro nunca mostra o texto técnico do Supabase.
    expect(screen.queryByText(/network/i)).not.toBeInTheDocument();
  });

  it("mostra o estado vazio com saída quando não há ONG", async () => {
    banco.respostas = { ongs: { data: [], error: null } };
    renderizar();

    expect(await screen.findByText(/Nenhuma ONG cadastrada ainda/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver projetos/i })).toBeInTheDocument();
  });
});
