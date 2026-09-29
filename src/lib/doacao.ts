import { TERMOS, VAZIO } from "@/lib/copy";
import { formatCurrency, formatQuantidade } from "@/lib/format";
import { TIPOS_DE_DOACAO } from "@/lib/schemas/admin";

/**
 * Regras de apresentação de uma doação, iguais no painel da ONG, no admin e
 * nos CSVs. Moravam em `pages/admin/_shared-lib.ts`, e as telas da ONG
 * acabaram reescrevendo cada uma do seu jeito ("Confirmada" num CSV,
 * "Recebimento confirmado" no outro; "pix" cru num, "Pix" no outro).
 */

/** Rótulo de situação, do glossário. */
export const situacaoDaDoacao = (status: string | null | undefined) =>
  status === "confirmada" ? TERMOS.confirmada : status === "cancelada" ? TERMOS.naoRecebida : TERMOS.pendente;

type ComDoador = {
  anonima?: boolean | null;
  doador?: { nome?: string | null } | null;
  doador_nome?: string | null;
};

/** Nome de quem doou, respeitando anonimato e o glossário para quem não tem cadastro. */
export const nomeDoDoador = (d: ComDoador) =>
  d.anonima ? TERMOS.anonimo : d.doador?.nome || d.doador_nome || TERMOS.semIdentificacao;

/** Rótulo da forma de doação ("Pix", "Item"); o valor cru do banco nunca vai para a tela. */
export const rotuloDoTipo = (tipo: string | null | undefined) =>
  TIPOS_DE_DOACAO.find((t) => t.valor === tipo)?.rotulo ?? (tipo === "item" ? "Item" : tipo || VAZIO.naoInformado);

type Descritivel = {
  valor?: number | string | null;
  quantidade?: number | string | null;
  necessidade?: { nome: string; unidade?: string | null } | null;
};

/**
 * O que foi doado: "12 caixas de Leite" quando é item de uma necessidade,
 * o valor em reais nos outros casos (inclusive dinheiro para uma necessidade
 * de dinheiro, que não tem quantidade).
 */
export const descreverDoacao = (d: Descritivel) =>
  d.necessidade && d.quantidade !== null && d.quantidade !== undefined
    ? `${formatQuantidade(d.quantidade, d.necessidade.unidade)} de ${d.necessidade.nome}`
    : formatCurrency(Number(d.valor ?? 0));
