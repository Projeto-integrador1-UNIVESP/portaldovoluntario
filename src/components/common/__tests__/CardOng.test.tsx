import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CardOng, type OngCardData } from "@/components/common/CardOng";

const ong: OngCardData = {
  id: "ong-1",
  slug: "casa-de-apoio",
  nome: "Casa de Apoio Esperança",
  cidade: "São Paulo",
  estado: "SP",
  missao: "Acolher famílias em situação de rua na zona leste.",
  causas: ["Assistência social", "População em situação de rua", "Alimentação"],
  verificada_em: "2026-01-10T00:00:00Z",
};

const renderizar = (props: Partial<React.ComponentProps<typeof CardOng>> = {}) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CardOng ong={ong} {...props} />
    </MemoryRouter>,
  );

/**
 * Um card só para a home (horizontal) e para a listagem (vertical). Os dois
 * layouts precisam mostrar as mesmas informações, e o texto do selo é um só.
 */
describe("CardOng", () => {
  it("vertical: nome, cidade, selo, duas causas e quantos pedidos tem em aberto", () => {
    renderizar({ pedidosAbertos: 2 });

    expect(screen.getByRole("link")).toHaveAttribute("href", "/ongs/casa-de-apoio");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Casa de Apoio Esperança");
    expect(screen.getByText("São Paulo, SP")).toBeInTheDocument();
    expect(screen.getByText("ONG verificada")).toBeInTheDocument();
    expect(screen.getByText("2 pedidos abertos")).toBeInTheDocument();
    expect(screen.getByText("Ver perfil")).toBeInTheDocument();
    // Só duas causas cabem no card; a terceira fica para o perfil.
    expect(screen.getByText("Assistência social")).toBeInTheDocument();
    expect(screen.getByText("População em situação de rua")).toBeInTheDocument();
    expect(screen.queryByText("Alimentação")).not.toBeInTheDocument();
  });

  it("diz quando não há pedido aberto, e nada quando a página não contou", () => {
    const { unmount } = renderizar({ pedidosAbertos: 0 });
    expect(screen.getByText("Nenhum pedido aberto")).toBeInTheDocument();
    unmount();

    renderizar();
    expect(screen.queryByText(/pedido/)).not.toBeInTheDocument();
  });

  it("horizontal: as mesmas informações, o selo só uma vez", () => {
    renderizar({ layout: "horizontal", pedidosAbertos: 1 });

    expect(screen.getByRole("link")).toHaveClass("flex-row");
    expect(screen.getByText("Casa de Apoio Esperança")).toBeInTheDocument();
    expect(screen.getByText("São Paulo, SP")).toBeInTheDocument();
    expect(screen.getAllByText("ONG verificada")).toHaveLength(1);
    expect(screen.getByText("1 pedido aberto")).toBeInTheDocument();
  });

  it("sem verificação o selo some em vez de dizer outra coisa", () => {
    renderizar({ ong: { ...ong, verificada_em: null } });
    expect(screen.queryByText(/verificad/i)).not.toBeInTheDocument();
  });
});
