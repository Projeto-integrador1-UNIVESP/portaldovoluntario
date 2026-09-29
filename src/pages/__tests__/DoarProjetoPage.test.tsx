import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import DoarProjetoPage from "@/pages/DoarProjetoPage";

const buscarProjeto = vi.fn();
const invoke = vi.fn();
const navegar = vi.fn();

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
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));
vi.mock("react-router-dom", async () => {
  const real = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...real, useNavigate: () => navegar };
});

const cestas = {
  id: "n-cestas",
  tipo: "item" as const,
  nome: "Cesta de frutas para os pacientes",
  categoria: "Alimentos",
  unidade: "caixa",
  meta: 30,
  arrecadado: 4,
  urgencia: 1,
  prazo: null,
};

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
  necessidades: [] as (typeof cestas)[],
};

const renderizar = (busca = "") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/doar/projeto/${projeto.slug}${busca}`]}
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

/** Resposta da Edge Function com status fora de 2xx, como o supabase-js entrega. */
const respostaComErro = (status: number, corpo: unknown) => ({
  data: null,
  error: new FunctionsHttpError({ status, json: () => Promise.resolve(corpo) }),
});

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

  it("dá nome ao grupo de destino e ao campo de valor, para leitor de tela e foco", async () => {
    const usuario = userEvent.setup();
    renderizar();

    expect(await screen.findByRole("group", { name: "O que você quer doar?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Para o projeto usar onde precisar" })).toBeChecked();

    const outroValor = screen.getByLabelText("Outro valor");
    expect(outroValor).toHaveAttribute("name", "valor");
    await usuario.type(outroValor, "1234");
    expect(outroValor).toHaveValue(formatCurrency(12.34));
  });

  it("enviar sem nome e e-mail mostra a mensagem em cada campo e marca aria-invalid", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole("button", { name: /R\$\s*50/ }));
    await usuario.click(screen.getByRole("button", { name: /Já paguei, registrar minha doação/ }));

    expect(await screen.findByText("Informe seu nome")).toBeInTheDocument();
    expect(screen.getByText("Informe seu e-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Seu nome")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Seu e-mail")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  const preencherEEnviar = async () => {
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole("button", { name: /R\$\s*50/ }));
    await usuario.type(screen.getByLabelText("Seu nome"), "Maria Silva");
    await usuario.type(screen.getByLabelText("Seu e-mail"), "maria@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: /Já paguei, registrar minha doação/ }));
  };

  it("leva ao comprovante quando a função registra a doação", async () => {
    invoke.mockResolvedValue({ data: { id: "d-1" }, error: null });
    renderizar();

    await preencherEEnviar();

    await vi.waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][0]).toBe("/obrigado/d-1");
    expect(invoke).toHaveBeenCalledWith(
      "registrar-doacao",
      expect.objectContaining({
        body: expect.objectContaining({ id_projeto: "p1", id_necessidade: null, valor: 50 }),
      }),
    );
  });

  // O supabase-js embrulha o corpo da função num FunctionsHttpError cuja
  // mensagem é "Edge Function returned a non-2xx status code": antes era isso
  // que aparecia no toast.
  it("traduz o erro da função em vez de mostrar o texto do supabase", async () => {
    invoke.mockResolvedValue(respostaComErro(409, { error: "Este projeto não está mais recebendo doações." }));
    renderizar();

    await preencherEEnviar();

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    const mensagem = String(vi.mocked(toast.error).mock.calls[0][0]);
    expect(mensagem).toMatch(/encerrou as doações/);
    expect(mensagem).not.toMatch(/non-2xx/i);
    expect(navegar).not.toHaveBeenCalled();
  });

  it("um erro de campo da função volta para o campo, com foco", async () => {
    invoke.mockResolvedValue(respostaComErro(400, { error: "Informe um e-mail válido." }));
    renderizar();

    await preencherEEnviar();

    expect(await screen.findByText("Informe um e-mail válido")).toBeInTheDocument();
    expect(screen.getByLabelText("Seu e-mail")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Seu e-mail")).toHaveFocus();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("explica a falha de rede em português e não trava o botão", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError("Failed to fetch")),
    });
    renderizar();

    await preencherEEnviar();

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Sem conexão/)));
    expect(screen.getByRole("button", { name: /Já paguei, registrar minha doação/ })).toBeEnabled();
  });

  it("corpo que não é JSON cai na mensagem padrão, sem quebrar", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({ status: 502, json: () => Promise.reject(new Error("html")) }),
    });
    renderizar();

    await preencherEEnviar();

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Não foi possível registrar/)),
    );
  });

  describe("doação de item", () => {
    beforeEach(() => {
      buscarProjeto.mockResolvedValue({ ...projeto, necessidades: [cestas] });
    });

    it("chega pelo link da necessidade já no passo 2 e enviar vazio explica cada campo", async () => {
      const usuario = userEvent.setup();
      renderizar(`?necessidade=${cestas.id}`);

      expect(await screen.findByText(/Passo 2 de 3: Quanto e como entregar/)).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: cestas.nome })).toBeChecked();

      await usuario.click(screen.getByRole("button", { name: "Registrar e avisar a ONG" }));

      expect(await screen.findByText("Diga quantos você vai doar")).toBeInTheDocument();
      expect(screen.getByLabelText("Quantidade (caixa)")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Informe seu nome")).toBeInTheDocument();
      expect(screen.getByText("Informe seu e-mail")).toBeInTheDocument();
      expect(invoke).not.toHaveBeenCalled();
    });

    it("não aceita meia caixa", async () => {
      const usuario = userEvent.setup();
      renderizar(`?necessidade=${cestas.id}`);

      await usuario.type(await screen.findByLabelText("Quantidade (caixa)"), "1.5");
      await usuario.click(screen.getByRole("button", { name: "Registrar e avisar a ONG" }));

      expect(await screen.findByText("Informe um número inteiro de itens")).toBeInTheDocument();
    });

    it("um link para uma necessidade que já fechou volta para o passo 1", async () => {
      renderizar("?necessidade=nao-existe-mais");

      expect(await screen.findByText(/Passo 1 de 4: O que doar/)).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Para o projeto usar onde precisar" })).toBeChecked();
    });
  });
});
