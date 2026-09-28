import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck, Building2, CalendarDays, Globe, Instagram, MapPin, Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ProjectCard, type ProjetoCardData } from "@/components/common/ProjectCard";
import { ShareButton } from "@/components/common/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatCnpj, formatPhone } from "@/lib/format";
import { normalizeUrl } from "@/lib/validators";

const ehUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function buscarOng(identificador: string) {
  const { data: ong, error } = await supabase
    .from("ongs")
    .select(
      "id, slug, nome, cnpj, descricao, missao, cidade, estado, logradouro, telefone, site, instagram, img_url, img_capa, logo_url, capa_url, causas, verificada_em, fundada_em, area_atuacao, endereco_entrega, horarios_recebimento",
    )
    .eq(ehUuid(identificador) ? "id" : "slug", identificador)
    .eq("status", true)
    .maybeSingle();

  if (error) throw error;
  if (!ong) return null;

  const { data: projetos } = await supabase
    .from("projetos")
    .select("id, slug, nome_projeto, descricao, img_url, capa_url, data_fim, cidade")
    .eq("id_ong", ong.id)
    .eq("status", true)
    .order("created_at", { ascending: false });

  return { ong, projetos: projetos ?? [] };
}

/** Perfil público da ONG (F3). Antes o card na listagem não abria nada. */
export default function OngPage() {
  const { slug } = useParams();

  const { data, isPending, isError } = useQuery({
    queryKey: ["ong", slug],
    queryFn: () => buscarOng(slug!),
    enabled: Boolean(slug),
  });

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (isError || !data) {
    return (
      <PublicShell>
        <Seo title="ONG não encontrada" noIndex />
        <div className="container py-16">
          <EmptyState
            title="ONG não encontrada"
            description="Ela pode ter saído da plataforma ou o link está incorreto."
            action={{ label: "Ver ONGs parceiras", to: "/ongs" }}
          />
        </div>
      </PublicShell>
    );
  }

  const { ong, projetos } = data;
  const capa = ong.capa_url || ong.img_capa;
  const logo = ong.logo_url || ong.img_url;
  const verificada = Boolean(ong.verificada_em);

  return (
    <PublicShell>
      <Seo
        title={ong.nome}
        description={ong.missao || ong.descricao || `Conheça a ${ong.nome} e veja como ajudar.`}
        image={capa ?? undefined}
      />

      {capa && (
        <img
          src={capa}
          alt={`Imagem de capa da ${ong.nome}`}
          className="h-40 w-full object-cover md:h-56"
          decoding="async"
        />
      )}

      <div className="container max-w-4xl py-6">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Início</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/ongs">ONGs</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{ong.nome}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-card">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-primary" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{ong.nome}</h1>
              {verificada && (
                <Badge className="gap-1 bg-success text-success-foreground">
                  <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                  ONG verificada
                </Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {ong.cidade && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {ong.cidade}{ong.estado ? `, ${ong.estado}` : ""}
                </span>
              )}
              {ong.fundada_em && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Desde {new Date(ong.fundada_em).getFullYear()}
                </span>
              )}
            </div>

            {Array.isArray(ong.causas) && ong.causas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ong.causas.map((causa: string) => (
                  <Badge key={causa} variant="secondary">{causa}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {(ong.missao || ong.descricao) && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Missão</h2>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">
              {ong.missao || ong.descricao}
            </p>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold">Projetos</h2>
          {projetos.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="Nenhum projeto ativo no momento"
                description="Assim que esta ONG publicar um projeto, ele aparece aqui."
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {projetos.map((p) => (
                <ProjectCard
                  key={p.id}
                  projeto={{
                    ...p,
                    img_url: p.capa_url || p.img_url,
                    ongNome: null,
                    slug: p.slug,
                  } as ProjetoCardData}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bloco de confiança: é o que decide a doação. */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Transparência</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ong.cnpj ? (
                <Linha rotulo="CNPJ" valor={formatCnpj(ong.cnpj)} />
              ) : (
                <p className="text-muted-foreground">CNPJ ainda não informado.</p>
              )}
              {ong.area_atuacao && <Linha rotulo="Área de atuação" valor={ong.area_atuacao} />}
              {ong.logradouro && <Linha rotulo="Endereço" valor={ong.logradouro} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Contato</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ong.telefone && (
                <p className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {formatPhone(ong.telefone)}
                </p>
              )}
              {ong.site && (
                <p>
                  <a
                    href={normalizeUrl(ong.site)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary underline underline-offset-2"
                  >
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    Site oficial
                  </a>
                </p>
              )}
              {ong.instagram && (
                <p>
                  <a
                    href={`https://instagram.com/${ong.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary underline underline-offset-2"
                  >
                    <Instagram className="h-4 w-4" aria-hidden="true" />
                    @{ong.instagram.replace(/^@/, "")}
                  </a>
                </p>
              )}
              {ong.endereco_entrega && (
                <div className="border-t pt-3">
                  <p className="font-medium">Entrega de doações</p>
                  <p className="text-muted-foreground">{ong.endereco_entrega}</p>
                  {ong.horarios_recebimento && (
                    <p className="text-muted-foreground">{ong.horarios_recebimento}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="cta" size="lg" asChild>
            <Link to={`/doar/${ong.id}`}>Doar para esta ONG</Link>
          </Button>
          <ShareButton titulo={ong.nome} />
        </section>
      </div>
      <Footer />
    </PublicShell>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );
}
