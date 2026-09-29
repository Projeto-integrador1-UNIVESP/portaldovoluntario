import { z } from "zod";
import { MENSAGENS } from "@/lib/copy";

export const emailSchema = z
  .string()
  .trim()
  .min(1, MENSAGENS.obrigatorio("seu e-mail"))
  .email("E-mail inválido");

/**
 * Regras de senha exibidas como checklist no cadastro. Ficam aqui para que a
 * validação e o checklist da tela não possam divergir.
 */
export const regrasDeSenha = [
  { id: "tamanho", texto: "Pelo menos 8 caracteres", testa: (s: string) => s.length >= 8 },
  { id: "maiuscula", texto: "Uma letra maiúscula", testa: (s: string) => /[A-Z]/.test(s) },
  { id: "minuscula", texto: "Uma letra minúscula", testa: (s: string) => /[a-z]/.test(s) },
  { id: "numero", texto: "Um número", testa: (s: string) => /\d/.test(s) },
] as const;

export const senhaSchema = z
  .string()
  .min(1, MENSAGENS.obrigatorio("uma senha"))
  .superRefine((valor, ctx) => {
    for (const regra of regrasDeSenha) {
      if (!regra.testa(valor)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `A senha precisa ter: ${regra.texto.toLowerCase()}` });
      }
    }
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, MENSAGENS.obrigatorio("sua senha")),
});

export const esqueciSenhaSchema = z.object({
  email: emailSchema,
});

export const redefinirSenhaSchema = z
  .object({
    password: senhaSchema,
    confirmacao: z.string().min(1, "Repita a nova senha"),
  })
  .refine((dados) => dados.password === dados.confirmacao, {
    path: ["confirmacao"],
    message: "As duas senhas precisam ser iguais",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type EsqueciSenhaInput = z.infer<typeof esqueciSenhaSchema>;
export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;
