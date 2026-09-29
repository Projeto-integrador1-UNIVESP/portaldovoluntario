import { Check, Eye, EyeOff } from "lucide-react";
import { regrasDeSenha } from "@/lib/schemas/auth";
import { cn } from "@/lib/utils";

/**
 * Botão de mostrar ou ocultar a senha. O rótulo é fixo e `aria-pressed`
 * carrega o estado: assim o leitor de tela diz "Mostrar senha, pressionado"
 * em vez de trocar o nome do botão debaixo de quem está nele.
 */
export function BotaoMostrarSenha({
  visivel,
  aoAlternar,
}: {
  visivel: boolean;
  aoAlternar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-pressed={visivel}
      aria-label="Mostrar senha"
      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-controle text-muted-foreground transition-colors hover:text-foreground"
    >
      {visivel ? (
        <EyeOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Eye className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Checklist de senha, alimentado pelas mesmas regras que o schema zod usa,
 * para que validação e checklist nunca digam coisas diferentes. Cada linha
 * muda de cor quando a regra passa a valer; o estado também vai em texto
 * para o leitor de tela.
 */
export function ChecklistDeSenha({ senha }: { senha: string }) {
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Requisitos da senha">
      {regrasDeSenha.map((regra) => {
        const ok = regra.testa(senha);
        return (
          <li
            key={regra.id}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors duration-200 ease-suave",
              ok ? "text-success" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-200 ease-suave",
                ok ? "scale-100 border-success bg-success text-success-foreground" : "scale-90 border-border bg-card",
              )}
              aria-hidden="true"
            >
              {ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <span>{regra.texto}</span>
            <span className="sr-only">{ok ? ", atendido" : ", pendente"}</span>
          </li>
        );
      })}
    </ul>
  );
}
