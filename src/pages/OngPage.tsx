import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck, Building2, CalendarDays, Globe, Instagram, MapPin, PackageCheck, Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { CauseTag } from "@/components/common/CauseTag";
import { Callout } from "@/components/common/Callout";
import { Capa } from "@/components/common/Capa";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { OngAvatar } from "@/components/common/OngAvatar";
import { Stat } from "@/components/common/Stat";
import { TaxaDeConfirmacao } from "@/components/common/SeloConfirmacao";
import { CardNecessidadeUrgente } from "@/components/common/CardNecessidadeUrgente";
import { ProjectCard, type ProjetoCardData } from "@/components/common/ProjectCard";
import { ShareButton } from "@/components/common/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { NecessidadeUrgente } from "@/hooks/queries/useHome";
import { formatCnpj, formatCurrency, formatPhone } from "@/lib/format";
import { normalizeUrl } from "@/lib/validators";

const ehUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const num = (v: unknown) => Number(v ?? 0);

async function buscarOng(identificador: string) {
  const { data: ong, error } = await supabase
    .from("ongs")
    .select(
      "id, slug, nome, cnpj, descricao, missao, cidade, estado, logradouro, telefone, site, instagram, img_url, img_capa, logo_url, capa_url, causas, verificada_em, fundada_em, area_atuacao, endereco_entrega, horarios_recebimento",
    )
    .eq(ehUuid(identificador) ? "id" : "slug", identificador)
    .eq("status", true)
    .maybeSingle();

  if (error) throw error;
  if (!ong) return null;

  const { data: projetosData, error: erroProjetos } = await supabase
    .from("projetos")
    .select("id, slug, nome_projeto, descricao, img_url, capa_url, data_fim, cidade")
    .eq("id_ong", ong.id)
    .eq("status", true)
    .order("created_at", { ascending: false });
  if (erroProjetos) throw erroProjetos;

  const projetos = projetosData ?? [];

  // As necessidades são o diferencial do perfil, e vivem penduradas no
  // projeto, não na ONG — por isso a busca passa pelos projetos ativos dela.
  let necessidades: NecessidadeUrgente[] = [];
  // `arrecadado` só sobe quando a ONG confirma o recebimento (trigger em
  // `doacoes`). É, portanto, a única prova de confirmação que a RLS expõe ao
  // visitante anônimo — e soma inclusive as metas já batidas.
  const confirmado = { itens: 0, valor: 0 };

  if (projetos.length) {
    const { data, error: erroNecessidades } = await supabase
      .from("necessidades")
      .select("id, nome, tipo, unidade, meta, arrecadado, urgencia, prazo, id_projeto")
      .in("id_projeto", projetos.map((p) => p.id))
      .eq("status", true)
      .order("urgencia", { ascending: false });
    if (erroNecessidades) throw erroNecessidades;

    const porProjeto = new Map(projetos.map((p) => [p.id, p]));

    for (const n of data ?? []) {
      if (n.tipo === "dinheiro") confirmado.valor += num(n.arrecadado);
      else confirmado.itens += num(n.arrecadado);
    }

    necessidades = (data ?? [])
      .map((n) => {
        const projeto = porProjeto.get(n.id_projeto);
        return {
          id: n.id,
          nome: n.nome,
          tipo: n.tipo as "item" | "dinheiro",
          unidade: n.unidade,
          meta: num(n.meta),
          arrecadado: num(n.arrecadado),
          urgencia: n.urgencia,
          prazo: n.prazo,
          projeto: projeto
            ? { id: projeto.id, slug: projeto.slug, nome_projeto: projeto.nome_projeto }
            : null,
          // Repetir o nome da ONG em cada card, dentro do perfil dela, é ruído.
          ong: null,
        };
      })
      .filter((n) => n.arrecadado < n.meta);
  }

  // Agregado por RPC: contar linha a linha voltaria zerado pela RLS para o
  // visitante anônimo, que é exatamente quem precisa desse dado para confiar.
  const { data: taxa } = await supabase.rpc("get_taxa_confirmacao_ong", { _ong_id: ong.id });
  const linha = taxa?.[0];
  const reputacao = {
    total: Number(linha?.total ?? 0),
    confirmadas: Number(linha?.confirmadas ?? 0),
    diasMedio: linha?.dias_medio_para_confirmar === null || linha === undefined
      ? null
      : Number(linha.dias_medio_para_confirmar),
  };

  return { ong, projetos, necessidades, confirmado, reputacao };
}

