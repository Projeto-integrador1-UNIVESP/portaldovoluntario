import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { BarraFixaInferior } from "@/components/common/BarraFixaInferior";
import { Callout } from "@/components/common/Callout";
import { Capa } from "@/components/common/Capa";
import { CauseTag } from "@/components/common/CauseTag";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LinhaDoTempoConfirmacoes } from "@/components/common/LinhaDoTempoConfirmacoes";
import { NeedItem, type Necessidade } from "@/components/common/NeedItem";
import { ProgressBar } from "@/components/common/ProgressBar";
import { SeloVerificada } from "@/components/common/SeloVerificada";
import { TaxaDeConfirmacao } from "@/components/common/SeloConfirmacao";
import { ShareButton } from "@/components/common/ShareButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useProjeto } from "@/hooks/queries/useProjeto";
import { useConfirmacoes } from "@/hooks/queries/useConfirmacoes";
import { useTaxaConfirmacao } from "@/hooks/queries/useTaxaConfirmacao";
import { mensagemAmigavel } from "@/lib/erros";
import { MARCA } from "@/lib/copy";
import { formatCurrency, formatDate, formatPrazo, progressoPercent, formatQuantidade } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Página do projeto: a tela que converte.
 *
 * A ordem segue as perguntas de quem está decidindo: o que falta, por que eu
 * confio nesse número, e só depois quem é o projeto. No desktop o painel da
 * direita acompanha a rolagem com o resumo do que falta e a única ação
 * terracota da página; no celular essa ação mora na barra fixa do rodapé.
 *
 * O voluntariado fica no fim, como bloco de tinta com botão de contorno: é
 * alternativa, não concorrente da doação.
 */
