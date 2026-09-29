import { z } from "zod";
import { emailSchema } from "@/lib/schemas/auth";

/**
 * Identificação mínima para doar: nome e e-mail, sem senha.
 *
 * O e-mail é por onde a pessoa recebe o comprovante e o aviso de quando a ONG
 * registrar o recebimento.
 */
export const identificacaoDoadorSchema = z.object({
  doador_nome: z
    .string()
    .trim()
    .min(3, "Informe seu nome")
    .max(120, "No máximo 120 caracteres"),
  doador_email: emailSchema,
  anonima: z.boolean().default(false),
});

export const doacaoDinheiroSchema = identificacaoDoadorSchema.extend({
  valor: z
    .number({ invalid_type_error: "Escolha ou digite quanto você quer doar" })
    .positive("O valor precisa ser maior que zero")
    .max(1_000_000, "O valor máximo por doação é R$ 1.000.000,00"),
});

export const doacaoItemSchema = identificacaoDoadorSchema.extend({
  quantidade: z
    .number({ invalid_type_error: "Diga quantos você vai doar" })
    .positive("A quantidade precisa ser maior que zero")
    .max(100_000, "A quantidade máxima por doação é 100.000"),
  forma_entrega: z.enum(["levar", "coleta"], {
    errorMap: () => ({ message: "Escolha como a doação vai chegar até a ONG" }),
  }),
});

export type IdentificacaoDoador = z.infer<typeof identificacaoDoadorSchema>;
export type DoacaoDinheiroInput = z.infer<typeof doacaoDinheiroSchema>;
export type DoacaoItemInput = z.infer<typeof doacaoItemSchema>;

/** Valores sugeridos em reais, para decidir em um clique. */
export const VALORES_SUGERIDOS = [20, 50, 100] as const;
