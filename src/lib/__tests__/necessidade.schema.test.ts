import { describe, expect, it } from "vitest";
import { necessidadeSchema } from "@/lib/schemas/necessidade";

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

  it("recusa urgência fora de 1 a 3", () => {
    expect(necessidadeSchema.safeParse({ ...base, urgencia: 5 }).success).toBe(false);
  });
});
