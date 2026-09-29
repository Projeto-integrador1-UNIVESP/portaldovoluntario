import { m } from "motion/react";
import { cn } from "@/lib/utils";

type RevelarTextoProps = {
  texto: string;
  as?: "h1" | "h2" | "p" | "span";
  className?: string;
  /** Segundos antes de a primeira palavra subir. */
  atraso?: number;
};

/**
 * Título que entra palavra por palavra, só com deslocamento. Sem opacidade:
 * o texto está lá desde o primeiro quadro, o que preserva o LCP e garante
 * que nada fica invisível se a animação não rodar. O elemento pai leva o
 * texto inteiro para o leitor de tela; as palavras soltas são decorativas.
 */
export function RevelarTexto({ texto, as: Tag = "h1", className, atraso = 0.05 }: RevelarTextoProps) {
  const palavras = texto.split(" ");

  return (
    <Tag className={cn(className)} aria-label={texto}>
      {palavras.map((palavra, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-baseline" aria-hidden="true">
          <m.span
            className="inline-block"
            initial={{ y: "0.6em" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: atraso + i * 0.045, ease: [0.16, 1, 0.3, 1] }}
          >
            {palavra}
          </m.span>
          {i < palavras.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
