import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { linhas } = vi.hoisted(() => ({
  linhas: {} as Record<string, unknown>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, role: null, profile: null, signOut: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const consulta = (tabela: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: () => Promise.resolve({ data: linhas[tabela] ?? null, error: null }),
    };
    return q;
  };
  return { supabase: { from: (tabela: string) => consulta(tabela) } };
});

const ID = "11111111-2222-3333-4444-555555555555";

const renderizar = async () => {
  const { default: ObrigadoPage } = await import("@/pages/ObrigadoPage");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/obrigado/${ID}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/obrigado/:id" element={<ObrigadoPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const doacaoBase = {
  id: ID,
  valor: 50,
  quantidade: null,
  status: "pendente",
  confirmada_em: null,
  data_doacao: "2026-09-20T12:00:00Z",
  doador_nome: "Maria Silva",
  id_ong: "o1",
  id_projeto: "p1",
  id_necessidade: null,
};

describe("ObrigadoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const chave of Object.keys(linhas)) delete linhas[chave];
    linhas.projetos = { id: "p1", nome_projeto: "Campanha do Agasalho", slug: "campanha" };
    linhas.ongs = { id: "o1", nome: "Sítio Agar", slug: "sitio-agar" };
  });

  it("explica a espera e entrega o código quando a doação está pendente", async () => {
    linhas.doacoes = doacaoBase;
    await renderizar();

    expect(await screen.findByText(/Obrigado, Maria!/)).toBeInTheDocument();
    expect(screen.getByText(/Aguardando a ONG confirmar o recebimento/)).toBeInTheDocument();
    expect(screen.getByText("Código do comprovante")).toBeInTheDocument();
    expect(screen.getByText(ID.slice(0, 8).toUpperCase())).toBeInTheDocument();
  });

  it("mostra a data da confirmação quando a ONG já confirmou", async () => {
    linhas.doacoes = {
      ...doacaoBase,
      status: "confirmada",
      confirmada_em: "2026-09-22T12:00:00Z",
    };
    await renderizar();

    expect(await screen.findByText(/A ONG confirmou o recebimento em/)).toBeInTheDocument();
    expect(screen.queryByText(/Aguardando a ONG confirmar/)).not.toBeInTheDocument();
  });

  it("não chama de 'aguardando' uma doação que a ONG marcou como não recebida", async () => {
    linhas.doacoes = { ...doacaoBase, status: "cancelada" };
    await renderizar();

    expect(await screen.findByText(/marcada como não recebida/)).toBeInTheDocument();
    expect(screen.queryByText(/Aguardando a ONG confirmar/)).not.toBeInTheDocument();
  });

  // Doação feita sem conta não é legível pelo doador (as policies de SELECT em
  // `doacoes` cobrem dono da conta, ONG e admin). Dizer "não encontramos" a
  // quem acabou de transferir dinheiro é o pior desfecho possível.
  it("entrega o comprovante mínimo quando a doação não pode ser lida", async () => {
    await renderizar();

    expect(await screen.findByText(/Obrigado pela doação/)).toBeInTheDocument();
    expect(screen.getByText(ID.slice(0, 8).toUpperCase())).toBeInTheDocument();
    expect(screen.queryByText(/Não encontramos essa doação/)).not.toBeInTheDocument();
  });
});
