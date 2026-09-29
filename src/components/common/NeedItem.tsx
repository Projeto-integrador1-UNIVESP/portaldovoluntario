import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CauseTag } from "@/components/common/CauseTag";
import { ProgressBar } from "@/components/common/ProgressBar";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPrazo, formatQuantidade } from "@/lib/format";

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
  /** Primeiro item de uma lista editorial: mais espaço e o número maior. */
  destaque?: boolean;
  /** Linha acima do nome, como o projeto a que o pedido pertence. */
  contexto?: ReactNode;
  className?: string;
};

/**
 * Uma necessidade na visão de quem doa.
 *
 * O número que recebe peso é **o que falta**: "faltam 68 cobertores" é um
 * pedido, "32 de 100" é um relatório. A barra fica embaixo como contexto e
 * só sobe com o que a ONG confirmou ter recebido.
 *
 * O botão é marinho: a ação terracota da página é uma só e mora no painel
 * ao lado, não em cada item da lista.
 */
export function NeedItem({ necessidade, linkDoar, destaque = false, contexto, className }: NeedItemProps) {
  const prazo = formatPrazo(necessidade.prazo);
  const urgente = necessidade.urgencia >= 3;
  const falta = Math.max(0, necessidade.meta - necessidade.arrecadado);
  const completa = falta === 0;
  const emReais = necessidade.tipo === "dinheiro";

  const quantidade = (valor: number) =>
    emReais
      ? formatCurrency(valor)
      : formatQuantidade(valor, necessidade.unidade);

  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border bg-card shadow-sutil",
        destaque ? "p-6" : "p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          {contexto && <p className="mb-1 text-xs text-muted-foreground">{contexto}</p>}
          <h3
            className={cn(
              "font-display font-semibold leading-snug",
              destaque ? "text-xl" : "text-lg",
            )}
          >
            {necessidade.nome}
          </h3>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {urgente && !completa && (
            <Badge variant="urgente">
              <Flame aria-hidden="true" />
              Urgente
            </Badge>
          )}
          {completa && <Badge variant="success">Meta atingida</Badge>}
        </div>
      </div>

      {/* Um único nó de texto: é a frase que o teste e o leitor de tela leem inteira. */}
      <p
        className={cn(
          "numero mt-2 font-display font-semibold leading-tight tracking-[-0.02em]",
          destaque ? "text-2xl-fluido" : "text-xl",
          completa ? "text-success" : "text-foreground",
        )}
      >
        {completa
          ? `${quantidade(necessidade.arrecadado)} já recebidos`
          : `Faltam ${quantidade(falta)}`}
      </p>

      {(necessidade.categoria || prazo) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {necessidade.categoria && <CauseTag causa={necessidade.categoria} />}
          {prazo && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
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
        <div className="mt-auto pt-4">
          <Button asChild className="w-full sm:w-auto">
            <Link to={linkDoar}>{emReais ? "Doar por Pix" : "Doar este item"}</Link>
          </Button>
        </div>
      )}
    </li>
  );
}
