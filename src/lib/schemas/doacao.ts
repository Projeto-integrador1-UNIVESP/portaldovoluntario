import { z } from "zod";
import "@/lib/zodPtBr";
import { MENSAGENS } from "@/lib/copy";

/**
 * Identificação mínima para doar: nome e e-mail, sem senha.
 *
 * O e-mail é por onde a pessoa recebe o comprovante e o aviso de quando a ONG
 * registrar o recebimento. O schema do e-mail é próprio, e não o do login:
 * o fluxo de doação não depende das regras de autenticação.
 */
export const identificacaoDoadorSchema = z.object({
  doador_nome: z
    .string()
    .trim()
    .min(3, "Informe seu nome")
    .max(120, MENSAGENS.maximo(120)),
  doador_email: z.string().trim().min(1, "Informe seu e-mail").email(MENSAGENS.email),
  anonima: z.boolean().default(false),
});

export const valorSchema = z
  .number({
    required_error: "Escolha ou digite quanto você quer doar",
    invalid_type_error: "Escolha ou digite quanto você quer doar",
  })
  .positive(MENSAGENS.valorPositivo)
  .max(1_000_000, "O valor máximo por doação é R$ 1.000.000,00");

const quantidadeSchema = z
  .number({ required_error: "Diga quantos você vai doar", invalid_type_error: "Diga quantos você vai doar" })
  .positive(MENSAGENS.quantidadePositiva)
  .max(100_000, "A quantidade máxima por doação é 100.000");

export const doacaoDinheiroSchema = identificacaoDoadorSchema.extend({
  valor: valorSchema,
});

export const doacaoItemSchema = identificacaoDoadorSchema.extend({
  quantidade: quantidadeSchema,
  forma_entrega: z.enum(["levar", "coleta"], {
    errorMap: () => ({ message: "Escolha como a doação vai chegar até a ONG" }),
  }),
});

/** Unidades que aceitam fração. Toda outra unidade é contável (un, caixa, par). */
export const UNIDADES_FRACIONADAS = ["kg", "L"] as const;

export const unidadeAceitaFracao = (unidade?: string | null) =>
  (UNIDADES_FRACIONADAS as readonly string[]).includes(unidade ?? "");

/**
 * Schema de item ajustado à unidade da necessidade: "3,5 caixas" não existe,
 * e a coluna `doacoes.quantidade` guarda duas casas, então kg e L param aí.
 */
export const doacaoItemSchemaPara = (unidade?: string | null) =>
  unidadeAceitaFracao(unidade)
    ? doacaoItemSchema.extend({
        quantidade: quantidadeSchema.multipleOf(0.01, "Use no máximo duas casas decimais"),
      })
    : doacaoItemSchema.extend({
        quantidade: quantidadeSchema.int("Informe um número inteiro de itens"),
      });

/** Doação para a ONG sem projeto: só o valor, porque quem doa está logado. */
export const doacaoAvulsaSchema = z.object({
  valor: valorSchema,
});

export type IdentificacaoDoador = z.infer<typeof identificacaoDoadorSchema>;
export type DoacaoDinheiroInput = z.infer<typeof doacaoDinheiroSchema>;
export type DoacaoItemInput = z.infer<typeof doacaoItemSchema>;
export type DoacaoAvulsaInput = z.infer<typeof doacaoAvulsaSchema>;

/** Valores sugeridos em reais, para decidir em um clique. */
export const VALORES_SUGERIDOS = [20, 50, 100] as const;
