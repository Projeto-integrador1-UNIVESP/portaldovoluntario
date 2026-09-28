import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";

type Props = { titulo: string; descricao: string; children: ReactNode };

/** Esqueleto comum das páginas institucionais (Sobre, Termos, etc.). */
export function PaginaDeConteudo({ titulo, descricao, children }: Props) {
  return (
    <PublicShell>
      <Seo title={titulo} description={descricao} />
      <article className="container max-w-3xl py-12">
        <h1 className="text-3xl font-bold">{titulo}</h1>
        <p className="mt-2 text-muted-foreground">{descricao}</p>
        <div className="prose prose-slate mt-8 max-w-none prose-headings:font-semibold prose-a:text-primary">
          {children}
        </div>
      </article>
      <Footer />
    </PublicShell>
  );
}
