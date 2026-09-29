import { z } from "zod";
import "@/lib/zodPtBr";
import { MENSAGENS } from "@/lib/copy";
import { parseCurrency, hojeLocal } from "@/lib/format";
import { chavePixPareceValida } from "@/lib/pix";
import { emailSchema, senhaSchema } from "@/lib/schemas/auth";
import {
  isValidCep, isValidCnpj, isValidPhone, normalizeUrl, onlyDigits,
} from "@/lib/validators";

/**
 * Schemas dos formulários do painel administrativo, um por diálogo.
 *
 * Antes cada tela validava com `throw new Error` dentro da mutation, e a
 * mensagem se perdia no caminho: o toast dizia "Não foi possível salvar". Aqui
 * a validação acontece antes da mutation, campo a campo, com as mensagens do
 * glossário, e a tela mostra cada erro embaixo do campo que o causou.
 *
 * O projeto não está aqui: usa `projetoAdminSchema` de `schemas/projeto.ts`,
 * compartilhado com o painel da ONG.
 */

const texto = z.string().trim();
const obrigatorio = (campo: string) => texto.min(1, MENSAGENS.obrigatorio(campo));
const escolha = (campo: string) => z.string().min(1, MENSAGENS.escolha(campo));

/** Aceita "exemplo.org" (o `normalizeUrl` completa o https://) e vazio. */
const urlOpcional = texto
  .transform(normalizeUrl)
  .pipe(z.union([z.literal(""), z.string().url(MENSAGENS.url)]));

/**
 * E-mail de outra pessoa. O `emailSchema` do login diz "Informe seu e-mail",
 * que não cabe quando o administrador cadastra terceiros; a mensagem de vazio
 * é desta tela e a checagem de formato continua a mesma do resto do produto.
 */
const emailDeTerceiro = (campo: string) =>
  texto.min(1, MENSAGENS.obrigatorio(campo)).pipe(emailSchema);

const emailOpcional = texto.pipe(z.union([z.literal(""), emailSchema]));

const PAPEIS = ["user", "ong", "admin"] as const;
export type Papel = (typeof PAPEIS)[number];

/* ─── ONG ─────────────────────────────────────────────────────────────────── */

/** `conta` e `agencia` são `INT` no banco: sem zero à esquerda e com teto de dígitos. */
export const MAX_DIGITOS_CONTA = 9;
export const MAX_DIGITOS_AGENCIA = 6;

export const ongAdminSchema = z.object({
  nome: texto
    .min(1, MENSAGENS.obrigatorio("o nome da ONG"))
    .min(3, MENSAGENS.minimo(3))
    .max(80, MENSAGENS.maximo(80)),
  cnpj: z.string().refine(isValidCnpj, MENSAGENS.cnpj),
  telefone: z.string().refine(isValidPhone, MENSAGENS.telefone),
  area_atuacao: obrigatorio("a área de atuação").max(80, MENSAGENS.maximo(80)),
  cep: z.string().refine(isValidCep, MENSAGENS.cep),
  cidade: obrigatorio("a cidade").max(80, MENSAGENS.maximo(80)),
  estado: escolha("o estado"),
  logradouro: obrigatorio("o logradouro").max(120, MENSAGENS.maximo(120)),
  pix: texto
    .min(1, MENSAGENS.obrigatorio("a chave Pix"))
    .refine(chavePixPareceValida, MENSAGENS.pix),
  banco: obrigatorio("o banco").max(60, MENSAGENS.maximo(60)),
  agencia: z
    .string()
    .regex(new RegExp(`^[1-9]\\d{0,${MAX_DIGITOS_AGENCIA - 1}}$`), "Informe a agência, só números"),
  conta: z
    .string()
    .regex(
      new RegExp(`^[1-9]\\d{0,${MAX_DIGITOS_CONTA - 1}}$`),
      "Informe a conta, só números e sem o dígito verificador",
    ),
  missao: obrigatorio("a missão").max(500, MENSAGENS.maximo(500)),
  descricao: obrigatorio("a descrição").max(900, MENSAGENS.maximo(900)),
  site: urlOpcional,
  instagram: texto.max(60, MENSAGENS.maximo(60)).transform((v) => v.replace(/^@/, "")),
  logo: urlOpcional,
  capa: urlOpcional,
});

export type OngAdminForm = z.input<typeof ongAdminSchema>;
export type OngAdminInput = z.output<typeof ongAdminSchema>;

/** Mesma ordem do formulário: o primeiro erro do schema é o campo que recebe o foco. */
export const ONG_VAZIA: OngAdminForm = {
  nome: "", cnpj: "", telefone: "", area_atuacao: "",
  cep: "", cidade: "", estado: "", logradouro: "",
  pix: "", banco: "", agencia: "", conta: "",
  missao: "", descricao: "", site: "", instagram: "", logo: "", capa: "",
};

/**
 * Colunas que vão para o banco. O CNPJ e o telefone vão só com dígitos; o site
 * exibe com `formatCnpj` e `formatPhone`. Os dois pares de colunas de imagem
 * recebem o mesmo valor: o site prefere `logo_url`/`capa_url` e as telas
 * antigas só escreviam `img_url`/`img_capa`.
 */
