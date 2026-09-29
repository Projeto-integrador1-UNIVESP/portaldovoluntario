import { Button } from "@/components/ui/button";
import { Ilustracao } from "@/components/common/Ilustracao";
import { CTA } from "@/lib/copy";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

/** Estado de erro padrão: diz o que houve em pt-BR e oferece tentar de novo. */
export function ErrorState({
  title = "Não foi possível carregar",
  description = "Verifique sua conexão e tente novamente.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-tinta-pessego/60 px-6 py-12 text-center",
        className,
      )}
    >
      <Ilustracao nome="erro" className="h-24" />
      <p className="mt-5 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          {CTA.tentarDeNovo}
        </Button>
      )}
    </div>
  );
}
