import { describe, expect, it } from "vitest";
import { doacaoDinheiroSchema, doacaoItemSchema } from "@/lib/schemas/doacao";

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
