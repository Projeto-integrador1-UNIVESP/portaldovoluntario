/**
 * Funções e o hook de paginação do painel administrativo.
 *
 * Ficam fora do `_shared.tsx` porque um módulo que exporta componentes e também
 * funções perde o fast refresh do Vite (`react-refresh/only-export-components`).
 */
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import type { ZodError, ZodTypeAny, output } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TERMOS, VAZIO } from "@/lib/copy";
import { ErroDeValidacao, mensagemAmigavel } from "@/lib/erros";
import { exportToCsv } from "@/lib/exportCsv";

export { descreverDoacao, nomeDoDoador, rotuloDoTipo, situacaoDaDoacao } from "@/lib/doacao";

/** Tamanho de página das listas que podem crescer (doações, usuários, ...). */
export const POR_PAGINA = 25;

/**
 * Executa uma consulta de contagem (`count: "exact", head: true`) e devolve só o
 * número. O servidor não manda linha nenhuma nesse modo.
 */
export const contarLinhas = async (
  consulta: PromiseLike<{ count: number | null; error: { message: string } | null }>,
) => {
  const { count, error } = await consulta;
  if (error) throw new Error(error.message);
  return count ?? 0;
};

/**
 * Recua para a última página existente quando a atual deixa de existir, o que
 * acontece ao excluir o único registro da última página. Sem isso a tela ficaria
 * mostrando o estado vazio com uma paginação dizendo que há registros.
 */
export function useCorrigirPaginaVazia({
  pagina, total, carregando, aoCorrigir, porPagina = POR_PAGINA,
}: {
  pagina: number;
  total: number;
  carregando: boolean;
  aoCorrigir: (pagina: number) => void;
  porPagina?: number;
}) {
  useEffect(() => {
    if (carregando || total === 0) return;
    const ultima = Math.max(0, Math.ceil(total / porPagina) - 1);
    if (pagina > ultima) aoCorrigir(ultima);
  }, [pagina, total, carregando, porPagina, aoCorrigir]);
}

/**
 * Mensagem de erro para quem está do outro lado da tela.
 *
 * Delega ao tradutor do produto: os casos do Supabase viram português e um
 * `ErroAmigavel` (ou `ErroDeValidacao`) passa intacto. Antes esta função
 * engolia a mensagem escrita para o usuário e devolvia o texto padrão.
 */
export const mensagemDeErro = (erro: unknown, padrao: string) => mensagemAmigavel(erro, padrao);

/** Primeira mensagem de cada campo, na ordem em que o schema declara os campos. */
export function errosPorCampo(erro: ZodError): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const problema of erro.issues) {
    const campo = String(problema.path[0] ?? "");
    if (!(campo in erros)) erros[campo] = problema.message;
  }
  return erros;
}

/** Leva o foco a um campo. Chame depois de um `flushSync`, para o campo já estar visível. */
export function focarCampo(id: string) {
  document.getElementById(id)?.focus();
}

/**
 * Validação de um formulário do painel: `safeParse` antes da mutation, erro
 * por campo para o `Campo`, foco no primeiro campo com problema e o mesmo
 * tratamento para um erro de campo vindo do servidor (`ErroDeValidacao`).
 *
 * Os ids dos controles seguem `${prefixo}-${campo}`.
 */
