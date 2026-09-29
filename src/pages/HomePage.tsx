import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Building2, HandHeart, PackageCheck, Search, UserCheck,
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CardNecessidadeUrgente } from "@/components/common/CardNecessidadeUrgente";
import { Capa } from "@/components/common/Capa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useHome } from "@/hooks/queries/useHome";
import { formatCurrency } from "@/lib/format";

/**
 * Página inicial.
 *
 * A promessa que organiza a tela é a que diferencia a plataforma: aqui a barra
 * de progresso é um recibo, não uma promessa — ela só anda quando a ONG
 * confirma que recebeu. Por isso o destaque não é um texto institucional nem
 * um carrossel decorativo, e sim o que está faltando agora.
 */
export default function HomePage() {
  const { data, isPending, isError, refetch } = useHome();

  // Número pequeno de prova social atrapalha em vez de ajudar: "1 ONG ativa"
  // sinaliza que quase ninguém usa. Abaixo do piso, a faixa não aparece.
  const stats = data?.stats;
  const mostrarNumeros =
    Boolean(stats) && stats!.ongs + stats!.projetos + stats!.voluntarios >= 6;

  return (
    <PublicShell>
      <Seo description="Veja do que as ONGs perto de você precisam agora e ajude com itens, dinheiro ou voluntariado. Sem taxa e sem precisar criar conta." />

      {/* ── Promessa ─────────────────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-b from-secondary/60 to-background">
        <div className="container py-10 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="gap-1.5 bg-card">
              <BadgeCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              A barra só anda quando a ONG confirma
            </Badge>

            <h1 className="mt-5 font-display text-3xl font-extrabold">
              Veja do que as ONGs perto de você precisam agora
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              Cobertores, alimento, horas de voluntariado ou um Pix. Você escolhe o
              que falta de verdade e doa direto para a organização — sem taxa e sem
              precisar criar conta.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="cta" asChild className="pressionavel shadow-cta">
                <Link to="/projetos">
                  Ver o que está faltando
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="pressionavel">
                <Link to="/ongs">Conhecer as ONGs</Link>
              </Button>
            </div>
          </div>

          {mostrarNumeros && (
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
              <Numero valor={stats!.ongs.toLocaleString("pt-BR")} rotulo={stats!.ongs === 1 ? "ONG ativa" : "ONGs ativas"} />
              <Numero valor={stats!.projetos.toLocaleString("pt-BR")} rotulo={stats!.projetos === 1 ? "projeto" : "projetos"} />
              <Numero valor={stats!.itensArrecadados.toLocaleString("pt-BR")} rotulo="itens confirmados" />
              <Numero valor={formatCurrency(stats!.valorArrecadado)} rotulo="doados e confirmados" />
            </div>
          )}
        </div>
      </section>

      {/* ── O que falta agora ────────────────────────────────────────────── */}
      <section className="container py-14" aria-labelledby="titulo-urgentes">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-urgentes" className="font-display text-2xl font-bold">
              O que está faltando agora
            </h2>
            <p className="mt-1 text-muted-foreground">
              Pedidos publicados pelas próprias organizações, com quantidade e prazo.
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/projetos">
              Ver todos <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          {isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Não foi possível carregar as necessidades"
              onRetry={() => refetch()}
            />
          ) : data!.urgentes.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="Nenhuma necessidade aberta no momento"
              description="Quando uma ONG publicar um pedido, ele aparece aqui primeiro."
              action={{ label: "Ver ONGs parceiras", to: "/ongs" }}
            />
          ) : (
            <div className="ao-rolar-escalonado grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data!.urgentes.map((n) => (
                <CardNecessidadeUrgente key={n.id} necessidade={n} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────────────────── */}
      <section className="border-y bg-secondary/40 py-14">
        <div className="container">
          <h2 className="text-center font-display text-2xl font-bold">
            Por que a conta fecha aqui
          </h2>
          <div className="ao-rolar-escalonado mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-3">
            <Passo
              numero="1"
              tinta="bg-tinta-agua"
              icone={Search}
              titulo="A ONG diz o que falta"
              texto="Não é um pedido genérico de doação: é “100 cobertores até 2 de outubro”, com quantidade e prazo."
            />
            <Passo
              numero="2"
              tinta="bg-tinta-areia"
              icone={HandHeart}
              titulo="Você doa direto"
              texto="Pix na conta da própria organização. A plataforma não retém nada e não cobra taxa de ninguém."
            />
            <Passo
              numero="3"
              tinta="bg-tinta-musgo"
              icone={BadgeCheck}
              titulo="A ONG confirma o recebimento"
              texto="Só então a barra de progresso sobe. É por isso que o número que você vê aqui corresponde ao que chegou."
            />
          </div>

          <Callout tom="confianca" className="mx-auto mt-8 max-w-2xl bg-card">
            Em outras plataformas a barra sobe assim que alguém diz que doou. Aqui ela
            depende de alguém da organização atestar que o item chegou — por isso ela
            demora mais para andar, e por isso ela significa alguma coisa.
          </Callout>
        </div>
      </section>

      {/* ── ONGs ─────────────────────────────────────────────────────────── */}
      <section className="container py-14" aria-labelledby="titulo-ongs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-ongs" className="font-display text-2xl font-bold">
              Organizações parceiras
            </h2>
            <p className="mt-1 text-muted-foreground">
              Com CNPJ, missão e histórico de confirmações abertos para consulta.
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/ongs">
              Ver todas <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          {isPending ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : data!.ongs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma ONG cadastrada ainda"
              description="É uma organização? Você pode solicitar o cadastro."
              action={{ label: "Cadastrar minha ONG", to: "/cadastro?tipo=ong" }}
            />
          ) : (
            <div className="ao-rolar-escalonado grid gap-5 sm:grid-cols-2">
              {data!.ongs.map((o) => (
                <CardOng key={o.id} ong={o} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Voluntariado ─────────────────────────────────────────────────── */}
      <section className="container pb-16">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center md:p-14">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="font-display text-2xl font-bold">Tem tempo em vez de dinheiro?</h2>
            <p className="max-w-xl text-muted-foreground">
              Várias organizações precisam de gente para separar doações, acompanhar
              atividades ou ajudar numa ação de fim de semana.
            </p>
            <Button size="lg" asChild className="pressionavel">
              <Link to="/projetos">Ver projetos que precisam de voluntários</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </PublicShell>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center shadow-sutil">
      <p className="font-display text-2xl font-extrabold tabular-nums text-primary">{valor}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{rotulo}</p>
    </div>
  );
}

function Passo({
  numero, icone: Icone, titulo, texto, tinta,
}: {
  numero: string;
  icone: typeof Search;
  titulo: string;
  texto: string;
  /* Card branco atrás de card branco vira grade monótona; a tinta dá ritmo
     sem precisar de borda colorida nem de sombra pesada. */
  tinta: string;
}) {
  return (
    <div className={`rounded-xl border p-6 ${tinta}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {numero}
        </span>
        <Icone className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{titulo}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function CardOng({ ong }: { ong: Record<string, any> }) {
  const capa = ong.capa_url || ong.img_capa;
  const logo = ong.logo_url || ong.img_url;

  return (
    <Link
      to={`/ongs/${ong.slug ?? ong.id}`}
      className="elevavel group flex overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Capa
        src={capa}
        alt=""
        id={ong.id}
        nome={ong.nome}
        className="w-28 shrink-0 sm:w-36"
      />

      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-start gap-2">
          {logo && (
            <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" loading="lazy" />
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{ong.nome}</h3>
            {ong.cidade && (
              <p className="text-xs text-muted-foreground">
                {ong.cidade}
                {ong.estado ? `, ${ong.estado}` : ""}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {ong.missao || ong.descricao || "Esta organização ainda não publicou sua missão."}
        </p>

        {ong.verificada_em && (
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-success">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            ONG verificada
          </span>
        )}
      </div>
    </Link>
  );
}
