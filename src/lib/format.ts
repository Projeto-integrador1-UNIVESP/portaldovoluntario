import { onlyDigits } from "@/lib/validators";

/** Formata um número como moeda brasileira: 1234.5 -> "R$ 1.234,50" */
export const formatCurrency = (value: number | null | undefined) => {
  const numero = value === null || value === undefined || Number.isNaN(value) ? 0 : value;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte a entrada em Date.
 *
 * Uma string "YYYY-MM-DD" (como as colunas `date` do Postgres devolvem) é lida
 * como data **local**. O parse nativo do JS a trataria como meia-noite UTC, o
 * que em qualquer fuso a oeste de Greenwich exibe o dia anterior. Era por isso
 * que um projeto começando em 2026-05-01 aparecia como 30/04.
 */
const paraData = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  if (SO_DATA.test(value)) {
    const [ano, mes, dia] = value.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }
  return new Date(value);
};

/** Formata uma data (ISO ou Date) como dd/mm/aaaa. Retorna "" para entrada vazia/inválida. */
export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const date = paraData(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
};

/** Formata data e hora como dd/mm/aaaa hh:mm. */
export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const date = paraData(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Máscara de telefone: 11987654321 -> "(11) 98765-4321"; 1132654321 -> "(11) 3265-4321" */
export const formatPhone = (value: string) => {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 2) return digits;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const breakpoint = rest.length > 8 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, breakpoint)}-${rest.slice(breakpoint)}`;
};

/** Máscara de CEP: 01310100 -> "01310-100" */
export const formatCep = (value: string) => {
  const digits = onlyDigits(value, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

/** Máscara de CNPJ: 12345678000199 -> "12.345.678/0001-99" */
export const formatCnpj = (value: string) => {
  const d = onlyDigits(value, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/**
 * Máscara de moeda para digitação: o usuário digita centavos da direita para a esquerda.
 * "" -> "R$ 0,00" | "5" -> "R$ 0,05" | "12345" -> "R$ 123,45"
 */
export const maskCurrency = (value: string) => {
  const digits = onlyDigits(value, 11);
  const cents = Number(digits || "0");
  return formatCurrency(cents / 100);
};

/** Converte o texto de um campo com máscara de moeda para número: "R$ 123,45" -> 123.45 */
export const parseCurrency = (value: string) => {
  const digits = onlyDigits(value, 11);
  return Number(digits || "0") / 100;
};

/**
 * Dias restantes até uma data (contagem por dia de calendário, ignorando horas).
 * Retorna null se não houver prazo; negativo quando o prazo já passou.
 *
 * Uma string "YYYY-MM-DD" é lida como data local, não como meia-noite UTC: o
 * parse nativo do JS a trata como UTC, o que adiantaria o prazo em um dia em
 * qualquer fuso a oeste de Greenwich (o caso do Brasil).
 */
export const diasRestantes = (prazo: string | Date | null | undefined) => {
  if (!prazo) return null;

  let alvo: number;
  if (typeof prazo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
    const [ano, mes, dia] = prazo.split("-").map(Number);
    alvo = Date.UTC(ano, mes - 1, dia);
  } else {
    const date = prazo instanceof Date ? prazo : new Date(prazo);
    if (Number.isNaN(date.getTime())) return null;
    alvo = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const agora = new Date();
  const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return Math.round((alvo - hoje) / 86_400_000);
};

/** Texto humano para o prazo: "faltam 7 dias", "último dia", "encerrado". */
export const formatPrazo = (prazo: string | Date | null | undefined) => {
  const dias = diasRestantes(prazo);
  if (dias === null) return "";
  if (dias < 0) return "encerrado";
  if (dias === 0) return "último dia";
  if (dias === 1) return "falta 1 dia";
  return `faltam ${dias} dias`;
};

/** Percentual de progresso limitado a 0–100, tolerante a meta zero/ausente. */
export const progressoPercent = (arrecadado: number, meta: number) => {
  if (!meta || meta <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((arrecadado / meta) * 100)));
};
