import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * O formulário de projeto passou a usar o schema compartilhado com o admin e
 * a gravar cidade, causa e capa. Estes testes protegem o que o site público
 * depende: `capa_url` e `img_url` recebem a mesma foto, e cidade vai junto.
 */

const escritas: { tabela: string; operacao: string; valores: unknown }[] = [];

const projeto = {
  id: "p1",
  nome_projeto: "Campanha do Agasalho",
  descricao: "Cobertores e agasalhos para as noites frias",
  slug: "campanha-do-agasalho",
  status: true,
  data_inicio: "2026-06-01",
  data_fim: "2026-08-30",
  img_url: null,
  capa_url: null,
  cidade: "São Paulo",
  causa: "População em situação de rua",
};

vi.mock("@/integrations/supabase/client", () => {
  const construir = (tabela: string) => {
    const estado = { operacao: "select" };
    const encadeavel = ["select", "eq", "is", "in", "or", "order", "limit"] as const;
    const resolver = () => {
      if (estado.operacao !== "select") return { data: [{ id: "p-novo" }], error: null, count: null };
      if (tabela === "projetos") return { data: [projeto], error: null, count: 1 };
      return { data: [], error: null, count: 0 };
    };
    const construtor: Record<string, unknown> = {
      insert: (valores: unknown) => {
        estado.operacao = "insert";
        escritas.push({ tabela, operacao: "insert", valores });
        return construtor;
      },
      update: (valores: unknown) => {
        estado.operacao = "update";
        escritas.push({ tabela, operacao: "update", valores });
        return construtor;
      },
      delete: () => {
        estado.operacao = "delete";
        escritas.push({ tabela, operacao: "delete", valores: null });
        return construtor;
      },
      single: () => Promise.resolve({ data: { id: "p-novo" }, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve(resolver()).then(ok, falha),
    };
    for (const metodo of encadeavel) construtor[metodo] = () => construtor;
    return construtor;
  };
  return { supabase: { from: (tabela: string) => construir(tabela) } };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ ongId: "o1", user: { id: "u1" }, role: "ong", profile: null, signOut: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderizar = async () => {
  const { default: OngProjetos } = await import("@/pages/ong/OngProjetos");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <OngProjetos />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("OngProjetos: formulário", () => {
  beforeEach(() => {
    escritas.length = 0;
  });

  it("enviar vazio mostra a mensagem por campo e marca aria-invalid", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(await screen.findByRole("button", { name: "Novo projeto" }));
    await usuario.click(await screen.findByRole("button", { name: "Criar projeto" }));

    expect(await screen.findByText("Dê um nome ao projeto")).toBeInTheDocument();
    expect(screen.getByText("Explique o projeto em pelo menos 20 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Informe quando o projeto começa")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome do projeto")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Começa em")).toHaveAttribute("aria-invalid", "true");
    expect(escritas).toHaveLength(0);
  }, 20_000);

  it("grava a capa em capa_url e img_url, com a cidade", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(await screen.findByRole("button", { name: "Novo projeto" }));
    await usuario.type(screen.getByLabelText("Nome do projeto"), "Volta às aulas 2027");
    await usuario.type(
      screen.getByLabelText("O que o projeto faz"),
      "Mochila, material e tênis para 28 crianças da casa.",
    );
    await usuario.type(screen.getByLabelText("Cidade"), "Sorocaba");
    await usuario.type(screen.getByLabelText("Começa em"), "2026-10-01");
    await usuario.type(screen.getByLabelText("Termina em"), "2027-02-01");
    await usuario.type(screen.getByLabelText("Foto de capa"), "https://exemplo.org/capa.jpg");
    await usuario.click(screen.getByRole("button", { name: "Criar projeto" }));

    await waitFor(() => expect(escritas.length).toBeGreaterThan(0));
    expect(escritas[0]).toEqual({
      tabela: "projetos",
      operacao: "insert",
      valores: expect.objectContaining({
        nome_projeto: "Volta às aulas 2027",
        cidade: "Sorocaba",
        causa: null,
        capa_url: "https://exemplo.org/capa.jpg",
        img_url: "https://exemplo.org/capa.jpg",
        id_ong: "o1",
      }),
    });
  }, 20_000);

  it("lista cidade e causa do projeto e oferece excluir", async () => {
    await renderizar();

    expect(await screen.findByText("Campanha do Agasalho")).toBeInTheDocument();
    expect(screen.getByText("População em situação de rua")).toBeInTheDocument();
    expect(screen.getByText("São Paulo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir Campanha do Agasalho" })).toBeInTheDocument();
  }, 20_000);
});
