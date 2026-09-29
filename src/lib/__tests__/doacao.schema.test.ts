import { describe, expect, it } from "vitest";
import {
  doacaoAvulsaSchema, doacaoDinheiroSchema, doacaoItemSchema, doacaoItemSchemaPara,
} from "@/lib/schemas/doacao";

const identificacao = {
  doador_nome: "Maria Souza",
  doador_email: "maria@exemplo.com",
  anonima: false,
};

describe("doacaoDinheiroSchema", () => {
  it("aceita nome, e-mail e valor, sem exigir senha", () => {
    const r = doacaoDinheiroSchema.safeParse({ ...identificacao, valor: 50 });
    expect(r.success).toBe(true);
  });

  it("recusa valor zero ou negativo", () => {
    expect(doacaoDinheiroSchema.safeParse({ ...identificacao, valor: 0 }).success).toBe(false);
    expect(doacaoDinheiroSchema.safeParse({ ...identificacao, valor: -5 }).success).toBe(false);
  });

  it("explica em português o que falta", () => {
    const r = doacaoDinheiroSchema.safeParse({ ...identificacao, doador_nome: "", valor: 50 });
    expect(r.error?.issues[0].message).toBe("Informe seu nome");
  });

  it("pede o e-mail e o valor com verbo e objeto, nunca 'Required'", () => {
    const r = doacaoDinheiroSchema.safeParse({ doador_nome: "Maria Souza", doador_email: "" });
    const mensagens = r.error?.issues.map((i) => i.message) ?? [];
    expect(mensagens).toContain("Informe seu e-mail");
    expect(mensagens).toContain("Escolha ou digite quanto você quer doar");
    expect(mensagens.join(" ")).not.toMatch(/required/i);
  });
});

describe("doacaoItemSchema", () => {
  it("exige quantidade e forma de entrega", () => {
    const r = doacaoItemSchema.safeParse({ ...identificacao, quantidade: 2, forma_entrega: "levar" });
    expect(r.success).toBe(true);
  });

  it("recusa forma de entrega fora das opções", () => {
    const r = doacaoItemSchema.safeParse({
      ...identificacao, quantidade: 2, forma_entrega: "drone",
    });
    expect(r.error?.issues[0].message).toMatch(/como a doação vai chegar/);
  });

  it("permite marcar a doação como anônima", () => {
    const r = doacaoItemSchema.safeParse({
      ...identificacao, anonima: true, quantidade: 2, forma_entrega: "coleta",
    });
    expect(r.success).toBe(true);
    expect(r.data?.anonima).toBe(true);
  });
});

describe("doacaoItemSchemaPara", () => {
  const base = { ...identificacao, forma_entrega: "levar" };

  it.each(["un", "caixa", "par", null])("só aceita inteiro quando a unidade é %s", (unidade) => {
    const schema = doacaoItemSchemaPara(unidade);
    expect(schema.safeParse({ ...base, quantidade: 2 }).success).toBe(true);
    const r = schema.safeParse({ ...base, quantidade: 1.5 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Informe um número inteiro de itens");
  });

  it.each(["kg", "L"])("aceita fração com duas casas quando a unidade é %s", (unidade) => {
    const schema = doacaoItemSchemaPara(unidade);
    expect(schema.safeParse({ ...base, quantidade: 1.5 }).success).toBe(true);
    expect(schema.safeParse({ ...base, quantidade: 1.555 }).error?.issues[0].message).toBe(
      "Use no máximo duas casas decimais",
    );
  });
});

describe("doacaoAvulsaSchema", () => {
  it("só pede o valor, e pede em português", () => {
    expect(doacaoAvulsaSchema.safeParse({ valor: 25 }).success).toBe(true);
    const r = doacaoAvulsaSchema.safeParse({});
    expect(r.error?.issues[0].message).toBe("Escolha ou digite quanto você quer doar");
  });
});
