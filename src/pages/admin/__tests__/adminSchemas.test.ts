import { describe, expect, it } from "vitest";
import { MENSAGENS } from "@/lib/copy";
import {
  codigoAdminSchema, doacaoAdminSchema, eventoAdminSchema, novoUsuarioSchema, ongAdminSchema,
  ONG_VAZIA, payloadDaOng, usuarioAdminSchema, voluntarioAdminSchema,
} from "@/lib/schemas/admin";
import { errosPorCampo } from "../_shared-lib";

const ongValida = {
  ...ONG_VAZIA,
  nome: "Casa do Caminho",
  cnpj: "05412783000134",
  area_atuacao: "Assistência social",
  telefone: "11987654321",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01310100",
  logradouro: "Av. Paulista, 1000",
  pix: "casa@exemplo.org",
  banco: "Banco X",
  agencia: "1234",
  conta: "12345",
  missao: "Acolher",
  descricao: "Descrição",
};

describe("ongAdminSchema", () => {
  it("aceita uma ONG completa", () => {
    expect(ongAdminSchema.safeParse(ongValida).success).toBe(true);
  });

  it("enviada vazia, aponta cada campo obrigatório com a mensagem do glossário", () => {
    const r = ongAdminSchema.safeParse(ONG_VAZIA);
    expect(r.success).toBe(false);
    const erros = errosPorCampo(r.error!);
    expect(erros.nome).toBe("Informe o nome da ONG");
    expect(erros.cnpj).toBe(MENSAGENS.cnpj);
    expect(erros.telefone).toBe(MENSAGENS.telefone);
    expect(erros.cep).toBe(MENSAGENS.cep);
    expect(erros.estado).toBe("Escolha o estado");
    expect(erros.pix).toBe("Informe a chave Pix");
  });

  it("recusa CNPJ com dígito verificador errado, não só pelo tamanho", () => {
    const r = ongAdminSchema.safeParse({ ...ongValida, cnpj: "11111111111111" });
    expect(r.success).toBe(false);
    expect(errosPorCampo(r.error!).cnpj).toBe(MENSAGENS.cnpj);
  });

  it("recusa chave Pix que não tem formato de chave", () => {
    const r = ongAdminSchema.safeParse({ ...ongValida, pix: "minha chave" });
    expect(r.success).toBe(false);
    expect(errosPorCampo(r.error!).pix).toBe(MENSAGENS.pix);
  });

  it("completa o https:// do site e grava só dígitos de CNPJ e telefone", () => {
    const r = ongAdminSchema.safeParse({ ...ongValida, site: "exemplo.org", cnpj: "05.412.783/0001-34", instagram: "@casa" });
    expect(r.success).toBe(true);
    const payload = payloadDaOng(r.data!);
    expect(payload.site).toBe("https://exemplo.org");
    expect(payload.cnpj).toBe("05412783000134");
    expect(payload.instagram).toBe("casa");
    expect(payload.conta).toBe(12345);
  });

  it("recusa conta e agência com zero à esquerda: o banco é INT e perderia o dígito", () => {
    const r = ongAdminSchema.safeParse({ ...ongValida, conta: "0123" });
    expect(r.success).toBe(false);
    expect(errosPorCampo(r.error!).conta).toMatch(/só números/);
  });
});

describe("usuários", () => {
  it("editar exige só o nome; telefone vazio passa, telefone curto não", () => {
    expect(usuarioAdminSchema.safeParse({ nome: "Ana", telefone: "", cidade: "", estado: "", papel: "user" }).success).toBe(true);
    const r = usuarioAdminSchema.safeParse({ nome: "", telefone: "119", cidade: "", estado: "", papel: "user" });
    const erros = errosPorCampo(r.error!);
    expect(erros.nome).toBe("Informe o nome");
    expect(erros.telefone).toBe(MENSAGENS.telefone);
  });

  it("novo usuário fala do e-mail da pessoa, não do 'seu' e-mail", () => {
    const r = novoUsuarioSchema.safeParse({ nome: "Ana", email: "", senha: "Senha1234", papel: "user" });
    expect(errosPorCampo(r.error!).email).toBe("Informe o e-mail");
    const r2 = novoUsuarioSchema.safeParse({ nome: "Ana", email: "ana@", senha: "Senha1234", papel: "user" });
    expect(errosPorCampo(r2.error!).email).toBe("Informe um e-mail válido");
  });

  it("a senha segue as mesmas regras do cadastro público", () => {
    const r = novoUsuarioSchema.safeParse({ nome: "Ana", email: "ana@exemplo.com", senha: "senha", papel: "user" });
    expect(errosPorCampo(r.error!).senha).toMatch(/A senha precisa ter/);
  });
});

