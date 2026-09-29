import { z } from "zod";

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

export const necessidadeSchema = z
  .object({
    tipo: z.enum(["item", "dinheiro"], {
      errorMap: () => ({ message: "Escolha se é item ou dinheiro" }),
    }),
    nome: z.string().trim().min(3, "Diga o que está faltando").max(120, "No máximo 120 caracteres"),
    categoria: z.string().optional(),
    unidade: z.string().optional(),
    meta: z
      .number({ invalid_type_error: "Informe a meta" })
      .positive("A meta precisa ser maior que zero")
      .max(1_000_000, "A meta máxima é 1.000.000"),
    urgencia: z.number().int().min(1).max(3),
    prazo: z.string().optional(),
    status: z.boolean().default(true),
  })
  .refine((d) => d.tipo !== "item" || Boolean(d.unidade), {
    path: ["unidade"],
    message: "Escolha a unidade (o doador precisa saber se são unidades, quilos…)",
  });

export type NecessidadeInput = z.infer<typeof necessidadeSchema>;
