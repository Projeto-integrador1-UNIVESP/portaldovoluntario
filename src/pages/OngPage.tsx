import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Globe, Instagram, MapPin, PackageCheck, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { BarraFixaInferior } from "@/components/common/BarraFixaInferior";
import { Callout } from "@/components/common/Callout";
import { Capa } from "@/components/common/Capa";
import { CauseTag } from "@/components/common/CauseTag";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { NeedItem, type Necessidade } from "@/components/common/NeedItem";
import { OngAvatar } from "@/components/common/OngAvatar";
import { ProjectCard, type ProjetoCardData } from "@/components/common/ProjectCard";
import { SeloVerificada } from "@/components/common/SeloVerificada";
import { ShareButton } from "@/components/common/ShareButton";
import { Stat } from "@/components/common/Stat";
import { TaxaDeConfirmacao } from "@/components/common/SeloConfirmacao";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatCnpj, formatCurrency, formatPhone } from "@/lib/format";
import { normalizeUrl } from "@/lib/validators";
import { cn } from "@/lib/utils";

const ehUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const num = (v: unknown) => Number(v ?? 0);

type NecessidadeDaOng = Necessidade & {
  projeto: { id: string; slug: string | null; nome_projeto: string } | null;
};

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
    .select("id, slug, nome_projeto, descricao, img_url, capa_url, data_fim, cidade, causa")
    .eq("id_ong", ong.id)
    .eq("status", true)
    .order("created_at", { ascending: false });
  if (erroProjetos) throw erroProjetos;

  const projetos = projetosData ?? [];

  // As necessidades são o diferencial do perfil, e vivem penduradas no
  // projeto, não na ONG. Por isso a busca passa pelos projetos ativos dela.
  let necessidades: NecessidadeDaOng[] = [];
  // `arrecadado` só sobe quando a ONG confirma o recebimento (trigger em
  // `doacoes`). É a única prova de confirmação que a RLS expõe ao visitante
  // anônimo, e soma inclusive as metas já batidas.
  const confirmado = { itens: 0, valor: 0 };

  if (projetos.length) {
    const { data, error: erroNecessidades } = await supabase
      .from("necessidades")
      .select("id, nome, tipo, categoria, unidade, meta, arrecadado, urgencia, prazo, id_projeto")
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
          categoria: n.categoria ?? null,
          unidade: n.unidade,
          meta: num(n.meta),
          arrecadado: num(n.arrecadado),
          urgencia: n.urgencia,
          prazo: n.prazo,
          projeto: projeto
            ? { id: projeto.id, slug: projeto.slug, nome_projeto: projeto.nome_projeto }
            : null,
        };
      })
      .filter((n) => n.arrecadado < n.meta);
  }

  // Agregado por RPC: contar linha a linha voltaria zerado pela RLS para o
  // visitante anônimo, que é quem mais precisa desse dado para confiar.
  const { data: taxa } = await supabase.rpc("get_taxa_confirmacao_ong", { _ong_id: ong.id });
  const linha = taxa?.[0];
  const reputacao = {
    total: Number(linha?.total ?? 0),
    confirmadas: Number(linha?.confirmadas ?? 0),
  };

  return { ong, projetos, necessidades, confirmado, reputacao };
}

/** Ano de fundação sem passar pelo parse de data: "2014-03-01" já traz o ano. */
const anoDeFundacao = (fundadaEm: string | null) => {
  const ano = Number(String(fundadaEm ?? "").slice(0, 4));
  return ano || null;
};

const anosDeAtuacao = (fundadaEm: string | null) => {
  const ano = anoDeFundacao(fundadaEm);
  if (!ano) return null;
  const anos = new Date().getFullYear() - ano;
  return anos >= 0 ? anos : null;
};

