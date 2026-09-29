import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { TERMOS } from "@/lib/copy";

type SeloVerificadaProps = {
  verificadaEm?: string | null;
  /**
   * `compacto`: ícone + "ONG verificada" (padrão).
   * `icone`: só o ícone, com o texto para leitor de tela; para ao lado do nome.
   * `completo`: pílula com a data, para o perfil e o painel.
   */
  variante?: "compacto" | "icone" | "completo";
  /** No painel, mostra "Aguardando verificação" em vez de sumir. */
  mostrarPendente?: boolean;
  className?: string;
};

/**
 * Selo de ONG verificada pela administração. Um componente, um texto: antes
 * havia oito variações escritas à mão, e duas diziam coisas diferentes.
 */
export function SeloVerificada({
  verificadaEm,
  variante = "compacto",
  mostrarPendente = false,
  className,
}: SeloVerificadaProps) {
  if (!verificadaEm) {
    if (!mostrarPendente) return null;
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>{TERMOS.aguardandoVerificacao}</span>
    );
  }

  if (variante === "icone") {
    return (
      <span className={cn("inline-flex shrink-0 text-success", className)}>
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{TERMOS.verificada}</span>
      </span>
    );
  }

  if (variante === "completo") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success",
          className,
        )}
      >
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Verificada em {formatDate(verificadaEm)}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-success", className)}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {TERMOS.verificada}
    </span>
  );
}