export default function ProjetoPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: projeto, isPending, isError, refetch } = useProjeto(slug);
  const [inscrevendo, setInscrevendo] = useState(false);

  const idOng = projeto?.ong?.id;

  // Reputação por RPC agregada: a RLS de `doacoes` não deixa o visitante ler
  // doação individual, e o componente se esconde abaixo de cinco doações.
  const { data: taxa } = useTaxaConfirmacao(idOng);
  const { data: confirmacoes } = useConfirmacoes(projeto?.id);

  const participar = async () => {
    if (!user) {
      navigate(`/login?redirect=/projetos/${slug}`);
      return;
    }
    if (role === "ong" || role === "admin") {
      toast.error("Entre com uma conta de doador para se voluntariar.");
      return;
    }
    setInscrevendo(true);
    const { error } = await supabase
      .from("voluntariado")
      .insert({ id_projeto: projeto!.id, id_usuario: user.id });
    setInscrevendo(false);

    if (error) {
      toast.error(mensagemAmigavel(error, "Não foi possível enviar seu contato. Tente de novo."));
      return;
    }
    toast.success("Contato enviado", {
      description: "A ONG recebeu seu contato e vai responder.",
    });
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
        <div className="container max-w-4xl py-14 md:py-20">
          <ErrorState
            title="Não foi possível carregar este projeto"
            description="Pode ter sido a conexão. Tente de novo em alguns segundos."
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
        <div className="container max-w-4xl py-14 md:py-20">
          <EmptyState
            ilustracao="perdido"
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
  const local = projeto.cidade || (projeto.ong?.cidade
    ? [projeto.ong.cidade, projeto.ong.estado].filter(Boolean).join(", ")
    : "");
  const necessidades = projeto.necessidades;
  const abertas = necessidades.filter((n) => n.arrecadado < n.meta);
  const [primeira, ...demais] = necessidades;

  return (
    <PublicShell>
      <Seo
        title={projeto.nome_projeto}
        description={projeto.descricao ?? `Projeto de ${projeto.ong?.nome ?? "uma ONG parceira"}.`}
        image={capa ?? undefined}
      />

      <div>
        <div className="container py-6 md:py-10">
          {/*
           * Quatro áreas. No celular fluem na ordem do DOM: capa, cabeçalho,
           * painel, conteúdo. No desktop a capa ocupa as duas primeiras linhas
           * da coluna da direita, para o conteúdo começar logo abaixo do
           * cabeçalho mesmo quando a foto é mais alta que ele; o painel entra
           * na terceira linha e acompanha a rolagem.
           */}
          <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[auto_auto_1fr]">
            {/* `min-w-0` em todo item da grade: sem isso, qualquer texto sem
                quebra dentro dele alarga a coluna e a página no celular. */}
            <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-end-3">
              <Capa
                src={capa}
                alt=""
                prioridade
                id={projeto.id}
                nome={projeto.ong?.nome ?? projeto.nome_projeto}
                causa={projeto.causa}
                sizes="(min-width: 1024px) 26rem, 100vw"
                className="aspect-[16/10] w-full rounded-destaque shadow-media lg:aspect-[4/3]"
              />
            </div>

            <header className="min-w-0 lg:col-start-1 lg:row-start-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild><Link to="/">Início</Link></BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild><Link to="/projetos">Projetos</Link></BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="block max-w-[11rem] truncate sm:max-w-sm" title={projeto.nome_projeto}>
                      {projeto.nome_projeto}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              {projeto.causa && (
                <div className="mt-6">
                  <CauseTag causa={projeto.causa} />
                </div>
              )}

              <h1 className="mt-3 font-display text-2xl-fluido font-bold">
                {projeto.nome_projeto}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {projeto.ong && (
                  <span className="inline-flex items-center gap-2">
                    <Link
                      to={`/ongs/${projeto.ong.slug ?? projeto.ong.id}`}
                      className="link-vivo font-medium text-primary"
                    >
                      {projeto.ong.nome}
                    </Link>
                    <SeloVerificada verificadaEm={projeto.ong.verificada_em} />
                  </span>
                )}
                {local && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {local}
                  </span>
                )}
                {prazo && projeto.data_fim && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {prazo === "encerrado"
                      ? `Encerrado em ${formatDate(projeto.data_fim)}`
                      : `${prazo}, até ${formatDate(projeto.data_fim)}`}
                  </span>
                )}
              </div>

              {/* Quem abriu o link é quem repassa: compartilhar fica junto do título. */}
              <ShareButton titulo={projeto.nome_projeto} className="mt-6" />
            </header>

            <div className="min-w-0 lg:col-start-2 lg:row-start-3">
              <PainelDoQueFalta
                necessidades={necessidades}
                abertas={abertas}
                taxa={taxa ?? null}
                linkDoar={linkDoar}
              />
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:row-end-4">
              {/* A necessidade vem primeiro: é a pergunta que traz o doador aqui. */}
              <section aria-labelledby="titulo-necessidades">
                <p className="rotulo-caps">Pedidos abertos</p>
                <h2 id="titulo-necessidades" className="mt-1 font-display text-2xl font-semibold">
                  Do que este projeto precisa agora
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Publicados pela própria organização, com quantidade e prazo.
                </p>

                {necessidades.length === 0 ? (
                  <EmptyState
                    className="mt-6"
                    ilustracao="caixa"
                    title="A ONG ainda não publicou necessidades"
                    description="Dá para ajudar com dinheiro: a organização aplica onde estiver faltando."
                    action={{ label: "Doar em dinheiro por Pix", to: linkDoar }}
                  />
                ) : (
                  <ul className="ao-rolar-escalonado mt-6 grid gap-4 sm:grid-cols-2">
                    <NeedItem
                      necessidade={primeira}
                      linkDoar={`${linkDoar}?necessidade=${primeira.id}`}
                      destaque
                      className="sm:col-span-2"
                    />
                    {demais.map((n, i) => (
                      <NeedItem
                        key={n.id}
                        necessidade={n}
                        linkDoar={`${linkDoar}?necessidade=${n.id}`}
                        className={larguraNaGrade(i, demais.length)}
                      />
                    ))}
                  </ul>
                )}

                {/* A tese, dita uma vez, encostada nos botões de doar: é aqui que a dúvida aparece. */}
                <Callout
                  tom="confianca"
                  titulo="Essas barras só andam quando a ONG confirma que recebeu"
                  className="mt-6"
                >
                  Você doa direto para a organização: o Pix cai na conta dela. A {MARCA} não
                  recebe nem retém o seu dinheiro e não cobra taxa. O progresso desta página
                  sobe só depois que alguém da ONG registra que a doação chegou.
                </Callout>
              </section>

              {confirmacoes && confirmacoes.length > 0 && (
                <LinhaDoTempoConfirmacoes confirmacoes={confirmacoes} className="mt-14" />
              )}

              {projeto.descricao && (
                <section className="mt-14" aria-labelledby="titulo-sobre">
                  <h2 id="titulo-sobre" className="font-display text-2xl font-semibold">
                    Sobre o projeto
                  </h2>
                  <div className="prose mt-6 max-w-prose">
                    {projeto.descricao.split(/\n{2,}/).map((paragrafo, i) => (
                      <p key={i} className="whitespace-pre-line">{paragrafo}</p>
                    ))}
                  </div>
                </section>
              )}

              {/* Alternativa para quem tem tempo em vez de dinheiro, sem competir com a doação. */}
              <section
                className="mt-14 rounded-xl bg-tinta-azulpo p-6 md:p-8"
                aria-labelledby="titulo-voluntariado"
              >
                <div className="md:flex md:items-center md:justify-between md:gap-8">
                  <div className="min-w-0">
                    <p className="rotulo-caps">Voluntariado</p>
                    <h2 id="titulo-voluntariado" className="mt-1 font-display text-xl font-semibold">
                      Tem tempo em vez de dinheiro?
                    </h2>
                    <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                      Deixe seu contato com a organização. Ela responde dizendo como você pode ajudar.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-5 shrink-0 md:mt-0"
                    onClick={participar}
                    disabled={inscrevendo}
                  >
                    {inscrevendo ? "Enviando seu contato…" : "Quero ser voluntário"}
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </div>

        <Footer />
        {/* Espaço com a cor do rodapé para a barra fixa do celular não cobrir a última linha dele. */}
        <div className="h-24 bg-card md:hidden" aria-hidden="true" />
      </div>

      {/* No celular a ação principal fica alcançável sem rolar. */}
      <BarraFixaInferior>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {abertas.length === 0
            ? "Pix direto para a ONG"
            : abertas.length === 1
              ? "1 pedido aberto"
              : `${abertas.length} pedidos abertos`}
        </p>
        <Button size="lg" variant="cta" asChild className="shrink-0">
          <Link to={linkDoar}>Doar para este projeto</Link>
        </Button>
      </BarraFixaInferior>
    </PublicShell>
  );
}

