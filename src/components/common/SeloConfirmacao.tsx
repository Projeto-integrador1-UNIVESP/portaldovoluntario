import { BadgeCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

/**
 * O selo que diferencia esta plataforma.
 *
 * Em quase toda vitrine de doação a barra de progresso é uma promessa: sobe
 * assim que alguém diz que doou. Aqui ela é um recibo — só sobe quando alguém
 * da ONG atesta ter recebido. Esse selo é onde essa diferença fica visível
 * para quem está decidindo se confia.
 */

type SeloConfirmacaoProps = {
  confirmadaEm?: string | null;
  className?: string;
  /** `compacto` cabe dentro de um card; `completo` explica a regra. */
  variante?: "compacto" | "completo";
};

export function SeloConfirmacao({
  confirmadaEm,
  className,
  variante = "compacto",
}: SeloConfirmacaoProps) {
  const confirmada = Boolean(confirmadaEm);

  if (variante === "compacto") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          confirmada
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground",
          className,
        )}
      >
        {confirmada ? (
          <>
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Recebimento confirmado
          </>
        ) : (
          <>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Aguardando a ONG confirmar
          </>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        confirmada ? "border-success/30 bg-success/5" : "border-border bg-muted/40",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {confirmada ? (
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0 text-sm">
          <p className="font-medium">
            {confirmada
              ? `A ONG confirmou o recebimento em ${formatDate(confirmadaEm)}`
              : "Aguardando a ONG confirmar o recebimento"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {confirmada
              ? "Por isso esta doação conta no progresso do projeto."
              : "O progresso do projeto só avança depois dessa confirmação. É o que mantém os números da plataforma honestos."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Reputação da ONG medida por um dado que a própria plataforma gera, em vez de
 * autodeclaração: de cada dez doações recebidas, quantas ela confirmou.
 */
export function TaxaDeConfirmacao({
  confirmadas,
  total,
  className,
}: {
  confirmadas: number;
  total: number;
  className?: string;
}) {
  // Abaixo de uma amostra mínima o percentual engana mais do que informa:
  // "100% de 1 doação" parece reputação e não é.
  if (total < 5) return null;

  const percentual = Math.round((confirmadas / total) * 100);
  const boa = percentual >= 80;

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-display text-2xl font-bold", boa ? "text-success" : "text-foreground")}>
        {percentual}%
      </span>
      <span className="text-sm text-muted-foreground">
        das {total} doações recebidas foram confirmadas por esta ONG
      </span>
    </div>
  );
}
