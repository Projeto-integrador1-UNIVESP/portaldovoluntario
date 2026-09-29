import { z } from "zod";
import { hojeLocal } from "@/lib/format";
import "@/lib/zodPtBr";
import { emailSchema, senhaSchema } from "@/lib/schemas/auth";
import { SIGLAS_UF } from "@/lib/constants/ufs";
import { onlyDigits } from "@/lib/validators";
import { MENSAGENS } from "@/lib/copy";

const nomeSchema = z
  .string()
  .trim()
  .min(3, "Informe seu nome completo")
  .max(80, MENSAGENS.maximo(80));

const aceiteSchema = z.literal(true, {
  errorMap: () => ({ message: "É preciso aceitar os Termos e a Política de Privacidade" }),
});

/**
 * Cadastro de doador: três campos obrigatórios.
 *
 * Antes eram nove, incluindo data de nascimento, CEP e logradouro. São dados
 * sem finalidade no momento do cadastro, o que contraria a minimização da LGPD.
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
  .refine((v) => [10, 11].includes(onlyDigits(v).length), MENSAGENS.telefone);

const cepSchema = z
  .string()
  .refine((v) => onlyDigits(v).length === 8, MENSAGENS.cep);

/**
 * Cadastro de ONG. Mantém os campos de endereço porque a Edge Function
 * `ong-signup` os exige e valida no servidor; reduzi-los aqui quebraria o
 * cadastro sem alterar aquele contrato.
 */
export const cadastroOngSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema,
  nome_ong: z.string().trim().min(3, MENSAGENS.obrigatorio("o nome da ONG")).max(80, MENSAGENS.maximo(80)),
  codigo_ong: z.string().trim().min(1, MENSAGENS.obrigatorio("a chave de acesso")),
  telefone: telefoneSchema,
  data_nascimento: z
    .string()
    .min(1, MENSAGENS.obrigatorio("a data de nascimento"))
    .refine((v) => v <= hojeLocal(), MENSAGENS.dataNoFuturo),
  cep: cepSchema,
  logradouro: z.string().trim().min(3, MENSAGENS.obrigatorio("o logradouro")).max(120, MENSAGENS.maximo(120)),
  cidade: z.string().trim().min(2, MENSAGENS.obrigatorio("a cidade")).max(80, MENSAGENS.maximo(80)),
  estado: z.enum(SIGLAS_UF as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "Selecione o estado" }),
  }),
  aceite: aceiteSchema,
});

export type CadastroDoadorInput = z.infer<typeof cadastroDoadorSchema>;
export type CadastroOngInput = z.infer<typeof cadastroOngSchema>;
