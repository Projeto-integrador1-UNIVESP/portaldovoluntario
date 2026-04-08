import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, ArrowRight, Building2, HandHeart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<any[]>([]);
  const [ongs, setOngs] = useState<any[]>([]);
  const [stats, setStats] = useState({ projetos: 0, ongs: 0, voluntarios: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, ongRes, volRes] = await Promise.all([
        supabase.from("projetos").select("*, ongs(nome)").eq("status", true).limit(6),
        supabase.from("ongs").select("*").eq("status", true).limit(4),
        supabase.from("voluntariado").select("id", { count: "exact", head: true }),
      ]);
      if (projRes.data) setProjetos(projRes.data);
      if (ongRes.data) setOngs(ongRes.data);
      setStats({
        projetos: projRes.data?.length || 0,
        ongs: ongRes.data?.length || 0,
        voluntarios: volRes.count || 0,
      });
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="relative py-20 md:py-28 bg-gradient-to-br from-primary/10 via-background to-accent">
        <div className="container text-center">
          <Badge variant="secondary" className="mb-4">
            <Heart className="h-3 w-3 mr-1" /> Plataforma de Solidariedade
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Conectando quem quer ajudar<br />com quem precisa
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Doe, seja voluntário e transforme vidas. Encontre projetos sociais e ONGs comprometidas com a mudança.
          </p>
          <div className="flex items-center justify-center gap-4">
            {!user && (
              <Button size="lg" asChild>
                <Link to="/cadastro">Começar agora</Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link to="/ongs">Ver ONGs</Link>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.ongs}</p>
              <p className="text-sm text-muted-foreground">ONGs ativas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.projetos}</p>
              <p className="text-sm text-muted-foreground">Projetos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.voluntarios}</p>
              <p className="text-sm text-muted-foreground">Voluntários</p>
            </div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Projetos em destaque</h2>
              <p className="text-muted-foreground">Encontre um projeto e faça a diferença</p>
            </div>
          </div>

          {projetos.length === 0 ? (
            <Card className="p-12 text-center">
              <HandHeart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum projeto disponível no momento.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos.map((p) => (
                <Card key={p.id} className="animate-fade-in hover:shadow-md transition-shadow">
                  {p.img_url && (
                    <div className="h-40 bg-muted rounded-t-lg overflow-hidden">
                      <img src={p.img_url} alt={p.nome_projeto} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{p.nome_projeto}</CardTitle>
                    <p className="text-sm text-muted-foreground">{(p as any).ongs?.nome}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao || "Sem descrição"}</p>
                    {p.data_inicio && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(p.data_inicio).toLocaleDateString("pt-BR")}
                        {p.data_fim && ` - ${new Date(p.data_fim).toLocaleDateString("pt-BR")}`}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button size="sm" asChild className="flex-1">
                      <Link to={`/projeto/${p.id}`}>
                        <Users className="h-4 w-4 mr-1" /> Participar
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <Link to={`/doar/${p.id_ong}`}>
                        <Heart className="h-4 w-4 mr-1" /> Doar
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ONGs */}
      {ongs.length > 0 && (
        <section className="py-16 bg-muted/50">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-8">ONGs parceiras</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ongs.map((o) => (
                <Card key={o.id} className="animate-fade-in hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{o.nome}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{o.descricao || "Organização parceira"}</p>
                    {o.cidade && (
                      <p className="text-xs text-muted-foreground mt-2">{o.cidade}, {o.estado}</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link to={`/doar/${o.id}`}>
                        Doar <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Portal de Voluntariado e Doações Solidárias
          </p>
        </div>
      </footer>
    </div>
  );
}
