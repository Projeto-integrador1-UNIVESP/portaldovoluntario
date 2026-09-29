import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BadgeCheck, Building2, Calendar, DollarSign, FolderOpen, LayoutDashboard,
  UserCheck, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { Callout } from "@/components/common/Callout";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { contarLinhas as contar } from "./_shared-lib";

/** A partir daqui uma doação parada deixa de ser espera e passa a ser problema. */
const DIAS_ATE_DOACAO_TRAVAR = 7;

/**
 * Visão geral da plataforma.
 *
 * A tela antiga eram sete contadores no mesmo peso visual, incluindo um card
 * "Voluntários: Ver" que não mostrava número nenhum. Contagem não é o que o
 * administrador precisa ver primeiro: o que precisa dele são as ONGs esperando
 * verificação de CNPJ e as doações que a ONG não confirmou há dias. Enquanto
 * ninguém confirma, o progresso público do projeto não anda.
 *
 * As contagens usam `head: true`: o servidor devolve só o total, sem trafegar
 * linha. O total em dinheiro vem da RPC que já soma no banco, em vez de baixar
 * a coluna `valor` da tabela inteira como a versão anterior fazia.
 */
export default function AdminDashboard() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const corte = new Date(Date.now() - DIAS_ATE_DOACAO_TRAVAR * 86_400_000).toISOString();

      const [
        ongs, ongsSemSelo, usuarios, projetos, eventos, doacoes,
        doacoesPendentes, doacoesTravadas, voluntariosPendentes, stats,
      ] = await Promise.all([
        contar(supabase.from("ongs").select("id", { count: "exact", head: true })),
        contar(
          supabase
            .from("ongs")
            .select("id", { count: "exact", head: true })
            .eq("status", true)
            .is("verificada_em", null),
        ),
        contar(supabase.from("profiles").select("id", { count: "exact", head: true })),
        contar(supabase.from("projetos").select("id", { count: "exact", head: true })),
        contar(supabase.from("eventos").select("id", { count: "exact", head: true })),
        contar(supabase.from("doacoes").select("id", { count: "exact", head: true })),
        contar(
          supabase
            .from("doacoes")
            .select("id", { count: "exact", head: true })
            .eq("status", "pendente"),
        ),
        contar(
          supabase
            .from("doacoes")
            .select("id", { count: "exact", head: true })
            .eq("status", "pendente")
            .lt("data_doacao", corte),
        ),
        contar(
          supabase
            .from("voluntariado")
            .select("id", { count: "exact", head: true })
            .eq("status", "pendente"),
        ),
        supabase.rpc("get_public_home_stats"),
      ]);

      // Sem isto, uma RPC que falha mostraria "R$ 0,00". E zero arrecadado é
      // uma afirmação, não um erro de carregamento.
      if (stats.error) throw new Error(stats.error.message);

      return {
        ongs,
        ongsSemSelo,
        usuarios,
        projetos,
        eventos,
        doacoes,
        doacoesPendentes,
        doacoesTravadas,
        voluntariosPendentes,
        totalConfirmado: Number(stats.data?.[0]?.valor_arrecadado ?? 0),
      };
    },
    staleTime: 60_000,
  });

  return (
    <DashboardLayout type="admin">
      <Seo title="Painel administrativo" noIndex />
      <PageHeader
        title="Painel administrativo"
        description="O que precisa de você agora e como a plataforma está"
        icon={<LayoutDashboard className="h-6 w-6" aria-hidden="true" />}
      />

      {isError ? (
        <ErrorState
          title="Não foi possível carregar o painel"
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="titulo-fila">
            <h2 id="titulo-fila" className="font-display text-lg font-bold">
              Precisa de você
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                valor={data.ongsSemSelo}
                rotulo={
                  data.ongsSemSelo === 1
                    ? "ONG ativa sem selo de verificada"
                    : "ONGs ativas sem selo de verificada"
                }
                icone={BadgeCheck}
                para="/admin/ongs?aba=sem-selo"
              />
              {/* O número tem que ser o mesmo que a tela de destino mostra:
                  contar só as travadas e abrir a lista de todas as pendentes
                  faria o painel e a lista discordarem. O recorte de dias vem
                  no aviso abaixo. */}
              <Stat
                valor={data.doacoesPendentes}
                rotulo={
                  data.doacoesPendentes === 1
                    ? "doação aguardando a ONG confirmar"
                    : "doações aguardando a ONG confirmar"
                }
                icone={DollarSign}
                para="/admin/doacoes?status=pendente"
              />
              <Stat
                valor={data.voluntariosPendentes}
                rotulo="inscrições de voluntário aguardando resposta"
                icone={UserCheck}
                para="/admin/voluntarios"
              />
            </div>

            {data.doacoesTravadas > 0 && (
              <Callout tom="atencao" titulo="Doações paradas travam o progresso público" className="mt-4">
                {data.doacoesTravadas === 1
                  ? "Uma doação está sem confirmação"
                  : `${data.doacoesTravadas} doações estão sem confirmação`}{" "}
                há mais de {DIAS_ATE_DOACAO_TRAVAR} dias. A barra de um projeto só sobe
                quando a ONG confirma que recebeu. Até lá, quem doou não vê o próprio
                efeito. Vale cobrar a organização.
                <div className="mt-3">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/doacoes?status=pendente">Ver as doações pendentes</Link>
                  </Button>
                </div>
              </Callout>
            )}

            {data.ongsSemSelo > 0 && (
              <Callout tom="info" titulo="Verificação de CNPJ é responsabilidade da administração" className="mt-4">
                Uma ONG sem selo aparece no site sem sinal de conferência. O selo é
                marcado na tela de ONGs, depois de checar o CNPJ.
                <div className="mt-3">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/ongs?aba=sem-selo">Ver ONGs sem selo</Link>
                  </Button>
                </div>
              </Callout>
            )}
          </section>

          <section aria-labelledby="titulo-plataforma">
            <h2 id="titulo-plataforma" className="font-display text-lg font-bold">
              A plataforma hoje
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat valor={data.ongs} rotulo={data.ongs === 1 ? "ONG" : "ONGs"} icone={Building2} para="/admin/ongs" />
              <Stat valor={data.usuarios} rotulo={data.usuarios === 1 ? "usuário" : "usuários"} icone={Users} para="/admin/usuarios" />
              <Stat valor={data.projetos} rotulo={data.projetos === 1 ? "projeto" : "projetos"} icone={FolderOpen} para="/admin/projetos" />
              <Stat valor={data.eventos} rotulo={data.eventos === 1 ? "evento" : "eventos"} icone={Calendar} para="/admin/eventos" />
              <Stat valor={data.doacoes} rotulo={data.doacoes === 1 ? "doação registrada" : "doações registradas"} icone={DollarSign} para="/admin/doacoes" />
              <Stat
                valor={formatCurrency(data.totalConfirmado)}
                rotulo="doados e confirmados pelas ONGs"
                icone={BadgeCheck}
                para="/admin/auditoria"
                className="col-span-2"
              />
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
