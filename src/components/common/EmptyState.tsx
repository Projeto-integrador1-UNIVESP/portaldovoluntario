import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ilustracao, type NomeDaIlustracao } from "@/components/common/Ilustracao";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Mantido por compatibilidade. A ilustração substitui o ícone. */
  icon?: LucideIcon;
  ilustracao?: NomeDaIlustracao;
  /** Ação sugerida. `to` navega pelo router; `onClick` executa no lugar. */
  action?: { label: string; to?: string; onClick?: () => void };
  className?: string;
};

/**
 * Estado vazio de qualquer lista: desenho, explicação e uma saída. O contrato
 * exige `action`: lista vazia sem para onde ir é beco.
 */
export function EmptyState({
  title,
  description,
  ilustracao = "vazio",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      <Ilustracao nome={ilustracao} className="h-24" />
      <p className="mt-5 font-display text-lg font-semibold">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.to ? (
            <Button asChild>
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}
