import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

// A página também conta as doações da ONG (taxa de confirmação). Sem este mock
// o teste tentaria rede de verdade; o contador zerado esconde o bloco.
vi.mock("@/integrations/supabase/client", () => {
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    insert: () => Promise.resolve({ error: null }),
    then: (resolver: (r: unknown) => unknown) =>
      Promise.resolve({ count: 0, data: null, error: null }).then(resolver),
  };
  return { supabase: { from: () => consulta } };
});

const renderizar = async (slug: string) => {
  const { default: ProjetoPage } = await import("@/pages/ProjetoPage");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/projetos/${slug}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/projetos/:slug" element={<ProjetoPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const projetoBase = {
  id: "p1",
  slug: "campanha-do-agasalho",
  nome_projeto: "Campanha do Agasalho",
  descricao: "Arrecadação de cobertores para o inverno.",
  img_url: null,
  capa_url: null,
  cidade: "Cajamar",
  causa: "Assistência social",
  data_inicio: "2026-06-01",
  data_fim: "2026-08-01",
  ong: {
    id: "o1", nome: "Sítio Agar", slug: "sitio-agar", cidade: "Cajamar", estado: "SP",
    pix: "agar@pix.com", pix_nome_recebedor: "Sitio Agar", banco: null, agencia: null,
    conta: null, verificada_em: "2026-01-01", endereco_entrega: null, horarios_recebimento: null,
  },
  necessidades: [],
};

describe("ProjetoPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra 'não encontrado' em vez de girar para sempre quando o slug não existe", async () => {
    buscarProjeto.mockResolvedValue(null);
    await renderizar("nao-existe");
    expect(await screen.findByText("Projeto não encontrado")).toBeInTheDocument();
  });

  it("lista as necessidades com o progresso de cada uma", async () => {
    buscarProjeto.mockResolvedValue({
      ...projetoBase,
      necessidades: [
        {
          id: "n1", tipo: "item", nome: "Cobertor solteiro", categoria: "Inverno",
          unidade: "un", meta: 100, arrecadado: 30, urgencia: 3, prazo: null,
        },
        {
          id: "n2", tipo: "dinheiro", nome: "Compra de alimentos", categoria: null,
          unidade: null, meta: 2000, arrecadado: 2000, urgencia: 1, prazo: null,
        },
      ],
    });

    await renderizar("campanha-do-agasalho");

    expect(
      await screen.findByRole("heading", { name: /Do que este projeto precisa/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cobertor solteiro")).toBeInTheDocument();

    // O número em destaque é o que falta; a barra fica como contexto.
    expect(screen.getByText("Faltam 70 un")).toBeInTheDocument();
    expect(screen.getByText("30 un de 100 un")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();

    // A necessidade urgente é sinalizada; a que bateu a meta também.
    expect(screen.getByText("Urgente")).toBeInTheDocument();
    expect(screen.getByText("Meta atingida")).toBeInTheDocument();
    expect(screen.getByText("R$ 2.000,00 já recebidos")).toBeInTheDocument();
  });

  it("explica a regra da confirmação junto dos botões de doar", async () => {
    buscarProjeto.mockResolvedValue({
      ...projetoBase,
      necessidades: [{
        id: "n1", tipo: "item", nome: "Cobertor", categoria: null, unidade: "un",
        meta: 100, arrecadado: 0, urgencia: 2, prazo: null,
      }],
    });

    await renderizar("campanha-do-agasalho");

    expect(
      await screen.findByText(/só andam quando a ONG confirma que recebeu/),
    ).toBeInTheDocument();
    expect(screen.getByText(/não recebe nem retém o seu dinheiro/)).toBeInTheDocument();
  });

  it("leva ao fluxo de doação já com a necessidade escolhida", async () => {
    buscarProjeto.mockResolvedValue({
      ...projetoBase,
      necessidades: [{
        id: "n1", tipo: "item", nome: "Cobertor", categoria: null, unidade: "un",
        meta: 100, arrecadado: 0, urgencia: 2, prazo: null,
      }],
    });

    await renderizar("campanha-do-agasalho");

    const botao = await screen.findByRole("link", { name: "Quero doar" });
    expect(botao).toHaveAttribute(
      "href",
      "/doar/projeto/campanha-do-agasalho?necessidade=n1",
    );
  });

  it("sugere doação em dinheiro quando a ONG ainda não publicou necessidades", async () => {
    buscarProjeto.mockResolvedValue(projetoBase);
    await renderizar("campanha-do-agasalho");
    expect(
      await screen.findByText("A ONG ainda não publicou necessidades"),
    ).toBeInTheDocument();
  });

  it("exibe o selo de ONG verificada", async () => {
    buscarProjeto.mockResolvedValue(projetoBase);
    await renderizar("campanha-do-agasalho");
    // Visível, não só no aria-label: é sinal de confiança, não decoração.
    expect(await screen.findByText("ONG verificada")).toBeInTheDocument();
  });
});
