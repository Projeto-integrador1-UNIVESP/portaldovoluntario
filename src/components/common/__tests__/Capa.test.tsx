import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Capa } from "@/components/common/Capa";
import { capaDaCausa } from "@/lib/capasPorCausa";

/**
 * A `Capa` escolhe entre três acabamentos e nenhuma página exercita o caminho
 * da foto de categoria ainda. Sem estes testes o mapa de causas poderia estar
 * inteiro errado sem nada quebrar.
 */
describe("Capa", () => {
  it("a foto do registro ganha da foto de categoria", () => {
    render(
      <Capa src="https://exemplo.org/foto.jpg" alt="Sede da ONG" id="o1" causa="Alimentos" />,
    );

    const img = screen.getByRole("img", { name: "Sede da ONG" });
    expect(img).toHaveAttribute("src", "https://exemplo.org/foto.jpg");
    expect(img).not.toHaveAttribute("srcset");
    expect(screen.queryByText("Imagem ilustrativa")).not.toBeInTheDocument();
  });

  it("sem foto e com causa conhecida, usa a foto da categoria com srcset", () => {
    const { container } = render(<Capa alt="" id="p1" causa="Alimentos" />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(capaDaCausa("Alimentos").src);
    expect(img?.getAttribute("srcset")).toContain("640w");
    expect(img?.getAttribute("srcset")).toContain("1280w");
  });

  /**
   * A foto é de banco e nunca é daquela ONG. O `alt` que a página passa
   * descreve o registro, então reaproveitá-lo aqui seria mentir para quem usa
   * leitor de tela: a foto vira decorativa e o aviso vira texto legível.
   */
  it("marca a foto de categoria como ilustrativa e não herda o alt do registro", () => {
    const { container } = render(<Capa alt="Sede da Casa de Apoio" id="p1" causa="Brinquedos" />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img", { name: "Sede da Casa de Apoio" })).not.toBeInTheDocument();
    expect(screen.getByText("Imagem ilustrativa")).toBeInTheDocument();
  });

  /**
   * O monograma existe para o substituto gerado. Sobre a fotografia de
   * categoria ele disputava espaço com a etiqueta "Imagem ilustrativa" e com
   * os selos que os cards sobrepõem, e a foto já carrega identidade sozinha.
   */
  it("não desenha monograma por cima da foto de categoria", () => {
    render(<Capa alt="" id="p1" nome="Casa de Apoio Esperança" causa="Alimentos" />);
    expect(screen.queryByText("CA")).not.toBeInTheDocument();
  });

  it("sem causa nenhuma, mantém o padrão gerado com monograma", () => {
    const { container } = render(<Capa alt="" id="o1" nome="Casa de Apoio Esperança" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("CA")).toBeInTheDocument();
  });

  it("causa vazia conta como ausente", () => {
    const { container } = render(<Capa alt="" id="o1" causa="   " />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("causa desconhecida usa o padrão gerado, não uma foto repetida", () => {
    // Várias organizações sem categoria aparecem lado a lado na listagem. Se
    // todas caíssem na mesma foto genérica, leria como defeito; o padrão
    // gerado varia por identificador.
    const { container } = render(<Capa alt="" id="p1" causa="Causa que não existe" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("a etiqueta e o substituto usam tokens, não cor crua", () => {
    const { container } = render(<Capa alt="" id="p1" nome="Casa de Apoio" causa="Alimentos" />);
    expect(container.innerHTML).not.toMatch(/bg-black|text-white|#000|#fff/);

    const gerado = render(<Capa alt="" id="o9" nome="Lar São José" />).container;
    expect(gerado.innerHTML).not.toMatch(/bg-black|text-white|#000|#fff/);
    // Matiz preso à faixa do marinho: nada de arco-íris por registro.
    const matizes = [...gerado.innerHTML.matchAll(/hsl\((\d+) /g)].map((m) => Number(m[1]));
    expect(matizes.length).toBeGreaterThan(0);
    for (const h of matizes) {
      expect(h).toBeGreaterThanOrEqual(190);
      expect(h).toBeLessThanOrEqual(240);
    }
  });
});

describe("capaDaCausa", () => {
  it("casa por radical, não por palavra exata", () => {
    // Todas vêm do texto livre que o admin digita em `projetos.causa`.
    expect(capaDaCausa("Alimentos")?.chave).toBe("alimentos");
    expect(capaDaCausa("alimentação")?.chave).toBe("alimentos");
    expect(capaDaCausa("Segurança alimentar")?.chave).toBe("alimentos");
    expect(capaDaCausa("Educação")?.chave).toBe("escolar");
    expect(capaDaCausa("Material escolar")?.chave).toBe("escolar");
    expect(capaDaCausa("Roupas e calçados")?.chave).toBe("roupas");
    expect(capaDaCausa("Higiene e limpeza")?.chave).toBe("higiene");
    expect(capaDaCausa("Saúde")?.chave).toBe("medicamentos");
    expect(capaDaCausa("Moradia")?.chave).toBe("moveis");
  });

  /**
   * As dez causas da lista fechada (`constants/causas.ts`) resolvem todas em
   * foto: nenhum chip de filtro fica sem miniatura e nenhuma capa de projeto
   * cai no padrão gerado só por causa da categoria. "Animais" e "Pessoas
   * idosas" têm fotografia própria, não a genérica.
   */
  it("cobre as dez causas da lista fechada", async () => {
    const { CAUSAS } = await import("@/lib/constants/causas");
    for (const causa of CAUSAS) {
      expect(capaDaCausa(causa)?.chave, causa).toBeDefined();
    }

    const generica = capaDaCausa("Meio ambiente")?.src;
    expect(capaDaCausa("Animais")?.src).not.toBe(generica);
    expect(capaDaCausa("Pessoas idosas")?.src).not.toBe(generica);

    expect(capaDaCausa("Crianças e adolescentes")?.chave).toBe("brinquedos");
    expect(capaDaCausa("População em situação de rua")?.chave).toBe("inverno");
    expect(capaDaCausa("Alimentação")?.chave).toBe("alimentos");
    expect(capaDaCausa("Saúde")?.chave).toBe("medicamentos");
    expect(capaDaCausa("Educação")?.chave).toBe("escolar");
    expect(capaDaCausa("Cultura")?.chave).toBe("escolar");
    expect(capaDaCausa("Animais")?.chave).toBe("animais");
    expect(capaDaCausa("Proteção animal")?.chave).toBe("animais");
    expect(capaDaCausa("Pessoas idosas")?.chave).toBe("idosos");
    expect(capaDaCausa("Terceira idade")?.chave).toBe("idosos");
    expect(capaDaCausa("Assistência social")?.chave).toBe("generica");
    expect(capaDaCausa("Meio ambiente")?.chave).toBe("generica");
  });

  it("resolve todas as CATEGORIAS do formulário de necessidade", async () => {
    const { CATEGORIAS } = await import("@/lib/schemas/necessidade");
    for (const categoria of CATEGORIAS) {
      expect(capaDaCausa(categoria)?.chave).toBeDefined();
    }
  });

  it("aceita array, porque ongs.causas é TEXT[]", () => {
    // Vence a primeira entrada que resolve.
    expect(capaDaCausa(["Causa que não existe", "Inverno"])?.chave).toBe("inverno");
    expect(capaDaCausa(["Assistência social", "Inverno"])?.chave).toBe("generica");
    expect(capaDaCausa([])).toBeNull();
  });

  it("devolve nulo quando a causa não resolve numa categoria", () => {
    // Causa desconhecida não é depósito da genérica: cai no padrão gerado.
    expect(capaDaCausa(null)).toBeNull();
    expect(capaDaCausa("causa que não existe")).toBeNull();
    expect(capaDaCausa("Outros")?.chave).toBe("outros");
  });
});
