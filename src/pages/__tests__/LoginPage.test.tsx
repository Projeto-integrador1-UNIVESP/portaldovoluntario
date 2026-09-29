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
    expect(screen.getByText(/confirmar, no seu nome, que a doação chegou/)).toBeInTheDocument();
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
});
