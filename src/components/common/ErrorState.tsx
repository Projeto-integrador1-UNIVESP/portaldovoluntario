import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

/** Estado de erro padrão: diz o que houve em pt-BR e oferece tentar de novo. */
export function ErrorState({
  title = "Não foi possível carregar",
  description = "Verifique sua conexão e tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <p className="mt-4 text-base font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
