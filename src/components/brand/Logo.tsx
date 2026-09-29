import { cn } from "@/lib/utils";

/**
 * Marca da Voluntá.
 *
 * A confirmação está no nome: o acento do "á" é um check. Aqui a barra só
 * sobe quando a ONG confirma que recebeu, e o wordmark diz isso antes de
 * qualquer frase. O nome é texto vivo em Fraunces (display, semibold) com o
 * "a" sem acento e o check terracota desenhado por cima, no lugar do agudo.
 *
 * O símbolo é o mesmo check dentro de um selo circular marinho: um anel de
 * traço levemente irregular, com uma pequena falha de tinta, como o carimbo
 * de "recebido" batido no papel.
 *
 * Marinho é estrutura e terracota é ação, os mesmos papéis que as cores têm
 * no resto da interface. Em `monocromatico` tudo herda `currentColor`.
 */

/**
 * Anel do carimbo: linha central de raio ~12,2 com ondulação de ±0,4 e uma
 * falha de 30° no alto à esquerda. Gerado uma vez (Catmull-Rom em cúbicas),
 * não desenhado à mão, para o traço ser o mesmo em todo lugar.
 */
const ANEL =
  "M6.91 8.10C7.21 7.82 8.07 6.93 8.70 6.39C9.33 5.85 9.98 5.30 10.70 4.86C11.42 4.42 12.21 3.99 13.03 3.76C13.84 3.53 14.75 3.44 15.59 3.47C16.44 3.50 17.30 3.71 18.11 3.93C18.93 4.14 19.72 4.42 20.48 4.75C21.25 5.07 22.02 5.42 22.70 5.88C23.38 6.34 24.02 6.91 24.57 7.52C25.11 8.13 25.55 8.85 25.96 9.55C26.38 10.25 26.74 10.97 27.08 11.71C27.43 12.46 27.80 13.21 28.03 14.02C28.27 14.82 28.46 15.69 28.47 16.53C28.48 17.37 28.32 18.25 28.09 19.06C27.86 19.88 27.48 20.66 27.09 21.41C26.70 22.16 26.27 22.90 25.76 23.56C25.24 24.23 24.67 24.89 24.02 25.41C23.36 25.93 22.59 26.35 21.83 26.67C21.06 26.99 20.23 27.16 19.44 27.34C18.64 27.52 17.85 27.66 17.04 27.77C16.24 27.87 15.41 28.01 14.59 27.99C13.77 27.96 12.90 27.87 12.11 27.64C11.31 27.41 10.54 27.02 9.81 26.60C9.09 26.18 8.41 25.67 7.76 25.13C7.11 24.59 6.45 24.02 5.92 23.36C5.39 22.70 4.88 21.96 4.56 21.18C4.24 20.40 4.08 19.51 3.99 18.68C3.90 17.84 3.98 16.99 4.03 16.16C4.08 15.34 4.27 14.13 4.32 13.73";

/** O check da marca, o mesmo no símbolo e no acento. */
const CHECK = "M10.2 16.6 L14.3 20.6 L22 12.2";

const terracota = (monocromatico?: boolean) => (monocromatico ? "currentColor" : "hsl(var(--cta))");

type SimboloProps = {
  className?: string;
  /** Em tamanhos pequenos o traço fino some; a variante compacta o engrossa. */
  compacto?: boolean;
  /** Herda a cor do contexto em vez de usar as cores da marca (rodapé escuro, impressão). */
  monocromatico?: boolean;
};

export function LogoSimbolo({ className, compacto, monocromatico }: SimboloProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={ANEL}
        fill="none"
        stroke="currentColor"
        strokeWidth={compacto ? 3 : 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={CHECK}
        fill="none"
        stroke={terracota(monocromatico)}
        strokeWidth={compacto ? 3.8 : 3.1}
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
    <span
      role="img"
      aria-label="Voluntá"
      className={cn(
        "inline-flex items-center gap-[0.4em] text-lg leading-none",
        !monocromatico && "text-foreground",
        className,
      )}
    >
      <LogoSimbolo
        className={cn("h-[1.45em] w-[1.45em] shrink-0", !monocromatico && "text-primary")}
        monocromatico={monocromatico}
      />
      {!soSimbolo && (
        <span
          aria-hidden="true"
          className="texto-display whitespace-nowrap font-display font-semibold tracking-[-0.02em]"
        >
          Volunt
          <span className="relative inline-block">
            a
            {/* O acento agudo, desenhado como check: por isso o "a" acima vai sem acento. */}
            <svg
              viewBox="0 0 12 10"
              className="absolute left-[0.12em] top-[-0.09em] h-[0.33em] w-[0.4em]"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M1.6 5.4 L4.6 8.4 L10.4 1.6"
                fill="none"
                stroke={terracota(monocromatico)}
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      )}
    </span>
  );
}
