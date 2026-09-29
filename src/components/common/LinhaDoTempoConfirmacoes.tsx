import { BadgeCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { TERMOS } from "@/lib/copy";

/**
 * Histórico de confirmações de um projeto.
 *
 * Outras vitrines mostram quanto foi arrecadado; nenhuma mostra quem
 * confirmou o quê e quando. Aqui esse registro existe porque a barra depende
 * dele, e mostrá-lo é a prova mais forte que o produto tem: a organização
 * assinando embaixo, com data e hora.
 */

export type Confirmacao = {
  id: string;
  quantidade: number | null;
  valor: number;
  confirmadaEm: string | null;
  dataDoacao: string;
  anonima: boolean;
  doadorNome: string | null;
  necessidadeNome: string | null;
  unidade: string | null;
};

function descrever(c: Confirmacao) {
  if (c.quantidade && c.necessidadeNome) {
    const unidade = c.unidade ? ` ${c.unidade}` : "";
    return `${c.quantidade.toLocaleString("pt-BR")}${unidade} de ${c.necessidadeNome}`;
  }
  return formatCurrency(c.valor);
}

function quemDoou(c: Confirmacao) {
  if (c.anonima) return "doação anônima";
  if (c.doadorNome) return `de ${c.doadorNome}`;
  return TERMOS.semIdentificacao.toLowerCase();
}

/** Índice da confirmação mais recente: é a que ganha o selo animado. */
function maisRecente(confirmacoes: Confirmacao[]) {
  let indice = -1;
  let maior = -Infinity;
  confirmacoes.forEach((c, i) => {
    if (!c.confirmadaEm) return;
    const t = new Date(c.confirmadaEm).getTime();
    if (t > maior) {
      maior = t;
      indice = i;
    }
  });
  return indice;
}

export function LinhaDoTempoConfirmacoes({
  confirmacoes,
  className,
}: {
  confirmacoes: Confirmacao[];
  className?: string;
}) {
  if (confirmacoes.length === 0) return null;

  const recente = maisRecente(confirmacoes);

  return (
    <section className={className} aria-labelledby="titulo-confirmacoes">
      <p className="rotulo-caps">Recibo público</p>
      <h2 id="titulo-confirmacoes" className="mt-1 font-display text-2xl font-semibold">
        O que já chegou
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada linha foi registrada por alguém da organização no dia em que a doação chegou.
      </p>

      <ol className="ao-rolar-escalonado mt-6">
        {confirmacoes.map((c, i) => {
          const confirmada = Boolean(c.confirmadaEm);
          const ultima = i === confirmacoes.length - 1;

          return (
            <li key={c.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Traço tintado ligando os marcadores. */}
              {!ultima && (
                <span
                  className="absolute left-[15px] top-9 h-[calc(100%-1.75rem)] w-0.5 rounded-full bg-primary/15"
                  aria-hidden="true"
                />
              )}

              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
                  confirmada
                    ? "bg-success text-success-foreground"
                    : "border border-border bg-card text-muted-foreground",
                  i === recente && "confirmou",
                )}
              >
                {confirmada ? (
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Clock className="h-4 w-4" aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm">
                  <span className="numero font-display text-lg font-semibold">{descrever(c)}</span>
                  <span className="text-muted-foreground">, {quemDoou(c)}</span>
                </p>

                {confirmada ? (
                  <p className="mt-1 text-xs">
                    <span className="font-semibold text-success">{TERMOS.confirmada}</span>
                    <span className="text-muted-foreground"> em {formatDateTime(c.confirmadaEm)}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold">{TERMOS.pendente}</span>
                    {" · "}declarada em {formatDateTime(c.dataDoacao)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
