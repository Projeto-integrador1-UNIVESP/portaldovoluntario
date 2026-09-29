import { z } from "zod";
import "@/lib/zodPtBr";
import { MENSAGENS } from "@/lib/copy";
import { formatCurrency, parseCurrency } from "@/lib/format";
import { onlyDigits } from "@/lib/validators";

export const UNIDADES = ["un", "kg", "L", "caixa", "pacote", "par"] as const;

export const CATEGORIAS = [
  "Alimentos", "Roupas e calçados", "Higiene e limpeza", "Inverno",
  "Material escolar", "Brinquedos", "Móveis e utensílios", "Medicamentos",
  "Outros",
] as const;

export const NIVEIS_DE_URGENCIA = [
  { valor: 1, rotulo: "Baixa" },
  { valor: 2, rotulo: "Média" },
  { valor: 3, rotulo: "Alta" },
] as const;

export type TipoDeNecessidade = "item" | "dinheiro";

/** Um milhão: de reais ou de unidades. Acima disso é erro de digitação. */
export const META_MAXIMA = 1_000_000;

export const rotuloDaUrgencia = (urgencia: number) =>
  NIVEIS_DE_URGENCIA.find((u) => u.valor === urgencia)?.rotulo ?? "Média";

/**
 * A meta em dinheiro é digitada com máscara ("R$ 1.500,00") e guardada como
 * número. Estas duas funções são a ponte, puras para dar para testar: o campo
 * vazio vira `undefined` (o schema pede a meta) e nunca zero.
 */
export function textoDaMeta(meta: number | undefined | null, tipo: TipoDeNecessidade): string {
  if (meta === undefined || meta === null || Number.isNaN(meta)) return "";
  return tipo === "dinheiro" ? formatCurrency(meta) : String(meta);
}

export function metaDoTexto(texto: string, tipo: TipoDeNecessidade): number | undefined {
  if (tipo === "dinheiro") {
    return onlyDigits(texto) === "" ? undefined : parseCurrency(texto);
  }
  const limpo = texto.trim();
  if (limpo === "") return undefined;
  return Number(limpo);
}

export const necessidadeSchema = z
  .object({
    tipo: z.enum(["item", "dinheiro"], {
      errorMap: () => ({ message: "Escolha se é item ou dinheiro" }),
    }),
    nome: z.string().trim().min(3, "Diga o que está faltando").max(120, MENSAGENS.maximo(120)),
    categoria: z.string().optional(),
    unidade: z.string().optional(),
    meta: z.number({
      required_error: MENSAGENS.obrigatorio("a meta"),
      invalid_type_error: MENSAGENS.obrigatorio("a meta"),
    }),
    urgencia: z
      .number({
        required_error: MENSAGENS.escolha("a urgência"),
        invalid_type_error: MENSAGENS.escolha("a urgência"),
      })
      .int(MENSAGENS.escolha("a urgência"))
      .min(1, MENSAGENS.escolha("a urgência"))
      .max(3, MENSAGENS.escolha("a urgência")),
    prazo: z.string().optional(),
    status: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    // Sem unidade, "meta 100" é ambíguo: 100 o quê?
    if (d.tipo === "item" && !d.unidade) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unidade"], message: MENSAGENS.escolha("a unidade") });
    }
    if (d.meta <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meta"],
        message: d.tipo === "dinheiro" ? MENSAGENS.valorPositivo : MENSAGENS.quantidadePositiva,
      });
    } else if (d.meta > META_MAXIMA) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meta"],
        message: `A meta máxima é ${
          d.tipo === "dinheiro" ? formatCurrency(META_MAXIMA) : META_MAXIMA.toLocaleString("pt-BR")
        }`,
      });
    }
  });

export type NecessidadeInput = z.infer<typeof necessidadeSchema>;
