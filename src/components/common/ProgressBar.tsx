import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency, progressoPercent } from "@/lib/format";

type ProgressBarProps = {
  arrecadado: number;
  meta: number;
  /** 'item' mostra "30 de 100 un"; 'dinheiro' formata em reais. */
  tipo: "item" | "dinheiro";
  unidade?: string | null;
  className?: string;
};

/** Barra de progresso de uma meta, com o texto que explica o número. */
export function ProgressBar({ arrecadado, meta, tipo, unidade, className }: ProgressBarProps) {
  const percentual = progressoPercent(arrecadado, meta);
  const atingida = percentual >= 100;

  const texto =
    tipo === "dinheiro"
      ? `${formatCurrency(arrecadado)} de ${formatCurrency(meta)}`
      : `${arrecadado.toLocaleString("pt-BR")} de ${meta.toLocaleString("pt-BR")}${unidade ? ` ${unidade}` : ""}`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Progress
        value={percentual}
        aria-label={`Progresso: ${texto}`}
        className={cn("h-2", atingida && "[&>div]:bg-success")}
      />
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{texto}</span>
        <span className={cn("font-semibold", atingida ? "text-success" : "text-primary")}>
          {percentual}%
        </span>
      </div>
    </div>
  );
}
