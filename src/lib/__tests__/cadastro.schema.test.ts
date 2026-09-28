import { describe, expect, it } from "vitest";
import { cadastroDoadorSchema, cadastroOngSchema } from "@/lib/schemas/cadastro";

const doadorValido = {
  nome: "Maria Souza",
  email: "maria@exemplo.com",
  senha: "Senha1234",
  aceite: true as const,
};

describe("cadastroDoadorSchema", () => {
  it("aceita apenas nome, e-mail, senha e aceite", () => {
    expect(cadastroDoadorSchema.safeParse(doadorValido).success).toBe(true);
  });

  it("não exige telefone, endereço nem data de nascimento", () => {
    // O cadastro tinha 9 campos obrigatórios; a SPEC pede no máximo 3.
    const obrigatorios = Object.keys(cadastroDoadorSchema.shape);
    expect(obrigatorios).toEqual(["nome", "email", "senha", "aceite"]);
  });

  it("recusa e-mail sem domínio", () => {
    const r = cadastroDoadorSchema.safeParse({ ...doadorValido, email: "maria@" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("E-mail inválido");
  });

  it("recusa senha que não atende às regras, dizendo qual falta", () => {
    const r = cadastroDoadorSchema.safeParse({ ...doadorValido, senha: "senha123" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toContain(
      "A senha precisa ter: uma letra maiúscula",
    );
  });

  it("exige o aceite dos termos", () => {
    const r = cadastroDoadorSchema.safeParse({ ...doadorValido, aceite: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/aceitar os Termos/);
  });
});

const ongValida = {
  ...doadorValido,
  nome_ong: "Sítio Agar",
  codigo_ong: "ONG-1234-ABCD",
  telefone: "(11) 98765-4321",
  data_nascimento: "1990-05-10",
  cep: "01310-100",
  logradouro: "Avenida Paulista, 1000",
  cidade: "São Paulo",
  estado: "SP",
};

describe("cadastroOngSchema", () => {
  it("aceita um cadastro completo de ONG", () => {
    expect(cadastroOngSchema.safeParse(ongValida).success).toBe(true);
  });

  it("aceita telefone e CEP já com máscara", () => {
    const r = cadastroOngSchema.safeParse({ ...ongValida, telefone: "1132654321", cep: "01310100" });
    expect(r.success).toBe(true);
  });

  it("recusa estado fora das 27 UFs", () => {
    const r = cadastroOngSchema.safeParse({ ...ongValida, estado: "XX" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Selecione o estado");
  });

  it("recusa data de nascimento no futuro", () => {
    const r = cadastroOngSchema.safeParse({ ...ongValida, data_nascimento: "2099-01-01" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/não pode ser no futuro/);
  });

  it("recusa telefone com dígitos de menos", () => {
    const r = cadastroOngSchema.safeParse({ ...ongValida, telefone: "1198765" });
    expect(r.success).toBe(false);
  });
});
