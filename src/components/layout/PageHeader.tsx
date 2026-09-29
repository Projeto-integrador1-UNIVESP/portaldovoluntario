import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

/**
 * Cabeçalho de página do painel.
 *
 * O h1 daqui usa a mesma escala e a mesma fonte do h1 do site público: o painel
 * é metade do produto e antes parecia outro, com Inter em `text-2xl` contra
 * Nunito no site. A ação quebra para baixo do título no celular — antes ela
 * dividia a linha e o título ficava em duas ou três palavras por linha.
 */
export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon && <span className="shrink-0 text-primary">{icon}</span>}
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">{title}</h1>
        </div>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
