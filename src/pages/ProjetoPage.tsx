import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, CalendarDays, MapPin, Package, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { LogoSimbolo } from "@/components/brand/Logo";
import { Seo } from "@/components/common/Seo";
import { CauseTag } from "@/components/common/CauseTag";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { NeedItem } from "@/components/common/NeedItem";
import { ShareButton } from "@/components/common/ShareButton";
import { TaxaDeConfirmacao } from "@/components/common/SeloConfirmacao";
import { useTaxaConfirmacao } from "@/hooks/queries/useTaxaConfirmacao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useProjeto } from "@/hooks/queries/useProjeto";
import { formatDate, formatPrazo } from "@/lib/format";

/**
 * Página do projeto — a tela que converte.
 *
 * A ordem da página é a ordem das perguntas de quem está decidindo: o que
 * falta, por que eu confio nesse número, e só depois quem é o projeto. O
 * argumento de confiança fica encostado na lista de necessidades, junto dos
 * botões de doar: prova de confiança longe da ação não converte.
 *
 * O voluntariado continua aqui, mas com peso visual de alternativa — sem card,
 * sem sombra, sem laranja.
 */
export default function ProjetoPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: projeto, isPending, isError, refetch } = useProjeto(slug);
  const [inscrevendo, setInscrevendo] = useState(false);

  const idOng = projeto?.ong?.id;

  /**
   * Reputação da ONG medida pela própria plataforma. Hoje as policies de
   * `doacoes` só liberam a leitura para quem administra a ONG e para o admin,
   * então para o visitante anônimo a contagem volta zerada e o componente se
   * esconde sozinho (ele já exige uma amostra mínima). Para o dado aparecer ao
   * público falta uma RPC pública agregada — fora do escopo desta tela.
   */
  const { data: taxa } = useTaxaConfirmacao(idOng);

  const participar = async () => {
    if (!user) {
      navigate(`/login?redirect=/projetos/${slug}`);
      return;
    }
    if (role === "ong" || role === "admin") {
      toast.error("Contas de ONG ou administrador não podem se voluntariar.");
      return;
    }
    setInscrevendo(true);
    const { error } = await supabase
      .from("voluntariado")
      .insert({ id_projeto: projeto!.id, id_usuario: user.id });
    setInscrevendo(false);

    if (error) {
      toast.error("Não foi possível registrar sua inscrição. Tente novamente.");
      return;
    }
    toast.success("Inscrição enviada! A ONG vai avaliar e responder.");
  };

  if (isPending) {
    return (
      <PublicShell>
        <EsqueletoProjeto />
      </PublicShell>
    );
  }

  if (isError) {
    return (
      <PublicShell>
        <Seo title="Não foi possível carregar o projeto" noIndex />
        <div className="container max-w-4xl py-16">
          <ErrorState
            title="Não foi possível carregar este projeto"
            description="Pode ter sido uma falha de conexão. Tente de novo em alguns segundos."
            onRetry={() => refetch()}
          />
        </div>
        <Footer />
      </PublicShell>
    );
  }

  if (!projeto) {
    return (
      <PublicShell>
        <Seo title="Projeto não encontrado" noIndex />
        <div className="container max-w-4xl py-16">
          <EmptyState
            title="Projeto não encontrado"
            description="Ele pode ter sido removido pela ONG ou o link está incorreto."
            action={{ label: "Ver todos os projetos", to: "/projetos" }}
          />
        </div>
        <Footer />
      </PublicShell>
    );
  }

  const capa = projeto.capa_url || projeto.img_url;
  const prazo = formatPrazo(projeto.data_fim);
  const linkDoar = `/doar/projeto/${projeto.slug ?? projeto.id}`;
  const verificada = Boolean(projeto.ong?.verificada_em);
  const local = projeto.cidade || (projeto.ong?.cidade
    ? [projeto.ong.cidade, projeto.ong.estado].filter(Boolean).join(", ")
    : "");
  const necessidades = projeto.necessidades;

  return (
    <PublicShell>
      <Seo
        title={projeto.nome_projeto}
        description={projeto.descricao ?? `Projeto de ${projeto.ong?.nome ?? "uma ONG parceira"}.`}
        image={capa ?? undefined}
      />

      {/* pb-28 no mobile: a barra fixa de doar tem ~68px + área segura do iPhone. */}
      <div className="container max-w-4xl py-6 pb-28 md:pb-12">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Início</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/projetos">Projetos</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{projeto.nome_projeto}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {capa ? (
          <img
            src={capa}
            alt={`Foto do projeto ${projeto.nome_projeto}`}
            className="mb-6 h-56 w-full rounded-xl border object-cover md:h-72"
            width={896}
            height={288}
            decoding="async"
          />
        ) : (
          /*
           * Projeto sem foto não vira retângulo cinza: o espaço passa a carregar
           * a tese do produto. Mais baixo que a foto de propósito — um
           * substituto não deve empurrar a necessidade para fora da primeira
           * tela.
           */
          <div className="mb-6 flex h-36 flex-col items-center justify-center gap-3 rounded-xl border bg-gradient-to-br from-secondary via-card to-secondary/60 px-6 text-center md:h-44">
            <LogoSimbolo className="h-9 w-9 text-primary" />
            <p className="max-w-md font-display text-base font-bold tracking-[-0.02em] md:text-lg">
              Aqui a barra de progresso só anda quando a ONG confirma que recebeu
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {projeto.causa && <CauseTag causa={projeto.causa} />}
              {prazo && <Badge variant="outline">{prazo}</Badge>}
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold tracking-[-0.02em]">
              {projeto.nome_projeto}
            </h1>

            {projeto.ong && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  to={`/ongs/${projeto.ong.slug ?? projeto.ong.id}`}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  {projeto.ong.nome}
                </Link>
                {verificada && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    ONG verificada
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {local && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {local}
                </span>
              )}
              {projeto.data_inicio && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {formatDate(projeto.data_inicio)}
                  {projeto.data_fim ? ` até ${formatDate(projeto.data_fim)}` : ""}
                </span>
              )}
            </div>
          </div>

          {/* Compartilhar vale mais no topo: quem abriu o link é quem repassa. */}
          <div className="shrink-0">
            <ShareButton titulo={projeto.nome_projeto} />
          </div>
        </div>

        {/* A necessidade vem primeiro: é a pergunta que traz o doador aqui. */}
        <section className="mt-10" aria-labelledby="titulo-necessidades">
          <h2 id="titulo-necessidades" className="font-display text-xl font-bold">
            Do que este projeto precisa agora
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos publicados pela própria organização, com quantidade e prazo.
          </p>

          {necessidades.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Package}
                title="A ONG ainda não publicou necessidades"
                description="Você pode contribuir com uma doação em dinheiro, que a organização aplica onde faltar."
                action={{ label: "Doar para o projeto", to: linkDoar }}
              />
            </div>
          ) : (
            <ul className="ao-rolar-escalonado mt-6 space-y-4">
              {necessidades.map((n) => (
                <NeedItem
                  key={n.id}
                  necessidade={n}
                  linkDoar={`${linkDoar}?necessidade=${n.id}`}
                />
              ))}
            </ul>
          )}

          {/* Encostado nos botões de doar, não no rodapé: é aqui que a dúvida aparece. */}
          <Callout
            tom="confianca"
            titulo="Essas barras só andam quando a ONG confirma que recebeu"
            className="mt-6"
          >
            Você doa direto para a organização — o Pix cai na conta dela. A plataforma
            não recebe nem retém o seu dinheiro, e não cobra taxa de ninguém. O
            progresso desta página sobe só depois que alguém da ONG registra o
            recebimento. É por isso que ele demora mais — e por isso ele significa
            alguma coisa.
          </Callout>

          {taxa && (
            <div className="mt-4 rounded-xl border bg-card p-5 shadow-sutil">
              <TaxaDeConfirmacao confirmadas={taxa.confirmadas} total={taxa.total} />
            </div>
          )}

          {/*
           * O laranja da tela fica com o botão de cada necessidade. O caminho
           * genérico existe para quem não quer escolher item, em peso menor —
           * exceto quando não há necessidade nenhuma, e aí ele é a única ação.
           */}
          <div className="mt-6 hidden md:block">
            <Button
              size="lg"
              variant={necessidades.length === 0 ? "cta" : "outline"}
              asChild
              className="pressionavel"
            >
              <Link to={linkDoar}>Doar em dinheiro para o projeto</Link>
            </Button>
          </div>
        </section>

        {projeto.descricao && (
          <section className="mt-10" aria-labelledby="titulo-sobre">
            <h2 id="titulo-sobre" className="font-display text-xl font-bold">
              Sobre o projeto
            </h2>
            <p className="mt-4 max-w-prose whitespace-pre-line text-muted-foreground">
              {projeto.descricao}
            </p>
          </section>
        )}

        {/* Alternativa para quem tem tempo em vez de dinheiro — sem competir com a doação. */}
        <section className="mt-10 border-t pt-8" aria-labelledby="titulo-voluntariado">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="titulo-voluntariado"
                className="inline-flex items-center gap-2 font-display text-lg font-bold"
              >
                <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Tem tempo em vez de dinheiro?
              </h2>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Inscreva-se como voluntário: a organização recebe seu contato e responde.
              </p>
            </div>
            <Button
              variant="outline"
              className="pressionavel shrink-0"
              onClick={participar}
              disabled={inscrevendo}
            >
              {inscrevendo ? "Enviando…" : "Quero ser voluntário"}
            </Button>
          </div>
        </section>
      </div>

      {/* No celular a ação principal fica alcançável sem rolar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <Button size="lg" variant="cta" asChild className="pressionavel w-full shadow-cta">
          <Link to={linkDoar}>Doar para este projeto</Link>
        </Button>
      </div>

      <Footer />
    </PublicShell>
  );
}

/** Carregando com a forma real da página: capa, cabeçalho e duas necessidades. */
function EsqueletoProjeto() {
  return (
    <div className="container max-w-4xl py-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando o projeto…</span>
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-4 h-36 w-full rounded-xl md:h-44" />
      <Skeleton className="mt-6 h-5 w-24" />
      <Skeleton className="mt-3 h-8 w-3/4 max-w-md" />
      <Skeleton className="mt-3 h-4 w-48" />
      <Skeleton className="mt-8 h-6 w-64" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-6 w-52" />
            <Skeleton className="mt-4 h-2 w-full" />
            <Skeleton className="mt-4 h-10 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
