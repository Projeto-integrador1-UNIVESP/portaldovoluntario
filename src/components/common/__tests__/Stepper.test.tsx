import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stepper } from "@/components/common/Stepper";

const passos = [
  { id: "destino", rotulo: "O que doar" },
  { id: "valor", rotulo: "Quanto doar" },
  { id: "doador", rotulo: "Seus dados" },
];

describe("Stepper", () => {
  it("marca só o passo atual e diz quanto falta", () => {
    render(<Stepper passos={passos} atual={2} />);

    const atual = screen.getAllByRole("listitem").filter((li) => li.getAttribute("aria-current"));
    expect(atual).toHaveLength(1);
    expect(atual[0]).toHaveTextContent("Quanto doar");
    expect(screen.getByText(/Passo 2 de 3: Quanto doar/)).toBeInTheDocument();
  });

  it("não estoura os limites quando o passo vem fora da faixa", () => {
    render(<Stepper passos={passos} atual={99} />);

    expect(screen.getByText(/Passo 3 de 3: Seus dados/)).toBeInTheDocument();
  });
});
