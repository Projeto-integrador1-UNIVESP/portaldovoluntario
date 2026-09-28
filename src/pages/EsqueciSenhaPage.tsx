import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { esqueciSenhaSchema, type EsqueciSenhaInput } from "@/lib/schemas/auth";
import { toast } from "sonner";

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);

  const form = useForm<EsqueciSenhaInput>({
    resolver: zodResolver(esqueciSenhaSchema),
    defaultValues: { email: "" },
  });

  const enviar = async ({ email }: EsqueciSenhaInput) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      toast.error("Não foi possível enviar o e-mail. Tente novamente em instantes.");
      return;
    }

    // Confirmamos o envio sem revelar se o e-mail existe na base: dizer
    // "e-mail não cadastrado" permitiria descobrir quem tem conta aqui.
    setEnviado(true);
  };

  return (
    <PublicShell>
      <Seo title="Esqueci minha senha" noIndex />
      <div className="container flex min-h-[70vh] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          {enviado ? (
            <>
              <CardHeader>
                <MailCheck className="h-10 w-10 text-success" aria-hidden="true" />
                <CardTitle className="mt-2">Verifique seu e-mail</CardTitle>
                <CardDescription>
                  Se houver uma conta com esse endereço, enviamos um link para criar uma
                  nova senha. O link vale por uma hora.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login">Voltar para o login</Link>
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Esqueci minha senha</CardTitle>
                <CardDescription>
                  Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(enviar)} noValidate className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              placeholder="voce@exemplo.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Enviando…" : "Enviar link de recuperação"}
                    </Button>
                    <Button variant="ghost" asChild className="w-full">
                      <Link to="/login">Voltar para o login</Link>
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
