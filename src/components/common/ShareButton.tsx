import { useEffect, useRef, useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SUCESSO } from "@/lib/copy";
import { cn } from "@/lib/utils";

type ShareButtonProps = {
  titulo: string;
  /** URL absoluta. Quando ausente, usa o endereço atual. */
  url?: string;
  className?: string;
};

/**
 * Compartilhar no WhatsApp e copiar o link.
 *
 * Quem abriu a página é quem repassa, então o botão fica perto do título.
 * Copiar sem avisar era o defeito: a área de transferência pode falhar (http,
 * permissão negada, navegador antigo) e a pessoa ficava sem saber se o link
 * foi. Agora toda tentativa termina num toast, de sucesso ou de erro, e o
 * botão ainda troca o ícone por alguns segundos para quem está olhando nele.
 */
export function ShareButton({ titulo, url, className }: ShareButtonProps) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>();
  const endereco = url ?? (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const copiarLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("sem área de transferência");
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
      toast.success(SUCESSO.linkCopiado);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não deu para copiar o link", {
        description: "Copie o endereço na barra do navegador ou envie pelo WhatsApp.",
      });
    }
  };

  const linkWhatsapp = `https://wa.me/?text=${encodeURIComponent(`${titulo}\n${endereco}`)}`;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button variant="outline" asChild>
        <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" />
          Enviar no WhatsApp
        </a>
      </Button>
      <Button variant="outline" onClick={copiarLink} aria-live="polite">
        {copiado ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        {copiado ? SUCESSO.linkCopiado : "Copiar link"}
      </Button>
    </div>
  );
}
