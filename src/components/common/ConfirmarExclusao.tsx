import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/copy";
import { cn } from "@/lib/utils";

type ConfirmarExclusaoProps = {
  /** Pergunta, com o objeto: "Excluir o projeto Van da quimioterapia?" */
  titulo: string;
  descricao?: ReactNode;
  /** Rótulo do botão que confirma. Sempre com o objeto: "Excluir projeto". */
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  /** Texto do botão enquanto a ação roda. Padrão: "Excluindo…". */
  rotuloCarregando?: string;
  /** Executa a ação. Pode ser assíncrona: o botão mostra carregamento. */
  onConfirmar: () => void | Promise<unknown>;
  /** `destrutivo` (vermelho) para excluir; `atencao` para reverter, marcar como não recebido. */
  tom?: "destrutivo" | "atencao";
  /**
   * Quando a exclusão não é possível, explica por quê e oferece uma saída
   * (por exemplo, desativar em vez de excluir).
   */
  bloqueio?: { motivo: ReactNode; alternativa?: { rotulo: string; onClick: () => void | Promise<unknown> } };
  /** O elemento que abre o diálogo. Recebe `asChild`. */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (aberto: boolean) => void;
};

/**
 * Confirmação de ação destrutiva. Um componente para as quatro versões que
 * existiam. Espera a ação terminar antes de fechar, mostra carregamento no
 * botão e nomeia o objeto no rótulo.
 */
export function ConfirmarExclusao({
  titulo,
  descricao,
  rotuloConfirmar,
  rotuloCancelar = CTA.cancelar,
  rotuloCarregando = CTA.excluindo,
  onConfirmar,
  tom = "destrutivo",
  bloqueio,
  children,
  open,
  onOpenChange,
}: ConfirmarExclusaoProps) {
  const [carregando, setCarregando] = useState(false);
  const [abertoInterno, setAbertoInterno] = useState(false);
  const controlado = open !== undefined;
  const aberto = controlado ? open : abertoInterno;
  const definirAberto = (v: boolean) => {
    if (!controlado) setAbertoInterno(v);
    onOpenChange?.(v);
  };
  // Enquanto a ação roda, Esc e clique fora não fecham o diálogo.
  const mudar = (v: boolean) => {
    if (carregando) return;
    definirAberto(v);
  };

  const executar = async (acao: () => void | Promise<unknown>) => {
    setCarregando(true);
    try {
      await acao();
      setCarregando(false);
      definirAberto(false);
    } catch {
      // Quem chama já mostrou o erro (toast). O diálogo fica aberto para a
      // pessoa tentar de novo ou cancelar, em vez de fechar como se tivesse dado certo.
      setCarregando(false);
    }
  };

  return (
    <AlertDialog open={aberto} onOpenChange={mudar}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent className="rolagem-contida">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-semibold">{titulo}</AlertDialogTitle>
          {(bloqueio?.motivo ?? descricao) && (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {bloqueio?.motivo ?? descricao}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>{bloqueio ? "Fechar" : rotuloCancelar}</AlertDialogCancel>
          {bloqueio?.alternativa ? (
            <Button
              variant="default"
              disabled={carregando}
              onClick={() => executar(bloqueio.alternativa!.onClick)}
            >
              {carregando && <Loader2 className="animate-spin" aria-hidden="true" />}
              {bloqueio.alternativa.rotulo}
            </Button>
          ) : !bloqueio ? (
            <AlertDialogAction
              disabled={carregando}
              onClick={(e) => {
                e.preventDefault();
                void executar(onConfirmar);
              }}
              className={cn(
                tom === "destrutivo"
                  ? "bg-destructive text-destructive-foreground hover:brightness-90"
                  : "bg-warning text-warning-foreground hover:brightness-90",
              )}
            >
              {carregando && <Loader2 className="animate-spin" aria-hidden="true" />}
              {carregando ? rotuloCarregando : rotuloConfirmar}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