export function payloadDaOng(dados: OngAdminInput) {
  const logo = dados.logo || null;
  const capa = dados.capa || null;
  return {
    nome: dados.nome,
    cnpj: onlyDigits(dados.cnpj, 14),
    area_atuacao: dados.area_atuacao,
    telefone: onlyDigits(dados.telefone, 11),
    cidade: dados.cidade,
    estado: dados.estado,
    cep: onlyDigits(dados.cep, 8),
    logradouro: dados.logradouro,
    pix: dados.pix,
    banco: dados.banco,
    conta: Number(dados.conta),
    agencia: Number(dados.agencia),
    missao: dados.missao,
    descricao: dados.descricao,
    site: dados.site || null,
    instagram: dados.instagram || null,
    logo_url: logo,
    img_url: logo,
    capa_url: capa,
    img_capa: capa,
  };
}

/* ─── Usuário ─────────────────────────────────────────────────────────────── */

export const usuarioAdminSchema = z.object({
  nome: obrigatorio("o nome").max(80, MENSAGENS.maximo(80)),
  telefone: z.string().refine((v) => !onlyDigits(v) || isValidPhone(v), MENSAGENS.telefone),
  cidade: texto.max(80, MENSAGENS.maximo(80)),
  estado: z.string(),
  papel: z.enum(PAPEIS),
});

export type UsuarioAdminForm = z.input<typeof usuarioAdminSchema>;

export const novoUsuarioSchema = z.object({
  nome: obrigatorio("o nome").max(80, MENSAGENS.maximo(80)),
  email: emailDeTerceiro("o e-mail"),
  senha: senhaSchema,
  papel: z.enum(PAPEIS),
});

export type NovoUsuarioForm = z.input<typeof novoUsuarioSchema>;

/* ─── Evento ──────────────────────────────────────────────────────────────── */

export const eventoAdminSchema = z.object({
  nome: obrigatorio("o nome do evento").max(120, MENSAGENS.maximo(120)),
  data_evento: z
    .string()
    .min(1, "Informe a data e a hora")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Informe uma data válida"),
  local: obrigatorio("o local").max(160, MENSAGENS.maximo(160)),
  vagas: texto.regex(/^([1-9]\d*)?$/, "Informe um número inteiro a partir de 1"),
  id_ong: escolha("a ONG responsável"),
  descricao: texto.max(900, MENSAGENS.maximo(900)),
  img_url: urlOpcional,
});

export type EventoAdminForm = z.input<typeof eventoAdminSchema>;

export const EVENTO_VAZIO: EventoAdminForm = {
  nome: "", data_evento: "", local: "", vagas: "", id_ong: "", descricao: "", img_url: "",
};

/* ─── Doação ──────────────────────────────────────────────────────────────── */

export const TIPOS_DE_DOACAO = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "boleto", rotulo: "Boleto" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
] as const;

export const doacaoAdminSchema = z.object({
  id_ong: escolha("a ONG que recebeu"),
  /** Texto com máscara de moeda: quem converte é o `parseCurrency`. */
  valor: z.string().refine((v) => parseCurrency(v) > 0, MENSAGENS.valorPositivo),
  tipo_doacao: z.enum(["pix", "cartao", "boleto", "transferencia", "dinheiro"]),
  doador_nome: texto.max(80, MENSAGENS.maximo(80)),
  doador_email: emailOpcional,
});

export type DoacaoAdminForm = z.input<typeof doacaoAdminSchema>;

export const DOACAO_VAZIA: DoacaoAdminForm = {
  id_ong: "", valor: "", tipo_doacao: "pix", doador_nome: "", doador_email: "",
};

/* ─── Voluntário ──────────────────────────────────────────────────────────── */

export const voluntarioAdminSchema = z.object({
  email: emailDeTerceiro("o e-mail da pessoa"),
  id_projeto: escolha("o projeto"),
  status: z.enum(["aprovado", "pendente"]),
});

export type VoluntarioAdminForm = z.input<typeof voluntarioAdminSchema>;

export const VOLUNTARIO_VAZIO: VoluntarioAdminForm = {
  email: "", id_projeto: "", status: "aprovado",
};

/* ─── Chave de acesso ─────────────────────────────────────────────────────── */

/** Mesmo alfabeto do gerador: sem O, I, 0 e 1, que se confundem ao ler em voz alta. */
export const FORMATO_DA_CHAVE = /^ONG-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

export const codigoAdminSchema = z.object({
  code: texto
    .toUpperCase()
    .regex(FORMATO_DA_CHAVE, "Use o formato ONG-XXXX-XXXX, sem as letras O e I nem os números 0 e 1"),
  nome_ong_sugerido: texto.max(80, MENSAGENS.maximo(80)),
  observacoes: texto.max(200, MENSAGENS.maximo(200)),
  expires_at: z.string().refine((v) => !v || v >= hojeLocal(), "A validade não pode ser no passado"),
});

export type CodigoAdminForm = z.input<typeof codigoAdminSchema>;

export const CODIGO_VAZIO: CodigoAdminForm = {
  code: "", nome_ong_sugerido: "", observacoes: "", expires_at: "",
};
