import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, ArrowRight, Building2, HandHeart, Quote, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import boxesImg from "@/assets/news-donation-boxes.jpg";
import heartImg from "@/assets/news-giving-heart.jpg";
import suppliesImg from "@/assets/news-supplies.jpg";

const newsSlides = [
  {
    img: boxesImg,
    tag: "Doações",
    title: "Doações que transformam",
    text: "Itens essenciais como alimentos, roupas e cobertores chegam a milhares de famílias todos os meses por meio das ONGs parceiras.",
  },
  {
    img: heartImg,
    tag: "Doações",
    title: "Cada doação importa",
    text: "Pequenos gestos de solidariedade somados constroem grandes mudanças. Doe, voluntarie-se, multiplique impacto.",
  },
  {
    img: suppliesImg,
    tag: "Solidariedade",
    title: "Suprimentos para quem precisa",
    text: "Cada caixa preparada representa esperança e dignidade para quem enfrenta momentos difíceis.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<any[]>([]);
  const [ongs, setOngs] = useState<any[]>([]);
  const [stats, setStats] = useState({ projetos: 0, ongs: 0, voluntarios: 0 });
  const [slide, setSlide] = useState(0);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDoarClick = (e: React.MouseEvent, ongId: string) => {
    if (!user) {
      e.preventDefault();
      navigate(`/login?redirect=/doar/${ongId}`);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % newsSlides.length), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, ongRes, statsRes] = await Promise.all([
        supabase.from("projetos").select("*").eq("status", true).limit(6),
        supabase.from("ongs").select("*").eq("status", true).limit(4),
        (supabase as any).rpc("get_public_home_stats"),
      ]);
      const ongMap = new Map((ongRes.data || []).map((o: any) => [o.id, o]));
      if (projRes.data) setProjetos(projRes.data.map((p: any) => ({ ...p, ongs: ongMap.get(p.id_ong) })));
      if (ongRes.data) setOngs(ongRes.data);
      const publicStats = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
      setStats({
        projetos: Number(publicStats?.projetos || projRes.data?.length || 0),
        ongs: Number(publicStats?.ongs || ongRes.data?.length || 0),
        voluntarios: Number(publicStats?.voluntarios || 0),
      });
    };
    fetchData();
  }, []);

  return (
    <PublicShell>
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
            <button onClick={() => scrollTo("ongs-section")} className="text-center group cursor-pointer">
              <p className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform">{stats.ongs}</p>
              <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">ONGs ativas</p>
            </button>
            <button onClick={() => scrollTo("projetos-section")} className="text-center group cursor-pointer">
              <p className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform">{stats.projetos}</p>
              <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Projetos</p>
            </button>
            <button onClick={() => scrollTo("voluntarios-section")} className="text-center group cursor-pointer">
              <p className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform">{stats.voluntarios}</p>
              <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Voluntários</p>
            </button>
          </div>
        </div>
      </section>

      {/* News Carousel */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Notícias e inspiração</h2>
            <p className="text-muted-foreground">Histórias sobre doações e o poder do voluntariado</p>
          </div>
          <div className="relative h-[360px] md:h-[420px] rounded-xl overflow-hidden shadow-md">
            {newsSlides.map((s, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-opacity duration-1000"
                style={{ opacity: i === slide ? 1 : 0, pointerEvents: i === slide ? "auto" : "none" }}
              >
                <img src={s.img} alt={s.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/50 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-12 text-background max-w-3xl">
                  <Badge variant="secondary" className="w-fit mb-3">{s.tag}</Badge>
                  <Quote className="h-8 w-8 mb-3 opacity-80" />
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">{s.title}</h3>
                  <p className="text-base md:text-lg opacity-95">{s.text}</p>
                </div>
              </div>
            ))}
            <div className="absolute bottom-5 right-6 z-20 flex gap-2">
              {newsSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === slide ? "w-8 bg-background" : "w-2 bg-background/60"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="projetos-section" className="py-16 scroll-mt-20">
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
                      <Link to={`/doar/${p.id_ong}`} onClick={(e) => handleDoarClick(e, p.id_ong)}>
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
        <section id="ongs-section" className="py-16 bg-muted/50 scroll-mt-20">
          <div className="container">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">ONGs parceiras</h2>
              <p className="text-muted-foreground">Conheça as organizações e suas histórias</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {ongs.map((o) => (
                <Card key={o.id} className="animate-fade-in hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="relative h-40 bg-gradient-to-br from-primary/30 to-accent">
                    {o.img_capa && (
                      <img src={o.img_capa} alt={`Capa ${o.nome}`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                    {o.area_atuacao && (
                      <Badge variant="secondary" className="absolute top-3 left-3">{o.area_atuacao}</Badge>
                    )}
                    <div className="absolute -bottom-6 left-4 h-14 w-14 rounded-full border-4 border-background bg-background flex items-center justify-center overflow-hidden shadow">
                      {o.img_url ? (
                        <img src={o.img_url} alt={o.nome} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-primary" />
                      )}
                    </div>
                  </div>
                  <CardHeader className="pt-8">
                    <CardTitle className="text-lg">{o.nome}</CardTitle>
                    {o.cidade && (
                      <p className="text-xs text-muted-foreground">{o.cidade}{o.estado && `, ${o.estado}`}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {o.missao && (
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Missão</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{o.missao}</p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-3">{o.descricao || "Organização parceira"}</p>
                    {(o.site || o.instagram) && (
                      <div className="flex gap-3 text-xs text-primary">
                        {o.site && <a href={o.site} target="_blank" rel="noreferrer" className="hover:underline">Site</a>}
                        {o.instagram && <a href={`https://instagram.com/${o.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="hover:underline">@{o.instagram.replace(/^@/, "")}</a>}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button size="sm" asChild className="w-full">
                      <Link to={`/doar/${o.id}`} onClick={(e) => handleDoarClick(e, o.id)}>
                        <Heart className="h-4 w-4 mr-1" /> Doar para esta ONG <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Volunteers CTA */}
      <section id="voluntarios-section" className="py-16 scroll-mt-20">
        <div className="container">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent p-10 md:p-14 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary mb-4">
              <UserCheck className="h-7 w-7" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Seja voluntário</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Já são <span className="font-semibold text-primary">{stats.voluntarios}</span> pessoas dedicando tempo às causas sociais.
              Escolha um projeto abaixo e some-se a essa rede de transformação.
            </p>
            <Button size="lg" onClick={() => scrollTo("projetos-section")}>
              <HandHeart className="h-4 w-4 mr-2" /> Ver projetos para voluntariar
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Portal de Voluntariado e Doações Solidárias
          </p>
        </div>
      </footer>
    </PublicShell>
  );
}
