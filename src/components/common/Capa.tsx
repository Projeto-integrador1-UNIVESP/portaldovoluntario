import { cn } from "@/lib/utils";
import { capaDaCausa, SIZES_PADRAO } from "@/lib/capasPorCausa";

/**
 * Imagem de capa com dois substitutos, nesta ordem de preferência.
 *
 * Projeto e ONG frequentemente não têm foto, e o buraco cinza que sobrava era
 * o pior defeito visual do produto.
 *
 * 1. `src` — a foto do próprio registro. Manda em tudo.
 * 2. `causa` — fotografia da categoria, de `lib/capasPorCausa`. Aquece a
 *    interface, que é o que as referências do setor fazem; fotografia ganha de
 *    ilustração quando o assunto é confiança. Mas é foto de banco, então vem
 *    sempre com véu e etiqueta "Imagem ilustrativa".
 * 3. Nada — o padrão gerado a partir do identificador, estável: a mesma ONG
 *    tem sempre a mesma capa. O monograma do nome vai por cima.
 *
 * O monograma importa: um padrão puramente abstrato parece gerado por
 * máquina, e isso é o pior recado possível num produto cuja tese é
 * confirmação real. A letra carrega identidade. O matiz fica preso numa faixa
 * estreita ao redor do azul da marca, senão cada organização vira uma cor do
 * arco-íris e a identidade some.
 *
 * O degradê é escuro de propósito. A versão pálida anterior, numa grade com
 * doze cards, lia como imagem que falhou ao carregar — o defeito exato que o
 * substituto existe para evitar. Escuro, com o monograma em branco por cima,
 * lê como capa de marca: escolha, não falha.
 */

/** Hash estável e barato. Não precisa ser criptográfico, só determinístico. */
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

/**
 * Véu e etiqueta que marcam a foto de categoria como ilustrativa.
 *
 * A foto é genérica e nunca é da ONG que está na tela. Sem marca nenhuma o
 * leitor entende que é, e num produto cuja tese é confirmação real isso é a
 * mentira mais cara possível.
 *
 * A marcação não pode depender de `nome`: só um dos quatro pontos de uso passa
 * esse dado hoje, então um monograma sozinho deixaria o card de projeto — o
 * mais visto — com foto de banco e nenhum aviso. Daí a etiqueta escrita, que
 * aparece sempre. Ela é texto de verdade, não `aria-hidden`: quem usa leitor
 * de tela merece o mesmo aviso que todo mundo.
 *
 * O véu é gradiente e não achatado: escurece o rodapé o bastante para a
 * etiqueta ter contraste, deixa o topo quase limpo e ainda baixa o contraste
 * geral, o que assenta a foto atrás de qualquer selo sobreposto.
 */
function MarcaIlustrativa() {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, hsl(200 60% 10% / 0.62) 0%, hsl(200 60% 10% / 0.24) 38%, hsl(200 60% 10% / 0.10) 100%)",
        }}
        aria-hidden="true"
      />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-medium leading-tight tracking-wide text-white/90 backdrop-blur-[2px]"
        /* À direita porque o avatar da ONG fica sobreposto no canto
           inferior esquerdo da capa e os dois se atropelavam. */>
        Imagem ilustrativa
      </span>
    </>
  );
}

type CapaProps = {
  src?: string | null;
  /** Descrição da foto. Vazio quando a imagem é decorativa. */
  alt: string;
  /** Identificador do registro: garante que a capa gerada seja sempre a mesma. */
  id: string;
  /** Nome de onde sai o monograma do substituto. */
  nome?: string;
  /**
   * Causa do registro, usada só quando não há `src`. Aceita array porque
   * `ongs.causas` é `TEXT[]`. Causa desconhecida cai na foto genérica.
   */
  causa?: string | string[] | null;
  /**
   * `sizes` da foto de categoria. O padrão é conservador para poupar dados no
   * celular; uma capa que ocupa a largura toda da página deve passar `100vw`.
   */
  sizes?: string;
  className?: string;
  /** Conteúdo sobreposto, como um selo. */
  children?: React.ReactNode;
};

export function Capa({
  src,
  alt,
  id,
  nome,
  causa,
  sizes = SIZES_PADRAO,
  className,
  children,
}: CapaProps) {
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

  // Causa preenchida, mesmo que fora da lista, ganha foto: a genérica existe
  // justamente para "Assistência social" e afins, e uma foto morna serve
  // melhor que um degradê. Sem causa nenhuma o padrão gerado é melhor, porque
  // ao menos é derivado deste registro.
  // Só entra na foto quando a causa resolve numa categoria de verdade.
  // Antes, causa desconhecida caía na foto genérica, e várias organizações
  // sem categoria apareciam lado a lado com a mesma imagem, o que lê como
  // defeito. O padrão gerado varia por registro e resolve melhor.
  const foto = capaDaCausa(causa);

  if (foto) {
    return (
      <div className={cn("relative overflow-hidden bg-secondary", className)}>
        <img
          src={foto.src}
          srcSet={foto.srcSet}
          sizes={sizes}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <MarcaIlustrativa />

        {/* Nada de monograma aqui. A fotografia já carrega a identidade, e a
            letra por cima competia com a etiqueta e com os selos sobrepostos.
            O monograma é o recurso do substituto gerado, onde não há foto. */}
        {children}
      </div>
    );
  }

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
            <stop offset="0%" stopColor={`hsl(${matiz} 48% 40%)`} />
            <stop offset="100%" stopColor={`hsl(${matiz - 16} 44% 62%)`} />
          </linearGradient>
        </defs>
        <rect width="120" height="80" fill={`url(#capa-${s})`} />
        <circle
          cx={18 + (s % 90)}
          cy={(s >> 3) % 80}
          r={20 + (s % 16)}
          fill={`hsl(${matiz} 56% 70%)`}
          opacity="0.30"
        />
        <circle
          cx={(s >> 5) % 120}
          cy={12 + ((s >> 7) % 60)}
          r={12 + (s % 10)}
          fill={`hsl(${matiz + 18} 60% 76%)`}
          opacity="0.22"
        />
      </svg>

      {letras && (
        <span
          className="absolute inset-0 flex items-center justify-center font-display text-5xl font-extrabold tracking-tight text-white/85"
          aria-hidden="true"
        >
          {letras}
        </span>
      )}

      {children}
    </div>
  );
}
