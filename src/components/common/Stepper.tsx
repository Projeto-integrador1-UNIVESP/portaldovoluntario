import { AnimatePresence, m } from "motion/react";
import { EASE_SUAVE } from "@/lib/movimento";
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
 * O número de cada passo é Fraunces, como todo número que a tela quer que se
 * leia. O passo atual é um disco de tinta que desliza entre os círculos
 * (`layoutId`), os concluídos ganham um check e o traço entre eles preenche
 * conforme a pessoa avança. Sob `prefers-reduced-motion` o `MotionConfig` do
 * app corta o movimento e sobra a troca de estado.
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
              className={cn("flex min-w-0 items-center gap-2.5", i > 0 && "flex-1")}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="relative h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-border"
                >
                  <m.span
                    className="absolute inset-0 origin-left rounded-full bg-primary"
                    initial={false}
                    animate={{ scaleX: concluido || ativo ? 1 : 0 }}
                    transition={{ duration: 0.42, ease: EASE_SUAVE }}
                  />
                </span>
              )}

              <span
                className={cn(
                  "numero relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-display text-sm font-semibold transition-colors duration-200",
                  concluido && "border-primary bg-primary/10 text-primary",
                  ativo && "border-primary text-primary-foreground",
                  !concluido && !ativo && "border-border bg-card text-muted-foreground",
                )}
              >
                {ativo && (
                  <m.span
                    layoutId="stepper-passo-atual"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ duration: 0.28, ease: EASE_SUAVE }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative">
                  {concluido ? <Check className="h-4 w-4" aria-hidden="true" /> : numero}
                </span>
              </span>

              <span
                className={cn(
                  "hidden truncate text-sm sm:inline",
                  ativo ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {passo.rotulo}
              </span>
            </li>
          );
        })}
      </ol>

      {/* No celular os rótulos não caberiam lado a lado; fica só o passo atual,
          que desliza de lado a cada troca. É decorativo: o leitor de tela ouve
          a versão `aria-live` logo abaixo. */}
      <div className="mt-2.5 overflow-hidden sm:hidden" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={indice}
            className="text-sm font-medium"
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            exit={{ x: -20 }}
            transition={{ duration: 0.28, ease: EASE_SUAVE }}
          >
            Passo <span className="numero">{indice}</span> de{" "}
            <span className="numero">{total}</span> · {passoAtual.rotulo}
          </m.p>
        </AnimatePresence>
      </div>

      <p aria-live="polite" className="sr-only">
        Passo {indice} de {total}: {passoAtual.rotulo}
      </p>
    </nav>
  );
}
