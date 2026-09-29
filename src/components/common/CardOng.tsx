import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { Capa } from "@/components/common/Capa";
import { OngAvatar } from "@/components/common/OngAvatar";
import { SeloVerificada } from "@/components/common/SeloVerificada";
import { CauseTag } from "@/components/common/CauseTag";
import { cn } from "@/lib/utils";

export type OngCardData = {
  id: string;
  slug?: string | null;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  missao?: string | null;
  descricao?: string | null;
  causas?: string[] | null;
  capa_url?: string | null;
  img_capa?: string | null;
  logo_url?: string | null;
  img_url?: string | null;
  verificada_em?: string | null;
};

type CardOngProps = {
  ong: OngCardData;
  /** `horizontal` para listas curtas (home); `vertical` para a grade. */
  layout?: "horizontal" | "vertical";
  /**
   * Necessidades ativas com meta ainda não atingida. Quando informado, o
   * rodapé diz quantos pedidos a organização tem em aberto; a listagem pública
   * calcula isso, a home não.
   */
  pedidosAbertos?: number;
  className?: string;
};

const textoDePedidos = (n: number) =>
  n === 0 ? "Nenhum pedido aberto" : n === 1 ? "1 pedido aberto" : `${n} pedidos abertos`;

/**
 * Card de organização. Um só, para a home e para a listagem: antes eram dois
 * componentes divergentes, com selos e capas diferentes.
 *
 * O card inteiro é um link para o perfil. Não há botão de doar aqui de
 * propósito: link dentro de link é HTML inválido, e ver de quem se trata vem
 * antes de transferir dinheiro.
 */
export function CardOng({ ong, layout = "vertical", pedidosAbertos, className }: CardOngProps) {
  const horizontal = layout === "horizontal";
  const capa = ong.capa_url || ong.img_capa;
  const texto = ong.missao || ong.descricao || "Esta organização ainda não publicou sua missão.";
  const local = ong.cidade ? `${ong.cidade}${ong.estado ? `, ${ong.estado}` : ""}` : null;
  const causas = (ong.causas ?? []).slice(0, 2);

  return (
    <Link
      to={`/ongs/${ong.slug ?? ong.id}`}
      className={cn(
        "elevavel group flex overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        horizontal ? "flex-row" : "h-full flex-col",
        className,
      )}
    >
      {/* `alt=""`: o nome da organização vem logo abaixo. */}
      <Capa
        src={capa}
        alt=""
        id={ong.id}
        nome={ong.nome}
        causa={ong.causas}
        className={cn("foto-zoom shrink-0", horizontal ? "w-32 sm:w-40" : "aspect-[16/9] w-full")}
      />

      <div className={cn("flex min-w-0 flex-1 flex-col p-5", !horizontal && "pt-0")}>
        {/* Na vertical o avatar sobe sobre a capa, como um selo colado no
            papel; na horizontal a capa é estreita e ele fica ao lado do nome. */}
        {horizontal ? (
          <div className="flex items-start gap-3">
            <OngAvatar nome={ong.nome} logoUrl={ong.logo_url} imgUrl={ong.img_url} tamanho="sm" />
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 font-display text-lg font-semibold leading-tight">
                <span className="truncate">{ong.nome}</span>
                <SeloVerificada verificadaEm={ong.verificada_em} variante="icone" />
              </h3>
              {local && (
                <p className="mt-0.5 inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{local}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <OngAvatar
              nome={ong.nome}
              logoUrl={ong.logo_url}
              imgUrl={ong.img_url}
              tamanho="md"
              className="-mt-6 ring-4 ring-card"
            />
            <h3 className="mt-3 line-clamp-2 font-display text-lg font-semibold leading-snug">
              {ong.nome}
            </h3>
            {(local || ong.verificada_em) && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {local && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{local}</span>
                  </span>
                )}
                {local && ong.verificada_em && <span aria-hidden="true">·</span>}
                <SeloVerificada verificadaEm={ong.verificada_em} />
              </p>
            )}
          </>
        )}

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{texto}</p>

        {causas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {causas.map((c) => (
              <CauseTag key={c} causa={c} />
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3.5 text-sm">
            {pedidosAbertos !== undefined ? (
              <span className="numero text-muted-foreground">
                {textoDePedidos(pedidosAbertos)}
              </span>
            ) : (
              <span />
            )}
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">
              Ver perfil
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 ease-suave group-hover:translate-x-1 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
