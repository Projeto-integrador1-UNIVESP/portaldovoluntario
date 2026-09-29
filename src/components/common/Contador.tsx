import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type ContadorProps = {
  valor: number;
  /** Como exibir o número. Padrão: milhar em pt-BR. */
  formatar?: (n: number) => string;
  duracao?: number;
  className?: string;
};

/**
 * Número que sobe ao entrar em tela, uma vez.
 *
 * Mostra o valor final direto quando a pessoa pediu menos movimento ou quando
 * o navegador não tem IntersectionObserver: nos dois casos o dado aparece na
 * hora, e nada depende da animação terminar.
 */
export function Contador({
  valor,
  formatar = (n) => Math.round(n).toLocaleString("pt-BR"),
  duracao = 1.6,
  className,
}: ContadorProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduzido = useReducedMotion();
  const semObserver = typeof IntersectionObserver === "undefined";
  const animarPermitido = !reduzido && !semObserver;
  const emTela = useInView(ref, { once: true, amount: 0.6 });
  const [exibido, setExibido] = useState(animarPermitido ? 0 : valor);

  useEffect(() => {
    if (!animarPermitido) {
      setExibido(valor);
      return;
    }
    if (!emTela) return;
    const controle = animate(0, valor, {
      duration: duracao,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setExibido(v),
    });
    return () => controle.stop();
  }, [emTela, valor, duracao, animarPermitido]);

  return (
    <span ref={ref} className={cn("numero", className)}>
      {formatar(exibido)}
    </span>
  );
}
