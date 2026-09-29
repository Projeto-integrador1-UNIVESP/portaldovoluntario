import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Ilustracao } from "@/components/common/Ilustracao";

type Props = { children: ReactNode };
type State = { erro: Error | null };

/**
 * Captura erros de render em qualquer ponto da árvore e mostra uma tela
 * amigável em vez da tela branca. Inclui o caso do chunk de rota que falha ao
 * baixar (deploy novo com o usuário na página antiga), em que recarregar resolve.
 *
 * Usa `<a>` em vez de `Link`: se o erro veio do próprio roteador, o contexto
 * dele pode não existir mais aqui.
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
      <div className="container flex min-h-[70vh] flex-col items-center justify-center py-14 text-center">
        <Ilustracao nome="erro" className="h-32 md:h-40" />
        <p className="rotulo-caps mt-8">{falhaDeChunk ? "Versão nova no ar" : "Algo saiu do lugar"}</p>
        <h1 className="mt-2 font-display text-2xl-fluido font-bold">
          {falhaDeChunk ? "A página foi atualizada" : "Não deu para mostrar esta página"}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {falhaDeChunk
            ? "Uma versão nova entrou no ar enquanto você navegava. Recarregue para continuar de onde estava."
            : "Tivemos um problema ao exibir esta tela. Recarregar costuma resolver; se não resolver, volte ao início."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>
            Recarregar a página
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Voltar ao início</a>
          </Button>
        </div>
      </div>
    );
  }
}
