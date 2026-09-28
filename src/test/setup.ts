import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
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
