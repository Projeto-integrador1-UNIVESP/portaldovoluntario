import { cn } from "@/lib/utils";

/**
 * Marca do Solidariedade.
 *
 * O símbolo é um anel com uma lacuna e um check preenchendo-a: a lacuna é o
 * que ainda falta para a meta, o check é a ONG confirmando que recebeu. É a
 * tese do produto em uma forma — a barra de progresso aqui é recibo, não
 * promessa.
 *
 * O azul carrega a instituição e o laranja carrega a ação, os mesmos papéis
 * que essas cores têm no resto da interface.
 */

type SimboloProps = {
  className?: string;
  /** Em tamanhos pequenos o traço fino do check some; a variante compacta o engrossa. */
  compacto?: boolean;
  /** Herda a cor do contexto em vez de usar as cores da marca (rodapé escuro, impressão). */
  monocromatico?: boolean;
};

export function LogoSimbolo({ className, compacto, monocromatico }: SimboloProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24.49 7.51 A12 12 0 1 1 7.51 7.51 L10.34 10.34 A8 8 0 1 0 21.66 10.34 Z"
        fill="currentColor"
      />
      <path
        d="M11 17 L14.5 20.5 L20.5 12.5"
        fill="none"
        stroke={monocromatico ? "currentColor" : "hsl(var(--cta))"}
        strokeWidth={compacto ? 4 : 2.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Oculta o nome, deixando só o símbolo. */
  soSimbolo?: boolean;
  monocromatico?: boolean;
};

export function Logo({ className, soSimbolo, monocromatico }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoSimbolo
        className="h-7 w-7 shrink-0 text-primary"
        monocromatico={monocromatico}
      />
      {!soSimbolo && (
        <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
          Solidariedade
        </span>
      )}
    </span>
  );
}
