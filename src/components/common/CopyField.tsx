import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyFieldProps = {
  valor: string;
  /** Rótulo lido por leitor de tela ao acionar o botão. */
  rotulo: string;
  className?: string;
};

/**
 * Campo de texto longo com botão de copiar — usado no "Pix Copia e Cola",
 * que ninguém digita à mão.
 */
export function CopyField({ valor, rotulo, className }: CopyFieldProps) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      // Navegador sem permissão de área de transferência: o texto continua
      // selecionável na tela, então o usuário copia à mão.
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm">
        {valor}
      </code>
      <Button type="button" variant={copiado ? "secondary" : "default"} onClick={copiar}>
        {copiado ? (
          <>
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            Copiado
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            Copiar
          </>
        )}
        <span className="sr-only">{rotulo}</span>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copiado ? "Copiado para a área de transferência" : ""}
      </span>
    </div>
  );
}