/**
 * Perfil público da ONG.
 *
 * É a página em que a pessoa decide se confia o suficiente para transferir
 * dinheiro. Por isso a ordem não é institucional: identidade, o que a
 * organização está pedindo agora, e a prova de confiança (número confirmado,
 * taxa de confirmação, CNPJ, tempo de atuação) num painel que acompanha a
 * rolagem, com a única ação terracota da página.
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
        <div className="container max-w-4xl py-14 md:py-20">
          <ErrorState
            title="Não foi possível carregar esta organização"
            description="Pode ter sido a conexão. Tente de novo em alguns segundos."
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
        <div className="container max-w-4xl py-14 md:py-20">
          <EmptyState
            ilustracao="perdido"
            title="ONG não encontrada"
            description="Ela pode ter saído da plataforma ou o link está incorreto."
            action={{ label: "Ver as ONGs parceiras", to: "/ongs" }}
          />
        </div>
        <Footer />
      </PublicShell>
    );
  }

  const { ong, projetos, necessidades, confirmado, reputacao } = data;
  const capa = ong.capa_url || ong.img_capa;
  const anos = anosDeAtuacao(ong.fundada_em);
  const fundacao = anoDeFundacao(ong.fundada_em);
  const missao = ong.missao || ong.descricao;
  const linkDoar = `/doar/${ong.id}`;
  const causas: string[] = Array.isArray(ong.causas) ? ong.causas : [];
  const [primeira, ...demais] = necessidades;
  const temContato = Boolean(
    ong.telefone || ong.site || ong.instagram || ong.logradouro || ong.endereco_entrega,
  );

  const linkDaNecessidade = (n: NecessidadeDaOng) =>
    n.projeto ? `/doar/projeto/${n.projeto.slug ?? n.projeto.id}?necessidade=${n.id}` : undefined;

  const contextoDaNecessidade = (n: NecessidadeDaOng) =>
    n.projeto ? (
      <>
        No projeto{" "}
        <Link
          to={`/projetos/${n.projeto.slug ?? n.projeto.id}`}
          className="link-vivo font-medium text-primary"
        >
          {n.projeto.nome_projeto}
        </Link>
      </>
    ) : undefined;

  return (
    <PublicShell>
      <Seo
        title={ong.nome}
        description={missao || `Veja do que a ${ong.nome} precisa agora e ajude direto.`}
        image={capa ?? undefined}
      />

      <div>
        <div className="container pt-4 md:pt-6">
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

          {/* `alt=""`: o nome da ONG vem logo abaixo, e repetir no alt um texto
              visível é ruído para o leitor de tela. Sem foto própria, a capa
              vem da causa, com a etiqueta de imagem ilustrativa. */}
          <Capa
            src={capa}
            alt=""
            id={ong.id}
            nome={ong.nome}
            causa={causas}
            sizes="100vw"
            className="mt-4 h-52 w-full rounded-destaque shadow-media md:h-80"
          />

          {/* ── Identidade ──────────────────────────────────────────────── */}
          <header className="px-1 sm:px-6">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <OngAvatar
                nome={ong.nome}
                logoUrl={ong.logo_url}
                imgUrl={ong.img_url}
                tamanho="lg"
                className="-mt-12 h-24 w-24 ring-4 ring-background md:-mt-14 md:h-28 md:w-28"
              />

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="font-display text-2xl-fluido font-bold">{ong.nome}</h1>
                  <SeloVerificada verificadaEm={ong.verificada_em} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {ong.cidade && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {ong.cidade}{ong.estado ? `, ${ong.estado}` : ""}
                    </span>
                  )}
                  {fundacao && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {anos !== null && anos >= 1
                        ? `${anos} ${anos === 1 ? "ano" : "anos"} de atuação, desde ${fundacao}`
                        : `Fundada em ${fundacao}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {causas.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {causas.map((causa) => (
                  <CauseTag key={causa} causa={causa} />
                ))}
              </div>
            )}

            {/* Quem abriu o link é quem repassa. */}
            <ShareButton titulo={ong.nome} className="mt-5" />
          </header>

          {/*
           * Três áreas. No celular fluem na ordem do DOM: pedidos, painel de
           * confiança, o resto. No desktop o painel ocupa a coluna da direita
           * inteira e acompanha a rolagem.
           */}
          <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr]">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              {/* ── O que falta agora ───────────────────────────────────── */}
              <section aria-labelledby="titulo-necessidades">
                <p className="rotulo-caps">Pedidos abertos</p>
                <h2 id="titulo-necessidades" className="mt-1 font-display text-2xl font-semibold">
                  O que esta ONG precisa agora
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Publicados pela própria organização, com quantidade e prazo.
                </p>

                {necessidades.length === 0 ? (
                  <EmptyState
                    className="mt-6"
                    ilustracao="caixa"
                    title="Nenhum pedido aberto agora"
                    description="Dá para ajudar com dinheiro: a organização aplica onde estiver faltando."
                    action={{ label: "Doar em dinheiro por Pix", to: linkDoar }}
                  />
                ) : (
                  <ul className="ao-rolar-escalonado mt-6 grid gap-4 sm:grid-cols-2">
                    <NeedItem
                      necessidade={primeira}
                      linkDoar={linkDaNecessidade(primeira)}
                      contexto={contextoDaNecessidade(primeira)}
                      destaque
                      className="sm:col-span-2"
                    />
                    {demais.map((n, i) => (
                      <NeedItem
                        key={n.id}
                        necessidade={n}
                        linkDoar={linkDaNecessidade(n)}
                        contexto={contextoDaNecessidade(n)}
                        className={larguraNaGrade(i, demais.length)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* `min-w-0`: texto sem quebra dentro do painel não pode alargar a coluna. */}
            <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-end-3">
              <PainelDeConfianca
                ong={ong}
                confirmado={confirmado}
                reputacao={reputacao}
                anos={anos}
                linkDoar={linkDoar}
              />
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              {/* ── Quem são ────────────────────────────────────────────── */}
              {missao && (
                <section aria-labelledby="titulo-missao">
                  <h2 id="titulo-missao" className="font-display text-2xl font-semibold">
                    Quem são
                  </h2>
                  <div className="prose mt-6 max-w-prose">
                    {missao.split(/\n{2,}/).map((paragrafo, i) => (
                      <p key={i} className="whitespace-pre-line">{paragrafo}</p>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Projetos ────────────────────────────────────────────── */}
              <section className={cn(missao && "mt-14")} aria-labelledby="titulo-projetos">
                <h2 id="titulo-projetos" className="font-display text-2xl font-semibold">
                  Projetos
                </h2>

                {projetos.length === 0 ? (
                  <EmptyState
                    className="mt-6"
                    title="Nenhum projeto ativo no momento"
                    description="Assim que esta ONG publicar um projeto, ele aparece aqui."
                    action={{ label: "Ver projetos de outras ONGs", to: "/projetos" }}
                  />
                ) : (
                  <div className="ao-rolar-escalonado mt-6 grid gap-5 sm:grid-cols-2">
                    {projetos.map((p) => (
                      <ProjectCard
                        key={p.id}
                        projeto={{
                          ...p,
                          img_url: p.capa_url || p.img_url,
                          // Dentro do perfil, repetir o nome da ONG em cada card é ruído.
                          ongNome: null,
                        } as ProjetoCardData}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── Contato ─────────────────────────────────────────────── */}
              <section className="mt-14 border-t pt-10" aria-labelledby="titulo-contato">
                <h2 id="titulo-contato" className="font-display text-2xl font-semibold">
                  Falar com a organização
                </h2>

                {temContato ? (
                  <ul className="mt-6 divide-y">
                    {ong.telefone && (
                      <Contato icone={Phone} rotulo="Telefone">
                        <a href={`tel:${ong.telefone.replace(/\D/g, "")}`} className="link-vivo text-primary">
                          {formatPhone(ong.telefone)}
                        </a>
                      </Contato>
                    )}
                    {ong.site && (
                      <Contato icone={Globe} rotulo="Site">
                        <a
                          href={normalizeUrl(ong.site)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-vivo break-all text-primary"
                        >
                          {ong.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </Contato>
                    )}
                    {ong.instagram && (
                      <Contato icone={Instagram} rotulo="Instagram">
                        <a
                          href={`https://instagram.com/${ong.instagram.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-vivo text-primary"
                        >
                          @{ong.instagram.replace(/^@/, "")}
                        </a>
                      </Contato>
                    )}
                    {ong.logradouro && (
                      <Contato icone={MapPin} rotulo="Endereço">
                        <span>{ong.logradouro}</span>
                      </Contato>
                    )}
                    {ong.endereco_entrega && (
                      <Contato icone={PackageCheck} rotulo="Entrega de doações">
                        <span>{ong.endereco_entrega}</span>
                        {ong.horarios_recebimento && (
                          <span className="block text-muted-foreground">{ong.horarios_recebimento}</span>
                        )}
                      </Contato>
                    )}
                  </ul>
                ) : (
                  <p className="mt-6 text-muted-foreground">
                    Esta organização ainda não publicou um canal de contato.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>

        <Footer />
        {/* Espaço com a cor do rodapé para a barra fixa do celular não cobrir a última linha dele. */}
        <div className="h-24 bg-card md:hidden" aria-hidden="true" />
      </div>

      {/* No celular o CTA fica sempre alcançável, sem depender de rolar. */}
      <BarraFixaInferior>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {necessidades.length === 0
            ? "Pix direto para a ONG"
            : necessidades.length === 1
              ? "1 pedido aberto"
              : `${necessidades.length} pedidos abertos`}
        </p>
        <Button size="lg" variant="cta" asChild className="shrink-0">
          <Link to={linkDoar}>Doar para esta ONG</Link>
        </Button>
      </BarraFixaInferior>
    </PublicShell>
  );
}

