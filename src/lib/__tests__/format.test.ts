import { describe, expect, it, vi, afterEach } from "vitest";
import {
  diasRestantes,
  formatCep,
  formatCnpj,
  formatCurrency,
  formatDate,
  formatPhone,
  formatPrazo,
  maskCurrency,
  parseCurrency,
  progressoPercent,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("formata no padrão brasileiro", () => {
    //   = espaço não separável que o Intl insere depois de "R$"
    expect(formatCurrency(1234.5)).toBe("R$ 1.234,50");
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });

  it("trata ausência de valor sem quebrar", () => {
    expect(formatCurrency(null)).toBe("R$\u00a00,00");
    expect(formatCurrency(undefined)).toBe("R$\u00a00,00");
    expect(formatCurrency(NaN)).toBe("R$\u00a00,00");
  });
});

describe("formatDate", () => {
  it("formata data ISO como dd/mm/aaaa", () => {
    expect(formatDate("2026-09-28T12:00:00Z")).toBe("28/09/2026");
  });

  it("retorna vazio para entrada ausente ou inválida", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("")).toBe("");
    expect(formatDate("não é data")).toBe("");
  });
});

describe("formatPhone", () => {
  it("formata celular com 11 dígitos", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo com 10 dígitos", () => {
    expect(formatPhone("1132654321")).toBe("(11) 3265-4321");
  });

  it("formata parcialmente enquanto o usuário digita", () => {
    expect(formatPhone("1")).toBe("1");
    expect(formatPhone("11")).toBe("11");
    expect(formatPhone("119")).toBe("(11) 9");
    expect(formatPhone("119876")).toBe("(11) 9876");
  });

  it("descarta caracteres não numéricos e excesso de dígitos", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("(11) 98765-4321");
    expect(formatPhone("119876543219999")).toBe("(11) 98765-4321");
  });
});

describe("formatCep", () => {
  it("formata CEP completo", () => {
    expect(formatCep("01310100")).toBe("01310-100");
  });

  it("formata parcialmente e limita a 8 dígitos", () => {
    expect(formatCep("01310")).toBe("01310");
    expect(formatCep("013101009999")).toBe("01310-100");
  });
});

describe("formatCnpj", () => {
  it("formata CNPJ completo", () => {
    expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("formata parcialmente enquanto digita", () => {
    expect(formatCnpj("12")).toBe("12");
    expect(formatCnpj("12345")).toBe("12.345");
    expect(formatCnpj("12345678")).toBe("12.345.678");
    expect(formatCnpj("123456780001")).toBe("12.345.678/0001");
  });
});

describe("maskCurrency / parseCurrency", () => {
  it("preenche da direita para a esquerda", () => {
    expect(maskCurrency("")).toBe("R$\u00a00,00");
    expect(maskCurrency("5")).toBe("R$ 0,05");
    expect(maskCurrency("12345")).toBe("R$ 123,45");
  });

  it("faz o caminho de volta para número", () => {
    expect(parseCurrency("R$ 123,45")).toBe(123.45);
    expect(parseCurrency("")).toBe(0);
  });
});

describe("diasRestantes / formatPrazo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const congelaEm = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  };

  it("conta dias de calendário ignorando horas", () => {
    congelaEm("2026-09-28T23:00:00");
    expect(diasRestantes("2026-10-05")).toBe(7);
    expect(diasRestantes("2026-09-28")).toBe(0);
    expect(diasRestantes("2026-09-27")).toBe(-1);
  });

  it("descreve o prazo em português", () => {
    congelaEm("2026-09-28T09:00:00");
    expect(formatPrazo("2026-10-05")).toBe("faltam 7 dias");
    expect(formatPrazo("2026-09-29")).toBe("falta 1 dia");
    expect(formatPrazo("2026-09-28")).toBe("último dia");
    expect(formatPrazo("2026-09-20")).toBe("encerrado");
    expect(formatPrazo(null)).toBe("");
  });
});

describe("progressoPercent", () => {
  it("calcula o percentual arredondado", () => {
    expect(progressoPercent(50, 200)).toBe(25);
    expect(progressoPercent(1, 3)).toBe(33);
  });

  it("limita entre 0 e 100 e tolera meta ausente", () => {
    expect(progressoPercent(300, 200)).toBe(100);
    expect(progressoPercent(-5, 200)).toBe(0);
    expect(progressoPercent(10, 0)).toBe(0);
  });
});
