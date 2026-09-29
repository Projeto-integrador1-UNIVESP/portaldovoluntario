import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErroAmigavel, ErroDeValidacao } from "@/lib/erros";
import {
  deCampoDeDataHora,
  ehCodigoDuplicado,
  erroDaFunction,
  errosPorCampo,
  fimDoDiaLocal,
  gerarCodigoDeAcesso,
  mensagemDeErro,
  paraCampoDeDataHora,
} from "../_shared-lib";

describe("gerarCodigoDeAcesso", () => {
  it("mantém o formato ONG-XXXX-XXXX", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(gerarCodigoDeAcesso()).toMatch(/^ONG-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it("não usa caracteres que se confundem ao ler em voz alta", () => {
    // O prefixo "ONG-" é fixo; o que não pode ter O/0/I/1 é a parte sorteada.
    const sorteado = Array.from({ length: 200 }, gerarCodigoDeAcesso)
      .map((codigo) => codigo.slice(4).replace("-", ""))
      .join("");
    expect(sorteado).not.toMatch(/[O0I1]/);
  });

  it("não repete código em uso normal", () => {
    const codigos = new Set(Array.from({ length: 500 }, gerarCodigoDeAcesso));
    expect(codigos.size).toBe(500);
  });
});

describe("fimDoDiaLocal", () => {
  it("leva a validade até o último instante do dia escolhido, no fuso local", () => {
    const instante = new Date(fimDoDiaLocal("2026-10-02"));
    expect(instante.getFullYear()).toBe(2026);
    expect(instante.getMonth()).toBe(9);
    expect(instante.getDate()).toBe(2);
    expect(instante.getHours()).toBe(23);
  });

  it("não expira antes do dia escolhido", () => {
    // O bug anterior: `new Date("2026-10-02").toISOString()` dá meia-noite UTC,
    // que no Brasil é 21h do dia 1º, então a chave morria um dia antes.
    const fim = new Date(fimDoDiaLocal("2026-10-02"));
    const meioDiaDoMesmoDia = new Date(2026, 9, 2, 12, 0, 0);
    expect(fim.getTime()).toBeGreaterThan(meioDiaDoMesmoDia.getTime());
  });
});

describe("campo de data e hora", () => {
  it("mostra a hora local, não a hora UTC", () => {
    const local = new Date(2026, 9, 2, 9, 30);
    expect(paraCampoDeDataHora(local.toISOString())).toBe("2026-10-02T09:30");
  });

  it("volta ao mesmo instante depois de ida e volta", () => {
    const original = new Date(2026, 4, 15, 18, 45).toISOString();
    expect(deCampoDeDataHora(paraCampoDeDataHora(original))).toBe(original);
  });

  it("devolve vazio para valor ausente ou inválido", () => {
    expect(paraCampoDeDataHora(null)).toBe("");
    expect(paraCampoDeDataHora("isso não é data")).toBe("");
  });

  it("recusa um valor que não é data", () => {
    expect(() => deCampoDeDataHora("")).toThrow();
  });
});

describe("mensagemDeErro", () => {
  it("traduz chave estrangeira sem mostrar o texto do Postgres", () => {
    const mensagem = mensagemDeErro(
      new Error('update or delete on table "ongs" violates foreign key constraint'),
      "padrão",
    );
    expect(mensagem).toContain("registros ligados");
    expect(mensagem).not.toMatch(/foreign key/i);
  });

  it("traduz unicidade", () => {
    expect(mensagemDeErro(new Error('duplicate key value violates unique constraint'), "padrão"))
      .toBe("Já existe um registro com esses dados.");
  });

  it("traduz falha de rede", () => {
    expect(mensagemDeErro(new Error("Failed to fetch"), "padrão")).toContain("Sem conexão");
  });

  it("cai no texto padrão quando não reconhece o erro", () => {
    expect(mensagemDeErro(new Error("algo muito específico"), "Não foi possível salvar."))
      .toBe("Não foi possível salvar.");
  });

  it("repassa intacta a mensagem escrita para o usuário", () => {
    // Antes um `throw new Error("Informe o nome")` virava "Não foi possível salvar".
    expect(mensagemDeErro(new ErroAmigavel("O papel anterior foi removido"), "padrão"))
      .toBe("O papel anterior foi removido");
    expect(mensagemDeErro(new ErroDeValidacao("Não existe conta com esse e-mail", "email"), "padrão"))
      .toBe("Não existe conta com esse e-mail");
  });
});

describe("errosPorCampo", () => {
  it("guarda a primeira mensagem de cada campo, na ordem do schema", () => {
    const schema = z.object({
      nome: z.string().min(1, "Informe o nome").min(3, "Use pelo menos 3 caracteres"),
      email: z.string().email("E-mail inválido"),
    });
    const r = schema.safeParse({ nome: "", email: "x" });
    expect(errosPorCampo(r.error!)).toEqual({ nome: "Informe o nome", email: "E-mail inválido" });
    expect(Object.keys(errosPorCampo(r.error!))[0]).toBe("nome");
  });
});

describe("erroDaFunction", () => {
  it("lê o motivo no corpo da resposta e aponta e-mail duplicado para o campo", async () => {
    const contexto = { json: async () => ({ error: "A user with this email address has already been registered" }) };
    const erro = await erroDaFunction({ context: contexto }, null);
    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).campo).toBe("email");
  });

  it("mantém o texto dos outros erros para o tradutor", async () => {
    const erro = await erroDaFunction(new Error("Edge Function returned a non-2xx status code"), { error: "forbidden" });
    expect(erro.message).toBe("forbidden");
    expect(mensagemDeErro(new Error("permission denied"), "padrão")).toContain("permissão");
  });
});

describe("ehCodigoDuplicado", () => {
  it("reconhece a colisão de código", () => {
    expect(ehCodigoDuplicado(new Error("duplicate key value violates unique constraint"))).toBe(true);
    expect(ehCodigoDuplicado(new Error("permission denied"))).toBe(false);
  });
});
