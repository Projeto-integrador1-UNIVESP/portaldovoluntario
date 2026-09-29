import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpc, buscarProjeto } = vi.hoisted(() => ({
  rpc: vi.fn(),
  buscarProjeto: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, role: null, profile: null, signOut: vi.fn() }),
}));

// O comprovante vem da RPC pública; a capa e a barra, do projeto.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a) },
}));

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

const ID = "11111111-2222-3333-4444-555555555555";

const renderizar = async (rota = `/obrigado/${ID}`) => {
  const { default: ObrigadoPage } = await import("@/pages/ObrigadoPage");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[rota]}
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

const comprovanteBase = {
  id: ID,
  valor: 50,
  quantidade: null,
  status: "pendente",
  anonima: false,
  forma_entrega: null,
  confirmada_em: null,
  data_doacao: "2026-09-20T12:00:00Z",
  doador_nome: "Maria Silva",
  projeto_nome: "Campanha do Agasalho",
  projeto_slug: "campanha",
  necessidade_nome: "Cobertores",
  necessidade_unidade: "un",
  ong_nome: "Sítio Agar",
  ong_slug: "sitio-agar",
};

const projeto = {
  id: "p1",
  slug: "campanha",
  nome_projeto: "Campanha do Agasalho",
  descricao: null,
  img_url: null,
  capa_url: null,
  cidade: null,
  causa: "Inverno",
  data_inicio: null,
  data_fim: null,
  ong: null,
  necessidades: [
    { id: "n1", tipo: "dinheiro", nome: "Cobertores", categoria: null, unidade: null, meta: 1000, arrecadado: 200, urgencia: 2, prazo: null },
  ],
};

const responder = (linha: unknown) => rpc.mockResolvedValue({ data: linha ? [linha] : [], error: null });

describe("ObrigadoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarProjeto.mockResolvedValue(projeto);
  });

  it("explica a espera e entrega o código quando a doação está pendente", async () => {
    responder(comprovanteBase);
    await renderizar();

    expect(await screen.findByText(/Obrigado, Maria!/)).toBeInTheDocument();
    expect(screen.getByText(/Aguardando a ONG confirmar o recebimento/)).toBeInTheDocument();
    expect(screen.getByText("Código do comprovante")).toBeInTheDocument();
    expect(screen.getByText(ID.slice(0, 8).toUpperCase())).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("get_comprovante_doacao", { _id: ID });
  });

  it("mostra a doação na faixa pendente da barra do pedido", async () => {
    responder(comprovanteBase);
    await renderizar();

    const barra = await screen.findByRole("progressbar");
    expect(barra).toHaveAccessibleName(/mais R\$\s*50,00 aguardando confirmação/);
  });

  it("mostra a data da confirmação quando a ONG já confirmou", async () => {
    responder({ ...comprovanteBase, status: "confirmada", confirmada_em: "2026-09-22T12:00:00Z" });
    await renderizar();

    expect(await screen.findByText(/A ONG confirmou o recebimento em/)).toBeInTheDocument();
    expect(screen.queryByText(/Aguardando a ONG confirmar/)).not.toBeInTheDocument();
  });

  it("não chama de 'aguardando' uma doação que a ONG marcou como não recebida", async () => {
    responder({ ...comprovanteBase, status: "cancelada" });
    await renderizar();

    expect(await screen.findByText(/marcada como não recebida/)).toBeInTheDocument();
    expect(screen.queryByText(/Aguardando a ONG confirmar/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  // O UUID do comprovante é a chave de acesso ao recibo, com nome e valor de
  // quem doou. O que vai para o WhatsApp é o projeto.
  it("compartilha o link do projeto, nunca o do comprovante", async () => {
    responder(comprovanteBase);
    await renderizar();

    const whatsapp = await screen.findByRole("link", { name: /WhatsApp/ });
    const href = decodeURIComponent(whatsapp.getAttribute("href") ?? "");
    expect(href).toContain("/projetos/campanha");
    expect(href).not.toContain(ID);
  });

  // Id que ainda não aparece na RPC (lag) ou função ausente: dizer "não
  // encontramos" a quem acabou de transferir dinheiro é o pior desfecho.
  it("entrega o comprovante mínimo quando a doação não pode ser lida", async () => {
    responder(null);
    await renderizar();

    expect(await screen.findByText(/Obrigado pela doação/)).toBeInTheDocument();
    expect(screen.getByText(ID.slice(0, 8).toUpperCase())).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.queryByText(/Não encontramos essa doação/)).not.toBeInTheDocument();
  });

  it("falha de rede vira erro com tentar de novo, não comprovante sem detalhes", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("TypeError: Failed to fetch") });
    await renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível abrir o comprovante/);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.queryByText(/Obrigado pela doação/)).not.toBeInTheDocument();
  });

  it("um id que não é UUID cai em 'não encontramos', sem consultar nada", async () => {
    await renderizar("/obrigado/abc");

    expect(await screen.findByText(/Não encontramos essa doação/)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });
});
