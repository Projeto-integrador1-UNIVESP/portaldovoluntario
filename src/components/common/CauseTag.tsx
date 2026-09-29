import { cn } from "@/lib/utils";

/**
 * Etiqueta de causa ou categoria.
 *
 * Antes toda causa usava o mesmo cinza-azulado: "Educação", "Alimentação" e
 * "Animais" eram visualmente idênticas e a informação não ajudava a escanear
 * a lista. A tinta de fundo é derivada do próprio texto, então é estável sem
 * precisar de tabela, e fica dentro das quatro tintas de superfície do
 * produto. O texto é sempre a tinta principal: texto colorido por cima de
 * tinta é o que o contrato proíbe, e é assim que o `contraste.test` garante o
 * AA sem uma paleta paralela.
 */

const TINTAS = ["bg-tinta-azulpo", "bg-tinta-creme", "bg-tinta-salvia", "bg-tinta-pessego"] as const;

const TAMANHOS = {
  sm: "px-2.5 py-0.5 text-xs",
  /** Para chip de filtro e para sobre a foto do card largo. */
  md: "px-3 py-1 text-sm",
} as const;

function indice(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h % TINTAS.length;
}

type CauseTagProps = {
  causa: string;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
};

export function CauseTag({ causa, tamanho = "sm", className }: CauseTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold leading-5 text-foreground",
        TINTAS[indice(causa)],
        TAMANHOS[tamanho],
        className,
      )}
    >
      {causa}
    </span>
  );
}
