import { useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { ProjectCard, type ProjetoCardData } from "@/components/common/ProjectCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { capaDaCausa } from "@/lib/capasPorCausa";
import { diasRestantes } from "@/lib/format";
import { cn } from "@/lib/utils";

const POR_PAGINA = 12;

/**
 * Tamanho da janela buscada por filtro.
 *
 * A RPC ordena por data de publicação e não recebe parâmetro de ordem. Ordenar
 * apenas a página visível produziria uma lista errada em relação ao total, então
 * a tela busca uma janela única e faz ordenação e paginação sobre ela, e assim
 * a ordem vale para tudo que a tela mostra. Acima da janela, o texto de
 * resultados pede para usar os filtros.
 */
const JANELA = 48;

/** Valor de "sem filtro" nos selects: o Radix não aceita `value=""`. */
const TODAS = "__todas__";

const ORDENACOES = {
  urgentes: "Mais urgentes",
  recentes: "Mais recentes",
  prazo: "Perto do fim do prazo",
} as const;

type Ordem = keyof typeof ORDENACOES;

type LinhaProjeto = {
  id: string;
  slug: string | null;
  nome_projeto: string;
  descricao: string | null;
  capa_url: string | null;
  img_url: string | null;
  cidade: string | null;
  causa: string | null;
  data_fim: string | null;
  ong_nome: string | null;
  ong_verificada: boolean | null;
  total_necessidades: number | null;
  progresso_medio: number | null;
  total_encontrado: number | null;
};

type Filtros = { termo: string; cidade: string; causa: string };

/**
 * A RPC monta `'%' || _q || '%'` sem escapar, então `%` e `_` digitados viriam
 * como coringa e "casariam tudo". O escape é aqui, na borda.
 */
const escaparBusca = (termo: string) => termo.trim().replace(/[%_\\]/g, "\\$&");

async function buscarProjetos({ termo, cidade, causa }: Filtros) {
  const { data, error } = await supabase.rpc("buscar_projetos", {
    _q: escaparBusca(termo) || undefined,
    _cidade: cidade || undefined,
    _causa: causa || undefined,
    _limit: JANELA,
    _offset: 0,
  });
  if (error) throw error;

  const linhas = (data ?? []) as LinhaProjeto[];
  return {
    total: Number(linhas[0]?.total_encontrado ?? 0),
    linhas,
  };
}

/** Opções dos filtros a partir do que existe publicado, sem lista fixa no código. */
async function buscarOpcoesDeFiltro() {
  const { data, error } = await supabase
    .from("projetos")
    .select("cidade, causa")
    .eq("status", true);
  if (error) throw error;

  const distintos = (valores: (string | null)[]) =>
    [...new Set(valores.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))].sort(
      (a, b) => a.localeCompare(b, "pt-BR"),
    );

  return {
    cidades: distintos((data ?? []).map((p) => p.cidade)),
    causas: distintos((data ?? []).map((p) => p.causa)),
  };
}

const paraCard = (p: LinhaProjeto): ProjetoCardData => ({
  id: p.id,
  slug: p.slug,
  nome_projeto: p.nome_projeto,
  descricao: p.descricao,
  img_url: p.capa_url || p.img_url,
  data_fim: p.data_fim,
  cidade: p.cidade,
  causa: p.causa,
  ongNome: p.ong_nome,
  ongVerificada: Boolean(p.ong_verificada),
  totalNecessidades: Number(p.total_necessidades ?? 0),
  progressoMedio: Number(p.progresso_medio ?? 0),
});

/** Urgência: tem pedido aberto e ainda falta muito para a ONG confirmar. */
const pesoUrgencia = (p: LinhaProjeto) =>
  Number(p.total_necessidades ?? 0) > 0 ? 1000 - Number(p.progresso_medio ?? 0) : 0;

/** Prazo: quem vence antes vem primeiro; sem prazo e encerrado vão para o fim. */
const pesoPrazo = (p: LinhaProjeto) => {
  const dias = diasRestantes(p.data_fim);
  return dias === null || dias < 0 ? Number.POSITIVE_INFINITY : dias;
};

