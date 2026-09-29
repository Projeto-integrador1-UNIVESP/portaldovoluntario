import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyFieldProps = {
  valor: string;
  /** Rótulo lido por leitor de tela ao acionar o botão. */
  rotulo: string;
  /** Nome do que está sendo copiado, para o toast: "Código Pix copiado". */
  objeto?: string;
  className?: string;
};

/**
 * Campo de texto longo com botão de copiar, usado no "Pix Copia e Cola" e no
 * código do comprovante, que ninguém digita à mão.
 *
 * Copiar falha em navegador sem permissão de área de transferência ou fora de
 * HTTPS. Antes isso falhava em silêncio e a pessoa colava vazio no banco;
 * agora o toast diz o que houve e o texto fica selecionável de um clique.
 */
export function CopyField({ valor, rotulo, objeto = "Código", className }: CopyFieldProps) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      toast.error("Não foi possível copiar. Toque no código para selecionar e copie à mão.");
      return;
    }
    setCopiado(true);
    toast.success(`${objeto} copiado`);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      <code className="numero min-w-0 flex-1 select-all truncate rounded-controle border bg-muted px-3.5 py-2.5 text-sm leading-6">
        {valor}
      </code>
      <Button
        type="button"
        variant={copiado ? "secondary" : "default"}
        onClick={copiar}
        className="shrink-0"
        aria-label={rotulo}
      >
        {copiado ? (
          <>
            <Check aria-hidden="true" />
            Copiado
          </>
        ) : (
          <>
            <Copy aria-hidden="true" />
            Copiar
          </>
        )}
      </Button>
    </div>
  );
}
