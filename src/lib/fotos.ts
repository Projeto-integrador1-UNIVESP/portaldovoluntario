import generica640 from "@/assets/capas/generica-640.webp";
import generica1280 from "@/assets/capas/generica-1280.webp";
import alimentos640 from "@/assets/capas/alimentos-640.webp";
import alimentos1280 from "@/assets/capas/alimentos-1280.webp";
import roupas640 from "@/assets/capas/roupas-640.webp";
import roupas1280 from "@/assets/capas/roupas-1280.webp";
import inverno640 from "@/assets/capas/inverno-640.webp";
import inverno1280 from "@/assets/capas/inverno-1280.webp";

/**
 * Fotografias editoriais da plataforma: hero, faixas, lado dos formulários,
 * páginas de conteúdo, obrigado. Cada entrada traz `srcSet` em três larguras,
 * um `alt` que descreve a cena (ou vazio, quando é decorativa no contexto) e
 * o crédito de quem fotografou. Curadoria em `src/assets/capas/CREDITOS.md`:
 * sem rosto identificável, sem pobreza encenada, paleta quente.
 *
 * As chaves são contrato: as telas importam `FOTOS.hero` e afins. Os
 * arquivos por trás podem trocar sem que nenhuma tela mude.
 */
export type Foto = {
  src: string;
  srcSet: string;
  /** Proporção largura/altura, para reservar espaço e evitar salto de layout. */
  proporcao: number;
  alt: string;
  credito: { autor: string; url: string };
};

const foto = (p640: string, p1280: string, alt: string, autor: string, url: string, proporcao = 3 / 2): Foto => ({
  src: p640,
  srcSet: `${p640} 640w, ${p1280} 1280w`,
  proporcao,
  alt,
  credito: { autor, url },
});

export const FOTOS = {
  /** Home, ao lado do título. */
  hero: foto(alimentos640, alimentos1280, "Mãos de voluntários separando alimentos não perecíveis sobre uma mesa", "Joel Muniz", "https://unsplash.com/photos/3k3l2brxmwQ"),
  /** Home, segunda foto do hero (menor). */
  heroSecundaria: foto(inverno640, inverno1280, "Pilha de cobertores e mantas de tricô dobrados", "Jordan Bigelow", "https://unsplash.com/photos/white-and-blue-knit-textile-53BjYSxca5g"),
  /** Faixa "Tem tempo em vez de dinheiro?". */
  voluntariado: foto(roupas640, roupas1280, "Pilha de calças jeans dobradas nos braços de uma pessoa", "Maude Frédérique Lavoie", "https://unsplash.com/photos/person-holding-stack-of-denim-jeans-EDSTj4kCUcw"),
  /** Lado dos formulários de entrar e criar conta. */
  auth: foto(generica640, generica1280, "", "Claudia Raya", "https://unsplash.com/photos/1VOx-Ffbd9w"),
  /** Página Sobre. */
  sobre: foto(generica640, generica1280, "", "Claudia Raya", "https://unsplash.com/photos/1VOx-Ffbd9w"),
  /** Página Como funciona. */
  comoFunciona: foto(alimentos640, alimentos1280, "", "Joel Muniz", "https://unsplash.com/photos/3k3l2brxmwQ"),
  /** Tela de obrigado. */
  obrigado: foto(inverno640, inverno1280, "", "Jordan Bigelow", "https://unsplash.com/photos/white-and-blue-knit-textile-53BjYSxca5g"),
} as const;

export type ChaveDeFoto = keyof typeof FOTOS;
