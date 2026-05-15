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
  const today = new Date().toISOString().slice(0, 10);
  return value > today;
};

export const isEndBeforeStart = (start?: string | null, end?: string | null) =>
  Boolean(start && end && end < start);

export const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};
