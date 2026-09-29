import { describe, expect, it } from "vitest";
import { FOTOS, type Foto } from "../fotos";

/**
 * Nenhuma tela quebra em `tsc` por um WebP que não existe: o `vite/client`
 * declara `*.webp` como curinga. Importar o módulo aqui faz o vitest resolver
 * cada arquivo de verdade.
 */
const CENAS = ["hero", "heroSecundaria", "voluntariado", "auth", "sobre", "comoFunciona", "obrigado"] as const;

describe("FOTOS", () => {
  it("mantém as chaves que as telas importam", () => {
    expect(Object.keys(FOTOS).sort()).toEqual([...CENAS].sort());
  });

  it.each(CENAS)("%s tem três larguras, alt, proporção e crédito", (chave) => {
    const foto: Foto = FOTOS[chave];
    const larguras = foto.srcSet.split(",").map((parte) => parte.trim().split(" ")[1]);
    expect(larguras).toEqual(["640w", "1280w", "1920w"]);
    expect(foto.srcSet).toContain(foto.src);
    expect(foto.src).toMatch(/\.webp$/);
    expect(foto.alt.length).toBeGreaterThan(10);
    expect(foto.proporcao).toBeGreaterThan(0);
    expect(foto.credito.autor.length).toBeGreaterThan(0);
    expect(foto.credito.url).toMatch(/^https:\/\/unsplash\.com\/photos\//);
  });

  it("usa as proporções combinadas com as telas", () => {
    expect(FOTOS.hero.proporcao).toBeCloseTo(3 / 2);
    expect(FOTOS.heroSecundaria.proporcao).toBe(1);
    expect(FOTOS.voluntariado.proporcao).toBeCloseTo(21 / 9);
    expect(FOTOS.auth.proporcao).toBeCloseTo(4 / 5);
  });
});
