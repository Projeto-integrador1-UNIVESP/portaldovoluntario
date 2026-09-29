import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CascaDeAuth } from "@/components/auth/CascaDeAuth";
import { Callout } from "@/components/common/Callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { esqueciSenhaSchema, type EsqueciSenhaInput } from "@/lib/schemas/auth";
import { mensagemAmigavel } from "@/lib/erros";
import { CTA } from "@/lib/copy";

export default function EsqueciSenhaPage() {
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);

  const form = useForm<EsqueciSenhaInput>({
    resolver: zodResolver(esqueciSenhaSchema),
    defaultValues: { email: "" },
  });

  const enviar = async ({ email }: EsqueciSenhaInput) => {
    const endereco = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(endereco, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      form.setError("root", {
        message: mensagemAmigavel(error.message, "Não foi possível enviar o e-mail agora. Tente de novo em instantes."),
      });
      return;
    }

    // Confirmamos o envio sem revelar se o e-mail existe na base: dizer
    // "e-mail não cadastrado" permitiria descobrir quem tem conta aqui.
    setEnviadoPara(endereco);
  };

  if (enviadoPara) {
    return (
      <CascaDeAuth
        tituloDaPagina="Veja seu e-mail"
        eyebrow="Recuperar acesso"
        titulo="Veja seu e-mail"
        descricao={
          <>
            Se existir uma conta com <strong className="text-foreground">{enviadoPara}</strong>, o
            link para criar a nova senha já saiu. Ele vale por uma hora.
          </>
        }
      >
        <div className="space-y-4">
          <Callout tom="info">
            Não chegou? Olhe a pasta de spam. Se ainda assim não aparecer, confira se digitou o
            e-mail certo e peça de novo.
          </Callout>
          <Button variant="outline" className="w-full" onClick={() => setEnviadoPara(null)}>
            Pedir de novo com outro e-mail
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link to="/login">Voltar para o login</Link>
          </Button>
        </div>
      </CascaDeAuth>
    );
  }

  const enviando = form.formState.isSubmitting;

  return (
    <CascaDeAuth
      tituloDaPagina="Esqueci minha senha"
      eyebrow="Recuperar acesso"
      titulo="Esqueci minha senha"
      descricao="Informe o e-mail da sua conta. Enviamos um link para você criar uma nova senha."
      rodape={
        <>
          Lembrou?{" "}
          <Link to="/login" className="link-vivo font-medium text-primary">
            Voltar para o login
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(enviar)} noValidate className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
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
              {enviando ? CTA.enviando : "Enviar o link por e-mail"}
            </Button>
            {form.formState.errors.root?.message && (
              <p role="alert" className="rounded-controle bg-tinta-pessego px-4 py-3 text-sm text-foreground">
                {form.formState.errors.root.message}
              </p>
            )}
          </div>
        </form>
      </Form>
    </CascaDeAuth>
  );
}
