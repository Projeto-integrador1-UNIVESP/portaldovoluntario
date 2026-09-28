import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ShareButton } from "@/components/common/ShareButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";

/**
 * Comprovante da doação.
 *
 * O status em destaque é proposital: a doação nasce "aguardando confirmação",
 * e é a ONG quem a confirma. Dizer isso aqui evita que a pessoa ache que algo
 * deu errado quando o progresso do projeto não muda na hora.
 */
export default function ObrigadoPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: doacao, isPending } = useQuery({
    queryKey: ["doacao", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("doacoes")
        .select("id, valor, quantidade, status, data_doacao, doador_nome, id_projeto, id_necessidade")
        .eq("id", id!)
        .maybeSingle();
      if (!data) return null;

      const [{ data: projeto }, { data: necessidade }] = await Promise.all([
        data.id_projeto
          ? supabase.from("projetos").select("nome_projeto, slug, id").eq("id", data.id_projeto).maybeSingle()
          : Promise.resolve({ data: null }),
        data.id_necessidade
          ? supabase.from("necessidades").select("nome, unidade").eq("id", data.id_necessidade).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return { ...data, projeto, necessidade };
    },
    enabled: Boolean(id),
  });

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (!doacao) {
    return (
      <PublicShell>
        <Seo title="Doação não encontrada" noIndex />
        <div className="container py-16">
          <EmptyState
            title="Não encontramos essa doação"
            description="O link pode estar incompleto."
            action={{ label: "Ver projetos", to: "/projetos" }}
          />
        </div>
      </PublicShell>
    );
  }

  const ehItem = Boolean(doacao.id_necessidade && doacao.quantidade);
  const linkProjeto = doacao.projeto ? `/projetos/${doacao.projeto.slug ?? doacao.projeto.id}` : "/projetos";

  return (
    <PublicShell>
      <Seo title="Obrigado pela sua doação" noIndex />

      <div className="container max-w-xl py-12">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">Obrigado, {doacao.doador_nome?.split(" ")[0]}!</h1>
          <p className="mt-2 text-muted-foreground">
            Sua doação foi registrada. Guarde esta página como comprovante.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Linha rotulo="Projeto" valor={doacao.projeto?.nome_projeto ?? "—"} />
            <Linha
              rotulo={ehItem ? "Item" : "Valor"}
              valor={
                ehItem
                  ? `${Number(doacao.quantidade)} ${doacao.necessidade?.unidade ?? ""} de ${doacao.necessidade?.nome ?? ""}`.trim()
                  : formatCurrency(Number(doacao.valor))
              }
            />
            <Linha rotulo="Data" valor={formatDateTime(doacao.data_doacao)} />
            <Linha rotulo="Código" valor={doacao.id.slice(0, 8).toUpperCase()} />

            <div className="flex items-center justify-between gap-4 border-t pt-3">
              <span className="text-muted-foreground">Status</span>
              {doacao.status === "confirmada" ? (
                <Badge className="bg-success text-success-foreground">Confirmada pela ONG</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Aguardando confirmação da ONG
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {doacao.status !== "confirmada" && (
          <p className="mt-4 text-sm text-muted-foreground">
            O progresso do projeto só avança depois que a organização registra o
            recebimento — é assim que os números na plataforma continuam confiáveis.
            Você recebe um aviso por e-mail quando isso acontecer.
          </p>
        )}

        <div className="mt-8 space-y-4">
          <ShareButton titulo={`Acabei de apoiar ${doacao.projeto?.nome_projeto ?? "um projeto"}`} />

          {!user && (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Quer acompanhar esta doação?</p>
                  <p className="text-sm text-muted-foreground">
                    Criar uma conta leva três campos e você vê o status de tudo que já doou.
                  </p>
                </div>
                <Button asChild className="shrink-0">
                  <Link to="/cadastro?tipo=doador">
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Criar conta
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" asChild className="w-full">
            <Link to={linkProjeto}>Voltar ao projeto</Link>
          </Button>
        </div>
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
