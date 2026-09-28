import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const signUp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signUp: (...a: unknown[]) => signUp(...a) },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderizar = async (rota: string) => {
  const { default: CadastroPage } = await import("@/pages/CadastroPage");
  return render(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={[rota]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <CadastroPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe("CadastroPage — doador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signUp.mockResolvedValue({ data: {}, error: null });
  });

  it("pede no máximo 3 campos além do aceite dos termos", async () => {
    await renderizar("/cadastro?tipo=doador");

    // Antes eram 9 campos obrigatórios (achado 9 da especificação).
    expect(await screen.findByLabelText("Nome completo")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();

    expect(screen.queryByLabelText(/data de nascimento/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^CEP$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/logradouro/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/telefone/i)).not.toBeInTheDocument();
  });

  it("mostra erro inline em pt-BR, sem balão nativo do navegador", async () => {
    const usuario = userEvent.setup();
    await renderizar("/cadastro?tipo=doador");

    // noValidate no <form> impede o balão nativo; quem valida é o zod (achado 12).
    const formulario = (await screen.findByRole("button", { name: "Criar conta" })).closest("form");
    expect(formulario).toHaveAttribute("novalidate");

    await usuario.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Informe seu nome completo")).toBeInTheDocument();
    expect(screen.getByText("Informe seu e-mail")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("os campos têm label associado e autocomplete, para leitor de tela e autopreenchimento", async () => {
    await renderizar("/cadastro?tipo=doador");

    // Achado 10: antes os <Label> não tinham htmlFor e os inputs não tinham id.
    expect(await screen.findByLabelText("Nome completo")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password");
  });

  it("cria a conta quando os dados são válidos", async () => {
    const usuario = userEvent.setup();
    await renderizar("/cadastro?tipo=doador");

    await usuario.type(await screen.findByLabelText("Nome completo"), "Maria Souza");
    await usuario.type(screen.getByLabelText("E-mail"), "maria@exemplo.com");
    await usuario.type(screen.getByLabelText("Senha"), "Senha1234");
    await usuario.click(screen.getByRole("checkbox"));
    await usuario.click(screen.getByRole("button", { name: "Criar conta" }));

    await vi.waitFor(() => expect(signUp).toHaveBeenCalledTimes(1));
    expect(signUp.mock.calls[0][0]).toMatchObject({
      email: "maria@exemplo.com",
      password: "Senha1234",
    });
  });
});

describe("CadastroPage — ONG", () => {
  it("mantém os campos de endereço, exigidos pela Edge Function ong-signup", async () => {
    await renderizar("/cadastro?tipo=ong");

    expect(await screen.findByLabelText("Nome da ONG")).toBeInTheDocument();
    expect(screen.getByLabelText("Chave de acesso")).toBeInTheDocument();
    expect(screen.getByLabelText("Telefone")).toBeInTheDocument();
    expect(screen.getByLabelText("CEP")).toBeInTheDocument();
    expect(screen.getByLabelText("Logradouro")).toBeInTheDocument();
  });
});
