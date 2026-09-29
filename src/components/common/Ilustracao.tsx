import { cn } from "@/lib/utils";

/**
 * Ilustrações da marca, em traço de caneta.
 *
 * Conjunto fechado: `vazio` (lista sem itens), `erro` (falha de carregamento),
 * `perdido` (404), `obrigado` (doação registrada), `caixa` (nenhum pedido).
 * Todas usam a tinta do contexto (`currentColor`) e um toque de terracota,
 * para não parecerem clip-art colada. Decorativas: `aria-hidden`.
 */
export type NomeDaIlustracao = "vazio" | "erro" | "perdido" | "obrigado" | "caixa";

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DESENHOS: Record<NomeDaIlustracao, JSX.Element> = {
  vazio: (
    <>
      <path d="M32 56 C33 53, 35 52, 38 52 L122 52 C125 52, 127 54, 127 57 L124 96 C124 99, 122 101, 119 101 L41 101 C38 101, 36 99, 36 96 Z" fill="hsl(var(--tinta-creme))" {...traco} />
      <path d="M38 52 L30 38 C29 36, 30 34, 32 34 L70 32 L80 50" {...traco} />
      <path d="M122 52 L131 39 C132 37, 131 35, 129 35 L92 32 L80 50" {...traco} />
      <path d="M70 32 L80 50 L92 32" {...traco} />
      <path d="M52 70 C60 66, 70 66, 78 70" {...traco} strokeWidth={2} />
      <path d="M62 18 L64 12 M78 14 L78 8 M94 18 L92 12" stroke="hsl(var(--cta))" strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  ),
  erro: (
    <>
      <path d="M18 62 C40 60, 48 58, 58 60" {...traco} />
      <path d="M58 52 L74 52 C77 52, 78 54, 78 56 L78 66 C78 68, 77 70, 74 70 L58 70 Z" fill="hsl(var(--tinta-creme))" {...traco} />
      <path d="M78 57 L86 57 M78 65 L86 65" {...traco} />
      <path d="M100 48 L118 48 C121 48, 122 50, 122 52 L122 70 C122 72, 121 74, 118 74 L100 74 Z" fill="hsl(var(--tinta-azulpo))" {...traco} />
      <path d="M100 57 L94 57 M100 65 L94 65" {...traco} />
      <path d="M122 61 C132 60, 138 62, 146 60" {...traco} />
      <path d="M90 34 L92 26 M88 42 L82 38 M94 40 L98 36" stroke="hsl(var(--cta))" strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  ),
  perdido: (
    <>
      <path d="M80 104 L80 40" {...traco} />
      <path d="M40 106 C56 104, 100 104, 122 106" {...traco} strokeWidth={2} />
      <path d="M80 44 L118 44 L128 52 L118 60 L80 60 Z" fill="hsl(var(--tinta-creme))" {...traco} />
      <path d="M80 66 L44 66 L34 74 L44 82 L80 82 Z" fill="hsl(var(--tinta-azulpo))" {...traco} />
      <path d="M92 52 L110 52 M52 74 L70 74" {...traco} strokeWidth={2} />
      <path d="M80 38 C80 32, 74 28, 74 22 C74 18, 77 15, 80 15 C83 15, 86 18, 86 22 C86 28, 80 32, 80 38 Z" fill="hsl(var(--cta))" stroke="hsl(var(--cta))" strokeWidth={2} strokeLinejoin="round" />
      <path d="M28 100 C30 96, 34 96, 36 100 M46 94 C48 90, 52 90, 54 94" {...traco} strokeWidth={2} strokeDasharray="0 6" />
    </>
  ),
  obrigado: (
    <>
      <circle cx="80" cy="62" r="30" fill="hsl(var(--tinta-salvia))" {...traco} />
      <path d="M66 63 L76 73 L96 51" stroke="hsl(var(--cta))" strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M30 40 L36 36 M26 62 L20 62 M34 86 L28 90 M130 40 L124 36 M134 62 L140 62 M126 86 L132 90" {...traco} strokeWidth={2.4} />
      <circle cx="46" cy="22" r="2.6" fill="hsl(var(--cta))" />
      <circle cx="116" cy="24" r="2.6" fill="currentColor" />
      <circle cx="122" cy="102" r="2.6" fill="hsl(var(--cta))" />
      <circle cx="40" cy="104" r="2.6" fill="currentColor" />
    </>
  ),
  caixa: (
    <>
      <path d="M36 58 L80 40 L124 58 L124 98 L80 116 L36 98 Z" fill="hsl(var(--tinta-creme))" {...traco} />
      <path d="M36 58 L80 76 L124 58 M80 76 L80 116" {...traco} />
      <path d="M58 49 L102 67" {...traco} strokeWidth={2} />
      <path d="M94 26 L112 20 L114 30 L98 36 Z" fill="hsl(var(--cta))" stroke="hsl(var(--cta))" strokeWidth={2} strokeLinejoin="round" />
      <path d="M92 32 C88 36, 86 40, 86 44" {...traco} strokeWidth={2} />
    </>
  ),
};

export function Ilustracao({ nome, className }: { nome: NomeDaIlustracao; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={cn("h-28 w-auto text-primary", className)}
      aria-hidden="true"
      focusable="false"
    >
      {DESENHOS[nome]}
    </svg>
  );
}
