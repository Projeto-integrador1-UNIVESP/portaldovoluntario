import { useRef } from "react";
import { Link } from "react-router-dom";
import { useInView } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { TESE } from "@/lib/copy";
import { formatCurrency, formatDate, formatQuantidade } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UltimaConfirmacao } from "@/hooks/queries/useHome";

/**
 * Enquanto não houver confirmação nos projetos em destaque, a linha do tempo
 * mostra este caso, marcado como exemplo na tela.
 */
const EXEMPLO: UltimaConfirmacao = {
  id: "exemplo",
  doador: "Simone",
  quantidade: null,
  unidade: null,
  valor: 300,
  necessidadeNome: "cestas básicas de setembro",
  dataDoacao: "2026-09-08T14:10:00-03:00",
  confirmadaEm: "2026-09-11T09:32:00-03:00",
  projeto: { id: "exemplo", slug: null, nome_projeto: "Cesta do mês" },
  ong: { nome: "Casa de Apoio Esperança", slug: null },
  barra: { antes: 24, depois: 31, meta: 4200, arrecadado: 1310, tipo: "dinheiro", unidade: null },
};

function descreverDoacao(c: UltimaConfirmacao) {
  if (c.quantidade && c.necessidadeNome) {
    return `${formatQuantidade(c.quantidade, c.unidade)} de ${c.necessidadeNome}`;
  }
  return formatCurrency(c.valor);
}

function diasDepois(c: UltimaConfirmacao) {
  const dias = Math.max(0, Math.round((Date.parse(c.confirmadaEm) - Date.parse(c.dataDoacao)) / 86_400_000));
  if (dias === 0) return "No mesmo dia";
  if (dias === 1) return "Um dia depois";
  return `${dias} dias depois`;
}

/**
 * A tese, mostrada numa doação que aconteceu: doou, a ONG confirmou, a barra
 * subiu. Três momentos ligados por um traço desenhado quando o bloco entra
 * em tela. É o único lugar da home em que a tese é dita por extenso.
 */
