import { z } from "zod";
import { emailSchema, senhaSchema } from "@/lib/schemas/auth";
import { SIGLAS_UF } from "@/lib/constants/ufs";
import { onlyDigits } from "@/lib/validators";

const nomeSchema = z
  .string()
  .trim()
  .min(3, "Informe seu nome completo")
  .max(80, "No máximo 80 caracteres");

const aceiteSchema = z.literal(true, {
  errorMap: () => ({ message: "É preciso aceitar os Termos e a Política de Privacidade" }),
});

/**
 * Cadastro de doador: três campos obrigatórios.
 *
 * Antes eram nove, incluindo data de nascimento, CEP e logradouro — dados sem
 * finalidade no momento do cadastro, o que contraria a minimização da LGPD.
 * Telefone e endereço passam a ser pedidos só quando forem necessários, por
 * exemplo ao agendar a coleta de uma doação de itens.
 */
export const cadastroDoadorSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema,
  aceite: aceiteSchema,
});

const telefoneSchema = z
  .string()
  .refine((v) => [10, 11].includes(onlyDigits(v).length), "Telefone deve ter DDD e 8 ou 9 dígitos");

const cepSchema = z
  .string()
  .refine((v) => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos");

/**
 * Cadastro de ONG. Mantém os campos de endereço porque a Edge Function
 * `ong-signup` os exige e valida no servidor; reduzi-los aqui quebraria o
 * cadastro sem alterar aquele contrato.
 */
export const cadastroOngSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema,
  nome_ong: z.string().trim().min(3, "Informe o nome da ONG").max(80, "No máximo 80 caracteres"),
  codigo_ong: z.string().trim().min(1, "Informe a chave de acesso"),
  telefone: telefoneSchema,
  data_nascimento: z
    .string()
    .min(1, "Informe a data de nascimento")
    .refine((v) => v <= new Date().toISOString().slice(0, 10), "A data não pode ser no futuro"),
  cep: cepSchema,
  logradouro: z.string().trim().min(3, "Informe o logradouro").max(120, "No máximo 120 caracteres"),
  cidade: z.string().trim().min(2, "Informe a cidade").max(80, "No máximo 80 caracteres"),
  estado: z.enum(SIGLAS_UF as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "Selecione o estado" }),
  }),
  aceite: aceiteSchema,
});

export type CadastroDoadorInput = z.infer<typeof cadastroDoadorSchema>;
export type CadastroOngInput = z.infer<typeof cadastroOngSchema>;
