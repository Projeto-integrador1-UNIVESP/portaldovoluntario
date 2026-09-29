import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CascaDeAuth } from "@/components/auth/CascaDeAuth";
import { BotaoMostrarSenha, ChecklistDeSenha } from "@/components/auth/CampoDeSenha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { redefinirSenhaSchema, type RedefinirSenhaInput } from "@/lib/schemas/auth";
import { mensagemAmigavel } from "@/lib/erros";
import { CTA } from "@/lib/copy";

/** Ocupa o lugar do formulário enquanto a sessão de recuperação é conferida. */
function EsqueletoDoFormulario() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <span className="sr-only">Conferindo o link…</span>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full rounded-controle" />
        <div className="grid gap-1.5 pt-1 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-36" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-11 w-full rounded-controle" />
      </div>
      <Skeleton className="h-12 w-full rounded-controle" />
    </div>
  );
}

export default function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [temSessaoDeRecuperacao, setTemSessaoDeRecuperacao] = useState<boolean | null>(null);

  const form = useForm<RedefinirSenhaInput>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { password: "", confirmacao: "" },
    mode: "onChange",
  });

  const senhaDigitada = form.watch("password");

  useEffect(() => {
    // O link do e-mail abre a página já com uma sessão de recuperação: o
    // client lê o hash da URL ao iniciar, e `getSession` espera por isso.
    // Sem sessão não há o que redefinir (link expirado ou já usado). O
    // formulário só aparece depois da resposta, para não piscar antes do aviso.
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setTemSessaoDeRecuperacao(Boolean(data.session));
    });
    return () => {
      ativo = false;
    };
  }, []);

  const salvar = async ({ password }: RedefinirSenhaInput) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      form.setError("root", {
        message: mensagemAmigavel(error.message, "Não foi possível alterar a senha. Peça um link novo e tente de novo."),
      });
      return;
    }
    toast.success("Senha alterada. Entre com ela agora.");
    navigate("/login", { replace: true });
  };

  if (temSessaoDeRecuperacao === false) {
    return (
      <CascaDeAuth
        tituloDaPagina="Este link expirou"
        eyebrow="Recuperar acesso"
        titulo="Este link expirou"
        descricao="Cada link vale por uma hora e serve uma vez só. Peça outro para seguir."
      >
        <div className="space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/esqueci-senha">Pedir um link novo</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">Voltar para o login</Link>
          </Button>
        </div>
      </CascaDeAuth>
    );
  }

  const enviando = form.formState.isSubmitting;

  return (
    <CascaDeAuth
      tituloDaPagina="Criar nova senha"
      eyebrow="Recuperar acesso"
      titulo="Criar nova senha"
      descricao="Use uma senha que você não repita em outros sites."
    >
      {temSessaoDeRecuperacao === null ? (
        <EsqueletoDoFormulario />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(salvar)} noValidate className="space-y-5">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={mostrarSenha ? "text" : "password"}
                        autoComplete="new-password"
                        className="pr-11"
                        {...field}
                      />
                    </FormControl>
                    <BotaoMostrarSenha
                      visivel={mostrarSenha}
                      aoAlternar={() => setMostrarSenha((v) => !v)}
                    />
                  </div>
                  <ChecklistDeSenha senha={senhaDigitada || ""} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repita a nova senha</FormLabel>
                  <FormControl>
                    <Input
                      type={mostrarSenha ? "text" : "password"}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Button type="submit" size="lg" className="w-full" disabled={enviando}>
                {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {enviando ? CTA.salvando : "Salvar nova senha"}
              </Button>
              {form.formState.errors.root?.message && (
                <p role="alert" className="rounded-controle bg-tinta-pessego px-4 py-3 text-sm text-foreground">
                  {form.formState.errors.root.message}
                </p>
              )}
            </div>
          </form>
        </Form>
      )}
    </CascaDeAuth>
  );
}
