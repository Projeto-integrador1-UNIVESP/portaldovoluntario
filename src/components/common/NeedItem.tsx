import { Link } from "react-router-dom";
import { CalendarClock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/common/ProgressBar";
import { formatPrazo } from "@/lib/format";

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

/** Uma linha da lista de necessidades de um projeto (F1). */
export function NeedItem({ necessidade, linkDoar }: NeedItemProps) {
  const prazo = formatPrazo(necessidade.prazo);
  const urgente = necessidade.urgencia >= 3;
  const completa = necessidade.arrecadado >= necessidade.meta;

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{necessidade.nome}</h3>
            {urgente && !completa && (
              <Badge variant="destructive" className="gap-1">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Urgente
              </Badge>
            )}
            {completa && <Badge className="bg-success text-success-foreground">Meta atingida</Badge>}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {necessidade.categoria && <span>{necessidade.categoria}</span>}
            {prazo && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                {prazo}
              </span>
            )}
          </div>
        </div>

        {linkDoar && !completa && (
          <Button variant="cta" size="sm" asChild>
            <Link to={linkDoar}>
              {necessidade.tipo === "item" ? "Quero doar" : "Contribuir"}
            </Link>
          </Button>
        )}
      </div>

      <ProgressBar
        className="mt-3"
        arrecadado={necessidade.arrecadado}
        meta={necessidade.meta}
        tipo={necessidade.tipo}
        unidade={necessidade.unidade}
      />
    </li>
  );
}
