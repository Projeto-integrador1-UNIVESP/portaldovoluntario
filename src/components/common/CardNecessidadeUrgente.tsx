import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Capa } from "@/components/common/Capa";
import { ProgressBar } from "@/components/common/ProgressBar";
import { formatPrazo, quantoFalta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NecessidadeUrgente } from "@/hooks/queries/useHome";

export { quantoFalta };

/** Rota de doação já apontando para este pedido. */
export function linkParaDoar(n: NecessidadeUrgente) {
  return n.projeto
    ? `/doar/projeto/${n.projeto.slug ?? n.projeto.id}?necessidade=${n.id}`
    : "/projetos";
}

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * "Faltam 77 kg de Pão francês" ou "Faltam R$ 1.200,00 para Reforma do
 * telhado". Quando a unidade já é o nome ("68 cobertores" de "Cobertores"),
 * fica só "Faltam 68 cobertores".
 */
export function tituloDoPedido(n: NecessidadeUrgente) {
  if (n.tipo === "dinheiro") return `Faltam ${quantoFalta(n)} para ${n.nome}`;
  if (n.unidade && normalizar(n.unidade) === normalizar(n.nome)) return `Faltam ${quantoFalta(n)}`;
  return `Faltam ${quantoFalta(n)} de ${n.nome}`;
}

type CardNecessidadeUrgenteProps = {
  necessidade: NecessidadeUrgente;
  /**
   * `card`: vertical, para grades (padrão).
   * `lista`: linha compacta, para a coluna ao lado do destaque.
   * `destaque`: grande, com foto de capa por cima.
   */
  variante?: "card" | "lista" | "destaque";
  className?: string;
};

/**
 * Card de necessidade em destaque.
 *
 * O número que ganha peso visual é **o que falta**, não o que já chegou:
 * "faltam 68 cobertores" move mais do que "32 de 100". A barra continua ali
 * para dar contexto. A ação é marinho: terracota é da página, não do card.
 */
export function CardNecessidadeUrgente({
  necessidade: n,
  variante = "card",
  className,
}: CardNecessidadeUrgenteProps) {
  const prazo = formatPrazo(n.prazo);
  const urgente = n.urgencia >= 3;
  const titulo = tituloDoPedido(n);

  const base =
    "elevavel group flex overflow-hidden rounded-xl border bg-card shadow-sutil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (variante === "lista") {
    return (
      <Link to={linkParaDoar(n)} className={cn(base, "flex-col p-5", className)}>
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">{n.ong?.nome}</p>
          {urgente && <EtiquetaUrgente />}
        </div>
        <p className="mt-1.5 font-display text-lg font-semibold leading-snug">{titulo}</p>
        <ProgressBar
          className="mt-3"
          arrecadado={n.arrecadado}
          meta={n.meta}
          tipo={n.tipo}
          unidade={n.unidade}
        />
        <Rodape prazo={prazo} />
      </Link>
    );
  }

  if (variante === "destaque") {
    return (
      <Link to={linkParaDoar(n)} className={cn(base, "flex-col", className)}>
        <Capa
          src={n.projeto?.capa}
          alt=""
          id={n.projeto?.id ?? n.id}
          nome={n.projeto?.nome_projeto}
          causa={n.projeto?.causa}
          sizes="(max-width: 1024px) 100vw, 880px"
          className="foto-zoom aspect-[16/9] w-full sm:aspect-[2/1]"
        >
          {urgente && <EtiquetaUrgente className="absolute left-4 top-4" />}
        </Capa>
        <div className="flex flex-1 flex-col p-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{n.ong?.nome}</span>
            {n.projeto && <> · {n.projeto.nome_projeto}</>}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold leading-tight">{titulo}</p>
          <ProgressBar
            className="mt-5"
            tamanho="lg"
            arrecadado={n.arrecadado}
            meta={n.meta}
            tipo={n.tipo}
            unidade={n.unidade}
          />
          <Rodape prazo={prazo} className="mt-5" />
        </div>
      </Link>
    );
  }

  return (
    <Link to={linkParaDoar(n)} className={cn(base, "h-full flex-col p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">{n.ong?.nome}</p>
        {urgente && <EtiquetaUrgente />}
      </div>

      {/* Na grade, o número fica sozinho no título e o nome vai na linha de
          baixo: é o formato que a página da ONG já usa. */}
      <p className="mt-3 font-display text-xl font-semibold leading-tight">Faltam {quantoFalta(n)}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {titulo === `Faltam ${quantoFalta(n)}` ? "" : n.tipo === "dinheiro" ? `para ${n.nome}` : `de ${n.nome}`}
        {n.projeto && (titulo === `Faltam ${quantoFalta(n)}` ? `no projeto ${n.projeto.nome_projeto}` : `, no projeto ${n.projeto.nome_projeto}`)}
      </p>

      <div className="mt-auto pt-4">
        <ProgressBar arrecadado={n.arrecadado} meta={n.meta} tipo={n.tipo} unidade={n.unidade} />
        <Rodape prazo={prazo} />
      </div>
    </Link>
  );
}

function EtiquetaUrgente({ className }: { className?: string }) {
  return (
    <Badge variant="urgente" className={cn("shrink-0", className)}>
      <Flame aria-hidden="true" />
      Urgente
    </Badge>
  );
}

function Rodape({ prazo, className }: { prazo: string; className?: string }) {
  return (
    <div className={cn("mt-3 flex items-center justify-between gap-3", className)}>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Doar para este pedido
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
      {prazo && <span className="numero text-xs text-muted-foreground">{prazo}</span>}
    </div>
  );
}
