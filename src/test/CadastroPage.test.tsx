
 // @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CadastroPage from "../pages/CadastroPage";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("Cadastro do Portal do Voluntário", () => {
  it("deve apresentar as opções de tipo de conta", () => {
    render(
      <MemoryRouter initialEntries={["/cadastro"]}>
        <CadastroPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", {
        name: "Como você quer participar?",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Quero doar ou ser voluntário/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Sou uma ONG/i,
      })
    ).toBeInTheDocument();
  });

  it("deve exibir o formulário de doador ao selecionar essa opção", () => {
    render(
      <MemoryRouter initialEntries={["/cadastro"]}>
        <CadastroPage />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Quero doar ou ser voluntário/i,
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Cadastro de doador e voluntário",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Nome completo")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("E-mail")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Senha")
    ).toBeInTheDocument();
  });

  it("deve exibir os campos específicos ao selecionar ONG", () => {
    render(
      <MemoryRouter initialEntries={["/cadastro"]}>
        <CadastroPage />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Sou uma ONG/i,
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Cadastro de ONG",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Nome da ONG")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Chave de acesso")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Nome do responsável")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Telefone")
    ).toBeInTheDocument();
  });

  it("deve abrir diretamente o formulário de ONG quando a URL contém tipo=ong", () => {
    render(
      <MemoryRouter initialEntries={["/cadastro?tipo=ong"]}>
        <CadastroPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", {
        name: "Cadastro de ONG",
      })
    ).toBeInTheDocument();
  });
});
