import { Fragment } from "react";
import { m } from "motion/react";
import { SublinhadoManual } from "@/components/common/SublinhadoManual";
import { cn } from "@/lib/utils";

type RevelarTextoProps = {
  texto: string;
  as?: "h1" | "h2" | "p" | "span";
  className?: string;
  /** Segundos antes de a primeira palavra subir. */
  atraso?: number;
  /** Palavra do texto que ganha o traço desenhado embaixo. Uma, no máximo. */
  destaque?: string;
};

/**
 * Título que entra palavra por palavra, só com deslocamento. Sem opacidade:
 * o texto está lá desde o primeiro quadro, o que preserva o LCP e garante
 * que nada fica invisível se a animação não rodar. O elemento pai leva o
 * texto inteiro para o leitor de tela; as palavras soltas são decorativas.
 *
 * O espaço entre palavras fica fora da máscara: dentro de um `inline-block`,
 * espaço no fim colapsa e as palavras saem coladas.
 */
export function RevelarTexto({ texto, as: Tag = "h1", className, atraso = 0.05, destaque }: RevelarTextoProps) {
  const palavras = texto.split(" ");

  return (
    <Tag className={cn(className)} aria-label={texto}>
      {palavras.map((palavra, i) => {
        const sublinhar = destaque !== undefined && palavra.replace(/[.,!?:;]$/, "") === destaque;
        const tempo = atraso + i * 0.045;
        return (
          <Fragment key={i}>
            <span
              className={cn("inline-block overflow-hidden align-baseline", sublinhar ? "pb-[0.18em]" : "pb-[0.08em]")}
              aria-hidden="true"
            >
              <m.span
                className="inline-block"
                initial={{ y: "0.6em" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, delay: tempo, ease: [0.16, 1, 0.3, 1] }}
              >
                {sublinhar ? (
                  <SublinhadoManual atraso={Math.round((tempo + 0.6) * 1000)}>{palavra}</SublinhadoManual>
                ) : (
                  palavra
                )}
              </m.span>
            </span>
            {i < palavras.length - 1 && " "}
          </Fragment>
        );
      })}
    </Tag>
  );
}
