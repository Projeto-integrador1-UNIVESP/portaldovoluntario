import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, ArrowRight, Building2, HandHeart, Pause, Play, Quote, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import boxesImg from "@/assets/news-donation-boxes.jpg";
import heartImg from "@/assets/news-giving-heart.jpg";
import suppliesImg from "@/assets/news-supplies.jpg";
import volunteersImg from "@/assets/news-volunteers-sorting.jpg";
import handsPlantImg from "@/assets/news-hands-plant.jpg";
import childrenBooksImg from "@/assets/news-children-books.jpg";
import communityMealImg from "@/assets/news-community-meal.jpg";
import { Footer } from "@/components/layout/Footer";
import { ProjectCard } from "@/components/common/ProjectCard";
import { Seo } from "@/components/common/Seo";

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
const extraSlides = [
  {
    img: volunteersImg,
    tag: "Voluntariado",
    title: "Mãos que organizam esperança",
    text: "Voluntários classificam roupas e alimentos para que cada doação chegue ao destino certo, com cuidado e dignidade.",
  },
  {
    img: handsPlantImg,
    tag: "Comunidade",
    title: "Juntos cultivamos o futuro",
    text: "Cada mão somada à causa faz crescer projetos que transformam comunidades inteiras.",
  },
  {
    img: childrenBooksImg,
    tag: "Educação",
    title: "Educação que liberta",
    text: "Livros e materiais escolares doados abrem portas para o futuro de milhares de crianças.",
  },
  {
    img: communityMealImg,
    tag: "Alimentação",
    title: "Uma refeição, muita dignidade",
    text: "Cozinhas solidárias servem refeições quentes todos os dias para quem mais precisa.",
  },
];
newsSlides.push(...extraSlides);

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

  // Com base pequena, "1 ONG / 1 projeto" enfraquece a prova social em vez de
  // reforçar. Abaixo deste mínimo, a faixa de números simplesmente não aparece.
  const MINIMO_PARA_EXIBIR = 3;
  const temNumerosQueImpressionam =
    stats.ongs + stats.projetos + stats.voluntarios >= MINIMO_PARA_EXIBIR;

  // Conteúdo que se move sozinho por mais de 5s precisa de um jeito de parar
  // (WCAG 2.2.2). Pausa no hover, no foco pelo teclado, no botão, e para quem
  // pediu menos movimento no sistema.
  const [pausado, setPausado] = useState(false);
  const prefereMenosMovimento =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (pausado || prefereMenosMovimento) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % newsSlides.length), 5500);
    return () => clearInterval(t);
  }, [pausado, prefereMenosMovimento]);

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, ongRes, statsRes] = await Promise.all([
        supabase.from("projetos").select("*").eq("status", true).limit(6),
        supabase.from("ongs").select("*").eq("status", true).limit(4),
        supabase.rpc("get_public_home_stats"),
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
      <Seo description="Veja do que as ONGs perto de você precisam hoje e ajude com doações ou voluntariado." />
      {/* Hero */}
      <section className="relative py-20 md:py-28 bg-gradient-to-br from-primary/10 via-background to-accent">
        <div className="container text-center">
          <Badge variant="secondary" className="mb-4">
            <Heart className="h-3 w-3 mr-1" /> Plataforma de Solidariedade
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Portal do Voluntário
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

          {temNumerosQueImpressionam && (
            <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-8">
              <Contador
                valor={stats.ongs}
                rotulo={stats.ongs === 1 ? "ONG ativa" : "ONGs ativas"}
                aoClicar={() => scrollTo("ongs-section")}
              />
              <Contador
                valor={stats.projetos}
                rotulo={stats.projetos === 1 ? "Projeto" : "Projetos"}
                aoClicar={() => scrollTo("projetos-section")}
              />
              <Contador
                valor={stats.voluntarios}
                rotulo={stats.voluntarios === 1 ? "Voluntário" : "Voluntários"}
                aoClicar={() => scrollTo("voluntarios-section")}
              />
            </div>
          )}
        </div>
      </section>

      {/* News Carousel */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Notícias e inspiração</h2>
            <p className="text-muted-foreground">Histórias sobre doações e o poder do voluntariado</p>
          </div>
          <div
            className="relative h-[360px] overflow-hidden rounded-xl shadow-md md:h-[420px]"
            role="region"
            aria-roledescription="carrossel"
            aria-label="Notícias e inspiração"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onFocusCapture={() => setPausado(true)}
            onBlurCapture={() => setPausado(false)}
          >
            {newsSlides.map((s, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-opacity duration-1000"
                style={{
                  opacity: i === slide ? 1 : 0,
                  visibility: i === slide ? "visible" : "hidden",
                  pointerEvents: i === slide ? "auto" : "none",
                }}
                aria-hidden={i !== slide}
              >
                <img src={s.img} alt={s.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/95 via-foreground/75 to-foreground/30" />
                <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-12 text-background max-w-3xl">
                  <Badge variant="secondary" className="w-fit mb-3">{s.tag}</Badge>
                  <Quote className="mb-3 h-8 w-8" aria-hidden="true" />
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">{s.title}</h3>
                  <p className="text-base md:text-lg">{s.text}</p>
                </div>
              </div>
            ))}
            <div className="absolute bottom-5 right-6 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPausado((v) => !v)}
                aria-label={pausado ? "Retomar o carrossel" : "Pausar o carrossel"}
                className="mr-1 rounded-full bg-background/90 p-1.5 text-foreground"
              >
                {pausado ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              {newsSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  aria-label={`Ir para o slide ${i + 1} de ${newsSlides.length}`}
                  aria-current={i === slide}
                  className={`h-2 rounded-full transition-all ${i === slide ? "w-8 bg-background" : "w-2 bg-background/70"}`}
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projetos.map((p) => (
                <ProjectCard
                  key={p.id}
                  projeto={{
                    id: p.id,
                    slug: p.slug,
                    nome_projeto: p.nome_projeto,
                    descricao: p.descricao,
                    img_url: p.capa_url || p.img_url,
                    data_fim: p.data_fim,
                    cidade: p.cidade,
                    ongNome: (p as any).ongs?.nome ?? null,
                  }}
                />
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
                  <CardFooter className="gap-2">
                    <Button size="sm" asChild className="flex-1">
                      <Link to={`/ongs/${o.slug ?? o.id}`}>
                        Ver perfil <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="cta" asChild>
                      <Link to={`/doar/${o.id}`}>
                        <Heart className="mr-1 h-4 w-4" aria-hidden="true" /> Doar
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
              Escolha um projeto e some-se a essa rede de transformação.
            </p>
            <Button size="lg" onClick={() => scrollTo("projetos-section")}>
              <HandHeart className="h-4 w-4 mr-2" /> Ver projetos para voluntariar
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </PublicShell>
  );
}

function Contador({
  valor, rotulo, aoClicar,
}: { valor: number; rotulo: string; aoClicar: () => void }) {
  return (
    <button onClick={aoClicar} className="group cursor-pointer text-center">
      <p className="text-3xl font-bold text-primary transition-transform group-hover:scale-110">
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="text-sm text-muted-foreground transition-colors group-hover:text-primary">
        {rotulo}
      </p>
    </button>
  );
}