export function useValidacao<T extends ZodTypeAny>(
  schema: T,
  prefixo: string,
  opcoes: { aoFalhar?: (primeiroCampo: string) => void } = {},
) {
  const [erros, setErros] = useState<Record<string, string>>({});
  const { aoFalhar } = opcoes;

  // `flushSync` aplica o estado (e a troca de aba, quando há) antes do foco:
  // sem isso o campo ainda estaria escondido e o `focus()` seria ignorado.
  const apontar = useCallback(
    (novos: Record<string, string>) => {
      const primeiro = Object.keys(novos)[0];
      flushSync(() => {
        setErros(novos);
        if (primeiro) aoFalhar?.(primeiro);
      });
      if (primeiro) focarCampo(`${prefixo}-${primeiro}`);
    },
    [aoFalhar, prefixo],
  );

  const validar = useCallback(
    (valores: unknown): output<T> | null => {
      const resultado = schema.safeParse(valores);
      if (resultado.success) {
        setErros({});
        return resultado.data as output<T>;
      }
      apontar(errosPorCampo(resultado.error));
      return null;
    },
    [schema, apontar],
  );

  const erroDoServidor = useCallback(
    (erro: unknown, padrao: string) => {
      if (erro instanceof ErroDeValidacao && erro.campo) {
        apontar({ [erro.campo]: erro.message });
        return;
      }
      toast.error(mensagemDeErro(erro, padrao));
    },
    [apontar],
  );

  const limpar = useCallback(() => setErros({}), []);

  return { erros, validar, erroDoServidor, limpar };
}

/**
 * Erro de uma edge function. A função escreve o motivo no corpo da resposta e
 * o supabase-js entrega só "Edge Function returned a non-2xx status code"; sem
 * ler o corpo, um e-mail já cadastrado viraria "Não foi possível criar".
 */
export async function erroDaFunction(erro: unknown, resposta: unknown): Promise<Error> {
  let texto = (resposta as { error?: string } | null)?.error ?? "";
  if (!texto) {
    const contexto = (erro as { context?: { json?: () => Promise<unknown> } } | null)?.context;
    if (contexto && typeof contexto.json === "function") {
      try {
        texto = ((await contexto.json()) as { error?: string } | null)?.error ?? "";
      } catch {
        /* corpo não é JSON */
      }
    }
  }
  if (!texto && erro instanceof Error) texto = erro.message;
  if (/already|registered|exists/i.test(texto)) {
    return new ErroDeValidacao("Já existe uma conta com esse e-mail", "email");
  }
  return new Error(texto);
}

/**
 * Baixa o CSV de uma consulta com teto. O `exportToCsv` já avisa que baixou;
 * quando a consulta foi cortada pelo teto, o aviso é este, um só, dizendo
 * quantas linhas saíram, para ninguém achar que o arquivo é o total.
 */
export function baixarCsv(nome: string, linhas: Record<string, unknown>[], total: number) {
  const cortado = linhas.length < total;
  exportToCsv(nome, linhas, { silencioso: cortado });
  if (cortado) {
    toast.success(
      `Arquivo ${nome} baixado com as ${linhas.length.toLocaleString("pt-BR")} linhas mais recentes de ${total.toLocaleString("pt-BR")}`,
    );
  }
}

/** `true` quando o erro é violação de unicidade, o caso de colisão de código. */
export const ehCodigoDuplicado = (erro: unknown) => {
  const texto = (erro instanceof Error ? erro.message : String(erro ?? "")).toLowerCase();
  return texto.includes("duplicate key") || texto.includes("already exists");
};

/**
 * Alfabeto sem os pares que se confundem quando alguém lê o código por telefone
 * ou copia de um print: sem O/0 e sem I/1. São 32 símbolos, divisor exato de
 * 256, então o resto do byte não enviesa nenhuma letra.
 */
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const TAMANHO_DO_BLOCO = 4;

/**
 * Gera a chave de acesso de uma ONG.
 *
 * A versão anterior usava `Math.random()`, que é previsível: conhecendo algumas
 * saídas dá para reconstruir o estado do gerador e prever as próximas. Esta
 * chave dá a alguém o controle de uma organização na plataforma, então ela vem
 * do gerador criptográfico do navegador.
 */
export function gerarCodigoDeAcesso() {
  const bytes = new Uint8Array(TAMANHO_DO_BLOCO * 2);
  crypto.getRandomValues(bytes);
  const simbolos = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]);
  return `ONG-${simbolos.slice(0, TAMANHO_DO_BLOCO).join("")}-${simbolos.slice(TAMANHO_DO_BLOCO).join("")}`;
}

