import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { erro: Error | null };

/**
 * Captura erros de render em qualquer ponto da árvore e mostra uma tela
 * amigável em vez da tela branca. Inclui o caso do chunk de rota que falha ao
 * baixar (deploy novo com o usuário na página antiga), em que recarregar resolve.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("Erro não tratado na interface:", erro, info.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const falhaDeChunk = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(
      erro.message,
    );

    return (
      <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
        <h1 className="mt-6 text-2xl font-bold">Algo deu errado</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          {falhaDeChunk
            ? "A página foi atualizada enquanto você navegava. Recarregue para continuar."
            : "Tivemos um problema ao exibir esta página. Você pode tentar novamente ou voltar ao início."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Recarregar a página</Button>
          <Button variant="outline" onClick={() => { window.location.href = "/"; }}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }
}
