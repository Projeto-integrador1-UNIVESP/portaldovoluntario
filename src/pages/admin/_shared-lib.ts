/**
 * Funções e o hook de paginação do painel administrativo.
 *
 * Ficam fora do `_shared.tsx` porque um módulo que exporta componentes e também
 * funções perde o fast refresh do Vite (`react-refresh/only-export-components`).
 */
import { useEffect } from "react";

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
 * Recua para a última página existente quando a atual deixa de existir — o que
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
 * O contrato proíbe mostrar o texto técnico do Supabase, que vem em inglês e
 * às vezes cita nome de constraint. Os casos que o painel realmente produz são
 * chave estrangeira e unicidade.
 */
export const mensagemDeErro = (erro: unknown, padrao: string) => {
  const bruto = erro instanceof Error ? erro.message : String(erro ?? "");
  const texto = bruto.toLowerCase();

  if (texto.includes("foreign key") || texto.includes("violates foreign key")) {
    return "Há registros ligados a este item. Remova ou transfira esses registros antes de excluir.";
  }
  if (texto.includes("duplicate key") || texto.includes("already exists") || texto.includes("unique")) {
    return "Já existe um registro com esses dados.";
  }
  if (texto.includes("row-level security") || texto.includes("permission")) {
    return "Sua conta não tem permissão para esta operação.";
  }
  if (texto.includes("failed to fetch") || texto.includes("networkerror")) {
    return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  }
  return padrao;
};

/** `true` quando o erro é violação de unicidade — o caso de colisão de código. */
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
 * UTC, que no Brasil é 21h do dia 1º — o código expirava um dia antes do que a
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
