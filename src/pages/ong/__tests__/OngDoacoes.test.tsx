import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const update = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

const doacaoPendente = {
  id: "d1", valor: 0, quantidade: 3, status: "pendente", tipo_doacao: "pix",
  data_doacao: "2026-09-28T14:00:00Z", doador_nome: "Maria Souza",
  doador_email: "maria@exemplo.com", anonima: false, forma_entrega: "levar",
  id_usuario: null, id_projeto: "p1", id_necessidade: "n1",
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: tabela === "doacoes" ? [doacaoPendente] : [], error: null }),
        }),
        in: () =>
          Promise.resolve({
            data:
              tabela === "projetos" ? [{ id: "p1", nome_projeto: "Campanha do Agasalho" }]
              : tabela === "necessidades" ? [{ id: "n1", nome: "Cobertor", unidade: "un" }]
              : [],
            error: null,
          }),
      }),
      update: () => ({ eq: () => ({ select: () => update() }) }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ ongId: "o1", user: { id: "u1" }, role: "ong", profile: null, signOut: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));

const renderizar = async () => {
  const { default: OngDoacoes } = await import("@/pages/ong/OngDoacoes");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OngDoacoes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("OngDoacoes — confirmação de recebimento", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra a doação de item pendente com quantidade e forma de entrega", async () => {
    update.mockResolvedValue({ data: [{ id: "d1" }], error: null });
    await renderizar();

    expect(await screen.findByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("3 un de Cobertor")).toBeInTheDocument();
    expect(screen.getByText("Vai levar no local")).toBeInTheDocument();
  });

  it("confirma o recebimento e avisa que o progresso mudou", async () => {
    update.mockResolvedValue({ data: [{ id: "d1" }], error: null });
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(await screen.findByRole("button", { name: /Recebi/ }));

    await vi.waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(toastSuccess.mock.calls[0][0]).toMatch(/progresso do projeto foi atualizado/i);
  });

  it("NÃO diz que deu certo quando a RLS bloqueia e o update afeta zero linhas", async () => {
    // O PostgREST devolve 200 com lista vazia quando a policy não alcança a
    // linha. Sem checar isso, a tela diria "confirmado" sem nada ter mudado —
    // exatamente o que acontecia antes de existir a policy de UPDATE da ONG.
    update.mockResolvedValue({ data: [], error: null });
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(await screen.findByRole("button", { name: /Recebi/ }));

    await vi.waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/sem permissão/i);
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
