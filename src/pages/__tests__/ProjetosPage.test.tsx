import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (nome: string, args: Record<string, unknown>) => rpc(nome, args),
    from: () => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [{ cidade: "Cajamar", causa: "Assistência social" }],
            error: null,
          }),
      }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, role: null, profile: null, signOut: vi.fn() }),
}));

const linha = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  slug: "campanha-do-agasalho",
  nome_projeto: "Campanha do Agasalho",
  descricao: "Cobertores para o inverno.",
  capa_url: null,
  img_url: null,
  cidade: "Cajamar",
  causa: "Assistência social",
  data_fim: null,
  ong_id: "o1",
  ong_nome: "Sítio Agar",
  ong_slug: "sitio-agar",
  ong_verificada: true,
  total_necessidades: 2,
  progresso_medio: 40,
  total_encontrado: 1,
  ...over,
});

const renderizar = async () => {
  const { default: ProjetosPage } = await import("@/pages/ProjetosPage");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={["/projetos"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ProjetosPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe("ProjetosPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolve a listagem em uma chamada e mostra ONG, causa e o que falta confirmar", async () => {
    rpc.mockResolvedValue({ data: [linha()], error: null });
    await renderizar();

    expect(await screen.findByText("Sítio Agar")).toBeInTheDocument();
    expect(screen.getByText("ONG verificada")).toBeInTheDocument();
    expect(screen.getByText("Assistência social")).toBeInTheDocument();
    expect(screen.getByText("2 pedidos abertos")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("40% já confirmado pela ONG")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("buscar_projetos", expect.objectContaining({ _q: undefined }));
  });

  it("ordena por urgência antes da data de publicação", async () => {
    rpc.mockResolvedValue({
      data: [
        linha({ id: "p1", nome_projeto: "Quase pronto", progresso_medio: 90, total_encontrado: 2 }),
        linha({ id: "p2", nome_projeto: "Longe da meta", progresso_medio: 10, total_encontrado: 2 }),
      ],
      error: null,
    });
    await renderizar();

    await screen.findByText("Longe da meta");
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual(["Longe da meta", "Quase pronto"]);
  });

  /**
   * Ritmo editorial: na primeira página sem filtro, o primeiro projeto ocupa
   * duas colunas. Com filtro ativo a lista é resultado de busca e volta a ser
   * uma grade regular.
   */
  it("destaca o primeiro projeto como card largo só na primeira página sem filtros", async () => {
    const usuario = userEvent.setup();
    rpc.mockResolvedValue({
      data: [
        linha({ id: "p1", nome_projeto: "Primeiro", total_encontrado: 2 }),
        linha({ id: "p2", nome_projeto: "Segundo", total_encontrado: 2 }),
      ],
      error: null,
    });
    await renderizar();

    await screen.findByText("Primeiro");
    const cards = screen.getAllByRole("link", { name: /Ver o que falta/ });
    expect(cards[0]).toHaveClass("sm:col-span-2");
    expect(cards[1]).not.toHaveClass("sm:col-span-2");

    await usuario.type(screen.getByLabelText("Buscar projetos"), "Primeiro");
    await usuario.click(screen.getByRole("button", { name: "Buscar" }));

    await screen.findByRole("button", { name: "Limpar filtros" });
    for (const card of screen.getAllByRole("link", { name: /Ver o que falta/ })) {
      expect(card).not.toHaveClass("sm:col-span-2");
    }
  });

  it("não pisca o estado vazio enquanto carrega", async () => {
    rpc.mockReturnValue(new Promise(() => {}));
    await renderizar();

    expect(screen.queryByText("Ainda não há projetos publicados")).not.toBeInTheDocument();
    expect(screen.queryByText("Nenhum projeto com esses filtros")).not.toBeInTheDocument();
  });

  it("oferece tentar de novo quando a consulta falha", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "network error" } });
    await renderizar();

    expect(await screen.findByText("Não foi possível carregar os projetos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("manda o termo buscado para a RPC e oferece limpar quando não acha nada", async () => {
    const usuario = userEvent.setup();
    rpc.mockResolvedValueOnce({ data: [linha()], error: null });
    rpc.mockResolvedValue({ data: [], error: null });
    await renderizar();

    await screen.findByText("Campanha do Agasalho");
    await usuario.type(screen.getByLabelText("Buscar projetos"), "fantasma");
    await usuario.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Nenhum projeto com esses filtros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
    expect(rpc).toHaveBeenLastCalledWith(
      "buscar_projetos",
      expect.objectContaining({ _q: "fantasma" }),
    );
  });
});
