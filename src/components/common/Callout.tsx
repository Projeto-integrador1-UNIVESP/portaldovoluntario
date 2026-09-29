import type { LucideIcon } from "lucide-react";
import { Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const estilos = {
  info: { classe: "border-primary/25 bg-primary/5", cor: "text-primary", icone: Info },
  confianca: { classe: "border-success/30 bg-success/5", cor: "text-success", icone: ShieldCheck },
  atencao: { classe: "border-warning/40 bg-warning/10", cor: "text-warning", icone: TriangleAlert },
} as const;

type CalloutProps = {
  tom?: keyof typeof estilos;
  titulo?: string;
  icone?: LucideIcon;
  children: React.ReactNode;
  className?: string;
};

/**
 * Destaque para informação que muda a decisão de quem lê — em especial as que
 * reduzem insegurança na hora de transferir dinheiro. Antes essas frases eram
 * parágrafo cinza, com o mesmo peso visual de um rodapé legal.
 */
export function Callout({ tom = "info", titulo, icone, children, className }: CalloutProps) {
  const estilo = estilos[tom];
  const Icone = icone ?? estilo.icone;

  return (
    <div className={cn("rounded-lg border p-4", estilo.classe, className)}>
      <div className="flex items-start gap-3">
        <Icone className={cn("mt-0.5 h-5 w-5 shrink-0", estilo.cor)} aria-hidden="true" />
        <div className="min-w-0 text-sm">
          {titulo && <p className="font-medium">{titulo}</p>}
          <div className={cn(titulo && "mt-1", "text-muted-foreground")}>{children}</div>
        </div>
      </div>
    </div>
  );
}
