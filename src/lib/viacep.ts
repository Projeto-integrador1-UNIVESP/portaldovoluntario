import { onlyDigits } from "@/lib/validators";

export type EnderecoViaCep = {
  cidade: string;
  estado: string;
  logradouro: string;
};

/**
 * Consulta o ViaCEP e devolve o endereço, ou `null` quando o CEP não existe
 * ou o serviço está fora do ar — o formulário segue preenchível à mão nesse caso.
 */
export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digitos = onlyDigits(cep, 8);
  if (digitos.length !== 8) return null;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
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
  }
}
