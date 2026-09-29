import { Link } from "react-router-dom";
import { CalendarClock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/common/ProgressBar";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPrazo } from "@/lib/format";

export type Necessidade = {
  id: string;
  tipo: "item" | "dinheiro";
  nome: string;
  categoria: string | null;
  unidade: string | null;
  meta: number;
  arrecadado: number;
  urgencia: number;
  prazo: string | null;
};

type NeedItemProps = {
  necessidade: Necessidade;
  /** Link do fluxo de doação. Omitido, o item fica só informativo. */
  linkDoar?: string;
};

/**
 * Uma necessidade na visão de quem doa.
 *
 * O número que recebe peso visual é **o que falta**, não o que já chegou:
 * "faltam 68 cobertores" é um pedido, "32 de 100" é um relatório. A barra
 * continua na linha de baixo como contexto. Ela é o recibo do que a ONG já
 * confirmou ter recebido, e daí vem a lentidão dela.
 */
export function NeedItem({ necessidade, linkDoar }: NeedItemProps) {
  const prazo = formatPrazo(necessidade.prazo);
  const urgente = necessidade.urgencia >= 3;
  const falta = Math.max(0, necessidade.meta - necessidade.arrecadado);
  const completa = falta === 0;
  const emReais = necessidade.tipo === "dinheiro";

  const quantidade = (valor: number) =>
    emReais
      ? formatCurrency(valor)
      : `${valor.toLocaleString("pt-BR")}${necessidade.unidade ? ` ${necessidade.unidade}` : ""}`;

  return (
    <li className="rounded-xl border bg-card p-5 shadow-sutil">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="min-w-0 font-semibold">{necessidade.nome}</h3>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {urgente && !completa && (
            <Badge variant="destructive" className="gap-1">
              <Flame className="h-3 w-3" aria-hidden="true" />
              Urgente
            </Badge>
          )}
          {completa && (
            <Badge className="bg-success text-success-foreground hover:bg-success">
              Meta atingida
            </Badge>
          )}
        </div>
      </div>

      <p
        className={cn(
          "mt-1 font-display text-xl font-bold leading-tight tracking-[-0.02em] tabular-nums",
          completa && "text-success",
        )}
      >
        {completa
          ? `${quantidade(necessidade.arrecadado)} já recebidos`
          : `Faltam ${quantidade(falta)}`}
      </p>

      {(necessidade.categoria || prazo) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {necessidade.categoria && <span>{necessidade.categoria}</span>}
          {prazo && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              {prazo}
            </span>
          )}
        </div>
      )}

      <ProgressBar
        className="mt-4"
        arrecadado={necessidade.arrecadado}
        meta={necessidade.meta}
        tipo={necessidade.tipo}
        unidade={necessidade.unidade}
      />

      {linkDoar && !completa && (
        <Button variant="cta" asChild className="pressionavel mt-4 w-full sm:w-auto">
          <Link to={linkDoar}>{emReais ? "Doar por Pix" : "Doar este item"}</Link>
        </Button>
      )}
    </li>
  );
}
