import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";

const { auth, tabelas, navegar } = vi.hoisted(() => ({
  auth: { user: null as null | { id: string; email: string }, profile: null as null | { nome: string } },
  tabelas: {} as Record<string, unknown>,
  navegar: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, profile: auth.profile, role: null, signOut: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-router-dom", async () => {
  const real = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...real, useNavigate: () => navegar };
});

// Um construtor de consulta encadeável: cada tabela responde com o que o teste
// pôs em `tabelas`. `maybeSingle` devolve o objeto; o `then` devolve a lista.
vi.mock("@/integrations/supabase/client", () => {
  const consulta = (tabela: string) => {
    const resposta = () => {
      const v = tabelas[tabela];
      if (v instanceof Error) return { data: null, error: v };
      return { data: v ?? null, error: null };
    };
    const q: Record<string, unknown> = {};
    for (const metodo of ["select", "eq", "order", "limit", "insert"]) q[metodo] = () => q;
    q.maybeSingle = () => Promise.resolve(resposta());
    q.single = () => Promise.resolve(resposta());
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(resposta()).then(res);
    return q;
  };
  return { supabase: { from: (tabela: string) => consulta(tabela) } };
});

const ong = {
  id: "o1", slug: "sitio-agar", nome: "Sítio Agar", cidade: "Cajamar", estado: "SP",
  logo_url: null, img_url: null, pix: "agar@pix.com", pix_nome_recebedor: "Sitio Agar",
  banco: null, agencia: null, conta: null, verificada_em: "2026-01-01",
};

const renderizar = async () => {
  const { default: DoarPage } = await import("@/pages/DoarPage");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={["/doar/sitio-agar"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/doar/:ongId" element={<DoarPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("DoarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    auth.profile = null;
    for (const chave of Object.keys(tabelas)) delete tabelas[chave];
    tabelas.ongs = ong;
    tabelas.projetos = [];
  });

  it("sem projeto aberto, avisa antes que registrar exige entrar e só libera com valor", async () => {
    await renderizar();

    expect(await screen.findByText(/Para registrar esta doação é preciso entrar/)).toBeInTheDocument();
    expect(screen.getByText(/O dinheiro vai direto para a conta da ONG/)).toBeInTheDocument();
    expect(screen.getByText("ONG verificada")).toBeInTheDocument();

    const botao = screen.getByRole("button", { name: /Escolha um valor para continuar/ });
    expect(botao).toBeDisabled();
    expect(botao.closest("form")).toHaveAttribute("novalidate");

    await userEvent.click(screen.getByRole("button", { name: /R\$\s*50/ }));
    expect(screen.getByLabelText("Outro valor")).toHaveValue(formatCurrency(50));
    expect(screen.getByText("Pix Copia e Cola")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Entrar e registrar minha doação/ }));
    expect(navegar).toHaveBeenCalledWith("/login?redirect=/doar/sitio-agar");
  });

  it("com projeto aberto, leva para a doação com projeto", async () => {
    tabelas.projetos = [
      { id: "p1", slug: "campanha", nome_projeto: "Campanha do Agasalho", descricao: "Cobertores.", data_fim: null },
    ];
    await renderizar();

    const link = await screen.findByRole("link", { name: /Campanha do Agasalho/ });
    expect(link).toHaveAttribute("href", "/doar/projeto/campanha");
    expect(screen.queryByRole("button", { name: /Escolha um valor/ })).not.toBeInTheDocument();
  });

  it("uma doação marcada como não recebida não aparece como 'aguardando'", async () => {
    auth.user = { id: "u1", email: "maria@exemplo.com" };
    tabelas.doacoes = [
      { id: "d1", valor: 30, status: "cancelada", confirmada_em: null, data_doacao: "2026-09-01T12:00:00Z" },
      { id: "d2", valor: 50, status: "pendente", confirmada_em: null, data_doacao: "2026-09-02T12:00:00Z" },
    ];
    await renderizar();

    expect(await screen.findByText("Marcada como não recebida")).toBeInTheDocument();
    expect(screen.getAllByText("Aguardando a ONG confirmar")).toHaveLength(1);
    expect(screen.queryByText(/é preciso entrar/)).not.toBeInTheDocument();
  });

  it("falha na consulta vira erro com tentar de novo", async () => {
    tabelas.ongs = new Error("TypeError: Failed to fetch");
    await renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível carregar esta organização/);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