/**
 * Converte a data do campo de validade no último instante daquele dia, no fuso
 * de quem está usando. `new Date("2026-10-02").toISOString()` daria meia-noite
 * UTC, que no Brasil é 21h do dia 1º: o código expirava um dia antes do que a
 * tela prometia.
 */
export function fimDoDiaLocal(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 23, 59, 59, 999).toISOString();
}

/**
 * Converte um instante do banco (`timestamptz`) no formato que o
 * `<input type="datetime-local">` espera: data e hora **locais**, sem fuso.
 *
 * A tela de eventos usava `toISOString().slice(0, 16)`, que entrega a hora em
 * UTC. No Brasil isso mostrava o evento três horas mais cedo do que a tabela
 * ao lado, e salvar de novo deslocava o horário mais uma vez.
 */
export const paraCampoDeDataHora = (valor: string | null | undefined) => {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return (
    `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
    `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
  );
};

/** Caminho de volta: o valor do campo é hora local e vai para o banco em UTC. */
export const deCampoDeDataHora = (valor: string) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) throw new Error("Informe uma data e hora válidas.");
  return data.toISOString();
};

/** Colunas que as telas de doação precisam, iguais nas duas. */
export const COLUNAS_DA_DOACAO =
  "id, valor, quantidade, status, tipo_doacao, data_doacao, confirmada_em, doador_nome, doador_email, anonima, forma_entrega, id_usuario, id_ong, id_projeto, id_necessidade";

export type DoacaoDetalhada = {
  id: string;
  valor: number;
  quantidade: number | null;
  status: string;
  tipo_doacao: string | null;
  data_doacao: string;
  confirmada_em: string | null;
  anonima: boolean;
  forma_entrega: string | null;
  doador_nome: string | null;
  doador_email: string | null;
  ong: { nome: string } | null;
  doador: { nome: string; email: string; telefone: string | null; cidade: string | null; estado: string | null } | null;
  necessidade: { nome: string; unidade: string | null } | null;
};

/**
 * Junta as doações com ONG, perfil e necessidade em três consultas por id, em
 * vez do embed do PostgREST, que devolve `null` silenciosamente quando a RLS
 * não alcança a tabela relacionada.
 */
export const doacoesComRelacionados = async (
  linhas: Record<string, unknown>[],
): Promise<DoacaoDetalhada[]> => {
  const ids = (chave: string) =>
    [...new Set(linhas.map((l) => l[chave]).filter(Boolean))] as string[];

  const idsOngs = ids("id_ong");
  const idsUsuarios = ids("id_usuario");
  const idsNecessidades = ids("id_necessidade");

  const [ongs, perfis, necessidades] = await Promise.all([
    idsOngs.length
      ? supabase.from("ongs").select("id, nome").in("id", idsOngs)
      : Promise.resolve({ data: [] }),
    idsUsuarios.length
      ? supabase
          .from("profiles")
          .select("user_id, nome, email, telefone, cidade, estado")
          .in("user_id", idsUsuarios)
      : Promise.resolve({ data: [] }),
    idsNecessidades.length
      ? supabase.from("necessidades").select("id, nome, unidade").in("id", idsNecessidades)
      : Promise.resolve({ data: [] }),
  ]);

  const porOng = new Map((ongs.data ?? []).map((o) => [o.id, o]));
  const porUsuario = new Map((perfis.data ?? []).map((p) => [p.user_id, p]));
  const porNecessidade = new Map((necessidades.data ?? []).map((n) => [n.id, n]));

  return linhas.map((l) => ({
    ...(l as unknown as DoacaoDetalhada),
    valor: Number(l.valor ?? 0),
    ong: porOng.get(l.id_ong as string) ?? null,
    doador: l.id_usuario ? porUsuario.get(l.id_usuario as string) ?? null : null,
    necessidade: l.id_necessidade ? porNecessidade.get(l.id_necessidade as string) ?? null : null,
  }));
};

/** Dias inteiros desde um instante. */
export const diasDesde = (instante: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(instante).getTime()) / 86_400_000));

