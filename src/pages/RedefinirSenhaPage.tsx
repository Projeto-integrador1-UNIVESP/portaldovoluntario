import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { redefinirSenhaSchema, regrasDeSenha, type RedefinirSenhaInput } from "@/lib/schemas/auth";
import { toast } from "sonner";

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
    // O link do e-mail abre a página já com uma sessão de recuperação. Sem ela
    // não há o que redefinir — normalmente o link expirou ou já foi usado.
    supabase.auth.getSession().then(({ data }) => {
      setTemSessaoDeRecuperacao(Boolean(data.session));
    });
  }, []);

  const salvar = async ({ password }: RedefinirSenhaInput) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Não foi possível alterar a senha. Peça um novo link e tente de novo.");
      return;
    }
    toast.success("Senha alterada. Você já pode entrar.");
    navigate("/login", { replace: true });
  };

  return (
    <PublicShell>
      <Seo title="Criar nova senha" noIndex />
      <div className="container flex min-h-[70vh] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Criar nova senha</CardTitle>
            <CardDescription>
              Escolha uma senha que você não use em outros sites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {temSessaoDeRecuperacao === false ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Este link expirou ou já foi usado. Peça um novo para continuar.
                </p>
                <Button asChild className="w-full">
                  <Link to="/esqueci-senha">Pedir um novo link</Link>
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(salvar)} noValidate className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={mostrarSenha ? "text" : "password"}
                              autoComplete="new-password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setMostrarSenha((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <ul className="space-y-1" aria-label="Requisitos da senha">
                    {regrasDeSenha.map((regra) => {
                      const ok = regra.testa(senhaDigitada || "");
                      return (
                        <li key={regra.id} className="flex items-center gap-2 text-xs">
                          {ok ? (
                            <Check className="h-3 w-3 text-success" aria-hidden="true" />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          )}
                          <span className={ok ? "text-success" : "text-muted-foreground"}>
                            {regra.texto}
                          </span>
                          <span className="sr-only">{ok ? "requisito atendido" : "requisito pendente"}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <FormField
                    control={form.control}
                    name="confirmacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repita a nova senha</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Salvando…" : "Salvar nova senha"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}
