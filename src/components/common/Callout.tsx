import type { LucideIcon } from "lucide-react";
import { Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const estilos = {
  info: { classe: "border-primary/15 bg-tinta-azulpo", cor: "text-primary", icone: Info },
  confianca: { classe: "border-success/20 bg-tinta-salvia", cor: "text-success", icone: ShieldCheck },
  atencao: { classe: "border-warning/25 bg-tinta-creme", cor: "text-warning", icone: TriangleAlert },
} as const;

type CalloutProps = {
  tom?: keyof typeof estilos;
  titulo?: string;
  icone?: LucideIcon;
  children: React.ReactNode;
  className?: string;
};

/**
 * Destaque para informação que muda a decisão de quem lê, em especial as que
 * reduzem insegurança na hora de transferir dinheiro. Fundo em tinta, não em
 * cor a 5%: assenta no papel e não parece um alerta de sistema.
 */
export function Callout({ tom = "info", titulo, icone, children, className }: CalloutProps) {
  const estilo = estilos[tom];
  const Icone = icone ?? estilo.icone;

  return (
    <div className={cn("rounded-xl border p-4 sm:p-5", estilo.classe, className)}>
      <div className="flex items-start gap-3">
        <Icone className={cn("mt-0.5 h-5 w-5 shrink-0", estilo.cor)} aria-hidden="true" />
        <div className="min-w-0 text-sm">
          {titulo && <p className="font-semibold text-foreground">{titulo}</p>}
          <div className={cn(titulo && "mt-1", "text-muted-foreground")}>{children}</div>
        </div>
      </div>
    </div>
  );
}
