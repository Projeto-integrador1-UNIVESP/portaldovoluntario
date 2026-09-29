import { z, type ZodErrorMap } from "zod";

/**
 * Mensagens padrão do zod em português, no tom do glossário: verbo + objeto,
 * sem ponto final, sem jargão. Cada schema pode passar a própria mensagem;
 * esta é a rede para o que ninguém escreveu. Sem ela, um `z.number()` que
 * chega vazio mostra "Required" em inglês na tela.
 */
const mapaDeErrosPtBr: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null" || issue.received === "nan") {
        return { message: "Preencha este campo" };
      }
      if (issue.expected === "number") return { message: "Digite um número" };
      if (issue.expected === "date") return { message: "Informe uma data válida" };
      return { message: "Valor inválido" };

    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        return issue.minimum === 1
          ? { message: "Preencha este campo" }
          : { message: `Use pelo menos ${issue.minimum} caracteres` };
      }
      if (issue.type === "number") {
        return issue.inclusive
          ? { message: `O valor mínimo é ${issue.minimum}` }
          : { message: `O valor precisa ser maior que ${issue.minimum}` };
      }
      if (issue.type === "array") return { message: `Escolha pelo menos ${issue.minimum}` };
      return { message: "Valor abaixo do mínimo" };

    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `No máximo ${issue.maximum} caracteres` };
      if (issue.type === "number") return { message: `O valor máximo é ${issue.maximum}` };
      if (issue.type === "array") return { message: `Escolha no máximo ${issue.maximum}` };
      return { message: "Valor acima do máximo" };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Informe um e-mail válido" };
      if (issue.validation === "url") return { message: "Cole um endereço que comece com https://" };
      return { message: "Formato inválido" };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Escolha uma das opções" };

    case z.ZodIssueCode.invalid_literal:
      return { message: "Confirme esta opção" };

    case z.ZodIssueCode.invalid_date:
      return { message: "Informe uma data válida" };

    default:
      return { message: ctx.defaultError };
  }
};

export function instalarMensagensPtBr() {
  z.setErrorMap(mapaDeErrosPtBr);
}

// Instala ao ser importado. Os schemas em `src/lib/schemas` importam este
// módulo, então o mapa vale em toda tela com formulário, e o zod não entra no
// chunk inicial de quem só olha a home.
instalarMensagensPtBr();
