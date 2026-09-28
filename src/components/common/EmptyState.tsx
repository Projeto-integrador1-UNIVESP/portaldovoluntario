import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Ação sugerida. `to` navega pelo router; `onClick` executa no lugar. */
  action?: { label: string; to?: string; onClick?: () => void };
};

/** Estado vazio padrão de qualquer lista: ícone, explicação e uma saída. */
export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 text-base font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <div className="mt-5">
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
