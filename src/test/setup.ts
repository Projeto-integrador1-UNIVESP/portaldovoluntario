import "@testing-library/jest-dom";
import { instalarMensagensPtBr } from "@/lib/zodPtBr";

// O mesmo mapa de mensagens que o `main.tsx` instala: sem ele, um schema sem
// mensagem própria mostraria "Required" em inglês nos testes e não no produto.
instalarMensagensPtBr();

// Os testes rodam como quem pediu menos movimento no sistema: o `Contador`
// mostra o valor final na hora, o `MotionConfig` desliga transforms, e as
// asserções de texto não dependem de uma animação terminar. É também o que o
// e2e faz antes da varredura de acessibilidade.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// O jsdom não implementa estas APIs, e os componentes do Radix (Checkbox,
// Select, Dialog) as usam para posicionamento e medição.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverMock as unknown as typeof ResizeObserver;

// `useInView` e `whileInView` do motion criam um IntersectionObserver sem
// checar se existe. Este responde "está em tela" na hora, para tudo.
class IntersectionObserverMock {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(alvo: Element) {
    this.callback(
      [{ isIntersecting: true, intersectionRatio: 1, target: alvo } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
}
globalThis.IntersectionObserver ??= IntersectionObserverMock as unknown as typeof IntersectionObserver;

globalThis.DOMRect ??= class {
  constructor(
    public x = 0, public y = 0,
    public width = 0, public height = 0,
  ) {}
  get top() { return this.y; }
  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get bottom() { return this.y + this.height; }
  static fromRect(rect?: DOMRectInit) {
    return new DOMRect(rect?.x, rect?.y, rect?.width, rect?.height);
  }
  toJSON() { return { ...this }; }
} as unknown as typeof DOMRect;

Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
