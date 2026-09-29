import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * O tailwind-merge só conhece a escala padrão. Sem ensinar os nossos tokens,
 * `text-2xl-fluido` era lido como cor e sumia ao lado de `text-primary`
 * (o título saía em 16px), e `rounded-controle`/`shadow-sutil` não eram
 * reconhecidos como raio e sombra, então não substituíam os padrões.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xl-fluido"] }],
      rounded: [{ rounded: ["controle", "destaque"] }],
      shadow: [{ shadow: ["sutil", "baixa", "media", "alta", "cta"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Grade de duas colunas com um número ímpar de itens: o último fecha a linha
 * inteira em vez de deixar um buraco ao lado.
 */
export const larguraNaGrade = (indice: number, total: number) =>
  total % 2 === 1 && indice === total - 1 ? "sm:col-span-2" : undefined;
