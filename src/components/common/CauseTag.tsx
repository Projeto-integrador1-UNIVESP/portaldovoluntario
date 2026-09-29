import { cn } from "@/lib/utils";

/**
 * Etiqueta de causa ou categoria.
 *
 * Antes toda causa usava o mesmo cinza-azulado: "Educação", "Alimentação" e
 * "Animais" eram visualmente idênticas e a informação não ajudava a escanear
 * a lista. A cor é derivada do próprio texto, então é estável sem precisar de
 * tabela, e fica dentro de uma paleta contida — matizes saturados demais
 * roubariam a atenção do laranja, que é a única cor de ação da interface.
 */

const PALETA = [
  { fundo: "var(--tinta-agua)", texto: "195 55% 28%" },
  { fundo: "var(--tinta-areia)", texto: "28 60% 30%" },
  { fundo: "var(--tinta-musgo)", texto: "155 45% 25%" },
  { fundo: "var(--tinta-lavanda)", texto: "258 40% 38%" },
] as const;

function indice(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h % PALETA.length;
}

export function CauseTag({ causa, className }: { causa: string; className?: string }) {
  const cor = PALETA[indice(causa)];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: `hsl(${cor.fundo})`, color: `hsl(${cor.texto})` }}
    >
      {causa}
    </span>
  );
}
