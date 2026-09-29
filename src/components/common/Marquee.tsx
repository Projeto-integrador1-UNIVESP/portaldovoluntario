import { useId, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: ReactNode;
  /** Segundos por volta. */
  duracao?: number;
  /** Rótulo do que rola, para o leitor de tela. */
  rotulo: string;
  className?: string;
};

/**
 * Faixa que rola sem parar, com um botão visível de pausa: qualquer
 * movimento acima de cinco segundos precisa dele (WCAG 2.2.2). O conteúdo é
 * duplicado para o loop parecer contínuo; a cópia é escondida do leitor de
 * tela. Quem pediu menos movimento vê uma faixa parada, rolável no dedo.
 */
export function Marquee({ children, duracao = 48, rotulo, className }: MarqueeProps) {
  const [pausado, setPausado] = useState(false);
  const reduzido = useReducedMotion();
  const id = useId();

  return (
    <div className={cn("relative", className)}>
      <div
        id={id}
        className="marquee"
        data-pausado={pausado}
        style={{ "--marquee-duracao": `${duracao}s` } as React.CSSProperties}
        role="region"
        aria-label={rotulo}
      >
        <div className="marquee-faixa">
          <div className="flex shrink-0 items-center gap-[var(--marquee-espaco,2rem)]">{children}</div>
          <div className="flex shrink-0 items-center gap-[var(--marquee-espaco,2rem)]" aria-hidden="true">
            {children}
          </div>
        </div>
      </div>

      {!reduzido && (
        <button
          type="button"
          onClick={() => setPausado((p) => !p)}
          aria-pressed={pausado}
          aria-controls={id}
          aria-label="Pausar a rolagem"
          className="alvo-confortavel absolute -bottom-1 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-card/90 text-muted-foreground shadow-sutil backdrop-blur-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {pausado ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
