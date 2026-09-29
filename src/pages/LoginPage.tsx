import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck, Building2, Eye, EyeOff, HandHeart, Landmark, Loader2, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";

/**
 * Entrar.
 *
 * A coluna ao lado do formulário já foi um carrossel de fotos com frases
 * genéricas. Saiu: era conteúdo de preenchimento que se movia sozinho, o que
 * ainda obrigava a oferecer pausa e respeitar `prefers-reduced-motion` (WCAG
 * 2.2.2) para não informar nada. No lugar ficam as garantias da plataforma,
 * que são o argumento para alguém criar conta aqui.
 */

/**
 * Um `?redirect=` só pode levar para dentro do site.
 *
 * Quem resolve isso é o parser de URL, não comparação de prefixo: o react-router
 * cai em `window.location.assign` quando o `pushState` estoura por ser
 * cross-origin, então um destino externo sai do site de verdade. E a lista de
 * grafias que viram `//evil.com` é maior do que parece: `/\evil.com` (o parser
 * trata `\` como `/`) e `/%09/evil.com` (o tab é descartado) passariam por um
 * teste de prefixo.
 */
function caminhoInterno(valor: string | null) {
  if (!valor) return null;
  try {
    const url = new URL(valor, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** Quem chega por redirect foi interrompido no meio de algo; a tela diz o quê. */
function motivoDoRedirect(destino: string | null) {
  if (!destino) return null;
  if (destino.startsWith("/doar/")) {
    return "A ONG confirma, no seu nome, que a doação chegou. É sua conta que liga uma coisa à outra, e é essa confirmação que faz a barra de progresso andar.";
  }
  // Só a página de um projeto pede inscrição; a listagem `/projetos` não.
  if (destino.startsWith("/projetos/")) {
    return "Para aceitar você como voluntário, a organização precisa saber quem vai aparecer e como falar com você.";
  }
  return "Entre para continuar de onde você parou.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const destino = caminhoInterno(params.get("redirect"));
  const motivo = motivoDoRedirect(destino);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const entrar = async ({ email, password }: LoginInput) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      toast.error('E-mail ou senha incorretos. Confira os dados ou use "Esqueci minha senha".');
      return;
    }

    toast.success("Tudo certo, bom te ver de volta.");

    if (destino) {
      navigate(destino);
      return;
    }

    // Sem destino explícito, cada papel cai no painel que usa de fato.
    const { data: papeis } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user?.id ?? "");
    const lista = papeis?.map((p) => p.role) ?? [];

    if (lista.includes("admin")) navigate("/admin");
    else if (lista.includes("ong")) navigate("/ong");
    else navigate("/");
  };

  const enviando = form.formState.isSubmitting;

  return (
    <PublicShell>
      <Seo title="Entrar" noIndex />

      <div className="container grid items-start gap-8 py-14 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
        <Card className="rounded-xl shadow-sutil">
          <CardHeader>
            <h1 className="font-display text-2xl font-bold">Entrar</h1>
            <p className="text-sm text-muted-foreground">
              Use o e-mail e a senha que você cadastrou.
            </p>
          </CardHeader>

          <CardContent>
            {motivo && (
              <Callout tom="info" titulo="Por que precisamos que você entre" className="mb-6">
                {motivo}
              </Callout>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(entrar)} noValidate className="space-y-4">
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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={mostrarSenha ? "text" : "password"}
                            autoComplete="current-password"
                            className="pr-10"
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setMostrarSenha((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {mostrarSenha ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Link
                    to="/esqueci-senha"
                    className="text-sm text-primary underline underline-offset-2"
                  >
                    Esqueci minha senha
                  </Link>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="pressionavel w-full"
                  disabled={enviando}
                >
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {enviando ? "Entrando…" : "Entrar"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 border-t pt-6">
              <p className="text-sm text-muted-foreground">
                Ainda não tem conta? Escolha por onde você entra:
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  asChild
                  className="h-auto min-h-20 flex-col gap-2 whitespace-normal py-3 text-center"
                >
                  <Link to="/cadastro?tipo=doador">
                    <HandHeart className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span>Quero doar ou ser voluntário</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto min-h-20 flex-col gap-2 whitespace-normal py-3 text-center"
                >
                  <Link to="/cadastro?tipo=ong">
                    <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span>Sou ONG e tenho uma chave</span>
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside
          className="rounded-xl border bg-secondary/50 p-6"
          aria-labelledby="titulo-garantias"
        >
          <h2 id="titulo-garantias" className="font-display text-lg font-bold">
            O que esta plataforma garante
          </h2>
          <ul className="mt-6 space-y-6">
            <Garantia
              icone={BadgeCheck}
              titulo="A barra de progresso é um recibo, não uma promessa"
              texto="Ela só sobe quando alguém da organização confirma que o item ou o valor chegou. Anda mais devagar por isso, e é por isso que ela vale como informação."
            />
            <Garantia
              icone={Landmark}
              titulo="O Pix cai direto na conta da ONG"
              texto="A plataforma não retém o dinheiro em nenhum momento e não cobra taxa de ninguém: nem de você, nem da organização."
            />
            <Garantia
              icone={ShieldCheck}
              titulo="Pedimos o mínimo de dados"
              texto="Nome, e-mail e senha. Telefone e endereço só quando forem necessários, por exemplo para agendar a coleta de uma doação."
            />
          </ul>
        </aside>
      </div>
    </PublicShell>
  );
}

function Garantia({
  icone: Icone, titulo, texto,
}: {
  icone: LucideIcon;
  titulo: string;
  texto: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold">{titulo}</p>
        <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
      </div>
    </li>
  );
}
