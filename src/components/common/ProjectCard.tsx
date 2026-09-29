import { Link } from "react-router-dom";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import { Capa } from "@/components/common/Capa";
import { CauseTag } from "@/components/common/CauseTag";
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

/**
 * Card de projeto.
 *
 * A estrutura segue o que funciona nas vitrines de campanha brasileiras: os
 * metadados que qualificam (causa, prazo) ficam sobre a imagem, liberando o
 * corpo do card para uma hierarquia só; e todo card termina numa ação, em vez
 * de depender do usuário adivinhar que o bloco inteiro é clicável.
 *
 * A diferença em relação a elas é o número que ganha peso: aqui é o que falta
 * confirmar, não o arrecadado.
 */
export function ProjectCard({ projeto }: { projeto: ProjetoCardData }) {
  const prazo = formatPrazo(projeto.data_fim);
  const dias = diasRestantes(projeto.data_fim);
  const encerrado = dias !== null && dias < 0;
  const apertado = dias !== null && dias >= 0 && dias <= 7;

  const temProgresso = projeto.totalNecessidades !== undefined;
  const pedidos = projeto.totalNecessidades ?? 0;
  const progresso = Math.min(100, Math.max(0, Math.round(projeto.progressoMedio ?? 0)));

  return (
    <Link
      to={`/projetos/${projeto.slug ?? projeto.id}`}
      className="elevavel group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* O `nome` é o que faz o substituto gerado mostrar o monograma da
          organização. Sem ele a capa sem foto ficava um degradê vazio, que numa
          grade cheia lê como imagem quebrada. */}
      <Capa
        src={projeto.img_url}
        alt=""
        id={projeto.id}
        nome={projeto.ongNome ?? projeto.nome_projeto}
        causa={projeto.causa}
        className="h-44 w-full shrink-0"
      >
        {/* Sobre a imagem, como nas vitrines de campanha: qualifica sem gastar
            linha no corpo do card. */}
        {projeto.causa && (
          <span className="absolute left-2.5 top-2.5">
            <CauseTag causa={projeto.causa} className="shadow-sutil" />
          </span>
        )}

        {prazo && (
          <span
            className={cn(
              "absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium shadow-sutil",
              encerrado
                ? "bg-muted text-muted-foreground"
                : apertado
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card/95 text-foreground backdrop-blur-[2px]",
            )}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            {prazo}
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

        {projeto.cidade && (
          <p className="mt-1.5 inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{projeto.cidade}</span>
          </p>
        )}

        {projeto.descricao && (
          <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">{projeto.descricao}</p>
        )}

        <div className="mt-auto pt-4">
          {temProgresso && pedidos > 0 && (
            <div className="mb-4">
              {/* O número grande é o que falta confirmar. O já confirmado fica
                  como contexto ao lado, em cinza. */}
              <p className="flex items-baseline gap-1.5">
                <span className="numero font-display text-xl font-extrabold text-primary">
                  {100 - progresso}%
                </span>
                <span className="text-sm text-muted-foreground">
                  ainda falta confirmar
                </span>
              </p>

              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progresso}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progresso}% dos pedidos já confirmados pela organização`}
              >
                <div
                  className={cn(
                    "h-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                    progresso >= 100 ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${progresso}%` }}
                />
              </div>

              {/* O confirmado continua escrito, em cinza: é a tese do produto e
                  não pode viver só no rótulo da barra. */}
              <p className="numero mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span>{progresso}% já confirmado pela ONG</span>
                <span aria-hidden="true">·</span>
                <span>{pedidos === 1 ? "1 pedido aberto" : `${pedidos} pedidos abertos`}</span>
              </p>
            </div>
          )}

          {temProgresso && pedidos === 0 && (
            <p className="mb-4 text-sm text-muted-foreground">Nenhum pedido aberto agora.</p>
          )}

          <span className="flex h-10 w-full items-center justify-center rounded-controle bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
            Ver o que falta
          </span>
        </div>
      </div>
    </Link>
  );
}
