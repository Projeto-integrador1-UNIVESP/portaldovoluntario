import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type StatProps = {
  valor: string | number;
  rotulo: string;
  icone?: LucideIcon;
  /** Quando informado, o bloco inteiro vira um link. */
  para?: string;
  /** Número maior e em tinta: o dado que a tela quer que se leia primeiro. */
  destaque?: boolean;
  className?: string;
};

/**
 * Número grande com legenda. O número é Fraunces, tabular; a legenda é um
 * rótulo pequeno em caixa alta, como nas faixas de impacto que funcionam.
 * `destaque` não usa mais a cor de ação: laranja é de botão, não de número.
 */
export function Stat({ valor, rotulo, icone: Icone, para, destaque, className }: StatProps) {
  const conteudo = (
    <>
      {Icone && <Icone className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden="true" />}
      <span
        className={cn(
          "numero block font-display font-semibold leading-none tracking-[-0.02em]",
          destaque ? "text-2xl-fluido text-primary" : "text-2xl text-foreground",
        )}
      >
        {typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}
      </span>
      <span className="rotulo-caps mt-2 block">{rotulo}</span>
    </>
  );

  const classes = cn("rounded-xl border bg-card p-5 shadow-sutil", className);

  if (para) {
    return (
      <Link to={para} className={cn(classes, "elevavel block hover:border-primary/40")}>
        {conteudo}
      </Link>
    );
  }
  return <div className={classes}>{conteudo}</div>;
}
