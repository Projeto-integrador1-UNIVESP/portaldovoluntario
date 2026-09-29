import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { formatPrazo, formatCurrency } from "@/lib/format";
import type { NecessidadeUrgente } from "@/hooks/queries/useHome";

/**
 * Card de necessidade em destaque.
 *
 * O número que ganha peso visual é **o que falta**, não o que já chegou:
 * "faltam 68 cobertores" move mais do que "32 de 100". A barra continua ali
 * para dar contexto, mas em segundo plano.
 */
export function CardNecessidadeUrgente({ necessidade: n }: { necessidade: NecessidadeUrgente }) {
  const falta = Math.max(0, n.meta - n.arrecadado);
  const prazo = formatPrazo(n.prazo);
  const linkDoar = n.projeto
    ? `/doar/projeto/${n.projeto.slug ?? n.projeto.id}?necessidade=${n.id}`
    : "/projetos";

  const quantoFalta =
    n.tipo === "dinheiro"
      ? formatCurrency(falta)
      : `${falta.toLocaleString("pt-BR")} ${n.unidade ?? ""}`.trim();

  return (
    <Link
      to={linkDoar}
      className="elevavel group flex h-full flex-col rounded-xl border bg-card p-5 shadow-sutil focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{n.ong?.nome}</p>
        {n.urgencia >= 3 && (
          <Badge variant="destructive" className="gap-1 shrink-0">
            <Flame className="h-3 w-3" aria-hidden="true" />
            Urgente
          </Badge>
        )}
      </div>

      <p className="mt-3 font-display text-xl font-bold leading-tight">
        Faltam {quantoFalta}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        de {n.nome}, no projeto {n.projeto?.nome_projeto}
      </p>

      <div className="mt-auto pt-4">
        <ProgressBar
          arrecadado={n.arrecadado}
          meta={n.meta}
          tipo={n.tipo}
          unidade={n.unidade}
        />
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cta">
          Doar para este pedido
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
        {prazo && <span className="ml-3 text-xs text-muted-foreground">{prazo}</span>}
      </div>
    </Link>
  );
}
