import alimentos640 from "@/assets/capas/alimentos-640.webp";
import alimentos1280 from "@/assets/capas/alimentos-1280.webp";
import roupas640 from "@/assets/capas/roupas-640.webp";
import roupas1280 from "@/assets/capas/roupas-1280.webp";
import higiene640 from "@/assets/capas/higiene-640.webp";
import higiene1280 from "@/assets/capas/higiene-1280.webp";
import inverno640 from "@/assets/capas/inverno-640.webp";
import inverno1280 from "@/assets/capas/inverno-1280.webp";
import escolar640 from "@/assets/capas/escolar-640.webp";
import escolar1280 from "@/assets/capas/escolar-1280.webp";
import brinquedos640 from "@/assets/capas/brinquedos-640.webp";
import brinquedos1280 from "@/assets/capas/brinquedos-1280.webp";
import moveis640 from "@/assets/capas/moveis-640.webp";
import moveis1280 from "@/assets/capas/moveis-1280.webp";
import medicamentos640 from "@/assets/capas/medicamentos-640.webp";
import medicamentos1280 from "@/assets/capas/medicamentos-1280.webp";
import outros640 from "@/assets/capas/outros-640.webp";
import outros1280 from "@/assets/capas/outros-1280.webp";
import generica640 from "@/assets/capas/generica-640.webp";
import generica1280 from "@/assets/capas/generica-1280.webp";

/**
 * Fotografia de capa por causa.
 *
 * O produto não tinha nenhuma foto própria, e as referências do setor (Unibes,
 * Amigos do Bem, Porquinho) são todas fotográficas — fotografia ganha de
 * ilustração quando o assunto é confiança. As fotos daqui são de banco, com
 * licença livre; os créditos e o critério de curadoria estão em
 * `src/assets/capas/CREDITOS.md`.
 *
 * Elas são ILUSTRATIVAS. Nenhuma é foto da ONG que está na tela, e a `Capa`
 * marca isso visualmente — ver `Capa.tsx`.
 */

export type ChaveDeCapa =
  | "alimentos"
  | "roupas"
  | "higiene"
  | "inverno"
  | "escolar"
  | "brinquedos"
  | "moveis"
  | "medicamentos"
  | "outros"
  | "generica"
  | "animais"
  | "idosos";

export type CapaDeCausa = {
  /** Largura menor. Vira o `src` para quem ignorar o `srcSet`. */
  src: string;
  srcSet: string;
  /** Qual foto saiu. Existe para o teste e para depurar, não para estilizar. */
  chave: ChaveDeCapa;
};

const ARQUIVOS: Record<ChaveDeCapa, { p640: string; p1280: string }> = {
  alimentos: { p640: alimentos640, p1280: alimentos1280 },
  roupas: { p640: roupas640, p1280: roupas1280 },
  higiene: { p640: higiene640, p1280: higiene1280 },
  inverno: { p640: inverno640, p1280: inverno1280 },
  escolar: { p640: escolar640, p1280: escolar1280 },
  brinquedos: { p640: brinquedos640, p1280: brinquedos1280 },
  moveis: { p640: moveis640, p1280: moveis1280 },
  medicamentos: { p640: medicamentos640, p1280: medicamentos1280 },
  outros: { p640: outros640, p1280: outros1280 },
  generica: { p640: generica640, p1280: generica1280 },
  // TROCAR: animais-640.webp e animais-1280.webp quando a frente 1 entregar.
  animais: { p640: generica640, p1280: generica1280 },
  // TROCAR: idosos-640.webp e idosos-1280.webp quando a frente 1 entregar.
  idosos: { p640: generica640, p1280: generica1280 },
};

/**
 * Descrição da foto, para o dia em que alguém precisar de um `alt` de verdade.
 * A `Capa` não usa: lá a foto é decorativa e o `alt` fica vazio.
 */
export const DESCRICOES: Record<ChaveDeCapa, string> = {
  alimentos: "Mãos de voluntários separando alimentos não perecíveis sobre uma mesa",
  roupas: "Pilha de calças jeans dobradas nos braços de uma pessoa",
  higiene: "Sabonete, escovas e frascos de higiene organizados sobre uma superfície clara",
  inverno: "Pilha de cobertores e mantas de tricô dobrados",
  escolar: "Lápis, canetas e tesouras em baldes sobre uma prateleira",
  brinquedos: "Blocos de madeira com números empilhados",
  moveis: "Prateleiras de cozinha com panelas, louça e utensílios",
  medicamentos: "Estojo de primeiros socorros aberto, com medicamentos organizados",
  outros: "Caixotes de madeira cheios de itens doados",
  generica: "Sacolas de papel preparadas para distribuição",
  // TROCAR: descrever as fotos novas quando a frente 1 entregar.
  animais: "Sacolas de papel preparadas para distribuição",
  idosos: "Sacolas de papel preparadas para distribuição",
};

