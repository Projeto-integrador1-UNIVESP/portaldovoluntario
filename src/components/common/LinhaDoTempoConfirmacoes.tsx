import { BadgeCheck, Clock, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "@/lib/format";

/**
 * Histórico de confirmações de um projeto.
 *
 * Nenhuma plataforma de doação pesquisada expõe isto. Elas mostram quanto foi
 * arrecadado; nenhuma mostra quem confirmou o quê e quando. Aqui esse registro
 * existe porque a barra depende dele, e mostrá-lo é a prova mais forte que o
 * produto tem: não é a plataforma afirmando que a doação chegou, é a
 * organização assinando embaixo, com data e hora.
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
    const unidade = c.unidade ? ` ${c.unidade}` : "";
    return `${c.quantidade.toLocaleString("pt-BR")}${unidade} de ${c.necessidadeNome}`;
  }
  return formatCurrency(c.valor);
}

export function LinhaDoTempoConfirmacoes({
  confirmacoes,
  className,
}: {
  confirmacoes: Confirmacao[];
  className?: string;
}) {
  if (confirmacoes.length === 0) return null;

  return (
    <section className={cn("", className)} aria-labelledby="titulo-confirmacoes">
      <h2 id="titulo-confirmacoes" className="font-display text-xl font-bold">
        O que já chegou
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada linha foi registrada pela própria organização no dia em que recebeu.
      </p>

      <ol className="ao-rolar-escalonado mt-5 space-y-0">
        {confirmacoes.map((c, i) => {
          const confirmada = Boolean(c.confirmadaEm);
          const ultima = i === confirmacoes.length - 1;

          return (
            <li key={c.id} className="relative flex gap-4 pb-5 last:pb-0">
              {!ultima && (
                <span
                  className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border"
                  aria-hidden="true"
                />
              )}

              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  confirmada ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {confirmada ? (
                  <PackageCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Clock className="h-4 w-4" aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm">
                  <span className="numero font-semibold">{descrever(c)}</span>
                  <span className="text-muted-foreground">
                    {c.anonima ? ", de um doador anônimo" : c.doadorNome ? `, de ${c.doadorNome}` : ""}
                  </span>
                </p>

                {confirmada ? (
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-success">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Recebimento confirmado em {formatDateTime(c.confirmadaEm)}</span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Declarado em {formatDateTime(c.dataDoacao)}. Ainda não confirmado.
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
