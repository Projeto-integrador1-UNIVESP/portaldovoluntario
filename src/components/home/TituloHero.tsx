import { m } from "motion/react";
import { SublinhadoManual } from "@/components/common/SublinhadoManual";
import { cn } from "@/lib/utils";

const PALAVRAS = ["Do", "que", "as", "ONGs", "perto", "de", "você", "precisam"];
const DESTAQUE = "hoje";
const TEXTO = [...PALAVRAS, DESTAQUE].join(" ");

/**
 * Título do hero: entra palavra por palavra, só com deslocamento, e a última
 * ganha o traço desenhado. É a mesma mecânica do `RevelarTexto`, refeita aqui
 * porque aquele componente só aceita texto puro, e uma palavra sublinhada
 * precisa de um filho. O h1 leva a frase inteira para o leitor de tela; as
 * palavras soltas são decorativas.
 */
export function TituloHero({ className }: { className?: string }) {
  return (
    <h1
      aria-label={TEXTO}
      className={cn("texto-display font-display text-3xl font-bold text-foreground", className)}
    >
      {PALAVRAS.map((palavra, i) => (
        <Palavra key={palavra + i} indice={i}>
          {palavra}
        </Palavra>
      ))}
      <Palavra indice={PALAVRAS.length} ultima>
        <SublinhadoManual atraso={1100}>{DESTAQUE}</SublinhadoManual>
      </Palavra>
    </h1>
  );
}

function Palavra({
  children,
  indice,
  ultima = false,
}: {
  children: React.ReactNode;
  indice: number;
  ultima?: boolean;
}) {
  // O espaço fica fora da máscara: dentro de um `inline-block`, espaço no
  // fim colapsa e as palavras saem coladas.
  return (
    <>
      <span
        className={cn("inline-block overflow-hidden align-baseline", ultima ? "pb-[0.18em]" : "pb-[0.08em]")}
        aria-hidden="true"
      >
        <m.span
          className="inline-block"
          initial={{ y: "0.6em" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 + indice * 0.045, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </m.span>
      </span>
      {!ultima && " "}
    </>
  );
}
