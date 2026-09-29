import { cn } from "@/lib/utils";

/**
 * Imagem de capa com um substituto que não é um vazio cinza.
 *
 * Projeto e ONG frequentemente não têm foto, e o buraco cinza que sobrava era
 * o pior defeito visual do produto. O espaço recebe um padrão derivado do
 * identificador do registro — estável, então a mesma ONG tem sempre a mesma
 * capa — com o monograma do nome por cima.
 *
 * O monograma importa: um padrão puramente abstrato parece gerado por
 * máquina, e isso é o pior recado possível num produto cuja tese é
 * confirmação real. A letra carrega identidade. O matiz fica preso numa faixa
 * estreita ao redor do azul da marca, senão cada organização vira uma cor do
 * arco-íris e a identidade some.
 */

/** Hash estável e barato — não precisa ser criptográfico, só determinístico. */
function semente(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "para", "em"]);

/** "Casa de Apoio Esperança" vira "CA", não "CD". */
function monograma(nome: string): string {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => !CONECTIVOS.has(p.toLowerCase()));

  if (palavras.length === 0) return "?";
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

type CapaProps = {
  src?: string | null;
  /** Descrição da foto. Vazio quando a imagem é decorativa. */
  alt: string;
  /** Identificador do registro: garante que a capa gerada seja sempre a mesma. */
  id: string;
  /** Nome de onde sai o monograma do substituto. */
  nome?: string;
  className?: string;
  /** Conteúdo sobreposto, como um selo. */
  children?: React.ReactNode;
};

export function Capa({ src, alt, id, nome, className, children }: CapaProps) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-secondary", className)}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {children}
      </div>
    );
  }

  const s = semente(id);
  const matiz = 188 + (s % 34);
  const rotacao = 20 + (s % 140);
  const letras = nome ? monograma(nome) : null;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 120 80"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`capa-${s}`} gradientTransform={`rotate(${rotacao} 0.5 0.5)`}>
            <stop offset="0%" stopColor={`hsl(${matiz} 42% 86%)`} />
            <stop offset="100%" stopColor={`hsl(${matiz - 14} 34% 94%)`} />
          </linearGradient>
        </defs>
        <rect width="120" height="80" fill={`url(#capa-${s})`} />
        <circle
          cx={18 + (s % 90)}
          cy={(s >> 3) % 80}
          r={20 + (s % 16)}
          fill={`hsl(${matiz} 48% 78%)`}
          opacity="0.5"
        />
        <circle
          cx={(s >> 5) % 120}
          cy={12 + ((s >> 7) % 60)}
          r={12 + (s % 10)}
          fill={`hsl(${matiz + 16} 52% 74%)`}
          opacity="0.35"
        />
      </svg>

      {letras && (
        <span
          className="absolute inset-0 flex items-center justify-center font-display text-4xl font-extrabold tracking-tight"
          style={{ color: `hsl(${matiz} 45% 40% / 0.3)` }}
          aria-hidden="true"
        >
          {letras}
        </span>
      )}

      {children}
    </div>
  );
}
