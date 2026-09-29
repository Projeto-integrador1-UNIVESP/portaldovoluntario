import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PassoDoFluxo = {
  id: string;
  /** Rótulo curto, visível a partir de `sm`. */
  rotulo: string;
};

type StepperProps = {
  passos: PassoDoFluxo[];
  /** Passo atual, contado a partir de 1. */
  atual: number;
  className?: string;
};

/**
 * Indicador de progresso de um fluxo de várias etapas.
 *
 * Antes os passos eram numerados no título de cada card e todos ficavam abertos
 * ao mesmo tempo: no celular a página ficava longa sem dizer onde a pessoa
 * estava nem quanto faltava. O número sai do título e vem para cá.
 *
 * Sem laranja: `cta` é reservado para a ação de doar.
 */
export function Stepper({ passos, atual, className }: StepperProps) {
  const total = passos.length;
  const indice = Math.min(Math.max(atual, 1), total);
  const passoAtual = passos[indice - 1];

  return (
    <nav aria-label="Progresso da doação" className={className}>
      <ol className="flex items-center">
        {passos.map((passo, i) => {
          const numero = i + 1;
          const concluido = numero < indice;
          const ativo = numero === indice;

          return (
            <li
              key={passo.id}
              aria-current={ativo ? "step" : undefined}
              className={cn("flex min-w-0 items-center gap-2", i > 0 && "flex-1")}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px flex-1 min-w-3",
                    concluido || ativo ? "bg-primary/40" : "bg-border",
                  )}
                />
              )}

              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                  concluido && "border-primary bg-primary/10 text-primary",
                  ativo && "border-primary bg-primary text-primary-foreground",
                  !concluido && !ativo && "border-border bg-muted text-muted-foreground",
                )}
              >
                {concluido ? <Check className="h-4 w-4" aria-hidden="true" /> : numero}
              </span>

              <span
                className={cn(
                  "hidden truncate text-sm sm:inline",
                  ativo ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {passo.rotulo}
              </span>
            </li>
          );
        })}
      </ol>

      {/* No celular os rótulos não caberiam lado a lado; fica só o passo atual. */}
      <p className="mt-2 text-sm font-medium sm:hidden">
        Passo <span className="tabular-nums">{indice}</span> de{" "}
        <span className="tabular-nums">{total}</span> · {passoAtual.rotulo}
      </p>

      <p aria-live="polite" className="sr-only">
        Passo {indice} de {total}: {passoAtual.rotulo}
      </p>
    </nav>
  );
}