/** Ano de fundação sem passar pelo parse de data: "2014-03-01" já traz o ano. */
const anosDeAtuacao = (fundadaEm: string | null) => {
  const ano = Number(String(fundadaEm ?? "").slice(0, 4));
  if (!ano) return null;
  const anos = new Date().getFullYear() - ano;
  return anos >= 0 ? anos : null;
};

/**
 * Perfil público da ONG.
 *
 * É a página em que a pessoa decide se confia o suficiente para transferir
 * dinheiro. Por isso a ordem não é institucional: primeiro identidade e ação,
 * depois o que a organização está pedindo agora, e a prova de confiança
 * (CNPJ, tempo de atuação, contato, taxa de confirmação) sempre visível ao
 * lado — não num rodapé que ninguém rola.
 */
export default function OngPage() {
  const { slug } = useParams();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong", slug],
    queryFn: () => buscarOng(slug!),
    enabled: Boolean(slug),
  });

  if (isPending) return <PublicShell><EsqueletoPerfil /></PublicShell>;

  if (isError) {
    return (
      <PublicShell>
        <Seo title="Não foi possível carregar a ONG" noIndex />
        <div className="container py-14">
          <ErrorState
            title="Não foi possível carregar esta organização"
            description="Pode ter sido uma falha de conexão. Tente de novo em alguns segundos."
            onRetry={() => refetch()}
          />
        </div>
        <Footer />
      </PublicShell>
    );
  }

  if (!data) {
    return (
      <PublicShell>
        <Seo title="ONG não encontrada" noIndex />
        <div className="container py-14">
          <EmptyState
            icon={Building2}
            title="ONG não encontrada"
            description="Ela pode ter saído da plataforma ou o link está incorreto."
            action={{ label: "Ver ONGs parceiras", to: "/ongs" }}
          />
        </div>
        <Footer />
      </PublicShell>
    );
  }

  const { ong, projetos, necessidades, confirmado, reputacao } = data;
  const capa = ong.capa_url || ong.img_capa;
  const verificada = Boolean(ong.verificada_em);
  const anos = anosDeAtuacao(ong.fundada_em);
  const missao = ong.missao || ong.descricao;
  const linkDoar = `/doar/${ong.id}`;

  return (
    <PublicShell>
      <Seo
        title={ong.nome}
        description={missao || `Veja do que a ${ong.nome} precisa agora e ajude direto.`}
        image={capa ?? undefined}
      />

      <div className="container pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Início</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/ongs">ONGs</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              {/* Nome comprido não pode empurrar o layout em 375px. */}
              <BreadcrumbPage className="block max-w-[11rem] truncate sm:max-w-sm" title={ong.nome}>
                {ong.nome}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mt-4">
        {/* `alt=""`: o nome da ONG vem logo abaixo, e o contrato proíbe repetir
            no alt um texto já visível. */}
        <Capa src={capa} alt="" id={ong.id} className="h-40 w-full rounded-xl border md:h-56" />
      </div>

      <div className="container pb-28 md:pb-10">
        {/* ── Identidade ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-4 md:gap-6">
          <OngAvatar
            nome={ong.nome}
            logoUrl={ong.logo_url}
            imgUrl={ong.img_url}
            tamanho="lg"
            className="-mt-10 ring-4 ring-background md:-mt-12 md:h-24 md:w-24"
          />

          <div className="min-w-0 flex-1 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">{ong.nome}</h1>
              {verificada && (
                <Badge className="gap-1 bg-success text-success-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  ONG verificada
                </Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {ong.cidade && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {ong.cidade}{ong.estado ? `, ${ong.estado}` : ""}
                </span>
              )}
              {anos !== null && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {anos >= 1
                    ? `${anos} ${anos === 1 ? "ano" : "anos"} de atuação`
                    : `Fundada em ${String(ong.fundada_em).slice(0, 4)}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {Array.isArray(ong.causas) && ong.causas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ong.causas.map((causa: string) => (
              <CauseTag key={causa} causa={causa} />
            ))}
          </div>
        )}

        {/* Doar vem aqui, não no fim da página: é a ação da tela. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="hidden md:block">
            <Button size="lg" variant="cta" asChild className="pressionavel shadow-cta">
              <Link to={linkDoar}>Doar para esta ONG</Link>
            </Button>
          </div>
          <ShareButton titulo={ong.nome} />
        </div>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <div className="min-w-0">
            {/* ── O que falta agora ──────────────────────────────────────── */}
            <section aria-labelledby="titulo-necessidades">
              <h2 id="titulo-necessidades" className="font-display text-2xl font-bold">
                O que esta ONG precisa agora
              </h2>
              <p className="mt-1 text-muted-foreground">
                Pedidos publicados pela própria organização, com quantidade e prazo.
              </p>

              <div className="mt-6">
                {necessidades.length === 0 ? (
                  <EmptyState
                    icon={PackageCheck}
                    title="Nenhuma necessidade aberta agora"
                    description="Esta organização não tem pedidos em aberto no momento. Você ainda pode contribuir com uma doação livre."
                    action={{ label: "Doar para esta ONG", to: linkDoar }}
                  />
                ) : (
                  <div className="ao-rolar-escalonado grid gap-5 sm:grid-cols-2">
                    {necessidades.map((n) => (
                      <CardNecessidadeUrgente key={n.id} necessidade={n} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── Quem são ───────────────────────────────────────────────── */}
            {missao && (
              <section className="mt-14" aria-labelledby="titulo-missao">
                <h2 id="titulo-missao" className="font-display text-2xl font-bold">
                  Quem são
                </h2>
                <p className="mt-6 whitespace-pre-line text-muted-foreground">{missao}</p>
              </section>
            )}

            {/* ── Projetos ───────────────────────────────────────────────── */}
            <section className="mt-14" aria-labelledby="titulo-projetos">
              <h2 id="titulo-projetos" className="font-display text-2xl font-bold">
                Projetos
              </h2>

              <div className="mt-6">
                {projetos.length === 0 ? (
                  <EmptyState
                    title="Nenhum projeto ativo no momento"
                    description="Assim que esta ONG publicar um projeto, ele aparece aqui."
                    action={{ label: "Ver projetos de outras ONGs", to: "/projetos" }}
                  />
                ) : (
                  <div className="ao-rolar-escalonado grid gap-5 sm:grid-cols-2">
                    {projetos.map((p) => (
                      <ProjectCard
                        key={p.id}
                        projeto={{
                          ...p,
                          img_url: p.capa_url || p.img_url,
                          ongNome: null,
                          slug: p.slug,
                        } as ProjetoCardData}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Confiança ────────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-6" aria-labelledby="titulo-confianca">
            <div className="rounded-xl border bg-card p-6 shadow-sutil">
              <h2 id="titulo-confianca" className="font-display text-lg font-bold">
                Por que confiar nesta ONG
              </h2>

              <dl className="mt-6 space-y-3 text-sm">
                {ong.cnpj && <Linha rotulo="CNPJ" valor={formatCnpj(ong.cnpj)} />}
                {anos !== null && anos >= 1 && (
                  <Linha rotulo="Tempo de atuação" valor={`${anos} ${anos === 1 ? "ano" : "anos"}`} />
                )}
                {ong.area_atuacao && <Linha rotulo="Área de atuação" valor={ong.area_atuacao} />}
                {ong.cidade && (
                  <Linha
                    rotulo="Cidade"
                    valor={`${ong.cidade}${ong.estado ? `, ${ong.estado}` : ""}`}
                  />
                )}
                {ong.logradouro && <Linha rotulo="Endereço" valor={ong.logradouro} />}
              </dl>

              {/* O que já chegou de fato. Estes números só existem porque
                  alguém da ONG confirmou o recebimento — é a tese da
                  plataforma em forma de dado público. */}
              {(confirmado.itens > 0 || confirmado.valor > 0) && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {confirmado.itens > 0 && (
                    <Stat
                      valor={Math.round(confirmado.itens)}
                      rotulo="itens recebidos e confirmados"
                      icone={PackageCheck}
                    />
                  )}
                  {confirmado.valor > 0 && (
                    <Stat
                      valor={formatCurrency(confirmado.valor)}
                      rotulo="em dinheiro confirmado"
                      icone={BadgeCheck}
                    />
                  )}
                </div>
              )}

              {reputacao.total > 0 && (
                <TaxaDeConfirmacao
                  className="mt-6 border-t pt-6"
                  confirmadas={reputacao.confirmadas}
                  total={reputacao.total}
                />
              )}

              <Callout tom="confianca" className="mt-6">
                O progresso que você vê nesta página só avança quando alguém desta
                organização confirma que recebeu. É por isso que o número significa
                alguma coisa.
              </Callout>

              {!ong.cnpj && (
                // Ausência de CNPJ não é irregularidade — várias iniciativas locais
                // funcionam sem. Mas é um dado a menos para checar, e quem vai
                // transferir dinheiro merece saber disso antes, não depois.
                <Callout tom="atencao" titulo="CNPJ ainda não informado" className="mt-4">
                  Esta organização não publicou o CNPJ aqui. Antes de doar, vale falar
                  com ela pelo contato abaixo e confirmar para quem o valor vai.
                </Callout>
              )}
            </div>

            <div className="mt-6 rounded-xl border bg-card p-6 shadow-sutil">
              <h2 className="font-display text-lg font-bold">Falar com a organização</h2>

              <ul className="mt-6 space-y-3 text-sm">
                {ong.telefone && (
                  <li>
                    <a
                      href={`tel:${ong.telefone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-2 text-primary underline underline-offset-2"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {formatPhone(ong.telefone)}
                    </a>
                  </li>
                )}
                {ong.site && (
                  <li>
                    <a
                      href={normalizeUrl(ong.site)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary underline underline-offset-2"
                    >
                      <Globe className="h-4 w-4" aria-hidden="true" />
                      Site oficial
                    </a>
                  </li>
                )}
                {ong.instagram && (
                  <li>
                    <a
                      href={`https://instagram.com/${ong.instagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary underline underline-offset-2"
                    >
                      <Instagram className="h-4 w-4" aria-hidden="true" />
                      @{ong.instagram.replace(/^@/, "")}
                    </a>
                  </li>
                )}
                {!ong.telefone && !ong.site && !ong.instagram && (
                  <li className="text-muted-foreground">
                    Esta organização ainda não publicou um canal de contato.
                  </li>
                )}
              </ul>

              {ong.endereco_entrega && (
                <div className="mt-6 border-t pt-6 text-sm">
                  <p className="font-medium">Entrega de doações</p>
                  <p className="mt-1 text-muted-foreground">{ong.endereco_entrega}</p>
                  {ong.horarios_recebimento && (
                    <p className="text-muted-foreground">{ong.horarios_recebimento}</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* No celular o CTA fica sempre alcançável, sem depender de rolar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 md:hidden">
        <Button size="lg" variant="cta" asChild className="pressionavel w-full shadow-cta">
          <Link to={linkDoar}>Doar para esta ONG</Link>
        </Button>
      </div>

      <Footer />
    </PublicShell>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{valor}</dd>
    </div>
  );
}

/** Carregando com a forma do perfil, para a página não saltar ao chegar. */
function EsqueletoPerfil() {
  return (
    <div className="container py-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando o perfil da organização…</span>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-40 w-full rounded-xl md:h-56" />
      <div className="flex flex-wrap items-end gap-4">
        <Skeleton className="-mt-10 h-20 w-20 rounded-full" />
        <div className="min-w-0 flex-1 pt-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
      </div>
      <Skeleton className="mt-6 h-11 w-56" />
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
