import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CardNecessidadeUrgente } from "@/components/common/CardNecessidadeUrgente";
import { CabecalhoDeSecao } from "@/components/home/CabecalhoDeSecao";
import type { NecessidadeUrgente } from "@/hooks/queries/useHome";

type OQueFaltaProps = {
  pedidos: NecessidadeUrgente[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
};

/** Quantos pedidos cabem na coluna ao lado do destaque sem esticá-lo demais. */
const NA_LISTA = 3;

/**
 * Pedidos abertos em ritmo editorial: o mais urgente grande, com foto, e os
 * seguintes numa lista compacta ao lado. Grade uniforme de cards iguais é o
 * que faz um site parecer modelo pronto.
 */
export function OQueFalta({ pedidos, isPending, isError, onRetry }: OQueFaltaProps) {
  const [primeiro, ...resto] = pedidos ?? [];

  return (
    <section className="container py-14 md:py-20" aria-labelledby="titulo-urgentes">
      <CabecalhoDeSecao
        id="titulo-urgentes"
        eyebrow="Pedidos abertos"
        titulo="O que está faltando agora"
        link={{ label: "Ver todos os pedidos", to: "/projetos" }}
      />

      <div className="mt-8">
        {isPending ? (
          <div className="grid gap-5 lg:grid-cols-3" role="status" aria-live="polite">
            <span className="sr-only">Carregando pedidos…</span>
            <div className="overflow-hidden rounded-xl border bg-card lg:col-span-2">
              <Skeleton className="aspect-[2/1] w-full rounded-none" />
              <div className="p-6">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-3 h-8 w-3/4" />
                <Skeleton className="mt-6 h-3 w-full rounded-full" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: NA_LISTA }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-5 w-4/5" />
                  <Skeleton className="mt-4 h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : isError ? (
          <ErrorState title="Não foi possível carregar os pedidos" onRetry={onRetry} />
        ) : !primeiro ? (
          <EmptyState
            ilustracao="caixa"
            title="Nenhum pedido aberto no momento"
            description="Quando uma ONG publicar um pedido, ele aparece aqui primeiro."
            action={{ label: "Ver as ONGs cadastradas", to: "/ongs" }}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <CardNecessidadeUrgente
              necessidade={primeiro}
              variante="destaque"
              className="ao-rolar lg:col-span-2"
            />
            {resto.length > 0 && (
              <div className="ao-rolar-escalonado flex flex-col gap-4">
                {resto.slice(0, NA_LISTA).map((n) => (
                  <CardNecessidadeUrgente key={n.id} necessidade={n} variante="lista" />
                ))}
                {resto.length > NA_LISTA && (
                  <Link
                    to="/projetos"
                    className="link-vivo mt-auto self-start text-sm font-medium text-foreground"
                  >
                    Mais {resto.length - NA_LISTA} {resto.length - NA_LISTA === 1 ? "pedido aberto" : "pedidos abertos"}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
