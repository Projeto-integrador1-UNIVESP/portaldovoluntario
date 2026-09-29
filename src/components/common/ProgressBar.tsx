import { cn } from "@/lib/utils";
import { formatCurrency, progressoPercent } from "@/lib/format";

type ProgressBarProps = {
  /** Já confirmado pela ONG. É o número que conta. */
  arrecadado: number;
  meta: number;
  /** Declarado por doadores e ainda aguardando confirmação da ONG. */
  pendente?: number;
  tipo: "item" | "dinheiro";
  unidade?: string | null;
  /** Destaca o que falta em vez do que já chegou. */
  destacarFalta?: boolean;
  className?: string;
};

/**
 * Progresso de uma meta, em duas camadas.
 *
 * A faixa sólida é o que a ONG confirmou ter recebido; a faixa listrada é o
 * que foi declarado e ainda aguarda confirmação. Uma barra única somando os
 * dois seria mais bonita e seria mentira por omissão — e é exatamente a
 * mentira que as outras plataformas contam ao subir a barra no instante em
 * que alguém diz que doou.
 */
export function ProgressBar({
  arrecadado,
  meta,
  pendente = 0,
  tipo,
  unidade,
  destacarFalta,
  className,
}: ProgressBarProps) {
  const confirmado = progressoPercent(arrecadado, meta);
  // A camada pendente começa onde a confirmada termina e nunca ultrapassa 100.
  const aguardando = Math.max(0, Math.min(100 - confirmado, progressoPercent(pendente, meta)));
  const atingida = confirmado >= 100;
  const falta = Math.max(0, meta - arrecadado);

  const formatar = (valor: number) =>
    tipo === "dinheiro"
      ? formatCurrency(valor)
      : `${valor.toLocaleString("pt-BR")}${unidade ? ` ${unidade}` : ""}`;

  const descricao = atingida
    ? `Meta atingida: ${formatar(arrecadado)} confirmados`
    : `${formatar(arrecadado)} confirmados de ${formatar(meta)}` +
      (pendente > 0 ? `, mais ${formatar(pendente)} aguardando confirmação` : "");

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className="relative flex h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={confirmado}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={descricao}
      >
        <div
          className={cn(
            "barra-anima h-full transition-[width] duration-500",
            atingida ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${confirmado}%` }}
        />
        {aguardando > 0 && (
          <div
            className="h-full opacity-70 transition-[width] duration-500"
            style={{
              width: `${aguardando}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--primary) / 0.45) 0 4px, transparent 4px 8px)",
              backgroundColor: "hsl(var(--primary) / 0.12)",
            }}
          />
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 text-sm">
        {destacarFalta && !atingida ? (
          <span className="numero font-medium">Faltam {formatar(falta)}</span>
        ) : (
          <span className="numero text-muted-foreground">
            {formatar(arrecadado)} de {formatar(meta)}
          </span>
        )}
        <span
          className={cn("numero shrink-0 font-semibold", atingida ? "text-success" : "text-primary")}
        >
          {confirmado}%
        </span>
      </div>

      {pendente > 0 && !atingida && (
        <p className="text-xs text-muted-foreground">
          <span className="numero">{formatar(pendente)}</span> aguardando a ONG confirmar
        </p>
      )}
    </div>
  );
}
