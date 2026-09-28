import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { BadgeCheck, Building2, CalendarDays, MapPin, Package, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { NeedItem } from "@/components/common/NeedItem";
import { ShareButton } from "@/components/common/ShareButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useProjeto } from "@/hooks/queries/useProjeto";
import { formatDate, formatPrazo } from "@/lib/format";

/**
 * Página do projeto. Antes mostrava só título, datas e contagem de voluntários,
 * com "Sem descrição disponível" — não informava nem convencia. Agora a lista
 * de necessidades vem antes de qualquer texto institucional.
 */
export default function ProjetoPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: projeto, isPending, isError } = useProjeto(slug);
  const [inscrevendo, setInscrevendo] = useState(false);

  const participar = async () => {
    if (!user) {
      navigate(`/login?redirect=/projetos/${slug}`);
      return;
    }
    if (role === "ong" || role === "admin") {
      toast.error("Contas de ONG ou administrador não podem se voluntariar.");
      return;
    }
    setInscrevendo(true);
    const { error } = await supabase
      .from("voluntariado")
      .insert({ id_projeto: projeto!.id, id_usuario: user.id });
    setInscrevendo(false);

    if (error) {
      toast.error("Não foi possível registrar sua inscrição. Tente novamente.");
      return;
    }
    toast.success("Inscrição enviada! A ONG vai avaliar e responder.");
  };

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (isError || !projeto) {
    return (
      <PublicShell>
        <Seo title="Projeto não encontrado" noIndex />
        <div className="container py-16">
          <EmptyState
            title="Projeto não encontrado"
            description="Ele pode ter sido removido pela ONG ou o link está incorreto."
            action={{ label: "Ver todos os projetos", to: "/projetos" }}
          />
        </div>
      </PublicShell>
    );
  }

  const capa = projeto.capa_url || projeto.img_url;
  const prazo = formatPrazo(projeto.data_fim);
  const linkDoar = `/doar/projeto/${projeto.slug ?? projeto.id}`;
  const verificada = Boolean(projeto.ong?.verificada_em);

  return (
    <PublicShell>
      <Seo
        title={projeto.nome_projeto}
        description={projeto.descricao ?? `Projeto de ${projeto.ong?.nome ?? "uma ONG parceira"}.`}
        image={capa ?? undefined}
      />

      {/* pb-24 no mobile reserva o espaço da barra fixa de doar */}
      <div className="container max-w-4xl py-6 pb-24 md:pb-6">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Início</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/projetos">Projetos</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{projeto.nome_projeto}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {capa && (
          <img
            src={capa}
            alt={`Foto do projeto ${projeto.nome_projeto}`}
            className="mb-6 h-56 w-full rounded-lg object-cover md:h-72"
            width={896}
            height={288}
            decoding="async"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {projeto.causa && <Badge variant="secondary">{projeto.causa}</Badge>}
          {prazo && <Badge variant="outline">{prazo}</Badge>}
        </div>

        <h1 className="mt-3 text-3xl font-bold">{projeto.nome_projeto}</h1>

        {projeto.ong && (
          <Link
            to={`/ongs/${projeto.ong.slug ?? projeto.ong.id}`}
            className="mt-2 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {projeto.ong.nome}
            {verificada && (
              <BadgeCheck className="h-4 w-4 text-success" aria-label="ONG verificada" />
            )}
          </Link>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {(projeto.cidade || projeto.ong?.cidade) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {projeto.cidade || `${projeto.ong?.cidade}, ${projeto.ong?.estado}`}
            </span>
          )}
          {projeto.data_inicio && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatDate(projeto.data_inicio)}
              {projeto.data_fim ? ` até ${formatDate(projeto.data_fim)}` : ""}
            </span>
          )}
        </div>

        {/* A necessidade vem primeiro: é a pergunta que o doador tem. */}
        <section className="mt-8" aria-labelledby="titulo-necessidades">
          <h2 id="titulo-necessidades" className="text-xl font-bold">
            Do que este projeto precisa
          </h2>

          {projeto.necessidades.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={Package}
                title="A ONG ainda não publicou necessidades"
                description="Você pode contribuir com uma doação em dinheiro para o projeto."
                action={{ label: "Doar para o projeto", to: linkDoar }}
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {projeto.necessidades.map((n) => (
                <NeedItem
                  key={n.id}
                  necessidade={n}
                  linkDoar={`${linkDoar}?necessidade=${n.id}`}
                />
              ))}
            </ul>
          )}
        </section>

        {projeto.descricao && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Sobre o projeto</h2>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">{projeto.descricao}</p>
          </section>
        )}

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" aria-hidden="true" />
                Quer ajudar com o seu tempo?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Inscreva-se como voluntário e a organização entra em contato.
              </p>
              <Button className="mt-4" onClick={participar} disabled={inscrevendo}>
                {inscrevendo ? "Enviando…" : "Quero ser voluntário"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">Compartilhe</h2>
          <ShareButton titulo={projeto.nome_projeto} />
        </section>

        <div className="mt-8 hidden md:block">
          <Button size="lg" variant="cta" asChild className="w-full sm:w-auto">
            <Link to={linkDoar}>Doar para este projeto</Link>
          </Button>
        </div>
      </div>

      {/* No celular o CTA fica sempre alcançável, sem depender de rolar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 md:hidden">
        <Button size="lg" variant="cta" asChild className="w-full">
          <Link to={linkDoar}>Doar para este projeto</Link>
        </Button>
      </div>

      <Footer />
    </PublicShell>
  );
}
