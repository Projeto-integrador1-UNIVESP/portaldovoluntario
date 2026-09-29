import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
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
  className?: string;
};

/**
 * Card de organização. Um só, para a home e para a listagem: antes eram dois
 * componentes divergentes, com selos e capas diferentes.
 */
export function CardOng({ ong, layout = "vertical", className }: CardOngProps) {
  const capa = ong.capa_url || ong.img_capa;
  const texto = ong.missao || ong.descricao || "Esta organização ainda não publicou sua missão.";
  const local = ong.cidade ? `${ong.cidade}${ong.estado ? `, ${ong.estado}` : ""}` : null;
  const causas = (ong.causas ?? []).slice(0, 2);

  return (
    <Link
      to={`/ongs/${ong.slug ?? ong.id}`}
      className={cn(
        "elevavel group flex overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        layout === "horizontal" ? "flex-row" : "h-full flex-col",
        className,
      )}
    >
      <Capa
        src={capa}
        alt=""
        id={ong.id}
        nome={ong.nome}
        causa={ong.causas}
        className={cn("foto-zoom shrink-0", layout === "horizontal" ? "w-32 sm:w-40" : "h-36 w-full")}
      />

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <OngAvatar nome={ong.nome} logoUrl={ong.logo_url} imgUrl={ong.img_url} tamanho="sm" />
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 font-display text-lg font-semibold leading-tight">
              <span className="truncate">{ong.nome}</span>
              <SeloVerificada verificadaEm={ong.verificada_em} variante="icone" />
            </h3>
            {local && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{local}</span>
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{texto}</p>

        {causas.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {causas.map((c) => (
              <CauseTag key={c} causa={c} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
