import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ShareButtonProps = {
  titulo: string;
  /** URL absoluta. Quando ausente, usa o endereço atual. */
  url?: string;
};

/** Compartilhar no WhatsApp e copiar link (F9). */
export function ShareButton({ titulo, url }: ShareButtonProps) {
  const [copiado, setCopiado] = useState(false);
  const endereco = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* sem área de transferência: o botão do WhatsApp continua servindo */
    }
  };

  const linkWhatsapp = `https://wa.me/?text=${encodeURIComponent(`${titulo} — ${endereco}`)}`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" asChild>
        <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer">
          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Compartilhar no WhatsApp
        </a>
      </Button>
      <Button variant="outline" onClick={copiarLink}>
        {copiado ? (
          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
        ) : (
          <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {copiado ? "Link copiado" : "Copiar link"}
      </Button>
    </div>
  );
}
