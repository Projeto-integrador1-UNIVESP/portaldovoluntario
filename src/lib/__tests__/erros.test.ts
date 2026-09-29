import { describe, expect, it } from "vitest";
import { ErroAmigavel, ErroDeValidacao, mensagemAmigavel } from "@/lib/erros";

describe("mensagemAmigavel", () => {
  it("repassa a mensagem escrita para o usuário", () => {
    expect(mensagemAmigavel(new ErroAmigavel("Informe o nome do projeto"), "padrão")).toBe("Informe o nome do projeto");
    expect(mensagemAmigavel(new ErroDeValidacao("Escolha a ONG", "id_ong"), "padrão")).toBe("Escolha a ONG");
  });

  it("traduz o objeto { message } do PostgREST, não só Error", () => {
    expect(mensagemAmigavel({ message: "duplicate key value violates unique constraint" }, "padrão")).toBe(
      "Já existe um registro com esses dados.",
    );
  });

  it("nunca mostra o texto técnico: cai no padrão da tela", () => {
    expect(mensagemAmigavel(new Error("column xyz does not exist"), "Não foi possível salvar o projeto.")).toBe(
      "Não foi possível salvar o projeto.",
    );
    expect(mensagemAmigavel(undefined, "padrão")).toBe("padrão");
  });

  it("traduz credencial errada e falta de rede", () => {
    expect(mensagemAmigavel(new Error("Invalid login credentials"), "x")).toBe("E-mail ou senha incorretos.");
    expect(mensagemAmigavel(new TypeError("Failed to fetch"), "x")).toMatch(/Sem conexão/);
  });
});