function ordenar(linhas: LinhaProjeto[], ordem: Ordem) {
  if (ordem === "recentes") return linhas;
  const copia = [...linhas];
  return ordem === "urgentes"
    ? copia.sort((a, b) => pesoUrgencia(b) - pesoUrgencia(a))
    : copia.sort((a, b) => pesoPrazo(a) - pesoPrazo(b));
}

export default function ProjetosPage() {
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Filtros>({ termo: "", cidade: "", causa: "" });
  const [ordem, setOrdem] = useState<Ordem>("urgentes");
  const [pagina, setPagina] = useState(0);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const inicioDosResultados = useRef<HTMLDivElement>(null);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["projetos", filtros],
    queryFn: () => buscarProjetos(filtros),
    placeholderData: keepPreviousData,
  });

  const opcoes = useQuery({
    queryKey: ["projetos-opcoes-de-filtro"],
    queryFn: buscarOpcoesDeFiltro,
    staleTime: 30 * 60 * 1000,
  });

  const total = data?.total ?? 0;
  const ordenados = useMemo(() => ordenar(data?.linhas ?? [], ordem), [data?.linhas, ordem]);
  const ultimaPagina = Math.max(0, Math.ceil(ordenados.length / POR_PAGINA) - 1);
  const paginaAtual = Math.min(pagina, ultimaPagina);
  const visiveis = ordenados.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);

  const filtrosAtivos = [filtros.termo, filtros.cidade, filtros.causa].filter(Boolean).length;

  /**
   * Ritmo editorial: na primeira página, sem filtro, o primeiro projeto vira
   * um card largo. Com filtro ou em outra página a lista é resultado de
   * busca, e uma grade regular lê melhor.
   */
  const comDestaque = paginaAtual === 0 && filtrosAtivos === 0;

  const trocarFiltros = (parcial: Partial<Filtros>) => {
    setPagina(0);
    setFiltros((atual) => ({ ...atual, ...parcial }));
  };

  const limparFiltros = () => {
    setBusca("");
    setPagina(0);
    setFiltros({ termo: "", cidade: "", causa: "" });
  };

  const irParaPagina = (proxima: number) => {
    setPagina(proxima);
    // Sem isto, quem clica "Próxima" no fim da lista continua vendo o fim dela.
    inicioDosResultados.current?.scrollIntoView({ block: "start" });
  };

  const cidades = opcoes.data?.cidades ?? [];
  const causas = opcoes.data?.causas ?? [];

  // Um select que só tem "todas" não filtra nada: fica desabilitado até a
  // primeira ONG preencher a cidade ou a causa do projeto. Na barra de
  // desktop os rótulos ficam só para o leitor de tela: o valor exibido
  // ("Todas as cidades") já diz o que o campo é.
  const camposDeFiltro = (idPrefixo: string, className: string, rotulosVisiveis: boolean) => {
    const rotulo = cn(!rotulosVisiveis && "sr-only");
    const gatilho = cn(rotulosVisiveis ? "mt-1.5" : "h-12");

    return (
      <div className={className}>
        <div>
          <Label htmlFor={`${idPrefixo}-cidade`} className={rotulo}>
            Cidade
          </Label>
          <Select
            value={filtros.cidade || TODAS}
            onValueChange={(v) => trocarFiltros({ cidade: v === TODAS ? "" : v })}
          >
            <SelectTrigger
              id={`${idPrefixo}-cidade`}
              className={gatilho}
              disabled={cidades.length === 0}
            >
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as cidades</SelectItem>
              {cidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${idPrefixo}-causa`} className={rotulo}>
            Causa
          </Label>
          <Select
            value={filtros.causa || TODAS}
            onValueChange={(v) => trocarFiltros({ causa: v === TODAS ? "" : v })}
          >
            <SelectTrigger
              id={`${idPrefixo}-causa`}
              className={gatilho}
              disabled={causas.length === 0}
            >
              <SelectValue placeholder="Todas as causas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as causas</SelectItem>
              {causas.map((causa) => (
                <SelectItem key={causa} value={causa}>
                  {causa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${idPrefixo}-ordem`} className={rotulo}>
            Ordenar por
          </Label>
          <Select
            value={ordem}
            onValueChange={(v) => {
              setPagina(0);
              setOrdem(v as Ordem);
            }}
          >
            <SelectTrigger id={`${idPrefixo}-ordem`} className={gatilho}>
              <span className="flex min-w-0 items-center gap-2">
                {!rotulosVisiveis && (
                  <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDENACOES).map(([valor, rotulo]) => (
                <SelectItem key={valor} value={valor}>
                  {rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <PublicShell>
      <Seo
        title="Projetos"
        description="Veja os projetos das ONGs parceiras, o que cada uma pediu e quanto já foi confirmado como recebido."
      />

      <div className="container py-14 md:py-20">
        <header className="max-w-2xl">
          <p className="rotulo-caps">Pedidos abertos das ONGs parceiras</p>
          {/* O texto do H1 é contrato do e2e (`e2e/navegacao-publica.spec.ts`), que
              casa o nome acessível exato em nível 1 depois de clicar no menu. */}
          <h1 className="mt-2 font-display text-2xl-fluido font-bold">Projetos</h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            Cada projeto lista o que a ONG pediu e quanto ela já confirmou ter recebido.
            Filtre por cidade ou causa para achar o que está perto de você.
          </p>
        </header>

        {/* Busca, filtros e atalhos de causa numa barra de papel só. */}
        <div className="mt-8 rounded-xl border bg-card p-3 shadow-sutil md:mt-10 md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  trocarFiltros({ termo: busca });
                }}
                className="flex min-w-0 flex-1 gap-2"
                noValidate
              >
                <Label htmlFor="busca-projetos" className="sr-only">
                  Buscar projetos
                </Label>
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="busca-projetos"
                    name="busca"
                    type="search"
                    autoComplete="off"
                    placeholder="Projeto, ONG ou cidade"
                    className="h-12 pl-10 md:text-base"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="shrink-0 px-4 md:px-6">
                  <Search className="md:hidden" aria-hidden="true" />
                  <span className="sr-only md:not-sr-only">Buscar</span>
                </Button>
              </form>

              <Sheet open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="lg" className="shrink-0 px-4 md:hidden">
                    <SlidersHorizontal aria-hidden="true" />
                    Filtros
                    {filtrosAtivos > 0 && (
                      <Badge className="numero ml-1 px-2">{filtrosAtivos}</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
                  <SheetHeader className="text-left">
                    <SheetTitle className="font-display text-xl">Filtros</SheetTitle>
                    <SheetDescription>A lista atualiza enquanto você escolhe.</SheetDescription>
                  </SheetHeader>

                  {camposDeFiltro("celular", "mt-6 grid gap-4", true)}

                  <div className="mt-8 flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button className="w-full">
                        Ver {total} {total === 1 ? "projeto" : "projetos"}
                      </Button>
                    </SheetClose>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={limparFiltros}
                      disabled={filtrosAtivos === 0}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {camposDeFiltro(
              "desktop",
              "hidden gap-2 md:grid md:grid-cols-3 lg:w-[34rem] lg:shrink-0",
              false,
            )}
          </div>

          {/*
           * Atalho de causa em chip, com a miniatura da foto da categoria.
           * Os selects continuam existindo e são a via acessível completa;
           * estes botões são o caminho de um toque. Rolagem horizontal contida
           * no celular, para não empurrar a página.
           */}
          {causas.length > 1 && (
            <div
              className="rolagem-contida -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 md:mt-4"
              role="group"
              aria-label="Filtrar por causa"
            >
              <ChipDeCausa
                rotulo="Todas as causas"
                ativo={!filtros.causa}
                onClick={() => trocarFiltros({ causa: "" })}
              />
              {causas.map((causa) => (
                <ChipDeCausa
                  key={causa}
                  rotulo={causa}
                  miniatura={capaDaCausa(causa)?.src}
                  ativo={filtros.causa === causa}
                  onClick={() => trocarFiltros({ causa: filtros.causa === causa ? "" : causa })}
                />
              ))}
            </div>
          )}
        </div>

        <div ref={inicioDosResultados} className="mt-10 scroll-mt-4" aria-busy={isFetching}>
          {isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardEsqueleto key={i} largo={comDestaque && i === 0} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Não foi possível carregar os projetos"
              description="Pode ter sido a conexão. Tente de novo em instantes."
              onRetry={() => refetch()}
            />
          ) : total === 0 ? (
            <EmptyState
              ilustracao={filtrosAtivos > 0 ? "vazio" : "caixa"}
              title={
                filtrosAtivos > 0
                  ? "Nenhum projeto com esses filtros"
                  : "Ainda não há projetos publicados"
              }
              description={
                filtrosAtivos > 0
                  ? "Tente outra cidade ou outra causa, ou veja tudo que está aberto."
                  : "Assim que uma ONG publicar um projeto, ele aparece aqui."
              }
              action={
                filtrosAtivos > 0
                  ? { label: "Limpar filtros", onClick: limparFiltros }
                  : { label: "Ver as ONGs parceiras", to: "/ongs" }
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p role="status" className="rotulo-caps">
                  <span className="numero text-foreground">{total}</span>{" "}
                  {total === 1 ? "projeto aberto" : "projetos abertos"}
                  {ultimaPagina > 0 && (
                    <span className="numero">
                      {` · página ${paginaAtual + 1} de ${ultimaPagina + 1}`}
                    </span>
                  )}
                </p>
                {filtrosAtivos > 0 && (
                  <Button variant="link" className="h-auto p-0" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                )}
              </div>

              {total > JANELA && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Mostrando os {JANELA} projetos publicados mais recentemente. Use a busca ou
                  os filtros para chegar no que você procura.
                </p>
              )}

              <div className="ao-rolar-escalonado mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visiveis.map((projeto, i) => {
                  const largo = comDestaque && i === 0;
                  return (
                    <ProjectCard
                      key={projeto.id}
                      projeto={paraCard(projeto)}
                      variante={largo ? "largo" : "padrao"}
                      className={largo ? "sm:col-span-2" : undefined}
                    />
                  );
                })}
              </div>

              {ultimaPagina > 0 && (
                <nav
                  className="mt-12 flex items-center justify-center gap-4"
                  aria-label="Paginação dos projetos"
                >
                  <Button
                    variant="outline"
                    onClick={() => irParaPagina(Math.max(0, paginaAtual - 1))}
                    disabled={paginaAtual === 0}
                  >
                    Anterior
                  </Button>
                  <span className="numero text-sm text-muted-foreground">
                    {paginaAtual + 1} de {ultimaPagina + 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => irParaPagina(Math.min(ultimaPagina, paginaAtual + 1))}
                    disabled={paginaAtual >= ultimaPagina}
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </PublicShell>
  );
}

/** Esqueleto com a mesma forma do card: capa 4:3, ONG, título, resumo, número, barra e ação. */
function CardEsqueleto({ largo = false }: { largo?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sutil",
        largo && "sm:col-span-2 md:grid md:grid-cols-2",
      )}
      aria-hidden="true"
    >
      <Skeleton
        className={cn(
          "w-full rounded-none",
          largo ? "aspect-[4/3] md:aspect-auto md:h-full md:min-h-[20rem]" : "aspect-[4/3]",
        )}
      />
      <div className={largo ? "p-6 md:p-8" : "p-5"}>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2.5 h-6 w-3/4" />
        <Skeleton className="mt-2.5 h-4 w-24" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-5/6" />
        <Skeleton className="mt-6 h-7 w-44" />
        <Skeleton className="mt-2.5 h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-3 w-48" />
        <Skeleton className="mt-5 h-5 w-32" />
      </div>
    </div>
  );
}

/**
 * Chip de filtro por causa, com a miniatura redonda da foto da categoria.
 *
 * `aria-pressed` em vez de papel de aba: não há painel por causa, é um botão de
 * duas posições. 40px de altura para caber o alvo de toque, e
 * `whitespace-nowrap` porque "População em situação de rua" quebraria em três
 * linhas dentro do chip. A miniatura é `alt=""`: o rótulo já diz a causa.
 */
function ChipDeCausa({
  rotulo,
  miniatura,
  ativo,
  onClick,
}: {
  rotulo: string;
  miniatura?: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "pressionavel inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-controle border pr-3.5 text-sm font-medium transition-[background-color,color,border-color] duration-150 ease-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        miniatura ? "pl-1.5" : "pl-3.5",
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent",
      )}
    >
      {miniatura && (
        <img
          src={miniatura}
          alt=""
          className={cn(
            "h-7 w-7 rounded-full object-cover ring-2",
            ativo ? "ring-primary-foreground/30" : "ring-card",
          )}
          loading="lazy"
          decoding="async"
        />
      )}
      {rotulo}
    </button>
  );
}
