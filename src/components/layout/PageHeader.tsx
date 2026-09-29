import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Aceito por compatibilidade com as telas que ainda passam. Não é exibido. */
  icon?: ReactNode;
  action?: ReactNode;
};

/**
 * Cabeçalho de página do painel.
 *
 * O h1 daqui usa a mesma escala e a mesma fonte do h1 do site público: o painel
 * é metade do produto e não pode parecer outro. O ícone ao lado do título saiu:
 * a seção já tem ícone no menu, e repetir o mesmo desenho em toda página é o
 * que dá cara de template. A ação quebra para baixo do título no celular.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="font-display text-2xl-fluido font-bold">{title}</h1>
        {description && <p className="mt-2 text-base text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
