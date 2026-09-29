import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, DollarSign, FolderOpen, LayoutDashboard, Package, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";

const num = (v: unknown) => Number(v ?? 0);

/**
 * Visão geral da ONG.
 *
 * O primeiro número da tela é o que depende dela: quantas doações estão
 * esperando a confirmação de recebimento. É essa confirmação que faz a barra
 * pública do projeto andar. Enquanto ela não acontece, quem doou não vê nada
 * mudar. Os totais arrecadados vêm depois, porque só contam o que foi confirmado.
 */
export default function OngDashboard() {
  const { ongId } = useAuth();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-resumo", ongId],
    queryFn: async () => {
      // A agregação vive no banco (`get_impacto_ong`), que já separa confirmado
      // de pendente e checa se quem pergunta administra a ONG. Somar no cliente
      // exigiria baixar a lista inteira de doações só para reduzir a um número.
      const [impacto, projetosRes] = await Promise.all([
        supabase.rpc("get_impacto_ong", { _ong_id: ongId! }),
        supabase.from("projetos").select("id").eq("id_ong", ongId!),
      ]);
      if (impacto.error) throw impacto.error;
      if (projetosRes.error) throw projetosRes.error;

      const ids = (projetosRes.data ?? []).map((p) => p.id);

      // Necessidade pende de projeto: sem nenhum, não há o que contar.
      let necessidadesAbertas = 0;
      if (ids.length) {
        const necessidades = await supabase
          .from("necessidades")
          .select("id", { count: "exact", head: true })
          .in("id_projeto", ids)
          .eq("status", true);
        if (necessidades.error) throw necessidades.error;
        necessidadesAbertas = necessidades.count ?? 0;
      }

      const resumo = impacto.data?.[0];

      return {
        projetos: ids.length,
        projetosAtivos: num(resumo?.projetos_ativos),
        voluntarios: num(resumo?.voluntarios_aprovados),
        necessidadesAbertas,
        aguardando: num(resumo?.doacoes_pendentes),
        valorAguardando: num(resumo?.total_pendente),
        confirmadas: num(resumo?.doacoes_confirmadas),
        valorConfirmado: num(resumo?.total_confirmado),
      };
    },
    enabled: Boolean(ongId),
    staleTime: 30_000,
  });

  return (
    <DashboardLayout type="ong">
      <Seo title="Painel da ONG" noIndex />
      <PageHeader
        title="Painel da ONG"
        description="O que está esperando você e o que já foi confirmado."
        icon={<LayoutDashboard className="h-6 w-6" aria-hidden="true" />}
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar o resumo" onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              valor={data.aguardando}
              rotulo={
                data.aguardando === 1
                  ? "doação aguardando sua confirmação"
                  : "doações aguardando sua confirmação"
              }
              icone={BadgeCheck}
              para="/ong/doacoes"
              destaque={data.aguardando > 0}
            />
            <Stat
              valor={data.confirmadas}
              rotulo={
                data.confirmadas === 1 ? "recebimento confirmado" : "recebimentos confirmados"
              }
              icone={BadgeCheck}
              para="/ong/doacoes"
            />
            <Stat
              valor={formatCurrency(data.valorConfirmado)}
              rotulo="em dinheiro já confirmado"
              icone={DollarSign}
              para="/ong/doacoes"
            />
            <Stat
              valor={data.necessidadesAbertas}
              rotulo={
                data.necessidadesAbertas === 1 ? "necessidade aberta" : "necessidades abertas"
              }
              icone={Package}
              para="/ong/necessidades"
            />
            <Stat
              valor={data.projetosAtivos}
              rotulo={data.projetosAtivos === 1 ? "projeto no ar" : "projetos no ar"}
              icone={FolderOpen}
              para="/ong/projetos"
            />
            <Stat
              valor={data.voluntarios}
              rotulo={data.voluntarios === 1 ? "voluntário aprovado" : "voluntários aprovados"}
              icone={UserCheck}
              para="/ong/voluntarios"
            />
          </div>

          {data.aguardando > 0 && (
            <Callout tom="atencao" titulo="Tem doação esperando sua confirmação" className="mt-6">
              <p>
                {data.aguardando === 1
                  ? "Uma doação foi registrada"
                  : `${data.aguardando} doações foram registradas`}
                {data.valorAguardando > 0 ? ` (${formatCurrency(data.valorAguardando)})` : ""} e o
                progresso do projeto só sobe depois que você confirma o recebimento.
              </p>
              <Button variant="outline" size="sm" className="mt-3 bg-card" asChild>
                <Link to="/ong/doacoes">Confirmar recebimentos</Link>
              </Button>
            </Callout>
          )}

          {data.projetos === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={FolderOpen}
                title="Você ainda não tem projetos"
                description="O projeto é onde você diz o que está faltando. Sem ele, ninguém consegue doar um item certo."
                action={{ label: "Criar meu primeiro projeto", to: "/ong/projetos" }}
              />
            </div>
          ) : data.necessidadesAbertas === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Package}
                title="Nenhuma necessidade publicada"
                description="Seus projetos estão cadastrados, mas nenhum diz do que precisa. É a necessidade que o doador lê primeiro."
                action={{ label: "Dizer o que está faltando", to: "/ong/necessidades" }}
              />
            </div>
          ) : null}
        </>
      )}
    </DashboardLayout>
  );
}