describe("eventoAdminSchema", () => {
  const base = { nome: "Mutirão", data_evento: "2026-10-02T09:30", local: "Galpão", vagas: "", id_ong: "ong-1", descricao: "", img_url: "" };

  it("vagas em branco é sem limite; zero ou texto é erro", () => {
    expect(eventoAdminSchema.safeParse(base).success).toBe(true);
    expect(eventoAdminSchema.safeParse({ ...base, vagas: "12" }).success).toBe(true);
    expect(errosPorCampo(eventoAdminSchema.safeParse({ ...base, vagas: "0" }).error!).vagas).toMatch(/a partir de 1/);
  });

  it("enviado vazio, nomeia cada campo", () => {
    const erros = errosPorCampo(eventoAdminSchema.safeParse({ ...base, nome: "", data_evento: "", local: "", id_ong: "" }).error!);
    expect(erros).toEqual({
      nome: "Informe o nome do evento",
      data_evento: "Informe a data e a hora",
      local: "Informe o local",
      id_ong: "Escolha a ONG responsável",
    });
  });
});

describe("doacaoAdminSchema", () => {
  it("exige ONG e valor maior que zero, lendo o valor com máscara", () => {
    const r = doacaoAdminSchema.safeParse({ id_ong: "", valor: "R$ 0,00", tipo_doacao: "pix", doador_nome: "", doador_email: "" });
    const erros = errosPorCampo(r.error!);
    expect(erros.id_ong).toBe("Escolha a ONG que recebeu");
    expect(erros.valor).toBe(MENSAGENS.valorPositivo);
    expect(doacaoAdminSchema.safeParse({ id_ong: "o1", valor: "R$ 12,50", tipo_doacao: "pix", doador_nome: "", doador_email: "" }).success).toBe(true);
  });

  it("e-mail do doador é opcional, mas se vier precisa ser válido", () => {
    const r = doacaoAdminSchema.safeParse({ id_ong: "o1", valor: "R$ 1,00", tipo_doacao: "pix", doador_nome: "", doador_email: "x" });
    expect(errosPorCampo(r.error!).doador_email).toBe("Informe um e-mail válido");
  });
});

describe("voluntarioAdminSchema", () => {
  it("enviado vazio, pede o e-mail da pessoa e o projeto", () => {
    const erros = errosPorCampo(voluntarioAdminSchema.safeParse({ email: "", id_projeto: "", status: "aprovado" }).error!);
    expect(erros.email).toBe("Informe o e-mail da pessoa");
    expect(erros.id_projeto).toBe("Escolha o projeto");
  });
});

describe("codigoAdminSchema", () => {
  const base = { code: "", nome_ong_sugerido: "", observacoes: "", expires_at: "" };

  it("aceita o formato do gerador, inclusive digitado em minúsculas", () => {
    expect(codigoAdminSchema.safeParse({ ...base, code: "ONG-7K3P-QW2M" }).success).toBe(true);
    const r = codigoAdminSchema.safeParse({ ...base, code: "ong-7k3p-qw2m" });
    expect(r.success).toBe(true);
    expect(r.data!.code).toBe("ONG-7K3P-QW2M");
  });

  it("recusa chave fora do formato ou com caracteres ambíguos", () => {
    for (const code of ["", "ABCD-EFGH", "ONG-ABC0-EFGH", "ONG-ABCI-EFGH", "ONG-ABCDE-FGH"]) {
      const r = codigoAdminSchema.safeParse({ ...base, code });
      expect(r.success, code).toBe(false);
      expect(errosPorCampo(r.error!).code).toMatch(/ONG-XXXX-XXXX/);
    }
  });

  it("não deixa a validade ficar no passado", () => {
    const r = codigoAdminSchema.safeParse({ ...base, code: "ONG-7K3P-QW2M", expires_at: "2000-01-01" });
    expect(errosPorCampo(r.error!).expires_at).toBe("A validade não pode ser no passado");
  });
});
