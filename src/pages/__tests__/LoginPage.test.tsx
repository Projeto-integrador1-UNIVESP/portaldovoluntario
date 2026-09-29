import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const signInWithPassword = vi.fn();
const navegar = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signInWithPassword: (...a: unknown[]) => signInWithPassword(...a) },
    // A tela consulta os papéis para escolher o painel de destino.
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [] }) }) }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("react-router-dom", async () => {
  const real = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...real, useNavigate: () => navegar };
});

const renderizar = async (rota: string) => {
  const { default: LoginPage } = await import("@/pages/LoginPage");
  return render(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={[rota]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LoginPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

const entrar = async () => {
  const usuario = userEvent.setup();
  await usuario.type(await screen.findByLabelText("E-mail"), "maria@exemplo.com");
  await usuario.type(screen.getByLabelText("Senha"), "Senha1234");
  await usuario.click(screen.getByRole("button", { name: "Entrar" }));
};

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("tem um h1, na mesma escala das outras telas do funil", async () => {
    await renderizar("/login");
    expect(await screen.findByRole("heading", { name: "Entrar", level: 1 })).toBeInTheDocument();
  });

  it("explica por que pede login quando a pessoa chega de um redirect", async () => {
    await renderizar("/login?redirect=/doar/abc");

    expect(await screen.findByText(/Por que precisamos que você entre/)).toBeInTheDocument();
    expect(screen.getByText(/confirma, no seu nome, que a doação chegou/)).toBeInTheDocument();
  });

  it("não mostra explicação de redirect quando a pessoa chegou por conta própria", async () => {
    await renderizar("/login");
    expect(screen.queryByText(/Por que precisamos que você entre/)).not.toBeInTheDocument();
  });

  // O react-router cai em window.location.assign quando o pushState estoura por
  // ser cross-origin, então um destino externo sai do site de verdade. As três
  // grafias abaixo chegam ao parser de URL como "//evil.com".
  const externos = ["//evil.com", "/\\evil.com", "/%09/evil.com", "https://evil.com"];

  it.each(externos)("ignora redirect para fora do site (%s)", async (destino) => {
    await renderizar(`/login?redirect=${destino}`);
    await entrar();

    await vi.waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith("/");
  });

  it("leva ao destino pedido quando ele é um caminho interno", async () => {
    await renderizar("/login?redirect=/doar/abc");
    await entrar();

    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith("/doar/abc"));
  });

  it("enviar vazio mostra a mensagem de cada campo e marca aria-invalid", async () => {
    const usuario = userEvent.setup();
    await renderizar("/login");

    const formulario = (await screen.findByRole("button", { name: "Entrar" })).closest("form");
    expect(formulario).toHaveAttribute("novalidate");

    await usuario.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe seu e-mail")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("aria-invalid", "true");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("credencial errada aparece na tela, em português, e marca os dois campos", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    await renderizar("/login");
    await entrar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("E-mail ou senha incorretos");
    expect(alerta).not.toHaveTextContent(/invalid/i);
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("aria-invalid", "true");
    expect(navegar).not.toHaveBeenCalled();
  });

  it("o botão de mostrar senha expõe o estado com aria-pressed", async () => {
    const usuario = userEvent.setup();
    await renderizar("/login");

    const botao = await screen.findByRole("button", { name: "Mostrar senha" });
    expect(botao).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");

    await usuario.click(botao);

    expect(botao).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  });
});