/**
 * Na grade de dois, o último item de uma contagem ímpar ocuparia meia linha
 * com um buraco ao lado. Ele passa a fechar a linha inteira.
 */
const larguraNaGrade = (indice: number, total: number) =>
  total % 2 === 1 && indice === total - 1 ? "sm:col-span-2" : undefined;

type PainelProps = {
  necessidades: Necessidade[];
  abertas: Necessidade[];
  taxa: { confirmadas: number; total: number } | null;
  linkDoar: string;
};

const quantoFalta = (n: Necessidade) => {
  const falta = Math.max(0, n.meta - n.arrecadado);
  return n.tipo === "dinheiro"
    ? formatCurrency(falta)
    : formatQuantidade(falta, n.unidade);
};

/**
 * Resumo do que falta, com a única ação terracota da página.
 *
 * O percentual é a média do progresso das necessidades, a mesma conta do
 * card de listagem: assim o número que a pessoa viu na vitrine é o que ela
 * encontra aqui. A legenda da barra é própria porque um projeto mistura
 * itens e dinheiro, e "65 % de 100 %" não é frase de gente.
 */
function PainelDoQueFalta({ necessidades, abertas, taxa, linkDoar }: PainelProps) {
  const percentual = necessidades.length
    ? Math.round(
        necessidades.reduce((soma, n) => soma + progressoPercent(n.arrecadado, n.meta), 0) /
          necessidades.length,
      )
    : 0;
  const tudoChegou = necessidades.length > 0 && abertas.length === 0;
  const resumo = abertas.slice(0, 3);
  const restantes = abertas.length - resumo.length;

  return (
    <aside
      className="rounded-xl border bg-card p-6 shadow-sutil lg:sticky lg:top-24"
      aria-labelledby="titulo-painel"
    >
      <p id="titulo-painel" className="rotulo-caps">O que falta</p>

      {necessidades.length === 0 && (
        <>
          <p className="mt-2 font-display text-xl font-semibold">A ONG ainda vai publicar os pedidos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Doe em dinheiro: ela aplica onde estiver faltando.
          </p>
        </>
      )}

      {tudoChegou && (
        <>
          <p className="mt-2 font-display text-xl font-semibold text-success">
            Tudo o que foi pedido já chegou
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Você ainda pode doar em dinheiro para o próximo pedido.
          </p>
        </>
      )}

      {abertas.length > 0 && (
        <>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="numero font-display text-2xl-fluido font-semibold leading-none text-primary">
              {abertas.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {abertas.length === 1 ? "pedido aberto" : "pedidos abertos"}
            </span>
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {resumo.map((n) => (
              <li key={n.id}>
                <span className="numero font-semibold">{quantoFalta(n)}</span>
                <span className="text-muted-foreground"> de {n.nome}</span>
              </li>
            ))}
            {restantes > 0 && (
              <li className="text-muted-foreground">
                e mais {restantes === 1 ? "1 pedido" : `${restantes} pedidos`}
              </li>
            )}
          </ul>
        </>
      )}

      {necessidades.length > 0 && (
        <div className="mt-5">
          {/*
           * A barra é decorativa aqui: a legenda logo abaixo diz o mesmo em
           * frase inteira, e o rótulo automático dela ("65 % de 100 %") fica
           * escondido. Fora do leitor de tela, a barra grossa é o que se vê.
           */}
          <div aria-hidden="true">
            <ProgressBar
              tamanho="lg"
              arrecadado={percentual}
              meta={100}
              tipo="item"
              unidade="%"
              legenda={false}
            />
          </div>
          <p className="mt-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">confirmado pela ONG</span>
            <span
              className={cn(
                "numero font-display text-base font-semibold",
                percentual >= 100 ? "text-success" : "text-primary",
              )}
            >
              {percentual}%
            </span>
          </p>
        </div>
      )}

      {taxa && (
        <TaxaDeConfirmacao
          className="mt-5 border-t pt-5"
          confirmadas={taxa.confirmadas}
          total={taxa.total}
        />
      )}

      {/* No celular esta ação mora na barra fixa do rodapé. */}
      <div className="mt-6 hidden md:block">
        <Button size="lg" variant="cta" asChild className="w-full">
          <Link to={linkDoar}>Doar para este projeto</Link>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Pix direto para a ONG, sem taxa.
        </p>
      </div>
    </aside>
  );
}

/** Carregando com a forma real da página: capa, cabeçalho, painel e pedidos. */
function EsqueletoProjeto() {
  return (
    <div className="container py-6 md:py-10" role="status" aria-live="polite">
      <span className="sr-only">Carregando o projeto…</span>
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[auto_auto_1fr]">
        <div className="lg:col-start-2 lg:row-start-1 lg:row-end-3">
          <Skeleton className="aspect-[16/10] w-full rounded-destaque lg:aspect-[4/3]" />
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-6 h-5 w-24" />
          <Skeleton className="mt-3 h-10 w-3/4 max-w-lg" />
          <Skeleton className="mt-4 h-4 w-64" />
          <Skeleton className="mt-6 h-11 w-72" />
        </div>
        <div className="lg:col-start-2 lg:row-start-3">
          <div className="rounded-xl border p-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-9 w-32" />
            <Skeleton className="mt-5 h-3 w-full rounded-full" />
            <Skeleton className="mt-6 h-12 w-full" />
          </div>
        </div>
        <div className="lg:col-start-1 lg:row-start-2 lg:row-end-4">
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
