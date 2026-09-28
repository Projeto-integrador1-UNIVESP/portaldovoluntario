import { describe, expect, it } from "vitest";
import { chavePixPareceValida, crc16, gerarPayloadPix } from "@/lib/pix";

describe("crc16", () => {
  it("bate com o valor de verificação canônico do CRC-16/CCITT-FALSE", () => {
    // "123456789" -> 0x29B1 é o check value publicado no catálogo de CRCs.
    // É o que prova que o polinômio e o valor inicial estão certos.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("concorda com a biblioteca pix-utils sobre um payload real", () => {
    // Payload gerado pela pix-utils (implementação independente e mantida)
    // para ANA SILVA / BELO HORIZONTE / chave 11223344556 / R$ 25,75.
    // Note o GUI em minúscula: o CRC é sensível a caixa, e foi essa a razão
    // de um exemplo publicado com o GUI em maiúscula não conferir.
    const doPixUtils =
      "00020126330014br.gov.bcb.pix011111223344556520400005303986540525.755802BR5909ANA SILVA6014BELO HORIZONTE62070503***6304027F";
    expect(crc16(doPixUtils.slice(0, -4))).toBe("027F");
    expect(crc16(doPixUtils.slice(0, -4))).toBe(doPixUtils.slice(-4));
  });

  it("devolve sempre 4 dígitos hexadecimais maiúsculos", () => {
    for (const entrada of ["", "A", "teste", "0".repeat(100)]) {
      expect(crc16(entrada)).toMatch(/^[0-9A-F]{4}$/);
    }
  });
});

describe("gerarPayloadPix", () => {
  const base = {
    chave: "123456789-0",
    nomeRecebedor: "Fulano",
    cidade: "Brasilia",
  };

  it("monta os campos do BR Code na ordem e com os tamanhos do padrão", () => {
    const payload = gerarPayloadPix(base);

    expect(payload.startsWith("000201")).toBe(true);        // versão do payload
    expect(payload).toContain("0014BR.GOV.BCB.PIX");         // GUI do Pix
    expect(payload).toContain("52040000");                   // categoria não informada
    expect(payload).toContain("5303986");                    // moeda: BRL
    expect(payload).toContain("5802BR");                     // país
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);             // CRC no fim

    // Todo campo declara o próprio tamanho; se algum estiver errado, o banco
    // recusa o código. Esta varredura confere cada declaração, sobre o payload
    // sem o campo 63 final ("6304" + 4 dígitos de CRC).
    const campos = payload.slice(0, -8);
    let i = 0;
    while (i < campos.length) {
      const tamanho = Number(campos.slice(i + 2, i + 4));
      expect(Number.isInteger(tamanho)).toBe(true);
      i += 4 + tamanho;
    }
    expect(i, "algum campo declara um tamanho que não fecha").toBe(campos.length);
  });

  it("o próprio CRC do payload gerado confere", () => {
    const payload = gerarPayloadPix({ ...base, valor: 50 });
    const semCrc = payload.slice(0, -4);
    expect(payload.slice(-4)).toBe(crc16(semCrc));
  });

  it("inclui o valor formatado com duas casas quando informado", () => {
    expect(gerarPayloadPix({ ...base, valor: 50 })).toContain("54055" + "0.00");
    expect(gerarPayloadPix({ ...base, valor: 1234.5 })).toContain("5407" + "1234.50");
  });

  it("omite o campo de valor numa doação de valor livre", () => {
    expect(gerarPayloadPix(base)).not.toMatch(/54\d{2}\d+\.\d{2}/);
  });

  it("tira acento e corta o nome do recebedor em 25 caracteres", () => {
    const payload = gerarPayloadPix({
      ...base,
      nomeRecebedor: "Associação Beneficente São José do Alto Vale",
      cidade: "São Paulo",
    });
    expect(payload).toContain("ASSOCIACAO BENEFICENTE SA");
    expect(payload).toContain("SAO PAULO");
    expect(payload).not.toMatch(/[çãáéêõ]/i);
  });

  it("aceita e-mail e chave aleatória como chave Pix", () => {
    expect(() => gerarPayloadPix({ ...base, chave: "doacoes@agar.org.br" })).not.toThrow();
    expect(() =>
      gerarPayloadPix({ ...base, chave: "123e4567-e89b-12d3-a456-426614174000" }),
    ).not.toThrow();
  });

  it("recusa gerar quando a ONG não cadastrou chave", () => {
    expect(() => gerarPayloadPix({ ...base, chave: "   " })).toThrow(/não cadastrou/i);
  });

  it("higieniza o identificador, que não aceita espaço nem barra", () => {
    const payload = gerarPayloadPix({ ...base, identificador: "doacao/2026 #12" });
    expect(payload).toContain("DOACAO202612");
  });
});

describe("chavePixPareceValida", () => {
  it.each([
    ["e-mail", "doacoes@agar.org.br"],
    ["CPF", "123.456.789-09"],
    ["CNPJ", "12.345.678/0001-99"],
    ["telefone", "+5511987654321"],
    ["chave aleatória", "123e4567-e89b-12d3-a456-426614174000"],
  ])("aceita %s", (_rotulo, chave) => {
    expect(chavePixPareceValida(chave)).toBe(true);
  });

  it.each([["vazia", "   "], ["texto solto", "minha chave"], ["curta demais", "123"]])(
    "recusa %s",
    (_rotulo, chave) => {
      expect(chavePixPareceValida(chave)).toBe(false);
    },
  );
});
