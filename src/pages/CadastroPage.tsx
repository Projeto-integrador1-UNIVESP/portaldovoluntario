import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Eye, EyeOff, Check, X, HandHeart, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const passwordRules = [
  { label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { label: "Contém letra", test: (v: string) => /[a-zA-Z]/.test(v) },
  { label: "Contém número", test: (v: string) => /\d/.test(v) },
  { label: "Contém caractere especial", test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
];

export default function CadastroPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"doador" | "interessado" | "ong" | null>(null);
  const [form, setForm] = useState({
    nome: "", email: "", senha: "", telefone: "",
    data_nascimento: "", cidade: "", estado: "", cep: "", logradouro: "",
    nome_ong: "", codigo_ong: "",
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const ruleResults = useMemo(() => passwordRules.map(r => ({
    ...r,
    pass: r.test(form.senha),
  })), [form.senha]);

  const allRulesPass = ruleResults.every(r => r.pass);
  const senhaStarted = form.senha.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPass) {
      toast.error("A senha não atende todos os requisitos.");
      return;
    }
    setLoading(true);

    // ONG flow: requires access code, handled by edge function
    if (accountType === "ong") {
      if (!form.codigo_ong.trim() || !form.nome_ong.trim()) {
        toast.error("Informe o código e o nome da ONG.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("ong-signup", {
        body: {
          email: form.email,
          password: form.senha,
          nome: form.nome,
          code: form.codigo_ong.trim().toUpperCase(),
          nome_ong: form.nome_ong,
          telefone: form.telefone,
          cidade: form.cidade,
          estado: form.estado,
        },
      });
      if (error || (data as any)?.error) {
        toast.error("Erro no cadastro: " + (((data as any)?.error) || error?.message));
        setLoading(false);
        return;
      }
      toast.success("ONG cadastrada! Faça login para continuar.");
      setLoading(false);
      navigate("/login");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: { nome: form.nome, contato_ong: accountType === "interessado" },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error("Erro no cadastro: " + error.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        telefone: form.telefone,
        data_nascimento: form.data_nascimento || null,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep,
        logradouro: form.logradouro,
      }).eq("user_id", user.id);
    }

    toast.success("Cadastro realizado com sucesso!");
    setLoading(false);
    navigate("/");
  };

  const typeOptions = [
    {
      key: "doador" as const,
      icon: HandHeart,
      title: "Sou doador",
      desc: "Quero contribuir financeiramente com projetos sociais.",
    },
    {
      key: "interessado" as const,
      icon: Search,
      title: "Quero acompanhar projetos",
      desc: "Desejo conhecer e ser voluntário em ações de ONGs.",
    },
    {
      key: "ong" as const,
      icon: Building2,
      title: "Sou uma ONG",
      desc: "Cadastro institucional. Requer código de acesso fornecido pelo administrador.",
    },
  ];

  if (!accountType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent p-4">
        <Card className="w-full max-w-2xl animate-fade-in">
          <CardHeader className="text-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </Link>
            <CardTitle className="text-2xl">Como você quer participar?</CardTitle>
            <CardDescription>Escolha o tipo de conta que melhor representa você.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {typeOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAccountType(opt.key)}
                className={cn(
                  "text-left rounded-lg border-2 border-border p-5 transition-all",
                  "hover:border-primary hover:shadow-md hover:-translate-y-0.5",
                )}
              >
                <opt.icon className="h-8 w-8 text-primary mb-3" />
                <div className="font-semibold mb-1">{opt.title}</div>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:underline">Entrar</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent p-4">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </Link>
          <CardTitle className="text-2xl">
            {accountType === "ong" ? "Cadastro de ONG" : accountType === "doador" ? "Cadastro de doador" : "Cadastro de voluntário"}
          </CardTitle>
          <CardDescription>
            <button type="button" onClick={() => setAccountType(null)} className="text-primary hover:underline">
              ← Trocar tipo de conta
            </button>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {accountType === "ong" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome da ONG *</Label>
                  <Input required value={form.nome_ong} onChange={(e) => update("nome_ong", e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Código de acesso *</Label>
                  <Input
                    required
                    placeholder="ONG-XXXX-XXXX"
                    value={form.codigo_ong}
                    onChange={(e) => update("codigo_ong", e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Código fornecido pelo administrador da plataforma.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{accountType === "ong" ? "Nome do responsável *" : "Nome completo *"}</Label>
                <Input required value={form.nome} onChange={(e) => update("nome", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.senha}
                    onChange={(e) => update("senha", e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {senhaStarted && (
                  <ul className="mt-2 space-y-1">
                    {ruleResults.map((r) => (
                      <li key={r.label} className="flex items-center gap-2 text-xs">
                        {r.pass
                          ? <Check className="h-3.5 w-3.5 text-green-600" />
                          : <X className="h-3.5 w-3.5 text-destructive" />}
                        <span className={r.pass ? "text-green-600" : "text-destructive"}>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => update("data_nascimento", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => update("cidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={form.estado} onChange={(e) => update("estado", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => update("cep", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Logradouro</Label>
                <Input value={form.logradouro} onChange={(e) => update("logradouro", e.target.value)} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading || !allRulesPass}>
              {loading ? "Cadastrando..." : "Criar conta"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:underline">Entrar</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
