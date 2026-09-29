import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const doacoes = [
  {
    id: "d1", valor: 100, quantidade: null, status: "confirmada", tipo_doacao: "pix",
    data_doacao: "2026-09-20T13:00:00Z", confirmada_em: "2026-09-21T10:00:00Z",
    anonima: false, doador_nome: null, doador_email: null,
    id_usuario: "u9", id_necessidade: null,
  },
  {
    id: "d2", valor: 50, quantidade: 3, status: "pendente", tipo_doacao: "item",
    data_doacao: "2026-09-22T13:00:00Z", confirmada_em: null,
    anonima: false, doador_nome: "Carlos Dias", doador_email: "carlos@exemplo.com",
    id_usuario: null, id_necessidade: "n1",
  },
];

const perfis = [{ user_id: "u9", nome: "Ana Lima", email: "ana@exemplo.com" }];
const necessidades = [{ id: "n1", nome: "Cobertor", unidade: "un" }];

// Como no painel de doações: o nome do doador não vem por embed, porque
// `doacoes.id_usuario` referencia `auth.users` e não `profiles`.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: tabela === "doacoes" ? doacoes : [], error: null }),
        }),
        in: () =>
          Promise.resolve({
            data: tabela === "profiles" ? perfis : tabela === "necessidades" ? necessidades : [],
            error: null,
          }),
      }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ ongId: "o1", user: { id: "u1" }, role: "ong", profile: null, signOut: vi.fn() }),
}));

const renderizar = async () => {
  const { default: OngAuditoria } = await import("@/pages/ong/OngAuditoria");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <OngAuditoria />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("OngAuditoria", () => {
  it("identifica o doador cadastrado e o que foi doado", async () => {
    await renderizar();

    expect((await screen.findAllByText("Ana Lima")).length).toBeGreaterThan(0);
    expect(screen.getByText("3 un de Cobertor")).toBeInTheDocument();
    expect(screen.getByText("Carlos Dias")).toBeInTheDocument();
  }, 20_000);

  it("não soma no total o que a ONG ainda não confirmou", async () => {
    await renderizar();

    // 100 confirmado + 50 aguardando. O total nunca é 150: a regra da
    // plataforma é que o número só sobe depois da confirmação.
    expect((await screen.findAllByText("R$ 100,00")).length).toBeGreaterThan(0);
    expect(screen.queryByText("R$ 150,00")).not.toBeInTheDocument();
    expect(screen.getByText("doação aguardando confirmação")).toBeInTheDocument();
    expect(screen.getByText("Aguardando você confirmar")).toBeInTheDocument();
  }, 20_000);
});
