/**
 * A capa a exibir: a coluna nova (`capa_url`), com a antiga (`img_url`) como
 * reserva; texto vazio conta como sem capa.
 *
 * Mora fora de `schemas/projeto.ts` porque a home, que está no chunk inicial,
 * também usa: importar o schema traria o zod junto.
 */
export const capaDoProjeto = (linha: { capa_url?: string | null; img_url?: string | null }) =>
  linha.capa_url || linha.img_url || null;
