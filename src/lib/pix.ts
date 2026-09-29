/**
 * Gera o payload "Pix Copia e Cola" (BR Code), no padrão EMV® QR Code definido
 * pelo Banco Central.
 *
 * É um QR **estático**: aponta para a chave Pix da ONG com valor sugerido. Não
 * há gateway de pagamento no projeto, então a transferência acontece direto
 * entre doador e ONG no app do banco, e é a ONG quem confirma o recebimento
 * depois. Por isso o nome do recebedor é exibido junto do código: é o que o
 * doador confere antes de pagar.
 */

/** Remove acentos e caracteres que o padrão não aceita nos campos de texto. */
const normalizar = (texto: string, max: number) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();

/** Monta um campo no formato ID + tamanho (2 dígitos) + valor. */
const campo = (id: string, valor: string) =>
  `${id}${String(valor.length).padStart(2, "0")}${valor}`;

/**
 * CRC16/CCITT-FALSE, polinômio 0x1021, valor inicial 0xFFFF, que é o que o
 * padrão do BR Code exige no campo 63.
 */
export function crc16(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type DadosPix = {
  /** Chave Pix da ONG: CPF/CNPJ, e-mail, telefone ou chave aleatória. */
  chave: string;
  /** Nome do recebedor, como aparece no app do banco. */
  nomeRecebedor: string;
  cidade: string;
  /** Valor em reais. Omitido gera um QR de valor livre. */
  valor?: number;
  /** Identificador da transação. Sem barras nem espaços; máx. 25 caracteres. */
  identificador?: string;
};

export function gerarPayloadPix({
  chave,
  nomeRecebedor,
  cidade,
  valor,
  identificador,
}: DadosPix): string {
  const chaveLimpa = chave.trim();
  if (!chaveLimpa) throw new Error("A ONG não cadastrou uma chave Pix.");

  const merchantAccount = campo("00", "BR.GOV.BCB.PIX") + campo("01", chaveLimpa);

  const referencia = normalizar(identificador || "", 25).replace(/[^A-Z0-9]/g, "") || "***";

  let payload =
    campo("00", "01") + // formato do payload
    campo("26", merchantAccount) +
    campo("52", "0000") + // categoria do comerciante: não informada
    campo("53", "986") + // moeda: BRL
    (valor && valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", normalizar(nomeRecebedor, 25) || "RECEBEDOR") +
    campo("60", normalizar(cidade, 15) || "BRASIL") +
    campo("62", campo("05", referencia));

  // O campo 63 entra no cálculo já com seu próprio cabeçalho "6304".
  payload += "6304";
  return payload + crc16(payload);
}

/**
 * Valida uma chave Pix pelos formatos aceitos pelo Banco Central. Serve para
 * avisar a ONG no cadastro, não para garantir que a chave exista de fato.
 */
export function chavePixPareceValida(chave: string): boolean {
  const v = chave.trim();
  if (!v) return false;

  const digitos = v.replace(/\D/g, "");
  const ehCpf = digitos.length === 11 && /^\d+$/.test(v.replace(/[.\-]/g, ""));
  const ehCnpj = digitos.length === 14 && /^\d+$/.test(v.replace(/[./\-]/g, ""));
  const ehTelefone = /^\+55\d{10,11}$/.test(v) || digitos.length === 13;
  const ehEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v);
  const ehAleatoria = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  return ehCpf || ehCnpj || ehTelefone || ehEmail || ehAleatoria;
}
