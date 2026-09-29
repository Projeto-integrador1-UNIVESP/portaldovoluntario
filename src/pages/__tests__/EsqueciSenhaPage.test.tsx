import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const resetPasswordForEmail = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a) },
  },
}));

const renderizar = async () => {
  const { default: EsqueciSenhaPage } = await import("@/pages/EsqueciSenhaPage");
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/esqueci-senha"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <EsqueciSenhaPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe("EsqueciSenhaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("enviar vazio mostra a mensagem do campo e marca aria-invalid", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(await screen.findByRole("button", { name: "Enviar o link por e-mail" }));

    expect(await screen.findByText("Informe seu e-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("confirma o envio sem dizer se o e-mail existe", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.type(await screen.findByLabelText("E-mail"), "Maria@Exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Enviar o link por e-mail" }));

    expect(await screen.findByRole("heading", { name: "Veja seu e-mail", level: 1 })).toBeInTheDocument();
    expect(resetPasswordForEmail).toHaveBeenCalledWith("maria@exemplo.com", expect.anything());
  });

  it("erro do servidor aparece na tela, em português", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error: { message: "Failed to fetch" } });
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.type(await screen.findByLabelText("E-mail"), "maria@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Enviar o link por e-mail" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/Sem conexão/);
    expect(alerta).not.toHaveTextContent(/fetch/i);
  });
});
