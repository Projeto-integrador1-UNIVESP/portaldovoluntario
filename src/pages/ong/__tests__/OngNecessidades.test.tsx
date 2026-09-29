import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const escritas: { tabela: string; operacao: string }[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const construir = (tabela: string) => {
    const encadeavel = ["select", "eq", "is", "in", "or", "order", "limit"] as const;
    const construtor: Record<string, unknown> = {
      insert: () => {
        escritas.push({ tabela, operacao: "insert" });
        return construtor;
      },
      update: () => {
        escritas.push({ tabela, operacao: "update" });
        return construtor;
      },
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve({
          data: tabela === "projetos" ? [{ id: "p1", nome_projeto: "Campanha do Agasalho", slug: "campanha" }] : [],
          error: null,
          count: 0,
        }).then(ok, falha),
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
  const { default: OngNecessidades } = await import("@/pages/ong/OngNecessidades");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <OngNecessidades />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("OngNecessidades: formulário", () => {
  it("publicar uma necessidade vazia mostra a mensagem por campo e marca aria-invalid", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    // O botão fica desabilitado até a lista de projetos chegar.
    const novo = await screen.findByRole("button", { name: "Nova necessidade" });
    await vi.waitFor(() => expect(novo).toBeEnabled());
    await usuario.click(novo);

    await usuario.click(await screen.findByRole("button", { name: "Publicar necessidade" }));

    expect(await screen.findByText("Diga o que está faltando")).toBeInTheDocument();
    expect(screen.getByText("Informe a meta")).toBeInTheDocument();
    expect(screen.getByLabelText("O que está faltando")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Quantidade necessária")).toHaveAttribute("aria-invalid", "true");
    expect(escritas).toHaveLength(0);
  }, 20_000);
});
