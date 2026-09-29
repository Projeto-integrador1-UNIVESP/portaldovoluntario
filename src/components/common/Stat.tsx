import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type StatProps = {
  valor: string | number;
  rotulo: string;
  icone?: LucideIcon;
  /** Quando informado, o bloco inteiro vira um link. */
  para?: string;
  /** Realça o número com a cor de ação. */
  destaque?: boolean;
  className?: string;
};

/** Número grande com legenda. Antes cada tela reimplementava o seu. */
export function Stat({ valor, rotulo, icone: Icone, para, destaque, className }: StatProps) {
  const conteudo = (
    <>
      {Icone && <Icone className="mb-2 h-5 w-5 text-muted-foreground" aria-hidden="true" />}
      <span
        className={cn(
          "block font-display text-2xl font-bold tabular-nums",
          destaque ? "text-cta" : "text-primary",
        )}
      >
        {typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}
      </span>
      <span className="mt-0.5 block text-sm text-muted-foreground">{rotulo}</span>
    </>
  );

  const classes = cn("rounded-lg border bg-card p-4 shadow-sutil", className);

  if (para) {
    return (
      <Link to={para} className={cn(classes, "elevavel block transition-colors hover:border-primary/40")}>
        {conteudo}
      </Link>
    );
  }
  return <div className={classes}>{conteudo}</div>;
}
