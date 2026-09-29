import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CardOng, type OngCardData } from "@/components/common/CardOng";
import { CabecalhoDeSecao } from "@/components/home/CabecalhoDeSecao";
import { useIsMobile } from "@/hooks/use-mobile";

type OrganizacoesProps = {
  ongs: OngCardData[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
};

/**
 * Quem publica os pedidos, em duas colunas de cards horizontais. No celular
 * o card fica na vertical: com a capa ao lado sobrava pouco para o nome, e
 * "Casa de Acolhimento" virava "Casa de A…".
 */
export function Organizacoes({ ongs, isPending, isError, onRetry }: OrganizacoesProps) {
  const celular = useIsMobile();

  return (
    <section className="container py-14 md:py-20" aria-labelledby="titulo-ongs">
      <CabecalhoDeSecao
        id="titulo-ongs"
        eyebrow="Quem publica os pedidos"
        titulo="Organizações"
        link={{ label: "Ver todas as ONGs", to: "/ongs" }}
      />

      <div className="mt-8">
        {isPending ? (
          <div className="grid gap-5 md:grid-cols-2" role="status" aria-live="polite">
            <span className="sr-only">Carregando organizações…</span>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xl border bg-card md:flex-row">
                <Skeleton className="h-36 w-full shrink-0 rounded-none md:h-auto md:w-40" />
                <div className="flex-1 p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="mt-1.5 h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Não foi possível carregar as organizações" onRetry={onRetry} />
        ) : !ongs || ongs.length === 0 ? (
          <EmptyState
            title="Nenhuma ONG cadastrada ainda"
            description="Trabalha em uma organização? Cadastre a sua e publique o primeiro pedido."
            action={{ label: "Cadastrar minha ONG", to: "/cadastro?tipo=ong" }}
          />
        ) : (
          <div className="ao-rolar-escalonado grid gap-5 md:grid-cols-2">
            {ongs.map((o) => (
              <CardOng key={o.id} ong={o} layout={celular ? "vertical" : "horizontal"} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
