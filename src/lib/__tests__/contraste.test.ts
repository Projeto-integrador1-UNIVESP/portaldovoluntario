import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contraste dos tokens de texto, conferido no próprio CSS.
 *
 * Existe porque um token reprovado não quebra nada: a tela continua montando,
 * o build passa, e a violação só aparece quando alguém roda a `axe` numa
 * página que por acaso tenha aquele elemento em tela. Foi assim que
 * `--success` passou despercebido — o selo verde só apareceu quando o banco
 * ganhou dados, e aí quatro cenários de acessibilidade caíram de uma vez.
 *
 * Aqui a conta é feita direto sobre o arquivo, então vale para todos os usos
 * do token ao mesmo tempo, inclusive os que nenhuma página exercita hoje.
 */

const CSS = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

/** Lê `--nome: H S% L%;` do bloco `:root`. */
function token(nome: string): [number, number, number] {
  const m = CSS.match(new RegExp(`--${nome}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!m) throw new Error(`token --${nome} não encontrado em index.css`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function hslParaRgb(h: number, s: number, l: number): [number, number, number] {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Luminância relativa, WCAG 2.1. */
function luminancia([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function razao(a: string, b: string): number {
  const la = luminancia(hslParaRgb(...token(a)));
  const lb = luminancia(hslParaRgb(...token(b)));
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

describe("contraste dos tokens de cor", () => {
  // 4.5:1 é o mínimo do WCAG 2.1 AA para texto normal. Todos estes tokens
  // aparecem como cor de texto em algum lugar do produto.
  it.each([
    ["foreground", "background"],
    ["muted-foreground", "background"],
    ["primary", "background"],
    ["success", "background"],
    ["destructive", "background"],
  ])("--%s sobre --%s passa em AA para texto normal", (frente, fundo) => {
    expect(razao(frente, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  // Estes são cor de texto sobre o próprio preenchimento: botão sólido, selo.
  it.each([
    ["primary-foreground", "primary"],
    ["success-foreground", "success"],
    ["destructive-foreground", "destructive"],
    ["cta-foreground", "cta"],
  ])("--%s sobre --%s passa em AA para texto normal", (frente, fundo) => {
    expect(razao(frente, fundo)).toBeGreaterThanOrEqual(4.5);
  });
});
