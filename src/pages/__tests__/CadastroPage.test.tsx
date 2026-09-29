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

const preencherDoador = async () => {
  const usuario = userEvent.setup();
  await renderizar("/cadastro?tipo=doador");
  await usuario.type(await screen.findByLabelText("Nome completo"), "Maria Souza");
  await usuario.type(screen.getByLabelText("E-mail"), "maria@exemplo.com");
  await usuario.type(screen.getByLabelText("Senha"), "Senha1234");
  await usuario.click(screen.getByRole("checkbox"));
  await usuario.click(screen.getByRole("button", { name: "Criar conta" }));
};

describe("CadastroPage: doador", () => {
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
    expect(screen.getByLabelText("Nome completo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("aria-invalid", "true");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("e-mail já cadastrado aparece no próprio campo, sem toast", async () => {
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "User already registered" } });
    await preencherDoador();

    expect(await screen.findByText(/Já existe uma conta com esse e-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
  });

  it("trata usuário sem identidades como e-mail já cadastrado (confirmação ligada)", async () => {
    signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    await preencherDoador();

    expect(await screen.findByText(/Já existe uma conta com esse e-mail/)).toBeInTheDocument();
  });

  it("sem sessão na resposta, explica que falta confirmar o e-mail", async () => {
    signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    await preencherDoador();

    expect(await screen.findByRole("heading", { name: "Confirme seu e-mail", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("maria@exemplo.com")).toBeInTheDocument();
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

describe("CadastroPage: ONG", () => {
  it("mantém os campos de endereço, exigidos pela Edge Function ong-signup", async () => {
    await renderizar("/cadastro?tipo=ong");

    expect(await screen.findByLabelText("Nome da ONG")).toBeInTheDocument();
    expect(screen.getByLabelText("Chave de acesso")).toBeInTheDocument();
    expect(screen.getByLabelText("Telefone")).toBeInTheDocument();
    expect(screen.getByLabelText("CEP")).toBeInTheDocument();
    expect(screen.getByLabelText("Logradouro")).toBeInTheDocument();
  });

  it("enviar vazio mostra a mensagem de cada campo e marca aria-invalid", async () => {
    const usuario = userEvent.setup();
    await renderizar("/cadastro?tipo=ong");

    await usuario.click(await screen.findByRole("button", { name: "Criar a conta da ONG" }));

    expect(await screen.findByText("Informe o nome da ONG")).toBeInTheDocument();
    expect(screen.getByText("Informe a chave de acesso")).toBeInTheDocument();
    expect(screen.getByText("Informe o telefone com DDD")).toBeInTheDocument();
    expect(screen.getByText("Informe um CEP com 8 números")).toBeInTheDocument();
    expect(screen.getByText("Informe o logradouro")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da ONG")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Chave de acesso")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("CEP")).toHaveAttribute("aria-invalid", "true");
  });

  it("lê o corpo da resposta da função e põe a chave inválida no campo da chave", async () => {
    const { FunctionsHttpError } = await import("@supabase/supabase-js");
    const { supabase } = await import("@/integrations/supabase/client");
    const resposta = new Response(JSON.stringify({ error: "Código inválido ou já utilizado." }), { status: 400 });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: new FunctionsHttpError(resposta) });

    const usuario = userEvent.setup();
    await renderizar("/cadastro?tipo=ong");

    await usuario.type(await screen.findByLabelText("Nome da ONG"), "Sítio Agar");
    await usuario.type(screen.getByLabelText("Chave de acesso"), "ONG-1234-ABCD");
    await usuario.type(screen.getByLabelText("CEP"), "01310100");
    await usuario.type(screen.getByLabelText("Cidade"), "São Paulo");
    await usuario.type(screen.getByLabelText("Logradouro"), "Avenida Paulista, 1000");
    await usuario.type(screen.getByLabelText("Nome do responsável"), "Maria Souza");
    await usuario.type(screen.getByLabelText("E-mail"), "maria@exemplo.com");
    await usuario.type(screen.getByLabelText("Senha"), "Senha1234");
    await usuario.type(screen.getByLabelText("Telefone"), "11987654321");
    await usuario.type(screen.getByLabelText("Data de nascimento"), "1990-05-10");
    await usuario.click(screen.getByRole("checkbox"));

    // O Select da UF é Radix e abre por teclado no jsdom.
    const uf = screen.getByRole("combobox", { name: "Estado" });
    uf.focus();
    await usuario.keyboard("{ArrowDown}");
    await usuario.click(await screen.findByRole("option", { name: /SP \(São Paulo\)/ }));

    await usuario.click(screen.getByRole("button", { name: "Criar a conta da ONG" }));

    expect(await screen.findByText(/Chave de acesso inválida ou já usada/)).toBeInTheDocument();
    expect(screen.getByLabelText("Chave de acesso")).toHaveAttribute("aria-invalid", "true");
  });
});
