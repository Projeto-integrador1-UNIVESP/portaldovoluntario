import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DoarProjetoPage from "@/pages/DoarProjetoPage";

const buscarProjeto = vi.fn();

vi.mock("@/hooks/queries/useProjeto", async () => {
  const real = await vi.importActual<typeof import("@/hooks/queries/useProjeto")>(
    "@/hooks/queries/useProjeto",
  );
  const { useQuery } = await import("@tanstack/react-query");
  return {
    ...real,
    useProjeto: (id: string | undefined) =>
      useQuery({ queryKey: ["projeto", id], queryFn: () => buscarProjeto(id), enabled: !!id }),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, role: null, profile: null, signOut: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const projeto = {
  id: "p1",
  slug: "campanha-do-agasalho",
  nome_projeto: "Campanha do Agasalho",
  descricao: "Cobertores para o inverno.",
  img_url: null,
  capa_url: null,
  cidade: "Cajamar",
  causa: "Assistência social",
  data_inicio: null,
  data_fim: null,
  ong: {
    id: "o1", nome: "Sítio Agar", slug: "sitio-agar", cidade: "Cajamar", estado: "SP",
    pix: "agar@pix.com", pix_nome_recebedor: "Sitio Agar", banco: null, agencia: null,
    conta: null, verificada_em: "2026-01-01", endereco_entrega: null, horarios_recebimento: null,
  },
  necessidades: [],
};

const renderizar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/doar/projeto/${projeto.slug}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/doar/projeto/:slug" element={<DoarProjetoPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("DoarProjetoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarProjeto.mockResolvedValue(projeto);
  });

  it("diz no topo que o dinheiro vai direto para a ONG e mostra o selo de verificada", async () => {
    renderizar();

    expect(
      await screen.findByText(/O dinheiro vai direto para a conta da ONG/),
    ).toBeInTheDocument();
    expect(screen.getByText(/não processa o pagamento/)).toBeInTheDocument();
    expect(screen.getByText("ONG verificada")).toBeInTheDocument();
  });

  // Sem valor não existe QR Code na tela: registrar aqui criaria uma doação
  // pendente que a ONG teria de perseguir e cancelar.
  it("só libera o registro depois de escolher um valor", async () => {
    renderizar();

    const bloqueado = await screen.findByRole("button", {
      name: /Escolha um valor para continuar/,
    });
    expect(bloqueado).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /R\$\s*50/ }));

    expect(
      await screen.findByRole("button", { name: /Já paguei, registrar minha doação/ }),
    ).toBeEnabled();
    expect(screen.getByText("Pix Copia e Cola")).toBeInTheDocument();
  });

  it("avança o passo do indicador conforme o formulário é preenchido", async () => {
    renderizar();

    expect(await screen.findByText(/Passo 1 de 4: O que doar/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /R\$\s*20/ }));
    expect(await screen.findByText(/Passo 3 de 4: Seus dados/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Seu nome"), "Maria Silva");
    await userEvent.type(screen.getByLabelText("Seu e-mail"), "maria@exemplo.com");
    expect(await screen.findByText(/Passo 4 de 4: Pagar com Pix/)).toBeInTheDocument();
  });
});
