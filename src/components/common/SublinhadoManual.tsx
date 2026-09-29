import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SublinhadoManualProps = {
  children: ReactNode;
  cor?: "cta" | "primary" | "success";
  /** Milissegundos antes de o traço começar a ser desenhado. */
  atraso?: number;
  className?: string;
};

/**
 * Traço desenhado sob a palavra-chave do título, como caneta sobre papel.
 * Um por título, no máximo: é o que dá ênfase a uma palavra sem gritar.
 */
export function SublinhadoManual({ children, cor = "cta", atraso = 400, className }: SublinhadoManualProps) {
  const stroke = cor === "cta" ? "hsl(var(--cta))" : cor === "success" ? "hsl(var(--success))" : "hsl(var(--primary))";
  return (
    <span className={cn("relative inline-block whitespace-nowrap", className)}>
      {children}
      <svg
        className="pointer-events-none absolute -bottom-[0.08em] left-0 h-[0.32em] w-full"
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M2 8.5 C 28 3, 62 11, 98 5.5"
          fill="none"
          stroke={stroke}
          strokeWidth="3.2"
          strokeLinecap="round"
          pathLength="1"
          className="desenhar"
          style={{ "--desenhar-atraso": `${atraso}ms` } as React.CSSProperties}
        />
      </svg>
    </span>
  );
}
