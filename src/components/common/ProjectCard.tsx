import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Capa } from "@/components/common/Capa";
import { formatPrazo, diasRestantes } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ProjetoCardData = {
  id: string;
  slug?: string | null;
  nome_projeto: string;
  descricao: string | null;
  img_url: string | null;
  data_fim: string | null;
  cidade?: string | null;
  causa?: string | null;
  /** Nome da ONG responsável, quando já resolvido pela página. */
  ongNome?: string | null;
  ongVerificada?: boolean;
  /** Necessidades abertas do projeto. `undefined` esconde o bloco de progresso. */
  totalNecessidades?: number;
  /** Média de progresso das necessidades abertas, em 0–100. */
  progressoMedio?: number;
};

/** Card de projeto usado na listagem e na página da ONG. */
export function ProjectCard({ projeto }: { projeto: ProjetoCardData }) {
  const prazo = formatPrazo(projeto.data_fim);
  const dias = diasRestantes(projeto.data_fim);
  const encerrado = dias !== null && dias < 0;
  const apertado = dias !== null && dias >= 0 && dias <= 7;

  const inicial = (projeto.ongNome ?? projeto.nome_projeto).trim().charAt(0).toUpperCase();
  const temProgresso = projeto.totalNecessidades !== undefined;
  const pedidos = projeto.totalNecessidades ?? 0;
  const progresso = Math.min(100, Math.max(0, Math.round(projeto.progressoMedio ?? 0)));

  return (
    <Link
      to={`/projetos/${projeto.slug ?? projeto.id}`}
      className="elevavel group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Sem foto, a `Capa` gera um padrão estável a partir do id; o selo com a
          inicial de quem publicou dá identidade ao card sem fingir fotografia. */}
      <Capa src={projeto.img_url} alt="" id={projeto.id} className="h-40 w-full shrink-0">
        {!projeto.img_url && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card font-display text-xl font-extrabold text-primary shadow-sutil">
              {inicial}
            </span>
          </span>
        )}
      </Capa>

      <div className="flex flex-1 flex-col p-5">
        {projeto.ongNome && (
          <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <span className="truncate">{projeto.ongNome}</span>
            {projeto.ongVerificada && (
              <>
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                <span className="sr-only">ONG verificada</span>
              </>
            )}
          </p>
        )}

        <h3 className="mt-1.5 line-clamp-2 font-display text-lg font-bold leading-tight">
          {projeto.nome_projeto}
        </h3>

        {projeto.descricao && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{projeto.descricao}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {projeto.cidade && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{projeto.cidade}</span>
            </span>
          )}
          {prazo && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                apertado && !encerrado && "font-medium text-destructive",
              )}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {prazo}
            </span>
          )}
          {projeto.causa && (
            <Badge variant="secondary" className="max-w-full truncate font-medium">
              {projeto.causa}
            </Badge>
          )}
        </div>

        <div className="mt-auto pt-4">
          {temProgresso &&
            (pedidos === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pedido aberto agora.
              </p>
            ) : (
              <>
                <p className="font-display text-lg font-bold tabular-nums">
                  {pedidos === 1 ? "1 pedido aberto" : `${pedidos} pedidos abertos`}
                </p>
                <Progress
                  value={progresso}
                  aria-label={`Progresso médio dos pedidos: ${progresso}% confirmado pela ONG`}
                  className={cn("mt-2 h-2", progresso >= 100 && "[&>div]:bg-success")}
                />
                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                  {progresso}% já confirmado pela ONG
                  {progresso < 100 && ` — faltam ${100 - progresso}%`}
                </p>
              </>
            ))}

          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Ver o que falta
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
