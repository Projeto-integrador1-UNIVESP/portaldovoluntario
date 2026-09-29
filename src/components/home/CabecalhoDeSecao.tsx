import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type CabecalhoDeSecaoProps = {
  id: string;
  eyebrow: string;
  titulo: string;
  link?: { label: string; to: string };
  /** Sobre tinta escura, os textos trocam para creme. */
  escuro?: boolean;
  className?: string;
};

/** Cabeçalho editorial das seções da home: eyebrow, título e um link à direita. */
export function CabecalhoDeSecao({ id, eyebrow, titulo, link, escuro, className }: CabecalhoDeSecaoProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-3", className)}>
      <div>
        <p className={cn("rotulo-caps", escuro && "text-primary-foreground/70")}>{eyebrow}</p>
        <h2
          id={id}
          className={cn("mt-2 font-display text-2xl font-semibold", escuro && "text-primary-foreground")}
        >
          {titulo}
        </h2>
      </div>
      {link && (
        <Link
          to={link.to}
          className={cn(
            "link-vivo pb-1 text-sm font-medium",
            escuro ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
