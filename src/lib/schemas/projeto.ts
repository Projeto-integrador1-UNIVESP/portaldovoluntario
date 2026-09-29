import { z } from "zod";
import "@/lib/zodPtBr";
import { CAUSAS, ehCausa } from "@/lib/constants/causas";
import { MENSAGENS } from "@/lib/copy";

/**
 * Projeto, o mesmo schema para o painel da ONG e para o admin.
 *
 * Antes cada painel tinha o seu: a ONG exigia 20 caracteres de descrição e o
 * admin nenhum; a ONG gravava só `img_url` e não preenchia cidade nem causa,
 * então os projetos dela nem apareciam nos filtros do site.
 */
const urlOpcional = z.union([z.literal(""), z.string().trim().url(MENSAGENS.url)]).optional();

const camposDoProjeto = z.object({
    nome_projeto: z
      .string()
      .trim()
      .min(3, "Dê um nome ao projeto")
      .max(80, MENSAGENS.maximo(80)),
    descricao: z
      .string()
      .trim()
      .min(20, "Explique o projeto em pelo menos 20 caracteres")
      .max(900, MENSAGENS.maximo(900)),
    data_inicio: z.string().min(1, "Informe quando o projeto começa"),
    data_fim: z.string().min(1, "Informe quando o projeto termina"),
    cidade: z.string().trim().max(80, MENSAGENS.maximo(80)).optional(),
    causa: z
      .union([z.literal(""), z.enum(CAUSAS, { errorMap: () => ({ message: "Escolha uma causa da lista" }) })])
      .optional(),
    capa: urlOpcional,
  });

/** O término não pode vir antes do início. Vale para a ONG e para o admin. */
const comDatasEmOrdem = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine((d: { data_inicio?: string; data_fim?: string }) => !d.data_inicio || !d.data_fim || d.data_fim >= d.data_inicio, {
    path: ["data_fim"],
    message: MENSAGENS.dataFimAntesDoInicio,
  });

export const projetoSchema = comDatasEmOrdem(camposDoProjeto);

/** No admin, o projeto também precisa da ONG responsável. */
export const projetoAdminSchema = comDatasEmOrdem(
  camposDoProjeto.extend({ id_ong: z.string().min(1, "Escolha a ONG responsável") }),
);

export type ProjetoInput = z.infer<typeof projetoSchema>;

export const PROJETO_VAZIO: ProjetoInput = {
  nome_projeto: "",
  descricao: "",
  data_inicio: "",
  data_fim: "",
  cidade: "",
  causa: "",
  capa: "",
};

/**
 * Colunas que vão para o banco. O site lê `capa_url` primeiro e as telas
 * antigas só escreviam `img_url`, então as duas recebem o mesmo valor.
 */
export function payloadDoProjeto(dados: ProjetoInput) {
  const capa = dados.capa?.trim() || null;
  return {
    nome_projeto: dados.nome_projeto.trim(),
    descricao: dados.descricao.trim(),
    data_inicio: dados.data_inicio,
    data_fim: dados.data_fim,
    cidade: dados.cidade?.trim() || null,
    causa: dados.causa || null,
    capa_url: capa,
    img_url: capa,
  };
}

/** Preenche o formulário a partir de uma linha do banco. */
export function projetoParaFormulario(linha: {
  nome_projeto: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  cidade?: string | null;
  causa?: string | null;
  capa_url?: string | null;
  img_url?: string | null;
}): ProjetoInput {
  return {
    nome_projeto: linha.nome_projeto ?? "",
    descricao: linha.descricao ?? "",
    data_inicio: linha.data_inicio ?? "",
    data_fim: linha.data_fim ?? "",
    cidade: linha.cidade ?? "",
    causa: ehCausa(linha.causa) ? linha.causa : "",
    capa: linha.capa_url ?? linha.img_url ?? "",
  };
}

export { capaDoProjeto } from "@/lib/capaDoProjeto";
