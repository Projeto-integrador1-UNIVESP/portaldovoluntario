/**
 * Causas em que uma ONG ou um projeto atuam. Lista fechada: `projetos.causa`
 * é texto livre no banco e filtrado por ILIKE, então texto livre no formulário
 * fragmentava os filtros ("Educacao", "educação", "Educação e cultura").
 * Ordem alfabética, que é como aparecem nos chips.
 */
export const CAUSAS = [
  "Alimentação",
  "Animais",
  "Assistência social",
  "Crianças e adolescentes",
  "Cultura",
  "Educação",
  "Meio ambiente",
  "Pessoas idosas",
  "População em situação de rua",
  "Saúde",
] as const;

export type Causa = (typeof CAUSAS)[number];

export const ehCausa = (valor: unknown): valor is Causa =>
  typeof valor === "string" && (CAUSAS as readonly string[]).includes(valor);
