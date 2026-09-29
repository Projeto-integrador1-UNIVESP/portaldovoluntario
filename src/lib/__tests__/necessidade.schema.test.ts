import { describe, expect, it } from "vitest";
import {
  META_MAXIMA, metaDoTexto, necessidadeSchema, textoDaMeta,
} from "@/lib/schemas/necessidade";

// O Intl separa "R$" do número com espaço inseparável; o teste compara com espaço comum.
const semNbsp = (s: string | undefined) => s?.replace(/\u00a0/g, " ");

const base = {
  tipo: "item" as const,
  nome: "Cobertor solteiro",
  categoria: "Inverno",
  unidade: "un",
  meta: 100,
  urgencia: 3,
  status: true,
};

describe("necessidadeSchema", () => {
  it("aceita uma necessidade de item completa", () => {
    expect(necessidadeSchema.safeParse(base).success).toBe(true);
  });

  it("exige unidade quando o tipo é item", () => {
    // Sem unidade, "meta 100" é ambíguo: 100 o quê?
    const r = necessidadeSchema.safeParse({ ...base, unidade: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/unidade/i);
  });

  it("dispensa unidade quando o tipo é dinheiro", () => {
    const r = necessidadeSchema.safeParse({
      ...base, tipo: "dinheiro", nome: "Compra de alimentos", unidade: undefined,
    });
    expect(r.success).toBe(true);
  });

  it("recusa meta zero ou negativa", () => {
    expect(necessidadeSchema.safeParse({ ...base, meta: 0 }).success).toBe(false);
    expect(necessidadeSchema.safeParse({ ...base, meta: -10 }).success).toBe(false);
  });

  it("pede a meta quando ela não vem", () => {
    const r = necessidadeSchema.safeParse({ ...base, meta: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Informe a meta");
  });

  it("diz a meta máxima em reais quando é dinheiro e em número quando é item", () => {
    const dinheiro = necessidadeSchema.safeParse({
      ...base, tipo: "dinheiro", unidade: undefined, meta: META_MAXIMA + 1,
    });
    expect(dinheiro.success).toBe(false);
    expect(semNbsp(dinheiro.error?.issues[0].message)).toBe("A meta máxima é R$ 1.000.000,00");

    const item = necessidadeSchema.safeParse({ ...base, meta: META_MAXIMA + 1 });
    expect(item.success).toBe(false);
    expect(item.error?.issues[0].message).toBe("A meta máxima é 1.000.000");
  });

  it("recusa urgência fora de 1 a 3", () => {
    expect(necessidadeSchema.safeParse({ ...base, urgencia: 5 }).success).toBe(false);
  });
});

describe("meta com máscara de dinheiro", () => {
  it("exibe o número guardado como moeda, sem erro de ponto flutuante", () => {
    expect(semNbsp(textoDaMeta(1500, "dinheiro"))).toBe("R$ 1.500,00");
    expect(semNbsp(textoDaMeta(19.99, "dinheiro"))).toBe("R$ 19,99");
    expect(textoDaMeta(undefined, "dinheiro")).toBe("");
    expect(textoDaMeta(12, "item")).toBe("12");
  });

  it("lê o que foi digitado como centavos da direita para a esquerda", () => {
    expect(metaDoTexto("R$ 1.500,00", "dinheiro")).toBe(1500);
    expect(metaDoTexto("R$ 1.500,003", "dinheiro")).toBe(15000.03);
    // Apagar o último dígito tira um centavo da direita: é a máscara, não um bug.
    expect(metaDoTexto("R$ 150,0", "dinheiro")).toBe(15);
  });

  it("campo vazio vira indefinido, não zero: o schema pede a meta", () => {
    expect(metaDoTexto("", "dinheiro")).toBeUndefined();
    expect(metaDoTexto("R$ ", "dinheiro")).toBeUndefined();
    expect(metaDoTexto("", "item")).toBeUndefined();
    expect(metaDoTexto("40", "item")).toBe(40);
  });
});
