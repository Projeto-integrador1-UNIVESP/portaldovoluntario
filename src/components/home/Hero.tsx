import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { RevelarTexto } from "@/components/common/RevelarTexto";
import { FOTOS } from "@/lib/fotos";
import { formatDate } from "@/lib/format";
import type { NecessidadeUrgente, UltimaConfirmacao } from "@/hooks/queries/useHome";
import { tituloDoPedido, linkParaDoar } from "@/components/common/CardNecessidadeUrgente";

type HeroProps = {
  /** O pedido mais urgente, que flutua sobre a foto. */
  pedido: NecessidadeUrgente | null;
  /** `undefined` enquanto carrega; `null` quando não há confirmação. */
  confirmacao: UltimaConfirmacao | null | undefined;
  carregando: boolean;
};

/**
 * Abertura da home: título à esquerda, foto recortada à direita e, sobre a
 * foto, um pedido real com a barra. Uma ação terracota; o resto é texto.
 */
export function Hero({ pedido, confirmacao, carregando }: HeroProps) {
  return (
    <section className="grao bg-background">
      <div className="container grid gap-12 py-14 md:grid-cols-12 md:items-center md:gap-8 md:py-24 lg:gap-14">
        <div className="md:col-span-7">
          <p className="rotulo-caps">Doação com recibo</p>
          <RevelarTexto
            texto="Do que as ONGs perto de você precisam hoje"
            destaque="hoje"
            className="texto-display mt-4 font-display text-3xl font-bold text-foreground"
          />
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Cobertores, arroz, um sábado de manhã ou um Pix. A ONG publica a
            quantidade e o prazo; você escolhe o pedido e doa direto para ela, sem taxa.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Button size="lg" variant="cta" asChild>
              <Link to="/projetos">
                Ver o que está faltando
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <a href="#como-a-conta-fecha" className="link-vivo font-medium text-foreground">
              Como a conta fecha
            </a>
          </div>
        </div>

        <div className="relative md:col-span-5">
          <div className="forma-organica-1 relative aspect-[4/5] overflow-hidden bg-secondary sm:aspect-[5/6]">
            <img
              src={FOTOS.hero.src}
              srcSet={FOTOS.hero.srcSet}
              sizes="(max-width: 768px) 100vw, 40vw"
              alt={FOTOS.hero.alt}
              // Minúsculo de propósito: o React 18 não conhece `fetchPriority`
              // e avisaria no console; o atributo passa direto para o DOM.
              {...({ fetchpriority: "high" } as Record<string, string>)}
              decoding="async"
              // Mais alta que a moldura, para o parallax nunca mostrar a borda.
              className="parallax-leve -mt-[6%] h-[112%] w-full object-cover"
            />
          </div>

          {/* Sobre a base da foto: no celular entra no fluxo com margem
              negativa; no desktop flutua para fora do recorte. */}
          {(carregando || pedido) && (
            <div className="relative z-10 -mt-14 mx-3 sm:mx-6 md:absolute md:-bottom-6 md:-left-8 md:mx-0 md:mt-0 md:w-[min(19rem,88%)] md:-rotate-2 lg:-left-12">
              {pedido ? (
                <CardFlutuante pedido={pedido} confirmacao={confirmacao} />
              ) : (
                <div className="rounded-xl bg-card p-5 shadow-alta" aria-hidden="true">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-6 w-4/5" />
                  <Skeleton className="mt-4 h-2 w-full rounded-full" />
                  <Skeleton className="mt-3 h-6 w-32 rounded-full" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CardFlutuante({
  pedido,
  confirmacao,
}: {
  pedido: NecessidadeUrgente;
  confirmacao: UltimaConfirmacao | null | undefined;
}) {
  return (
    <Link
      to={linkParaDoar(pedido)}
      className="elevavel block rounded-xl bg-card p-5 shadow-alta ring-1 ring-border/60 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="rotulo-caps truncate">{pedido.ong?.nome ?? "Pedido mais urgente"}</p>
      <p className="mt-2 font-display text-xl font-semibold leading-tight">{tituloDoPedido(pedido)}</p>
      <ProgressBar
        className="mt-3"
        arrecadado={pedido.arrecadado}
        meta={pedido.meta}
        tipo={pedido.tipo}
        unidade={pedido.unidade}
      />
      {/* O selo só aparece quando a última confirmação é deste mesmo projeto.
          A confirmação vem da plataforma inteira; colar o selo de outra ONG
          neste pedido seria afirmar um recebimento que não aconteceu. */}
      {confirmacao && pedido.projeto && confirmacao.projeto.id === pedido.projeto.id && (
        <div className="mt-3 border-t pt-3">
          <SeloConfirmacao confirmadaEm={confirmacao.confirmadaEm} />
          <p className="numero mt-1.5 text-xs text-muted-foreground">
            Última confirmação em {formatDate(confirmacao.confirmadaEm)}
          </p>
        </div>
      )}
    </Link>
  );
}
