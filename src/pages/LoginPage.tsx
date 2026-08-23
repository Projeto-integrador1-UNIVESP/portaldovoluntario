import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Eye, EyeOff, Quote, HandHeart, Building2 } from "lucide-react";
import { toast } from "sonner";
import volunteers from "@/assets/login-volunteers.jpg";
import donation from "@/assets/login-donation.jpg";
import community from "@/assets/login-community.jpg";

const slides = [
  {
    img: volunteers,
    title: "O poder do voluntariado",
    text: "Mais de 60% das ONGs brasileiras dependem do trabalho voluntário para manter seus projetos ativos. Sua hora doada transforma vidas.",
  },
  {
    img: donation,
    title: "Cada doação importa",
    text: "Pequenos gestos de solidariedade somados constroem grandes mudanças. Doe, voluntarie-se, multiplique impacto.",
  },
  {
    img: community,
    title: "Comunidades fortalecidas",
    text: "Quando nos unimos por uma causa, criamos redes de apoio que protegem quem mais precisa.",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Erro ao entrar: " + error.message);
    } else {
      toast.success("Login realizado!");
      if (redirect) { navigate(redirect); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");
      const roles = data?.map(r => r.role) || [];
      if (roles.includes("admin")) navigate("/admin");
      else if (roles.includes("ong")) navigate("/ong");
      else navigate("/");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Carrossel de notícias */}
      <div className="relative hidden lg:block overflow-hidden bg-primary">
        {slides.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === slide ? 1 : 0 }}
          >
            <img src={s.img} alt={s.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-primary/30" />
            <div className="relative z-10 flex h-full flex-col justify-end p-12 text-primary-foreground">
              <Quote className="h-10 w-10 mb-4 opacity-80" />
              <h2 className="text-3xl font-bold mb-3 leading-tight">{s.title}</h2>
              <p className="text-lg opacity-90 max-w-md">{s.text}</p>
            </div>
          </div>
        ))}
        <div className="absolute bottom-6 right-8 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === slide ? "w-8 bg-primary-foreground" : "w-2 bg-primary-foreground/50"}`}
            />
          ))}
        </div>
        <Link to="/" className="absolute top-6 left-8 z-20 flex items-center gap-2 text-primary-foreground font-bold">
          <Heart className="h-6 w-6" /> Solidariedade
        </Link>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-fade-in">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-8 text-primary font-bold">
            <Heart className="h-6 w-6" /> Solidariedade
          </Link>
          <h1 className="text-3xl font-bold mb-2">Bem-vindo de volta</h1>
          <p className="text-muted-foreground mb-8">Entre para continuar transformando vidas.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="destructive" className="w-full" disabled={loading} size="lg">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="pt-3 space-y-3">
              <p className="text-sm text-muted-foreground text-center">Não tem conta? Escolha como participar:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="h-auto min-h-24 flex-col gap-2 whitespace-normal text-center" asChild>
                  <Link to="/cadastro?tipo=doador">
                    <HandHeart className="h-5 w-5" />
                    <span>Doador e projetos</span>
                  </Link>
                </Button>
                <Button type="button" variant="outline" className="h-auto min-h-24 flex-col gap-2 whitespace-normal text-center" asChild>
                  <Link to="/cadastro?tipo=ong">
                    <Building2 className="h-5 w-5" />
                    <span>ONG com chave</span>
                  </Link>
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
