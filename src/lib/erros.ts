/**
 * Erros que chegam à tela.
 *
 * O contrato proíbe mostrar texto técnico do Supabase (inglês, nome de
 * constraint). Esta função traduz os casos conhecidos e cai no texto padrão
 * da tela para o resto. Mensagens escritas para o usuário passam intactas
 * quando vêm num `ErroAmigavel`: antes, um `throw new Error("Informe o
 * nome")` no admin virava "Não foi possível salvar" no caminho.
 */

export class ErroAmigavel extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroAmigavel";
  }
}

/** Erro de validação de formulário. Mesmo tratamento do `ErroAmigavel`. */
export class ErroDeValidacao extends ErroAmigavel {
  constructor(mensagem: string, public campo?: string) {
    super(mensagem);
    this.name = "ErroDeValidacao";
  }
}

/** Aceita `Error`, texto e o objeto `{ message }` que o PostgREST devolve. */
const textoDoErro = (erro: unknown) => {
  if (erro instanceof Error) return erro.message.toLowerCase();
  if (typeof erro === "string") return erro.toLowerCase();
  if (erro && typeof erro === "object" && typeof (erro as { message?: unknown }).message === "string") {
    return (erro as { message: string }).message.toLowerCase();
  }
  return "";
};

export function mensagemAmigavel(erro: unknown, padrao: string): string {
  if (erro instanceof ErroAmigavel) return erro.message;

  const texto = textoDoErro(erro);

  if (texto.includes("foreign key") || texto.includes("violates foreign key")) {
    return "Há registros ligados a este item. Remova ou transfira esses registros antes de excluir.";
  }
  if (texto.includes("duplicate key") || texto.includes("already exists") || texto.includes("unique")) {
    return "Já existe um registro com esses dados.";
  }
  if (texto.includes("already registered") || texto.includes("user already")) {
    return "Já existe uma conta com esse e-mail.";
  }
  if (texto.includes("invalid login") || texto.includes("invalid credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (texto.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Procure a mensagem que enviamos.";
  }
  if (texto.includes("row-level security") || texto.includes("permission") || texto.includes("not authorized")) {
    return "Sua conta não tem permissão para esta operação.";
  }
  if (texto.includes("failed to fetch") || texto.includes("networkerror") || texto.includes("load failed")) {
    return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  }
  if (texto.includes("jwt") || texto.includes("expired") || texto.includes("session")) {
    return "Sua sessão expirou. Entre de novo para continuar.";
  }
  return padrao;
}
