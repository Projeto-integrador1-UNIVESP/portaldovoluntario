import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";

/**
 * Casca das páginas públicas: cabeçalho e conteúdo.
 *
 * A sidebar de painel que ficava aqui saiu: o painel tem a própria navegação
 * e o menu da conta no cabeçalho já leva até ele. No site público ela só
 * roubava 240px de largura de quem estava logado.
 *
 * `overflow-x-clip` no conteúdo: as faixas em `.sangria` medem `100dvw`, que
 * inclui a barra de rolagem no desktop e, sem o recorte, abriria rolagem
 * horizontal de alguns pixels. `clip` não cria contexto de rolagem, então a
 * barra fixa e os `sticky` continuam funcionando.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <div className="min-w-0 flex-1 overflow-x-clip">{children}</div>
    </div>
  );
}
