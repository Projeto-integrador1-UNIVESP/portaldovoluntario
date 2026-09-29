import { useEffect, useRef, type ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Seo } from "@/components/common/Seo";
import { FOTOS } from "@/lib/fotos";
import { A_MARCA, TESE } from "@/lib/copy";
import { cn } from "@/lib/utils";

/**
 * As três garantias da plataforma, em uma linha cada. São o argumento para
 * alguém criar conta aqui, então ficam ao lado de todo formulário de acesso.
 */
const GARANTIAS = [
  TESE,
  "O Pix cai direto na conta da ONG, sem taxa para ninguém.",
  "Pedimos só nome, e-mail e senha.",
] as const;

type CascaDeAuthProps = {
  /** Título da aba e do `og:title`. */
  tituloDaPagina: string;
  /** Rótulo pequeno em caixa alta, acima do h1. */
  eyebrow?: string;
  /** Texto do h1. Fica dentro do card, na escala de todo h1 do site. */
  titulo: string;
  descricao?: ReactNode;
  /** `lg` para formulários longos (cadastro de ONG) e para a escolha de conta. */
  largura?: "md" | "lg";
  /** Conteúdo abaixo do card (link para entrar, criar conta, etc.). */
  rodape?: ReactNode;
  children: ReactNode;
};

/**
 * Casca comum de entrar, criar conta, esqueci e redefinir senha.
 *
 * Formulário à esquerda, em card de papel; à direita, só no desktop, a foto
 * editorial com as garantias por cima. No celular o formulário vem primeiro,
 * a foto some e as garantias ficam abaixo do card, em três linhas. É um
 * elemento só, reposicionado: nada renderiza duas vezes.
 *
 * Quando o título muda com a página aberta (formulário que vira "confira
 * seu e-mail", link expirado), o foco vai para o novo h1: o botão que a
 * pessoa acabou de acionar saiu do DOM e o leitor de tela precisa saber
 * para onde a tela foi.
 */
export function CascaDeAuth({
  tituloDaPagina,
  eyebrow,
  titulo,
  descricao,
  largura = "md",
  rodape,
  children,
}: CascaDeAuthProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primeiroRender = useRef(true);

  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    tituloRef.current?.focus();
  }, [titulo]);

  return (
    <PublicShell>
      <Seo title={tituloDaPagina} noIndex />

      <div
        className={cn(
          "container grid items-start gap-10 py-10 md:py-14 lg:gap-14",
          largura === "lg"
            ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <div
          className={cn(
            "w-full justify-self-center lg:justify-self-start",
            largura === "lg" ? "max-w-2xl" : "max-w-md",
          )}
        >
          <section
            aria-labelledby="titulo-auth"
            className="rounded-xl border bg-card p-6 shadow-sutil sm:p-8"
          >
            <header>
              {eyebrow && <p className="rotulo-caps mb-2">{eyebrow}</p>}
              <h1
                id="titulo-auth"
                ref={tituloRef}
                tabIndex={-1}
                className="font-display text-2xl-fluido font-bold outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                {titulo}
              </h1>
              {descricao && <p className="mt-2 text-muted-foreground">{descricao}</p>}
            </header>

            <div className="mt-6">{children}</div>
          </section>

          {rodape && <div className="mt-5 text-center text-sm text-muted-foreground">{rodape}</div>}
        </div>

        <aside
          className="relative w-full max-w-md justify-self-center lg:max-w-none lg:self-stretch lg:justify-self-stretch"
          aria-label={`O que ${A_MARCA} garante`}
        >
          <div className="lg:sticky lg:top-24 lg:overflow-hidden lg:rounded-destaque lg:bg-tinta-azulpo">
            <img
              src={FOTOS.auth.src}
              srcSet={FOTOS.auth.srcSet}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={FOTOS.auth.alt}
              width={1280}
              height={Math.round(1280 / FOTOS.auth.proporcao)}
              // A proporção vem da foto: reserva a altura antes de o arquivo
              // chegar, e a foto final (vertical) entra sem salto de layout.
              style={{ aspectRatio: String(FOTOS.auth.proporcao) }}
              className="hidden h-auto w-full object-cover lg:block lg:min-h-[30rem]"
            />
            <div className="rounded-xl border bg-tinta-creme/95 p-5 lg:absolute lg:inset-x-5 lg:bottom-5 lg:border-0 lg:shadow-alta lg:backdrop-blur-sm">
              <p className="rotulo-caps">O que {A_MARCA} garante</p>
              <ul className="mt-3 space-y-2.5">
                {GARANTIAS.map((linha) => (
                  <li key={linha} className="flex gap-3 text-sm leading-snug text-foreground">
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <circle cx="8" cy="8" r="7" fill="hsl(var(--tinta-salvia))" stroke="currentColor" strokeWidth="1.2" />
                      <path
                        d="M4.6 8.2 L7 10.5 L11.4 5.8"
                        fill="none"
                        stroke="hsl(var(--cta))"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{linha}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </PublicShell>
  );
}
