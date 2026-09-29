import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Building2, MapPin, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { Capa } from "@/components/common/Capa";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { OngAvatar } from "@/components/common/OngAvatar";
import { Skeleton } from "@/components/ui/skeleton";

type OngDaLista = {
  id: string;
  slug: string | null;
  nome: string;
  missao: string | null;
  descricao: string | null;
  cidade: string | null;
  estado: string | null;
  logo_url: string | null;
  img_url: string | null;
  capa_url: string | null;
  img_capa: string | null;
  verificada_em: string | null;
  /** Necessidades ativas com meta ainda não atingida. */
  necessidadesAbertas: number;
};

/**
 * Necessidade pertence a projeto, e projeto pertence a ONG: para contar o que
 * cada organização está pedindo é preciso passar pelos projetos. Três leituras,
 * o mesmo caminho que a home já faz.
 */
async function buscarOngs(): Promise<OngDaLista[]> {
  const { data: ongs, error } = await supabase
    .from("ongs")
    .select(
      "id, slug, nome, descricao, missao, cidade, estado, img_url, logo_url, img_capa, capa_url, verificada_em",
    )
    .eq("status", true)
    .order("verificada_em", { ascending: false, nullsFirst: false })
    .order("nome");

  if (error) throw error;
  if (!ongs?.length) return [];

  const { data: projetos, error: erroProjetos } = await supabase
    .from("projetos")
    .select("id, id_ong")
    .in("id_ong", ongs.map((o) => o.id))
    .eq("status", true);
  if (erroProjetos) throw erroProjetos;

  const abertasPorOng = new Map<string, number>();

  if (projetos?.length) {
    const { data: necessidades, error: erroNecessidades } = await supabase
      .from("necessidades")
      .select("id_projeto, meta, arrecadado")
      .in("id_projeto", projetos.map((p) => p.id))
      .eq("status", true);
    if (erroNecessidades) throw erroNecessidades;

    const ongDoProjeto = new Map(projetos.map((p) => [p.id, p.id_ong]));

    for (const n of necessidades ?? []) {
      if (Number(n.arrecadado ?? 0) >= Number(n.meta ?? 0)) continue;
      const idOng = ongDoProjeto.get(n.id_projeto);
      if (idOng) abertasPorOng.set(idOng, (abertasPorOng.get(idOng) ?? 0) + 1);
    }
  }

  return ongs.map((o) => ({ ...o, necessidadesAbertas: abertasPorOng.get(o.id) ?? 0 }));
}

/** Listagem pública de organizações. */
export default function OngsPublicPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ongs-publicas"],
    queryFn: buscarOngs,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <PublicShell>
      <Seo
        title="ONGs parceiras"
        description="Conheça as organizações da plataforma, veja do que cada uma precisa agora e doe direto para ela."
      />

      <section className="container py-14" aria-labelledby="titulo-ongs">
        <h1 id="titulo-ongs" className="font-display text-2xl font-bold tracking-[-0.02em]">
          Organizações parceiras
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Cada perfil mostra CNPJ, tempo de atuação e o que a organização está pedindo
          hoje. Sua doação vai direto para ela.
        </p>

        <div className="mt-6">
          {isPending ? (
            <div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">Carregando as organizações…</span>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card shadow-sutil">
                  <Skeleton className="h-28 w-full rounded-b-none rounded-t-xl" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-1/3" />
                    <Skeleton className="mt-4 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Não foi possível carregar as organizações"
              description="Pode ter sido a conexão. Tente de novo em alguns segundos."
              onRetry={() => refetch()}
            />
          ) : data!.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma ONG cadastrada ainda"
              description="Assim que uma organização entrar na plataforma, ela aparece aqui."
              action={{ label: "Ver projetos abertos", to: "/projetos" }}
            />
          ) : (
            <div className="ao-rolar-escalonado grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data!.map((ong) => (
                <CardOng key={ong.id} ong={ong} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </PublicShell>
  );
}

/**
 * O card inteiro é um link para o perfil. Não há botão de doar aqui de
 * propósito: link dentro de link é HTML inválido, e ver de quem se trata vem
 * antes de transferir dinheiro.
 */
function CardOng({ ong }: { ong: OngDaLista }) {
  const capa = ong.capa_url || ong.img_capa;

  return (
    <Link
      to={`/ongs/${ong.slug ?? ong.id}`}
      className="elevavel group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* `alt=""`: o nome da organização aparece logo abaixo. */}
      <Capa src={capa} alt="" id={ong.id} className="h-28 w-full" />

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex min-w-0 items-start gap-3">
          <OngAvatar
            nome={ong.nome}
            logoUrl={ong.logo_url}
            imgUrl={ong.img_url}
            tamanho="sm"
            className="-mt-9 ring-4 ring-card"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display font-bold" title={ong.nome}>
              {ong.nome}
            </h2>
            {ong.cidade && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {ong.cidade}{ong.estado ? `, ${ong.estado}` : ""}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
          {ong.missao || ong.descricao || "Esta organização ainda não publicou sua missão."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          {ong.verificada_em && (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verificada
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {ong.necessidadesAbertas === 0
              ? "Nenhum pedido aberto"
              : `${ong.necessidadesAbertas} ${ong.necessidadesAbertas === 1 ? "pedido aberto" : "pedidos abertos"}`}
          </span>
        </div>

        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
          Ver perfil e pedidos
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
