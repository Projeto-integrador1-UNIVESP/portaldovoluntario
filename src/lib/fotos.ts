import hero640 from "@/assets/fotos/hero-640.webp";
import hero1280 from "@/assets/fotos/hero-1280.webp";
import hero1920 from "@/assets/fotos/hero-1920.webp";
import heroSecundaria640 from "@/assets/fotos/hero-secundaria-640.webp";
import heroSecundaria1280 from "@/assets/fotos/hero-secundaria-1280.webp";
import heroSecundaria1920 from "@/assets/fotos/hero-secundaria-1920.webp";
import voluntariado640 from "@/assets/fotos/voluntariado-640.webp";
import voluntariado1280 from "@/assets/fotos/voluntariado-1280.webp";
import voluntariado1920 from "@/assets/fotos/voluntariado-1920.webp";
import auth640 from "@/assets/fotos/auth-640.webp";
import auth1280 from "@/assets/fotos/auth-1280.webp";
import auth1920 from "@/assets/fotos/auth-1920.webp";
import sobre640 from "@/assets/fotos/sobre-640.webp";
import sobre1280 from "@/assets/fotos/sobre-1280.webp";
import sobre1920 from "@/assets/fotos/sobre-1920.webp";
import comoFunciona640 from "@/assets/fotos/como-funciona-640.webp";
import comoFunciona1280 from "@/assets/fotos/como-funciona-1280.webp";
import comoFunciona1920 from "@/assets/fotos/como-funciona-1920.webp";
import obrigado640 from "@/assets/fotos/obrigado-640.webp";
import obrigado1280 from "@/assets/fotos/obrigado-1280.webp";
import obrigado1920 from "@/assets/fotos/obrigado-1920.webp";

/**
 * Fotografias editoriais da plataforma: hero, faixas, lado dos formulários,
 * páginas de conteúdo, obrigado. Cada entrada traz `srcSet` em três larguras
 * (640, 1280 e 1920), um `alt` que descreve a cena (a tela pode trocar por
 * `""` quando a foto for decorativa no contexto) e o crédito de quem
 * fotografou. Curadoria em `src/assets/capas/CREDITOS.md`: sem rosto
 * identificável, sem pobreza encenada, paleta quente.
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

const foto = (
  [p640, p1280, p1920]: [string, string, string],
  proporcao: number,
  alt: string,
  autor: string,
  url: string,
): Foto => ({
  src: p1280,
  srcSet: `${p640} 640w, ${p1280} 1280w, ${p1920} 1920w`,
  proporcao,
  alt,
  credito: { autor, url },
});

export const FOTOS = {
  /** Home, ao lado do título. Horizontal 3:2. */
  hero: foto(
    [hero640, hero1280, hero1920],
    3 / 2,
    "Mãos plantando mudas na terra de um canteiro de madeira",
    "Sandie Clarke",
    "https://unsplash.com/photos/hands-planting-seedlings-in-garden-soil-q13Zq1Jufks",
  ),
  /** Home, segunda foto do hero (menor). Quadrada. */
  heroSecundaria: foto(
    [heroSecundaria640, heroSecundaria1280, heroSecundaria1920],
    1,
    "Pilha de mantas de tricô dobradas sob a luz de uma janela",
    "Nellie Adamyan",
    "https://unsplash.com/photos/a-pile-of-folded-towels-sitting-on-top-of-a-bed-wH_avVRSuJM",
  ),
  /** Faixa "Tem tempo em vez de dinheiro?". Faixa larga 21:9. */
  voluntariado: foto(
    [voluntariado640, voluntariado1280, voluntariado1920],
    21 / 9,
    "Mãos de várias pessoas colocando mudas em vasos sobre uma mesa com terra",
    "Alex Diaz",
    "https://unsplash.com/photos/a-group-of-people-standing-around-a-table-filled-with-plants-2S1JhFhhSi4",
  ),
  /** Lado dos formulários de entrar e criar conta. Vertical 4:5. */
  auth: foto(
    [auth640, auth1280, auth1920],
    4 / 5,
    "Mãos costurando um tecido claro com agulha e linha",
    "Elio Santos",
    "https://unsplash.com/photos/hands-sewing-white-fabric-5ZQn_gWKvLE",
  ),
  /** Página Sobre. Horizontal 3:2. */
  sobre: foto(
    [sobre640, sobre1280, sobre1920],
    3 / 2,
    "Mão servindo pães em tigelas de folha sobre uma bancada",
    "Subhayan Das",
    "https://unsplash.com/photos/person-holding-bread-on-bowl-at-daytime-GPoJezGXMp4",
  ),
  /** Página Como funciona. Horizontal 3:2. */
  comoFunciona: foto(
    [comoFunciona640, comoFunciona1280, comoFunciona1920],
    3 / 2,
    "Mãos entregando uma manta de tricô dobrada a outra pessoa",
    "Erik Mclean",
    "https://unsplash.com/photos/person-holding-white-blue-and-red-plaid-textile-QJ3g4T8Cxu4",
  ),
  /** Tela de obrigado. Horizontal 3:2. */
  obrigado: foto(
    [obrigado640, obrigado1280, obrigado1920],
    3 / 2,
    "Mãos repartindo um pão sobre uma tábua de madeira, vistas de cima",
    "Gustavo Sánchez",
    "https://unsplash.com/photos/a-person-cutting-a-loaf-of-bread-on-a-cutting-board-bMuzlborr0M",
  ),
} as const satisfies Record<string, Foto>;

export type ChaveDeFoto = keyof typeof FOTOS;
