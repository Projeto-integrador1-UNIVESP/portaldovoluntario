import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const vinculos = [
  { id: "m1", id_usuario: "u9", data_inicio: "2026-03-10", status: true },
];

const perfis = [
  { user_id: "u9", nome: "Ana Lima", email: "ana@exemplo.com", telefone: "11987654321" },
];

// O nome e o e-mail vinham de um embed `profiles:id_usuario(...)`, que o
// PostgREST não resolve (não há FK de `usuarios_ong` para `profiles`). O mock
// devolve o vínculo SEM nenhum perfil aninhado, como o banco de fato devolve:
// se a tela voltar a depender do embed, estes casos falham.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({ data: tabela === "usuarios_ong" ? vinculos : [], error: null }),
        }),
        in: () => Promise.resolve({ data: tabela === "profiles" ? perfis : [], error: null }),
      }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ ongId: "o1", user: { id: "u1" }, role: "ong", profile: null, signOut: vi.fn() }),
}));

const renderizar = async () => {
  const { default: OngMembros } = await import("@/pages/ong/OngMembros");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <OngMembros />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("OngMembros", () => {
  it("mostra nome, e-mail e telefone cruzando profiles pelo user_id", async () => {
    await renderizar();

    expect(await screen.findByText("Ana Lima")).toBeInTheDocument();
    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByText("(11) 98765-4321")).toBeInTheDocument();
    expect(screen.getByText("10/03/2026")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  }, 20_000);
});
