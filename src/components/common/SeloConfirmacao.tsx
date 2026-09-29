import { BadgeCheck, Clock, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, progressoPercent } from "@/lib/format";

/**
 * O selo que diferencia esta plataforma.
 *
 * Em quase toda vitrine de doação a barra de progresso é uma promessa: sobe
 * assim que alguém diz que doou. Aqui ela é um recibo: só sobe quando alguém
 * da ONG atesta ter recebido. Esse selo é onde a diferença fica visível para
 * quem está decidindo se confia.
 */

type SeloConfirmacaoProps = {
  confirmadaEm?: string | null;
  /** A ONG marcou que a doação não chegou. */
  cancelada?: boolean;
  /** Pulsa ao aparecer: use no instante em que a confirmação acabou de acontecer. */
  animar?: boolean;
  className?: string;
  /** `compacto` cabe dentro de um card; `completo` explica a regra. */
  variante?: "compacto" | "completo";
};

export function SeloConfirmacao({
  confirmadaEm,
  cancelada = false,
  animar = false,
  className,
  variante = "compacto",
}: SeloConfirmacaoProps) {
  const confirmada = Boolean(confirmadaEm) && !cancelada;
  const estado = cancelada ? "cancelada" : confirmada ? "confirmada" : "pendente";

  if (variante === "compacto") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          estado === "confirmada" && "bg-success/12 text-success",
          estado === "pendente" && "bg-muted text-muted-foreground",
          estado === "cancelada" && "bg-destructive/10 text-destructive",
          animar && "confirmou",
          className,
        )}
      >
        {estado === "confirmada" && (
          <>
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Recebimento confirmado
          </>
        )}
        {estado === "pendente" && (
          <>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Aguardando a ONG confirmar
          </>
        )}
        {estado === "cancelada" && (
          <>
            <PackageX className="h-3.5 w-3.5" aria-hidden="true" />
            Marcada como não recebida
          </>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5",
        estado === "confirmada" && "border-success/20 bg-tinta-salvia",
        estado === "pendente" && "border-border bg-muted/50",
        estado === "cancelada" && "border-destructive/20 bg-destructive/5",
        animar && "confirmou",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {estado === "confirmada" && (
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        )}
        {estado === "pendente" && (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        {estado === "cancelada" && (
          <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        )}
        <div className="min-w-0 text-sm">
          <p className="font-semibold">
            {estado === "confirmada" && `A ONG confirmou o recebimento em ${formatDate(confirmadaEm)}`}
            {estado === "pendente" && "Aguardando a ONG confirmar o recebimento"}
            {estado === "cancelada" && "A ONG marcou esta doação como não recebida"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {estado === "confirmada" && "Por isso esta doação conta no progresso do projeto."}
            {estado === "pendente" &&
              "O progresso do projeto só avança depois dessa confirmação. É o que mantém os números da plataforma honestos."}
            {estado === "cancelada" &&
              "Ela não conta no progresso. Se você entregou, fale com a organização pelos contatos do perfil dela."}
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

  const percentual = progressoPercent(confirmadas, total);
  const boa = percentual >= 80;

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "numero font-display text-2xl font-semibold tracking-[-0.02em]",
          boa ? "text-success" : "text-foreground",
        )}
      >
        {percentual}%
      </span>
      <span className="text-sm text-muted-foreground">
        das {total} doações recebidas foram confirmadas por esta ONG
      </span>
    </div>
  );
}
