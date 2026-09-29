import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BarraFixaInferiorProps = {
  children: ReactNode;
  /** Por padrão a barra só existe no celular, onde o botão sai da tela ao rolar. */
  sempre?: boolean;
  className?: string;
};

/**
 * Barra fixa no rodapé com a ação principal da página de detalhe.
 *
 * Respeita a área segura de aparelhos com notch e nasce deslizando de baixo.
 * Reserva o próprio espaço: logo depois dela vem um bloco da cor do rodapé,
 * com a altura da barra mais a área segura, para que ela nunca cubra a última
 * linha da página. Coloque-a como último filho do `PublicShell`.
 */
export function BarraFixaInferior({ children, sempre = false, className }: BarraFixaInferiorProps) {
  return (
    <>
      <div
        className={cn("bg-primary", !sempre && "md:hidden")}
        style={{ height: "calc(5rem + env(safe-area-inset-bottom))" }}
        aria-hidden="true"
      />
      <div
        className={cn(
          "barra-fixa-inferior surge-de-baixo fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 pt-3 shadow-alta backdrop-blur-md",
          !sempre && "md:hidden",
          className,
        )}
      >
        <div className="container flex items-center gap-3 px-0">{children}</div>
      </div>
    </>
  );
}
