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
   * leitor de tela: a foto vira decorativa e o aviso vira texto de verdade.
   */
  it("marca a foto de categoria como ilustrativa e não herda o alt do registro", () => {
    const { container } = render(<Capa alt="Sede da Casa de Apoio" id="p1" causa="Brinquedos" />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img", { name: "Sede da Casa de Apoio" })).not.toBeInTheDocument();
    expect(screen.getByText("Imagem ilustrativa")).toBeInTheDocument();
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

  it("causa desconhecida cai na foto genérica, não no padrão", () => {
    const { container } = render(<Capa alt="" id="p1" causa="Assistência social" />);

    expect(container.querySelector("img")?.getAttribute("src")).toBe(capaDaCausa(null).src);
  });
});

describe("capaDaCausa", () => {
  it("casa por radical, não por palavra exata", () => {
    // Todas vêm do texto livre que o admin digita em `projetos.causa`.
    expect(capaDaCausa("Alimentos").chave).toBe("alimentos");
    expect(capaDaCausa("alimentação").chave).toBe("alimentos");
    expect(capaDaCausa("Segurança alimentar").chave).toBe("alimentos");
    expect(capaDaCausa("Educação").chave).toBe("escolar");
    expect(capaDaCausa("Material escolar").chave).toBe("escolar");
    expect(capaDaCausa("Roupas e calçados").chave).toBe("roupas");
    expect(capaDaCausa("Higiene e limpeza").chave).toBe("higiene");
    expect(capaDaCausa("Saúde").chave).toBe("medicamentos");
    expect(capaDaCausa("Moradia").chave).toBe("moveis");
  });

  it("resolve todas as CATEGORIAS do formulário de necessidade", async () => {
    const { CATEGORIAS } = await import("@/lib/schemas/necessidade");
    for (const categoria of CATEGORIAS) {
      expect(capaDaCausa(categoria).chave).not.toBe("generica");
    }
  });

  it("aceita array, porque ongs.causas é TEXT[]", () => {
    expect(capaDaCausa(["Assistência social", "Inverno"]).chave).toBe("inverno");
    expect(capaDaCausa([]).chave).toBe("generica");
  });

  it("nunca devolve nulo: causa ausente ou desconhecida vira a genérica", () => {
    expect(capaDaCausa(null).chave).toBe("generica");
    expect(capaDaCausa(undefined).chave).toBe("generica");
    expect(capaDaCausa("cultura e lazer").chave).toBe("generica");
    expect(capaDaCausa(null).srcSet).toContain("1280w");
  });
});
