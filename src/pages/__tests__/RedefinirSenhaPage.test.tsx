import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const getSession = vi.fn();
const updateUser = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSession(...a),
      updateUser: (...a: unknown[]) => updateUser(...a),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// A página resolve `getSession` logo após montar; o `act` espera esse
// primeiro estado assentar antes de o teste olhar a tela.
const renderizar = async () => {
  const { default: RedefinirSenhaPage } = await import("@/pages/RedefinirSenhaPage");
  await act(async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/redefinir-senha"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RedefinirSenhaPage />
        </MemoryRouter>
      </HelmetProvider>,
    );
  });
};

describe("RedefinirSenhaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateUser.mockResolvedValue({ data: {}, error: null });
  });

  it("mostra um esqueleto até saber se o link ainda vale, sem piscar o formulário", async () => {
    let resolver: (v: unknown) => void = () => {};
    getSession.mockReturnValue(new Promise((r) => { resolver = r; }));
    await renderizar();

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();

    await act(async () => resolver({ data: { session: { user: {} } } }));

    expect(await screen.findByLabelText("Nova senha")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("sem sessão de recuperação, diz que o link expirou e oferece pedir outro", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await renderizar();

    expect(await screen.findByRole("heading", { name: "Este link expirou", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir um link novo" })).toHaveAttribute("href", "/esqueci-senha");
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it("enviar vazio mostra a mensagem de cada campo e marca aria-invalid", async () => {
    getSession.mockResolvedValue({ data: { session: { user: {} } } });
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(await screen.findByRole("button", { name: "Salvar nova senha" }));

    expect(await screen.findByText("Informe uma senha")).toBeInTheDocument();
    expect(screen.getByText("Repita a nova senha", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Repita a nova senha")).toHaveAttribute("aria-invalid", "true");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("senhas diferentes barram o envio com a mensagem no segundo campo", async () => {
    getSession.mockResolvedValue({ data: { session: { user: {} } } });
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.type(await screen.findByLabelText("Nova senha"), "Senha1234");
    await usuario.type(screen.getByLabelText("Repita a nova senha"), "Senha1235");
    await usuario.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(await screen.findByText("As duas senhas precisam ser iguais")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
