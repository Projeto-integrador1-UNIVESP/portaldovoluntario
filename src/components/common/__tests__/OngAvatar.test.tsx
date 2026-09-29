import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OngAvatar } from "@/components/common/OngAvatar";

/**
 * O fallback são as iniciais da ONG, e não um ícone genérico: num grid de dez
 * organizações sem logo, o ícone deixava todas com a mesma silhueta.
 */
describe("OngAvatar", () => {
  it("usa as duas primeiras palavras que carregam identidade", () => {
    render(<OngAvatar nome="Instituto Criança Feliz" />);
    expect(screen.getByText("IC")).toBeInTheDocument();
  });

  it("ignora conectivos no meio do nome", () => {
    render(<OngAvatar nome="Casa de Apoio Esperança" />);
    expect(screen.getByText("CA")).toBeInTheDocument();
  });

  it("aguenta nome de uma palavra, minúscula e espaço sobrando", () => {
    render(<OngAvatar nome="  lar são josé  " />);
    expect(screen.getByText("LS")).toBeInTheDocument();
  });

  it("não deixa o fallback vazio quando não há letra útil", () => {
    render(<OngAvatar nome="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("não é anunciado pelo leitor de tela: o nome da ONG vem ao lado", () => {
    render(<OngAvatar nome="Instituto Criança Feliz" />);
    expect(screen.getByText("IC")).toHaveAttribute("aria-hidden", "true");
  });
});
