import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * A casca dos painéis mostra quem está logado e quantas pendências cada seção
 * tem. Estes testes conferem que a identidade da ONG (nome, selo) e as
 * contagens chegam ao menu, e que o painel administrativo não consulta a ONG.
 */

const consultas: { tabela: string; metodo: string; args: unknown[] }[] = [];
let papel: "ong" | "admin" = "ong";

const ong = {
  id: "ong-1",
  nome: "Banco de Alimentos Prato Cheio",
  logo_url: null,
  img_url: null,
  verificada_em: "2026-05-02",
};

vi.mock("@/integrations/supabase/client", () => {
  const construir = (tabela: string) => {
    const encadeavel = ["select", "eq", "is", "in", "or", "order", "limit"] as const;
    const resolver = () => {
      if (tabela === "doacoes") return { data: [], error: null, count: 3 };
      if (tabela === "voluntariado") return { data: [], error: null, count: 2 };
      if (tabela === "ongs") return { data: [], error: null, count: 1 };
      return { data: [], error: null, count: 0 };
    };
    const construtor: Record<string, unknown> = {
      maybeSingle: () => {
        consultas.push({ tabela, metodo: "maybeSingle", args: [] });
        return Promise.resolve({ data: tabela === "ongs" ? ong : null, error: null });
      },
      then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve(resolver()).then(ok, falha),
    };
    for (const metodo of encadeavel) {
      construtor[metodo] = (...args: unknown[]) => {
        consultas.push({ tabela, metodo, args });
        return construtor;
      };
    }
    return construtor;
  };
  return { supabase: { from: (tabela: string) => construir(tabela) } };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "ana@exemplo.com.br" },
    role: papel,
    profile: papel === "admin" ? { nome: "Ana Administradora" } : null,
    ongId: papel === "ong" ? "ong-1" : null,
    signOut: vi.fn(),
  }),
}));

const renderizar = async (type: "ong" | "admin", rota: string) => {
  const { DashboardLayout } = await import("@/components/layout/DashboardLayout");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[rota]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <DashboardLayout type={type}>
          <h1>Conteúdo</h1>
        </DashboardLayout>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("DashboardLayout", () => {
  beforeEach(() => {
    consultas.length = 0;
  });

  it("mostra a ONG logada, o selo e as pendências no menu", async () => {
    papel = "ong";
    await renderizar("ong", "/ong/doacoes");

    expect(await screen.findByText("Banco de Alimentos Prato Cheio")).toBeInTheDocument();
    expect(screen.getByText("ONG verificada")).toBeInTheDocument();

    // O número é decorativo; o leitor de tela ouve a frase inteira no link.
    expect(await screen.findByRole("link", { name: /Doações.*3 para confirmar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voluntários.*2 para responder/ })).toBeInTheDocument();

    // Breadcrumb da barra superior: painel / seção atual.
    expect(screen.getByRole("link", { name: "Painel da ONG" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Doações/ })).toHaveAttribute("aria-current", "page");

    // Rodapé com as duas saídas.
    expect(screen.getByRole("link", { name: "Ver o site" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });

  it("no admin mostra a pessoa, conta ONGs sem verificação e não consulta a ONG", async () => {
    papel = "admin";
    await renderizar("admin", "/admin");

    expect(screen.getByText("Administração")).toBeInTheDocument();
    expect(screen.getByText("Ana Administradora")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /ONGs.*1 para verificar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Doações.*3 pendentes/ })).toBeInTheDocument();

    expect(consultas.some((c) => c.tabela === "ongs" && c.metodo === "maybeSingle")).toBe(false);
    expect(screen.queryByText("Painel da ONG")).not.toBeInTheDocument();
    expect(screen.getByText("Painel administrativo")).toBeInTheDocument();
  });
});
