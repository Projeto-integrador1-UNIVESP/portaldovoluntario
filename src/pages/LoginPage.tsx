import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CascaDeAuth } from "@/components/auth/CascaDeAuth";
import { BotaoMostrarSenha } from "@/components/auth/CampoDeSenha";
import { Callout } from "@/components/common/Callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { mensagemAmigavel } from "@/lib/erros";

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

const CREDENCIAL_ERRADA = /invalid login|invalid credentials/i;

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

  // Credencial errada marca os dois campos. Assim que a pessoa mexe em
  // qualquer um, os avisos do servidor saem dos dois: ficar "Confira a senha"
  // depois de corrigir só o e-mail diria que a senha continua errada.
  useEffect(() => {
    const assinatura = form.watch((_, { type }) => {
      if (type !== "change") return;
      const { errors } = form.formState;
      if (errors.root || errors.email?.type === "server" || errors.password?.type === "server") {
        form.clearErrors("root");
        form.clearErrors(["email", "password"]);
      }
    });
    return () => assinatura.unsubscribe();
  }, [form]);

  const entrar = async ({ email, password }: LoginInput) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      // O erro fica na tela, embaixo do botão, e não num toast que some.
      // Credencial errada marca os dois campos: não dá para saber qual falhou.
      const credencialErrada = CREDENCIAL_ERRADA.test(error.message);
      const mensagem = mensagemAmigavel(error.message, "Não foi possível entrar agora. Tente de novo em instantes.");
      form.setError("root", {
        message: credencialErrada ? `${mensagem} Confira os dados ou peça uma senha nova.` : mensagem,
      });
      if (credencialErrada) {
        form.setError("email", { type: "server", message: "Confira o e-mail" });
        form.setError("password", { type: "server", message: "Confira a senha" });
      }
      return;
    }

    toast.success("Tudo certo, bom te ver de volta.");

    if (destino) {
      navigate(destino);
      return;
    }

    // Sem destino explícito, cada papel cai no painel que usa.
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
  const erroGeral = form.formState.errors.root?.message;

  return (
    <CascaDeAuth
      tituloDaPagina="Entrar"
      eyebrow="Sua conta"
      titulo="Entrar"
      descricao="Use o e-mail e a senha que você cadastrou."
    >
      {motivo && (
        <Callout tom="info" titulo="Por que precisamos que você entre" className="mb-6">
          {motivo}
        </Callout>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(entrar)} noValidate className="space-y-5">
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
                    inputMode="email"
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
                <div className="flex items-baseline justify-between gap-3">
                  <FormLabel>Senha</FormLabel>
                  <Link
                    to="/esqueci-senha"
                    className="link-vivo text-sm text-primary"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={mostrarSenha ? "text" : "password"}
                      autoComplete="current-password"
                      className="pr-11"
                      {...field}
                    />
                  </FormControl>
                  <BotaoMostrarSenha
                    visivel={mostrarSenha}
                    aoAlternar={() => setMostrarSenha((v) => !v)}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 pt-1">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {enviando ? "Entrando…" : "Entrar"}
            </Button>

            {erroGeral && (
              <p role="alert" className="rounded-controle bg-tinta-pessego px-4 py-3 text-sm text-foreground">
                {erroGeral}
              </p>
            )}
          </div>
        </form>
      </Form>

      <div className="mt-8 border-t pt-6">
        <p className="text-sm text-muted-foreground">Primeira vez aqui? Escolha por onde você entra:</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            asChild
            className="h-auto min-h-14 whitespace-normal py-3 text-center">
            <Link to="/cadastro?tipo=doador">Quero doar ou ser voluntário</Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-auto min-h-14 whitespace-normal py-3 text-center">
            <Link to="/cadastro?tipo=ong">Sou ONG e tenho uma chave</Link>
          </Button>
        </div>
      </div>
    </CascaDeAuth>
  );
}
