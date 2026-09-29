import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import type { Foto } from "@/lib/fotos";

type Props = {
  /** Rótulo pequeno em caixa alta acima do título ("Sobre", "Legal"). */
  eyebrow?: string;
  titulo: string;
  /** Parágrafo de abertura. Vai também para a descrição da página. */
  descricao: string;
  /** Foto editorial de abertura, entre o título e o texto. */
  foto?: Foto;
  /** `article` para texto editorial; `website` para páginas legais. */
  tipo?: "article" | "website";
  children: ReactNode;
};

/**
 * Esqueleto comum das páginas institucionais (Sobre, Como funciona, Termos,
 * Privacidade). Título na escala de todo h1 do site, abertura em fonte
 * maior, foto recortada em destaque e corpo em `prose` já tematizado.
 */
export function PaginaDeConteudo({ eyebrow, titulo, descricao, foto, tipo = "article", children }: Props) {
  return (
    <PublicShell>
      <Seo title={titulo} description={descricao} type={tipo} />
      <article className="container max-w-3xl py-14 md:py-20">
        <header>
          {eyebrow && <p className="rotulo-caps">{eyebrow}</p>}
          <h1 className="mt-2 font-display text-2xl-fluido font-bold">{titulo}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{descricao}</p>
        </header>

        {foto && (
          <figure className="mt-10">
            <div className="overflow-hidden rounded-destaque bg-tinta-azulpo">
              <img
                src={foto.src}
                srcSet={foto.srcSet}
                sizes="(min-width: 768px) 48rem, 100vw"
                alt={foto.alt}
                width={1280}
                height={Math.round(1280 / foto.proporcao)}
                className="aspect-[3/2] w-full object-cover"
              />
            </div>
            <figcaption className="mt-2 text-right text-xs text-muted-foreground">
              Foto de {foto.credito.autor}
            </figcaption>
          </figure>
        )}

        <div className="prose prose-lg mt-10 max-w-none">{children}</div>
      </article>
      <Footer />
    </PublicShell>
  );
}
