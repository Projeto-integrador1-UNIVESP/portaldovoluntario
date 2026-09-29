import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Avatar de uma ONG. É o único do produto.
 *
 * Antes cada tela desenhava o seu: uma com `img` redonda solta, outra com um
 * círculo `bg-primary/10` e o ícone `Building2`, outra sem nada. O ícone
 * genérico era o pior dos três: num grid de dez organizações, todas ficavam
 * com a mesma silhueta. A inicial do nome distingue.
 *
 * O bloco é decorativo de propósito: ele nunca aparece sem o nome da ONG ao
 * lado, e o contrato proíbe repetir no `alt` um texto já visível.
 */

const TAMANHOS = {
  sm: { caixa: "h-9 w-9", texto: "text-xs" },
  md: { caixa: "h-12 w-12", texto: "text-sm" },
  lg: { caixa: "h-20 w-20", texto: "text-lg" },
} as const;

// Conectivos não carregam identidade: "Casa de Apoio" deve virar CA, não CD.
const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "a", "o"]);

/** Até duas iniciais do nome da ONG. "Instituto Criança Feliz" -> "IC". */
function iniciaisDaOng(nome: string) {
  const palavras = nome
    .trim()
    .split(/[\s—–-]+/)
    .filter((p) => p && !CONECTIVOS.has(p.toLowerCase()));

  const letras = (palavras.length ? palavras : [nome.trim()])
    .slice(0, 2)
    .map((p) => [...p][0] ?? "")
    .join("");

  return letras.toLocaleUpperCase("pt-BR") || "?";
}

type OngAvatarProps = {
  nome: string;
  /** Logo atual da organização. */
  logoUrl?: string | null;
  /** Coluna legada `img_url`, usada quando a ONG ainda não subiu a logo nova. */
  imgUrl?: string | null;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
};

export function OngAvatar({
  nome,
  logoUrl,
  imgUrl,
  tamanho = "md",
  className,
}: OngAvatarProps) {
  const { caixa, texto } = TAMANHOS[tamanho];
  const src = logoUrl || imgUrl || undefined;

  return (
    <Avatar className={cn(caixa, "border bg-card shadow-sutil", className)}>
      {src && <AvatarImage src={src} alt="" loading="lazy" decoding="async" />}
      <AvatarFallback
        aria-hidden="true"
        className={cn(
          "bg-primary/10 font-display font-bold tracking-tight text-primary",
          texto,
        )}
      >
        {iniciaisDaOng(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
