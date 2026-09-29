import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Chega rápido e assenta devagar: o mesmo "expo out" do resto da interface. */
const easeSaidaExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

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
    // Tween próprio com requestAnimationFrame: o `animate` do motion traria o
    // motor de animação inteiro para o chunk inicial só para contar um número.
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / (duracao * 1000));
      setExibido(valor * easeSaidaExpo(t));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [emTela, valor, duracao, animarPermitido]);

  return (
    <span ref={ref} className={cn("numero", className)}>
      {formatar(exibido)}
    </span>
  );
}
