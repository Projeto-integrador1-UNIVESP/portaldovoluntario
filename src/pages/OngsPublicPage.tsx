import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { CardOng, type OngCardData } from "@/components/common/CardOng";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

type OngDaLista = OngCardData & {
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
      "id, slug, nome, descricao, missao, cidade, estado, img_url, logo_url, img_capa, capa_url, verificada_em, causas",
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

  const verificadas = data?.filter((o) => o.verificada_em).length ?? 0;

  return (
    <PublicShell>
      <Seo
        title="ONGs parceiras"
        description="Conheça as organizações da plataforma, veja do que cada uma precisa agora e doe direto para ela."
      />

      <section className="container py-14 md:py-20" aria-labelledby="titulo-ongs">
        <header className="max-w-2xl">
          <p className="rotulo-caps">Quem recebe a sua doação</p>
          <h1 id="titulo-ongs" className="mt-2 font-display text-2xl-fluido font-bold">
            ONGs parceiras
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            Cada perfil mostra o CNPJ da organização e o que ela está pedindo hoje. A doação
            vai direto para a conta dela.
          </p>
        </header>

        <div className="mt-10">
          {isPending ? (
            <div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">Carregando as organizações…</span>
              {Array.from({ length: 6 }).map((_, i) => (
                <CardEsqueleto key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Não foi possível carregar as organizações"
              description="Pode ter sido a conexão. Tente de novo em alguns segundos."
              onRetry={() => refetch()}
            />
          ) : data.length === 0 ? (
            <EmptyState
              title="Nenhuma ONG cadastrada ainda"
              description="Assim que uma organização entrar na plataforma, ela aparece aqui."
              action={{ label: "Ver projetos abertos", to: "/projetos" }}
            />
          ) : (
            <>
              <p className="rotulo-caps">
                <span className="numero text-foreground">{data.length}</span>{" "}
                {data.length === 1 ? "organização" : "organizações"}
                {verificadas > 0 && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span className="numero text-foreground">{verificadas}</span>{" "}
                    {verificadas === 1 ? "verificada" : "verificadas"}
                  </>
                )}
              </p>

              <div className="ao-rolar-escalonado mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.map((ong) => (
                  <CardOng key={ong.id} ong={ong} pedidosAbertos={ong.necessidadesAbertas} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </PublicShell>
  );
}

/** Esqueleto com a forma do `CardOng`: capa 16:9, avatar sobreposto, nome, cidade, texto e rodapé. */
function CardEsqueleto() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sutil" aria-hidden="true">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="p-5 pt-0">
        <Skeleton className="-mt-6 h-12 w-12 rounded-full ring-4 ring-card" />
        <Skeleton className="mt-3 h-6 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-5/6" />
        <div className="mt-3 flex gap-1.5">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-5 h-5 w-full" />
      </div>
    </div>
  );
}