/**
 * Sinônimos por radical, não por palavra inteira.
 *
 * Duas listas chegam aqui: `CATEGORIAS` (`schemas/necessidade.ts`), do
 * formulário de necessidade, e `CAUSAS` (`constants/causas.ts`), do cadastro
 * de projeto e de ONG. Antes delas `projetos.causa` era texto livre, e o banco
 * ainda guarda variações ("alimentação", "doação de alimentos"). Casar só com
 * as listas fechadas jogaria o legado no padrão gerado.
 *
 * Radical em vez de tabela de sinônimos porque uma entrada resolve a família
 * inteira: "aliment" pega "Alimentos", "alimentação", "doação de alimentos" e
 * "segurança alimentar" de uma vez. A ordem importa: vence o primeiro radical
 * desta lista que aparecer no texto.
 */
const RADICAIS: ReadonlyArray<readonly [string, ChaveDeCapa]> = [
  ["aliment", "alimentos"],
  ["comida", "alimentos"],
  ["cesta", "alimentos"],
  ["merenda", "alimentos"],
  ["fome", "alimentos"],
  ["nutri", "alimentos"],
  ["roupa", "roupas"],
  ["calcad", "roupas"],
  ["sapat", "roupas"],
  ["vestuari", "roupas"],
  ["higien", "higiene"],
  ["limpez", "higiene"],
  ["invern", "inverno"],
  ["agasalh", "inverno"],
  ["cobertor", "inverno"],
  ["frio", "inverno"],
  ["escol", "escolar"],
  ["educa", "escolar"],
  ["alfabetiza", "escolar"],
  ["brinqued", "brinquedos"],
  ["ludic", "brinquedos"],
  // "Crianças e adolescentes" e "População em situação de rua" são causas que o
  // cadastro usa e que caíam no padrão gerado. A foto de blocos serve à
  // primeira e a de cobertores à segunda sem inventar nada: a etiqueta
  // "Imagem ilustrativa" continua dizendo que a foto não é daquela ONG.
  ["crianc", "brinquedos"],
  ["adolescen", "brinquedos"],
  ["infan", "brinquedos"],
  ["situacao de rua", "inverno"],
  ["morador de rua", "inverno"],
  ["sem-teto", "inverno"],
  ["sem teto", "inverno"],
  ["movei", "moveis"],
  ["mobili", "moveis"],
  ["utensili", "moveis"],
  ["moradia", "moveis"],
  ["habita", "moveis"],
  ["medicament", "medicamentos"],
  ["remedi", "medicamentos"],
  ["farmac", "medicamentos"],
  ["saude", "medicamentos"],
  ["animai", "animais"],
  ["animal", "animais"],
  ["idoso", "idosos"],
  ["idosa", "idosos"],
  ["terceira idade", "idosos"],
  // "Cultura" fica com a foto de material escolar: no acervo é a que mais
  // perto chega de leitura e oficina, e a etiqueta avisa que é ilustrativa.
  ["cultur", "escolar"],
  // Causas amplas, sem fotografia honesta no acervo: a genérica (sacolas
  // fechadas) é neutra de propósito e serve melhor que inventar uma cena.
  ["assistenc", "generica"],
  ["ambient", "generica"],
  ["sustentab", "generica"],
];

/** Minúscula, sem acento, sem espaço sobrando. "Higiene e limpeza" → "higiene e limpeza". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve um texto de causa numa chave de foto.
 *
 * "Outros" é a categoria do formulário e tem foto própria, mas só quando o
 * texto é mesmo "outros". Causa desconhecida devolve nulo, e a `Capa` cai no
 * padrão gerado por identificador.
 */
function resolverUma(texto: string): ChaveDeCapa | null {
  const t = normalizar(texto);
  if (!t) return null;
  if (t === "outros" || t === "outro") return "outros";
  for (const [radical, chave] of RADICAIS) {
    if (t.includes(radical)) return chave;
  }
  return null;
}

/**
 * Foto para uma causa.
 *
 * Aceita array porque `ongs.causas` é `TEXT[]`: vence a primeira entrada que
 * resolver.
 *
 * Causa desconhecida devolve nulo, e não a foto genérica. Quando várias
 * organizações sem categoria aparecem lado a lado, a mesma foto repetida lê
 * como defeito; o padrão gerado por identificador dá uma capa diferente para
 * cada uma. A genérica só entra por escolha explícita da lista de radicais.
 */
export function capaDaCausa(causa?: string | string[] | null): CapaDeCausa | null {
  const candidatos = Array.isArray(causa) ? causa : [causa];

  for (const c of candidatos) {
    if (typeof c !== "string") continue;
    const chave = resolverUma(c);
    if (chave) {
      const { p640, p1280 } = ARQUIVOS[chave];
      return { src: p640, srcSet: `${p640} 640w, ${p1280} 1280w`, chave };
    }
  }

  return null;
}

/**
 * `sizes` padrão das capas.
 *
 * Declara menos do que a capa costuma ocupar, de propósito. A foto é
 * decorativa e fica atrás de um véu escuro, então meia resolução não aparece —
 * e num celular em 4G isso é a diferença entre baixar o arquivo de 43 KB e o
 * de 75 KB por card. Quem usar a capa como herói de página inteira e quiser a
 * versão grande passa o próprio `sizes` para a `Capa`.
 */
export const SIZES_PADRAO = "(max-width: 768px) 55vw, 420px";
