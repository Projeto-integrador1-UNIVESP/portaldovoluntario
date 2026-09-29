import { Link } from "react-router-dom";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Capa } from "@/components/common/Capa";
import { CauseTag } from "@/components/common/CauseTag";
import { ProgressBar } from "@/components/common/ProgressBar";
import { SeloVerificada } from "@/components/common/SeloVerificada";
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

type ProjectCardProps = {
  projeto: ProjetoCardData;
  /**
   * `largo`: foto à esquerda e mais texto, para o primeiro item de uma
   * listagem (ritmo editorial). Quem monta a grade decide quantas colunas ele
   * ocupa; aqui só muda o arranjo interno.
   */
  variante?: "padrao" | "largo";
  className?: string;
};

/**
 * Card de projeto.
 *
 * A foto ocupa mais da metade do card: é ela que dá vida à listagem, e os
 * metadados que qualificam (causa, prazo) ficam sobre ela, liberando o corpo
 * para uma hierarquia só. Todo card termina numa ação, em vez de depender de
 * o visitante adivinhar que o bloco inteiro é clicável.
 *
 * O número que ganha peso é o que falta confirmar, não o arrecadado.
 */
export function ProjectCard({ projeto, variante = "padrao", className }: ProjectCardProps) {
  const largo = variante === "largo";
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
      className={cn(
        "elevavel group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        largo && "md:grid md:grid-cols-2",
        className,
      )}
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
        sizes={largo ? "(max-width: 768px) 100vw, 640px" : undefined}
        className={cn(
          "foto-zoom w-full shrink-0",
          largo ? "aspect-[4/3] md:aspect-auto md:h-full md:min-h-[20rem]" : "aspect-[4/3]",
        )}
      >
        {/* Sobre a imagem: qualifica sem gastar linha no corpo do card. */}
        {projeto.causa && (
          <CauseTag
            causa={projeto.causa}
            tamanho={largo ? "md" : "sm"}
            className="absolute left-3 top-3 shadow-sutil"
          />
        )}

        {prazo && (
          <Badge
            variant={encerrado ? "neutro" : apertado ? "urgente" : "outline"}
            className="absolute right-3 top-3 shadow-sutil"
          >
            <Clock aria-hidden="true" />
            {prazo}
          </Badge>
        )}
      </Capa>

      {/* No largo a coluna de texto é mais baixa que a foto: centrada, a
          folga sobra em cima e embaixo em vez de abrir um vão no meio. */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          largo ? "p-6 md:justify-center md:p-8" : "p-5",
        )}
      >
        {projeto.ongNome && (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate font-medium">{projeto.ongNome}</span>
            {/* O card só sabe se a ONG é verificada, não desde quando: o selo
                só precisa de um valor presente para desenhar o ícone. */}
            <SeloVerificada
              verificadaEm={projeto.ongVerificada ? "verificada" : null}
              variante="icone"
            />
          </p>
        )}

        <h3
          className={cn(
            "mt-1.5 line-clamp-2 font-display font-semibold leading-snug",
            largo ? "text-xl md:text-2xl" : "text-lg",
          )}
        >
          {projeto.nome_projeto}
        </h3>

        {projeto.cidade && (
          <p className="mt-1.5 inline-flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{projeto.cidade}</span>
          </p>
        )}

        {projeto.descricao && (
          <p
            className={cn(
              "mt-2.5 text-muted-foreground",
              largo ? "line-clamp-4 text-base md:line-clamp-5" : "line-clamp-2 text-sm",
            )}
          >
            {projeto.descricao}
          </p>
        )}

        {/* No card padrão o bloco do que falta desce para o rodapé, para as
            barras de uma mesma linha da grade ficarem alinhadas. No largo há
            espaço de sobra e ele segue o resumo. */}
        <div className={cn(largo ? "mt-6 flex flex-col gap-4" : "mt-auto pt-5")}>
          {temProgresso && pedidos > 0 && (
            <div>
              {/* O número grande é o que falta confirmar. O já confirmado fica
                  como contexto abaixo, em cinza. */}
              <p className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "numero font-display font-semibold text-primary",
                    largo ? "text-2xl" : "text-xl",
                  )}
                >
                  {100 - progresso}%
                </span>
                <span className="text-sm text-muted-foreground">ainda falta confirmar</span>
              </p>

              {/* A legenda própria da barra repetiria o número acima e o de
                  baixo; some, e a barra continua com o `aria` e a animação
                  do componente. */}
              <ProgressBar
                arrecadado={progresso}
                meta={100}
                tipo="item"
                unidade="%"
                destacarFalta
                legenda={false}
                rotulo={`${progresso}% dos pedidos já confirmados pela organização`}
                className="mt-2.5"
              />

              {/* O confirmado continua escrito: é a tese do produto e não
                  pode viver só no rótulo da barra. */}
              <p className="numero mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span>{progresso}% já confirmado pela ONG</span>
                <span aria-hidden="true">·</span>
                <span>{pedidos === 1 ? "1 pedido aberto" : `${pedidos} pedidos abertos`}</span>
              </p>
            </div>
          )}

          {temProgresso && pedidos === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum pedido aberto agora.</p>
          )}

          <span
            className={cn(
              "flex items-center justify-between border-t border-border pt-3.5 text-sm font-semibold text-primary",
              !largo && "mt-4",
            )}
          >
            Ver o que falta
            <ArrowRight
              className="h-4 w-4 shrink-0 transition-transform duration-200 ease-suave group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
