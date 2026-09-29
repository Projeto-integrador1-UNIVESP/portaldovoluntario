import { useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FolderOpen, Search, SlidersHorizontal } from "lucide-react";
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
import { diasRestantes } from "@/lib/format";

const POR_PAGINA = 12;

/**
 * Tamanho da janela buscada por filtro.
 *
 * A RPC ordena por data de publicação e não recebe parâmetro de ordem. Ordenar
 * apenas a página visível produziria uma lista errada em relação ao total, então
 * a tela busca uma janela única e faz ordenação e paginação sobre ela — a ordem
 * passa a valer para tudo que a tela mostra. Acima da janela, o texto de
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

/** Opções dos filtros a partir do que existe publicado — sem lista fixa no código. */
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
  // primeira ONG preencher a cidade ou a causa do projeto.
  const camposDeFiltro = (idPrefixo: string, className: string) => (
    <div className={className}>
      <div>
        <Label htmlFor={`${idPrefixo}-cidade`}>Cidade</Label>
        <Select
          value={filtros.cidade || TODAS}
          onValueChange={(v) => trocarFiltros({ cidade: v === TODAS ? "" : v })}
        >
          <SelectTrigger
            id={`${idPrefixo}-cidade`}
            className="mt-1.5"
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
        <Label htmlFor={`${idPrefixo}-causa`}>Causa</Label>
        <Select
          value={filtros.causa || TODAS}
          onValueChange={(v) => trocarFiltros({ causa: v === TODAS ? "" : v })}
        >
          <SelectTrigger
            id={`${idPrefixo}-causa`}
            className="mt-1.5"
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
        <Label htmlFor={`${idPrefixo}-ordem`}>Ordenar por</Label>
        <Select
          value={ordem}
          onValueChange={(v) => {
            setPagina(0);
            setOrdem(v as Ordem);
          }}
        >
          <SelectTrigger id={`${idPrefixo}-ordem`} className="mt-1.5">
            <SelectValue />
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

  return (
    <PublicShell>
      <Seo
        title="Projetos"
        description="Veja os projetos das ONGs parceiras, o que cada uma pediu e quanto já foi confirmado como recebido."
      />

      <div className="container py-14">
        {/* O texto do H1 é contrato do e2e (`e2e/navegacao-publica.spec.ts`), que
            casa o nome acessível exato em nível 1 depois de clicar no menu. */}
        <h1 className="font-display text-2xl font-bold">Projetos</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Cada projeto mostra o que a organização pediu e quanto ela já confirmou ter
          recebido. Filtre por cidade e causa para achar o que está perto de você.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                trocarFiltros({ termo: busca });
              }}
              className="flex flex-1 gap-2 md:max-w-md"
              noValidate
            >
              <Label htmlFor="busca-projetos" className="sr-only">
                Buscar projetos
              </Label>
              <Input
                id="busca-projetos"
                name="busca"
                type="search"
                autoComplete="off"
                placeholder="Projeto, ONG ou cidade"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Button type="submit" className="pressionavel shrink-0">
                <Search className="h-4 w-4 md:mr-2" aria-hidden="true" />
                <span className="sr-only md:not-sr-only">Buscar</span>
              </Button>
            </form>

            <Sheet open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
              <SheetTrigger asChild>
                <Button variant="outline" className="pressionavel shrink-0 md:hidden">
                  <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
                  Filtros
                  {filtrosAtivos > 0 && (
                    <Badge className="ml-2 tabular-nums">{filtrosAtivos}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
                <SheetHeader className="text-left">
                  <SheetTitle className="font-display text-xl">Filtros</SheetTitle>
                  <SheetDescription>
                    A lista atualiza enquanto você escolhe.
                  </SheetDescription>
                </SheetHeader>

                {camposDeFiltro("celular", "mt-6 grid gap-4")}

                <div className="mt-8 flex flex-col gap-2">
                  <SheetClose asChild>
                    <Button className="pressionavel w-full">
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

          {camposDeFiltro("desktop", "hidden max-w-3xl gap-3 md:grid md:grid-cols-3")}
        </div>

        <div ref={inicioDosResultados} className="mt-8 scroll-mt-4" aria-busy={isFetching}>
          {isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardEsqueleto key={i} />
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
              icon={FolderOpen}
              title={
                filtrosAtivos > 0
                  ? "Nenhum projeto com esses filtros"
                  : "Ainda não há projetos publicados"
              }
              description={
                filtrosAtivos > 0
                  ? "Tente outra cidade ou causa, ou veja tudo que está aberto."
                  : "Assim que uma ONG publicar um projeto, ele aparece aqui."
              }
              action={
                filtrosAtivos > 0
                  ? { label: "Limpar filtros", onClick: limparFiltros }
                  : { label: "Ver ONGs parceiras", to: "/ongs" }
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p role="status" className="text-sm text-muted-foreground tabular-nums">
                  {total} {total === 1 ? "projeto encontrado" : "projetos encontrados"}
                  {ultimaPagina > 0 && ` · página ${paginaAtual + 1} de ${ultimaPagina + 1}`}
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
                {visiveis.map((projeto) => (
                  <ProjectCard key={projeto.id} projeto={paraCard(projeto)} />
                ))}
              </div>

              {ultimaPagina > 0 && (
                <nav
                  className="mt-10 flex items-center justify-center gap-4"
                  aria-label="Paginação dos projetos"
                >
                  <Button
                    variant="outline"
                    className="pressionavel"
                    onClick={() => irParaPagina(Math.max(0, paginaAtual - 1))}
                    disabled={paginaAtual === 0}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {paginaAtual + 1} de {ultimaPagina + 1}
                  </span>
                  <Button
                    variant="outline"
                    className="pressionavel"
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

/** Esqueleto com a mesma forma do card: capa, ONG, título, resumo, dados e barra. */
function CardEsqueleto() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sutil">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-5 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-5/6" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-5 h-5 w-32" />
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
      </div>
    </div>
  );
}
