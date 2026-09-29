import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectCard, type ProjetoCardData } from "@/components/common/ProjectCard";

const renderizar = (projeto: ProjetoCardData) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProjectCard projeto={projeto} />
    </MemoryRouter>,
  );

describe("ProjectCard", () => {
  it("mostra ONG verificada, prazo e quanto falta a ONG confirmar", () => {
    renderizar({
      id: "p1",
      slug: "campanha-do-agasalho",
      nome_projeto: "Campanha do Agasalho",
      descricao: "Cobertores para o inverno.",
      img_url: null,
      data_fim: null,
      cidade: "Cajamar",
      causa: "Assistência social",
      ongNome: "Sítio Agar",
      ongVerificada: true,
      totalNecessidades: 3,
      progressoMedio: 25,
    });

    expect(screen.getByRole("link")).toHaveAttribute("href", "/projetos/campanha-do-agasalho");
    expect(screen.getByText("ONG verificada")).toBeInTheDocument();
    expect(screen.getByText("3 pedidos abertos")).toBeInTheDocument();
    expect(screen.getByText(/25% já confirmado pela ONG — faltam 75%/)).toBeInTheDocument();
  });

  /**
   * A página da ONG monta o card com um `as ProjetoCardData` e sem os campos
   * novos, e uma asserção de tipo não acusa isso — este teste é a única prova
   * de que a tela dela continua funcionando.
   */
  it("degrada sem ONG, sem causa e sem progresso (o caso da página da ONG)", () => {
    renderizar({
      id: "p2",
      slug: null,
      nome_projeto: "Reforço escolar",
      descricao: null,
      img_url: null,
      data_fim: null,
      cidade: null,
      ongNome: null,
    } as ProjetoCardData);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Reforço escolar");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/projetos/p2");
    expect(screen.queryByText(/pedido/)).not.toBeInTheDocument();
    expect(screen.queryByText(/confirmado pela ONG/)).not.toBeInTheDocument();
  });

  it("marca o prazo apertado sem esconder a informação de quem não vê cor", () => {
    // Data montada em fuso local: `toISOString()` é UTC e adiantaria um dia à noite.
    const emTresDias = new Date();
    emTresDias.setDate(emTresDias.getDate() + 3);
    const prazo = [
      emTresDias.getFullYear(),
      String(emTresDias.getMonth() + 1).padStart(2, "0"),
      String(emTresDias.getDate()).padStart(2, "0"),
    ].join("-");

    renderizar({
      id: "p3",
      slug: "mutirao",
      nome_projeto: "Mutirão de limpeza",
      descricao: null,
      img_url: null,
      data_fim: prazo,
      totalNecessidades: 0,
    });

    expect(screen.getByText("faltam 3 dias")).toBeInTheDocument();
    expect(screen.getByText("Nenhum pedido aberto agora.")).toBeInTheDocument();
  });
});
