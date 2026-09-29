import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MENSAGENS } from "@/lib/copy";

/**
 * O que estes testes protegem: cada diálogo do painel é um `<form>` que, ao
 * ser enviado vazio, mostra a mensagem embaixo do campo e marca o controle com
 * `aria-invalid`. Antes a validação vivia dentro da mutation e a mensagem se
 * perdia num toast genérico.
 */

const escritas: { tabela: string; operacao: string; valores: unknown }[] = [];
let pessoaPorEmail: { user_id: string } | null = null;

const dados: Record<string, Record<string, unknown>[]> = {
  ongs: [{ id: "ong-1", nome: "Casa do Caminho", status: true, verificada_em: null }],
  projetos: [{ id: "proj-1", nome_projeto: "Campanha do Agasalho", status: true, id_ong: "ong-1" }],
};

vi.mock("@/integrations/supabase/client", () => {
  const construir = (tabela: string) => {
    const estado = { operacao: "select" };
    const encadeavel = [
      "select", "eq", "is", "in", "order", "range", "ilike", "limit", "or", "not", "lt", "single",
    ] as const;

    const resolver = () => {
      if (estado.operacao !== "select") return { data: [{ id: "novo" }], error: null, count: null };
      const linhas = dados[tabela] ?? [];
      return { data: linhas, error: null, count: linhas.length };
    };

    const construtor: Record<string, unknown> = {
      update: (valores: unknown) => {
        estado.operacao = "update";
        escritas.push({ tabela, operacao: "update", valores });
        return construtor;
      },
      insert: (valores: unknown) => {
        estado.operacao = "insert";
        escritas.push({ tabela, operacao: "insert", valores });
        return construtor;
      },
      delete: () => {
        estado.operacao = "delete";
        escritas.push({ tabela, operacao: "delete", valores: null });
        return construtor;
      },
      maybeSingle: () => ({
        then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
          Promise.resolve({ data: pessoaPorEmail, error: null }).then(ok, falha),
      }),
      then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve(resolver()).then(ok, falha),
    };
    for (const metodo of encadeavel) construtor[metodo] = () => construtor;
    return construtor;
  };

  return {
    supabase: {
      from: (tabela: string) => construir(tabela),
      rpc: async () => ({ data: [{ valor_arrecadado: 0, itens_arrecadados: 0 }], error: null }),
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      functions: { invoke: async () => ({ data: null, error: null }) },
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, role: "admin", profile: null, ongId: null, signOut: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const renderizar = async (caminho: string) => {
  const { default: Pagina } = await import(`@/pages/admin/${caminho}.tsx`);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Pagina />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

/** Abre o diálogo pelo botão do cabeçalho (o primeiro com esse nome) e devolve o diálogo. */
const abrir = async (nomeDoBotao: RegExp) => {
  const [botao] = await screen.findAllByRole("button", { name: nomeDoBotao });
  await userEvent.click(botao);
  return within(await screen.findByRole("dialog"));
};

/** O erro mora em `#{id}-erro`, ligado ao controle por `aria-describedby`. */
const esperaInvalido = async (_dialogo: ReturnType<typeof within>, id: string, mensagem: string | RegExp) => {
  await waitFor(() => {
    const erro = document.getElementById(`${id}-erro`);
    expect(erro).not.toBeNull();
    expect(erro).toHaveAttribute("role", "alert");
    expect(erro).toHaveTextContent(mensagem);
  });
  const controle = document.getElementById(id)!;
  expect(controle).toHaveAttribute("aria-invalid", "true");
  expect(controle.getAttribute("aria-describedby")).toContain(`${id}-erro`);
};

describe("formulários do painel enviados vazios", () => {
  beforeEach(() => {
    escritas.length = 0;
    pessoaPorEmail = null;
    vi.clearAllMocks();
  });

  it("ONG: mensagem inline, aria-invalid e foco no primeiro campo", async () => {
    await renderizar("AdminOngs");
    const dialogo = await abrir(/^Nova ONG$/);
    await userEvent.click(dialogo.getByRole("button", { name: "Cadastrar ONG" }));

    await esperaInvalido(dialogo, "ong-nome", "Informe o nome da ONG");
    expect(document.activeElement).toBe(document.getElementById("ong-nome"));
    expect(escritas).toHaveLength(0);
  }, 20_000);

  it("ONG: erro numa aba escondida troca a aba e leva o foco até o campo", async () => {
    await renderizar("AdminOngs");
    const dialogo = await abrir(/^Nova ONG$/);

    await userEvent.type(dialogo.getByLabelText(/Nome da ONG/), "Casa do Caminho");
    await userEvent.type(dialogo.getByLabelText(/^CNPJ/), "05412783000134");
    await userEvent.type(dialogo.getByLabelText(/^Telefone/), "11987654321");
    await userEvent.type(dialogo.getByLabelText(/Área de atuação/), "Assistência social");
    await userEvent.click(dialogo.getByRole("button", { name: "Cadastrar ONG" }));

    // O primeiro erro é o CEP, que está na aba Endereço.
    await esperaInvalido(dialogo, "ong-cep", MENSAGENS.cep);
    expect(dialogo.getByRole("tab", { name: /Endereço/ })).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(document.getElementById("ong-cep"));
    // O gatilho da aba avisa quantos campos têm erro.
    expect(dialogo.getByRole("tab", { name: /Endereço.*campos com erro/ })).toBeInTheDocument();
  }, 20_000);

  it("Usuário novo: nome, e-mail e senha", async () => {
    await renderizar("AdminUsuarios");
    const dialogo = await abrir(/^Novo usuário$/);
    await userEvent.click(dialogo.getByRole("button", { name: "Criar usuário" }));

    await esperaInvalido(dialogo, "novo-nome", "Informe o nome");
    await esperaInvalido(dialogo, "novo-email", "Informe o e-mail");
    await esperaInvalido(dialogo, "novo-senha", /Informe uma senha|A senha precisa ter/);
  }, 20_000);

  it("Projeto: nome, ONG (Select) e datas", async () => {
    await renderizar("AdminProjetos");
    const dialogo = await abrir(/^Novo projeto$/);
    await userEvent.click(dialogo.getByRole("button", { name: "Criar projeto" }));

    await esperaInvalido(dialogo, "projeto-nome_projeto", "Dê um nome ao projeto");
    await esperaInvalido(dialogo, "projeto-id_ong", "Escolha a ONG responsável");
    await esperaInvalido(dialogo, "projeto-data_inicio", "Informe quando o projeto começa");
  }, 20_000);

  it("Evento: nome, data e hora, local e ONG", async () => {
    await renderizar("AdminEventos");
    const dialogo = await abrir(/^Novo evento$/);
    await userEvent.click(dialogo.getByRole("button", { name: "Criar evento" }));

    await esperaInvalido(dialogo, "evento-nome", "Informe o nome do evento");
    await esperaInvalido(dialogo, "evento-data_evento", "Informe a data e a hora");
    await esperaInvalido(dialogo, "evento-id_ong", "Escolha a ONG responsável");
  }, 20_000);

  it("Doação: ONG e valor maior que zero", async () => {
    await renderizar("AdminDoacoes");
    const dialogo = await abrir(/^Registrar doação$/);
    await userEvent.click(dialogo.getByRole("button", { name: "Registrar doação" }));

    await esperaInvalido(dialogo, "doacao-id_ong", "Escolha a ONG que recebeu");
    await esperaInvalido(dialogo, "doacao-valor", MENSAGENS.valorPositivo);
    expect(escritas).toHaveLength(0);
  }, 20_000);

  it("Voluntário: e-mail da pessoa e projeto", async () => {
    await renderizar("AdminVoluntarios");
    const dialogo = await abrir(/^Inscrever voluntário$/);
    await userEvent.click(dialogo.getByRole("button", { name: "Inscrever voluntário" }));

    await esperaInvalido(dialogo, "voluntario-email", "Informe o e-mail da pessoa");
    await esperaInvalido(dialogo, "voluntario-id_projeto", "Escolha o projeto");
  }, 20_000);

  it("Voluntário: e-mail sem conta aparece embaixo do campo, vindo do servidor", async () => {
    pessoaPorEmail = null;
    await renderizar("AdminVoluntarios");
    const dialogo = await abrir(/^Inscrever voluntário$/);

    await userEvent.type(dialogo.getByLabelText(/E-mail da pessoa/), "ninguem@exemplo.com");
    await userEvent.click(dialogo.getByRole("combobox", { name: /Projeto/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Campanha do Agasalho" }));
    await userEvent.click(dialogo.getByRole("button", { name: "Inscrever voluntário" }));

    await esperaInvalido(dialogo, "voluntario-email", "Não existe conta com esse e-mail na plataforma");
    expect(escritas.some((e) => e.operacao === "insert")).toBe(false);
  }, 20_000);

  it("Chave de acesso: chave fora do formato", async () => {
    await renderizar("AdminCodigos");
    const dialogo = await abrir(/^Gerar chave de acesso$/);

    const chave = dialogo.getByLabelText(/^Chave/);
    await userEvent.clear(chave);
    await userEvent.type(chave, "ONG-ABC0-1234");
    await userEvent.click(dialogo.getByRole("button", { name: "Gerar chave de acesso" }));

    await esperaInvalido(dialogo, "codigo-code", /ONG-XXXX-XXXX/);
    await waitFor(() => expect(escritas).toHaveLength(0));
  }, 20_000);
});
