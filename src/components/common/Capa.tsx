import { cn } from "@/lib/utils";

/**
 * Imagem de capa com um substituto que não é um vazio cinza.
 *
 * Projeto e ONG frequentemente não têm foto, e o buraco cinza que sobrava era
 * o pior defeito visual do produto. Em vez de um placeholder genérico, o
 * espaço recebe um padrão gerado a partir do identificador do registro: é
 * estável (o mesmo projeto tem sempre a mesma capa), usa as cores da marca e
 * não finge ser uma fotografia.
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

function PadraoGerado({ id, className }: { id: string; className?: string }) {
  const s = semente(id);
  // Matizes vizinhos ao azul da marca, para o padrão nunca brigar com a UI.
  const matiz = 185 + (s % 40);
  const rotacao = s % 180;
  const raio = 18 + (s % 14);

  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden="true">
      <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 120 80">
        <defs>
          <linearGradient id={`g-${s}`} gradientTransform={`rotate(${rotacao} 0.5 0.5)`}>
            <stop offset="0%" stopColor={`hsl(${matiz} 45% 82%)`} />
            <stop offset="100%" stopColor={`hsl(${matiz - 12} 35% 92%)`} />
          </linearGradient>
        </defs>
        <rect width="120" height="80" fill={`url(#g-${s})`} />
        <circle cx={s % 120} cy={(s >> 3) % 80} r={raio} fill={`hsl(${matiz} 50% 74%)`} opacity="0.55" />
        <circle
          cx={(s >> 5) % 120}
          cy={(s >> 7) % 80}
          r={raio * 0.65}
          fill={`hsl(${matiz + 18} 55% 70%)`}
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

type CapaProps = {
  src?: string | null;
  /** Descrição da foto. Vazio quando a imagem é decorativa. */
  alt: string;
  /** Identificador do registro: garante que a capa gerada seja sempre a mesma. */
  id: string;
  className?: string;
  /** Conteúdo sobreposto, como um selo. */
  children?: React.ReactNode;
};

export function Capa({ src, alt, id, className, children }: CapaProps) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <PadraoGerado id={id} className="h-full w-full" />
      )}
      {children}
    </div>
  );
}
