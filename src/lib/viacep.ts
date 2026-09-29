import { onlyDigits } from "@/lib/validators";

export type EnderecoViaCep = {
  cidade: string;
  estado: string;
  logradouro: string;
};

/** Depois disso o campo volta a ser preenchível à mão, sem "Buscando…" preso. */
const TEMPO_LIMITE_MS = 6000;

/**
 * Consulta o ViaCEP e devolve o endereço, ou `null` quando o CEP não existe,
 * o serviço está fora do ar ou demora demais. Nesse caso o formulário segue
 * preenchível à mão.
 */
export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digitos = onlyDigits(cep, 8);
  if (digitos.length !== 8) return null;

  // `AbortController` + timer em vez de `AbortSignal.timeout`: o jsdom dos
  // testes e o Safari antigo não têm o segundo.
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal: controle.signal });
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    if (dados.erro) return null;

    return {
      cidade: dados.localidade ?? "",
      estado: dados.uf ?? "",
      logradouro: dados.logradouro ?? "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
