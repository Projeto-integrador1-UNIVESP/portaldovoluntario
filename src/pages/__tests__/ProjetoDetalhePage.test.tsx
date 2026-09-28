import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

/**
 * Regressão do achado de loading infinito: quando o projeto não existe, a
 * página fazia `if (!projeto) return <spinner>` e girava para sempre, porque
 * `projeto` nunca era preenchido e não havia estado de "não encontrado".
 */

const single = vi.fn();
const maybeSingle = vi.fn();
const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => single(),
          maybeSingle: () => maybeSingle(),
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, role: null, profile: null, signOut: vi.fn() }),
}));

const renderizarProjeto = async (id: string) => {
  const { default: ProjetoDetalhePage } = await import("@/pages/ProjetoDetalhePage");
  return render(
    // Mesma árvore de providers do App.tsx, para o teste exercitar o que roda de verdade.
    <HelmetProvider>
      <MemoryRouter
        initialEntries={[`/projeto/${id}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/projeto/:id" element={<ProjetoDetalhePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe("ProjetoDetalhePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: 0, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("mostra 'projeto não encontrado' quando o id não existe, em vez de girar para sempre", async () => {
    single.mockResolvedValue({ data: null, error: { message: "No rows found" } });

    await renderizarProjeto("id-que-nao-existe");

    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument();
  });

  it("exibe o projeto quando ele existe", async () => {
    single.mockResolvedValue({
      data: {
        id: "abc",
        nome_projeto: "Campanha do Agasalho",
        descricao: "Arrecadação de cobertores",
        id_ong: "ong-1",
        data_inicio: "2026-06-01",
        data_fim: "2026-08-01",
        img_url: null,
        status: true,
      },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: { id: "ong-1", nome: "Sítio Agar" }, error: null });

    await renderizarProjeto("abc");

    expect(await screen.findByText("Campanha do Agasalho")).toBeInTheDocument();
  });
});