/**
 * Na grade de dois, o último item de uma contagem ímpar ocuparia meia linha
 * com um buraco ao lado. Ele passa a fechar a linha inteira: o ritmo vira
 * 1 grande + pares + 1 largo, que é o que a página quer.
 */
const larguraNaGrade = (indice: number, total: number) =>
  total % 2 === 1 && indice === total - 1 ? "sm:col-span-2" : undefined;

type PainelProps = {
  ong: {
    cnpj: string | null;
    area_atuacao: string | null;
    verificada_em: string | null;
  };
  confirmado: { itens: number; valor: number };
  reputacao: { total: number; confirmadas: number };
  anos: number | null;
  linkDoar: string;
};

/**
 * Prova de confiança ao lado da ação, não num rodapé que ninguém rola.
 *
 * Os números de "já chegou" só existem porque alguém da ONG confirmou o
 * recebimento: é a tese da plataforma em forma de dado público. O aviso de
 * CNPJ ausente vem antes de tudo, porque muda a decisão de quem vai doar.
 */
function PainelDeConfianca({ ong, confirmado, reputacao, anos, linkDoar }: PainelProps) {
  const temNumeros = confirmado.itens > 0 || confirmado.valor > 0;

  return (
    <aside
      className="rounded-xl border bg-card p-6 shadow-sutil lg:sticky lg:top-24"
      aria-labelledby="titulo-confianca"
    >
      {/* No celular esta ação mora na barra fixa do rodapé. */}
      <div className="hidden md:block">
        <Button size="lg" variant="cta" asChild className="w-full">
          <Link to={linkDoar}>Doar para esta ONG</Link>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Pix direto para a conta dela, sem taxa.
        </p>
      </div>

      {!ong.cnpj && (
        // Ausência de CNPJ não é irregularidade: várias iniciativas locais
        // funcionam sem. Mas é um dado a menos para checar, e quem vai
        // transferir dinheiro merece saber disso antes, não depois.
        <Callout tom="atencao" titulo="CNPJ ainda não informado" className="mt-5 md:mt-6">
          Esta organização não publicou o CNPJ aqui. Antes de doar, vale falar com ela
          pelos contatos desta página e confirmar para quem o valor vai.
        </Callout>
      )}

      {/* No celular o CTA some; sem o aviso de CNPJ, o título é o primeiro elemento. */}
      <h2 id="titulo-confianca" className={cn("font-display text-lg font-semibold md:mt-6", !ong.cnpj && "mt-6")}>
        Por que confiar
      </h2>

      {temNumeros && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {confirmado.itens > 0 && (
            <Stat
              valor={Math.round(confirmado.itens)}
              rotulo="itens recebidos e confirmados"
              className="border-0 bg-tinta-salvia"
            />
          )}
          {confirmado.valor > 0 && (
            <Stat
              valor={formatCurrency(confirmado.valor)}
              rotulo="em dinheiro confirmado"
              className="border-0 bg-tinta-salvia"
            />
          )}
        </div>
      )}

      {reputacao.total > 0 && (
        <TaxaDeConfirmacao
          className="mt-4"
          confirmadas={reputacao.confirmadas}
          total={reputacao.total}
        />
      )}

      <dl className="mt-5 space-y-2.5 border-t pt-5 text-sm">
        {ong.verificada_em && (
          <Linha rotulo="Verificação">
            <SeloVerificada verificadaEm={ong.verificada_em} variante="completo" />
          </Linha>
        )}
        {ong.cnpj && <Linha rotulo="CNPJ">{formatCnpj(ong.cnpj)}</Linha>}
        {anos !== null && anos >= 1 && (
          <Linha rotulo="Tempo de atuação">{`${anos} ${anos === 1 ? "ano" : "anos"}`}</Linha>
        )}
        {ong.area_atuacao && <Linha rotulo="Área de atuação">{ong.area_atuacao}</Linha>}
      </dl>

      {/* A tese, dita uma vez nesta página. */}
      <Callout tom="confianca" className="mt-5">
        O progresso desta página só sobe quando alguém desta organização confirma que
        recebeu. Por isso ele mede o que já chegou lá.
      </Callout>
    </aside>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{rotulo}</dt>
      <dd className="numero min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

function Contato({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: typeof Phone;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 py-4 first:pt-0">
      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="rotulo-caps">{rotulo}</p>
        <p className="mt-1">{children}</p>
      </div>
    </li>
  );
}

/** Carregando com a forma do perfil, para a página não saltar ao chegar. */
function EsqueletoPerfil() {
  return (
    <div className="container pt-4 md:pt-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando o perfil da organização…</span>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-52 w-full rounded-destaque md:h-80" />
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 px-1 sm:px-6">
        <Skeleton className="-mt-12 h-24 w-24 rounded-full md:-mt-14 md:h-28 md:w-28" />
        <div className="min-w-0 flex-1 pb-1">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-48" />
        </div>
      </div>
      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="lg:col-start-2 lg:row-start-1">
          <div className="rounded-xl border p-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-6 h-5 w-32" />
            <Skeleton className="mt-4 h-20 w-full rounded-xl" />
            <Skeleton className="mt-5 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-80 max-w-full" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={cn("rounded-xl border p-5", i === 0 && "sm:col-span-2")}>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-7 w-52" />
                <Skeleton className="mt-4 h-2 w-full rounded-full" />
                <Skeleton className="mt-4 h-11 w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
