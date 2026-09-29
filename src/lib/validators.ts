export const onlyDigits = (value: string, maxLength?: number) => {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
};

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim());

export const isValidPhone = (value: string) => {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
};

export const isValidCep = (value: string) => onlyDigits(value).length === 8;

export const isFutureDate = (value: string) => {
  if (!value) return false;
  const agora = new Date();
  const dois = (n: number) => String(n).padStart(2, "0");
  const today = `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
  return value > today;
};

export const isEndBeforeStart = (start?: string | null, end?: string | null) =>
  Boolean(start && end && end < start);

export const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/**
 * CNPJ com dígito verificador. Só tamanho deixava passar "11.111.111/1111-11".
 */
export const isValidCnpj = (value: string) => {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (tamanho: number) => {
    const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, peso, i) => acc + Number(d[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
};
