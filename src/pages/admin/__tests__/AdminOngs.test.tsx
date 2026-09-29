import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * O que estes testes protegem: `doacoes.id_ong` é `ON DELETE CASCADE`, então
 * excluir uma ONG apaga o histórico de doações dela sem o banco reclamar. A tela
 * precisa contar os vínculos antes e, havendo doação, não oferecer a exclusão.
 */

const escritas: { tabela: string; operacao: string; valores: unknown }[] = [];
let doacoesDaOng = 0;
/** Quando definida, a contagem de doações só responde depois que ela resolve. */
let segurarContagem: Promise<void> | null = null;

const ong = {
  id: "ong-1",
  nome: "Casa do Caminho",
  cnpj: "12345678000199",
  telefone: "11987654321",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01310100",
  logradouro: "Av. Paulista, 1000",
  area_atuacao: "Assistência social",
  pix: "casa@exemplo.org",
  banco: "Banco X",
  conta: 12345,
  agencia: 1234,
  missao: "Acolher",
  descricao: "Descrição",
  site: null,
  instagram: null,
  img_url: null,
  img_capa: null,
  logo_url: null,
  capa_url: null,
  status: true,
  verificada_em: null,
};

vi.mock("@/integrations/supabase/client", () => {
  const construir = (tabela: string) => {
    const estado = { operacao: "select" };
    const encadeavel = [
      "select", "eq", "is", "in", "order", "range", "ilike", "limit", "or", "not", "lt",
    ] as const;

    const resolver = () => {
      if (estado.operacao !== "select") {
        return { data: [{ id: "ong-1" }], error: null, count: null };
      }
      if (tabela === "ongs") return { data: [ong], error: null, count: 1 };
      if (tabela === "doacoes") return { data: [], error: null, count: doacoesDaOng };
      return { data: [], error: null, count: 0 };
    };

    const construtor: Record<string, unknown> = {
      update: (valores: unknown) => {
        estado.operacao = "update";
        escritas.push({ tabela, operacao: "update", valores });
        return construtor;
      },
      insert: (valores: unknown) => {
        estado.operacao = "insert";
        escritas.push({ tabela, operacao: "insert", valores });
        return construtor;
      },
      delete: () => {
        estado.operacao = "delete";
        escritas.push({ tabela, operacao: "delete", valores: null });
        return construtor;
      },
      then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
        (tabela === "doacoes" && estado.operacao === "select" && segurarContagem
          ? segurarContagem
          : Promise.resolve()
        )
          .then(resolver)
          .then(ok, falha),
    };
    for (const metodo of encadeavel) construtor[metodo] = () => construtor;
    return construtor;
  };

  return {
    supabase: {
      from: (tabela: string) => construir(tabela),
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
    role: "admin",
    profile: null,
    ongId: null,
    signOut: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const renderizar = async () => {
  const { default: AdminOngs } = await import("@/pages/admin/AdminOngs");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AdminOngs />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("AdminOngs", () => {
  beforeEach(() => {
    escritas.length = 0;
    doacoesDaOng = 0;
    segurarContagem = null;
    vi.clearAllMocks();
  });

  it("não oferece excluir enquanto ainda conta o que está ligado à ONG", async () => {
    let liberar: () => void = () => {};
    segurarContagem = new Promise<void>((r) => {
      liberar = r;
    });
    await renderizar();

    await userEvent.click(await screen.findByRole("button", { name: /Excluir Casa do Caminho/i }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Excluir ONG$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Fechar$/ })).toBeInTheDocument();

    liberar();
    expect(await screen.findByRole("button", { name: /^Excluir ONG$/ })).toBeInTheDocument();
  }, 20_000);

  it("não deixa excluir uma ONG que tem doações registradas", async () => {
    doacoesDaOng = 3;
    await renderizar();

    await userEvent.click(await screen.findByRole("button", { name: /Excluir Casa do Caminho/i }));

    expect(await screen.findByText(/3 doações/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Excluir ONG$/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Desativar a ONG/i }));

    await waitFor(() => expect(escritas.length).toBeGreaterThan(0));
    expect(escritas.some((e) => e.operacao === "delete")).toBe(false);
    expect(escritas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tabela: "ongs", operacao: "update", valores: { status: false } }),
      ]),
    );
  }, 20_000);

  it("deixa excluir quando não há doação ligada à ONG", async () => {
    doacoesDaOng = 0;
    await renderizar();

    await userEvent.click(await screen.findByRole("button", { name: /Excluir Casa do Caminho/i }));
    await userEvent.click(await screen.findByRole("button", { name: /^Excluir ONG$/ }));

    await waitFor(() =>
      expect(escritas).toEqual(
        expect.arrayContaining([expect.objectContaining({ tabela: "ongs", operacao: "delete" })]),
      ),
    );
  }, 20_000);

  it("aplica o selo de verificada gravando a data em verificada_em", async () => {
    await renderizar();

    await userEvent.click(await screen.findByRole("button", { name: /^Aplicar selo$/i }));
    await userEvent.click(
      await screen.findByRole("button", { name: /Aplicar selo de verificada/i }),
    );

    await waitFor(() => expect(escritas.length).toBeGreaterThan(0));
    const escrita = escritas.find((e) => e.tabela === "ongs" && e.operacao === "update");
    expect(escrita).toBeDefined();
    expect((escrita!.valores as { verificada_em: string | null }).verificada_em).toBeTruthy();
  }, 20_000);
});