export function ComoAContaFecha({
  confirmacao,
  carregando = false,
}: {
  /** `null` quando não há confirmação: entra o exemplo. */
  confirmacao: UltimaConfirmacao | null | undefined;
  carregando?: boolean;
}) {
  const exemplo = !carregando && !confirmacao;
  const c = confirmacao ?? EXEMPLO;
  // A ref fica na seção, que existe desde o primeiro render: o `useInView`
  // só observa o elemento que encontra no primeiro efeito, e a lista dos
  // momentos entra depois, quando a confirmação chega.
  const ref = useRef<HTMLElement>(null);
  const emTela = useInView(ref, { once: true, amount: 0.3 });

  const quem = c.doador ?? "Uma pessoa";
  const ong = c.ong?.nome ?? "A ONG";
  const linkProjeto = exemplo ? null : `/projetos/${c.projeto.slug ?? c.projeto.id}`;

  return (
    <section
      ref={ref}
      id="como-a-conta-fecha"
      className="grao bg-primary py-14 text-primary-foreground md:py-20"
      aria-labelledby="titulo-conta"
    >
      <div className="container">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="rotulo-caps text-primary-foreground/70">Como a conta fecha</p>
            {exemplo && (
              <Badge variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground/80">
                Exemplo
              </Badge>
            )}
          </div>
          <h2 id="titulo-conta" className="mt-3 font-display text-2xl-fluido font-semibold">
            {TESE}
          </h2>
          <p className="mt-4 text-base text-primary-foreground/80">
            {exemplo
              ? "Assim fica o registro de uma doação, do Pix até a barra."
              : "Este é o registro da última doação confirmada na plataforma, do Pix até a barra."}
          </p>
        </div>

        {carregando ? (
          // Barras discretas em creme translúcido: o `Skeleton` padrão brilha
          // cor de papel, e sobre marinho isso vira um bloco branco.
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8" role="status" aria-live="polite">
            <span className="sr-only">Carregando a última confirmação…</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 md:block" aria-hidden="true">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary-foreground/15" />
                <div className="flex-1 pt-1.5 md:pt-5">
                  <div className="h-3 w-20 rounded-md bg-primary-foreground/15" />
                  <div className="mt-3 h-6 w-4/5 rounded-md bg-primary-foreground/15" />
                  <div className="mt-2 h-4 w-3/5 rounded-md bg-primary-foreground/15" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Traço que liga os três discos: horizontal no desktop (do centro
              do 1º ao centro do 3º), vertical no celular. `pathLength="1"`
              deixa o CSS desenhar de 0 a 1. A viewBox tem quase o tamanho
              final em pixels, para o esticamento não deformar o traço.
              Largura e altura explícitas: `svg` absoluto ignora `left`+`right`
              e fica no tamanho da viewBox. Com três colunas e `gap-8`, o
              centro do 3º disco fica em 2/3 da largura + 21px. */}
          <svg
            className="pointer-events-none absolute left-5 top-5 hidden h-3 w-[calc(66.667%+1.33rem)] md:block"
            viewBox="0 0 800 12"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M0 6 C 140 1, 260 11, 400 6 S 660 2, 800 6"
              className={cn("fill-none stroke-primary-foreground/45", tracoClasse(emTela))}
              strokeWidth={2}
              strokeLinecap="round"
              pathLength="1"
            />
          </svg>
          <Momento numero={1} data={formatDate(c.dataDoacao)} emTela={emTela}>
            <p className="font-display text-xl font-semibold">
              {quem} doou <span className="numero">{descreverDoacao(c)}</span>
            </p>
            <p className="mt-2 text-sm text-primary-foreground/80">
              para o projeto{" "}
              {linkProjeto ? (
                <Link to={linkProjeto} className="font-medium text-primary-foreground underline underline-offset-4">
                  {c.projeto.nome_projeto}
                </Link>
              ) : (
                <span className="font-medium text-primary-foreground">{c.projeto.nome_projeto}</span>
              )}
              , da {ong}.
            </p>
          </Momento>

          <Momento numero={2} data={formatDate(c.confirmadaEm)} emTela={emTela}>
            <p className="font-display text-xl font-semibold">
              {diasDepois(c)}, a {ong} confirmou que recebeu
            </p>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Alguém da organização entrou no painel e registrou a entrega. Sem isso, a doação fica como aguardando.
            </p>
          </Momento>

          <Momento numero={3} data="Só então" emTela={emTela} ultimo>
            <p className="font-display text-xl font-semibold">
              {c.barra ? (
                <>
                  A barra subiu de <span className="numero">{c.barra.antes}%</span> para{" "}
                  <span className="numero">{c.barra.depois}%</span>
                </>
              ) : (
                "A barra do pedido subiu"
              )}
            </p>
            {c.barra && (
              <div className="mt-4 rounded-xl bg-card p-4 text-card-foreground shadow-alta">
                <ProgressBar
                  arrecadado={c.barra.arrecadado}
                  meta={c.barra.meta}
                  tipo={c.barra.tipo}
                  unidade={c.barra.unidade}
                />
              </div>
            )}
            <SeloConfirmacao
              variante="completo"
              confirmadaEm={c.confirmadaEm}
              className="mt-4 text-foreground"
            />
          </Momento>
        </ol>
        )}
      </div>
    </section>
  );
}

/** Antes de entrar em tela o traço fica recolhido; depois, `.desenhar` o revela. */
function tracoClasse(emTela: boolean) {
  return emTela ? "desenhar" : "[stroke-dasharray:1] [stroke-dashoffset:1] motion-reduce:[stroke-dashoffset:0]";
}

function Momento({
  numero,
  data,
  emTela,
  ultimo = false,
  children,
}: {
  numero: number;
  data: string;
  emTela: boolean;
  ultimo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4 md:block">
      <span
        className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background font-display text-base font-semibold text-primary ring-4 ring-primary"
        aria-hidden="true"
      >
        {numero}
      </span>

      {/* No celular o traço é por trecho: do disco deste momento até o disco
          do próximo (a altura do item mais o espaço da lista). O segundo trecho
          espera o primeiro terminar. */}
      {!ultimo && (
        <svg
          className="pointer-events-none absolute left-3.5 top-10 h-full w-3 md:hidden"
          viewBox="0 0 12 400"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M6 0 C 1 90, 11 160, 6 220 S 2 340, 6 400"
            className={cn("fill-none stroke-primary-foreground/45", tracoClasse(emTela))}
            style={{ "--desenhar-atraso": `${300 + (numero - 1) * 700}ms` } as React.CSSProperties}
            strokeWidth={2}
            strokeLinecap="round"
            pathLength="1"
          />
        </svg>
      )}
      <div className="min-w-0 pt-1.5 md:pt-5">
        <p className="rotulo-caps text-primary-foreground/70">{data}</p>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}
