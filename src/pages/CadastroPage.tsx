import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";

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
  const [form, setForm] = useState({
    nome: "", email: "", senha: "", telefone: "",
    data_nascimento: "", cidade: "", estado: "", cep: "", logradouro: "",
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
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: { nome: form.nome },
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent p-4">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </Link>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>Cadastre-se para doar e ser voluntário</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome completo *</Label>
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
