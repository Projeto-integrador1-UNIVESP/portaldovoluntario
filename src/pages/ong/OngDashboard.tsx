import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime, formatQuantidade } from "@/lib/format";
import { TERMOS, VAZIO } from "@/lib/copy";
import { descreverDoacao, nomeDoDoador } from "@/lib/doacao";

const num = (v: unknown) => Number(v ?? 0);

/**
 * Início do painel da ONG.
 *
 * A primeira coisa da tela é o que depende dela: quantas doações estão
 * esperando a confirmação de recebimento. É essa confirmação que faz a barra
 * pública do projeto andar; enquanto ela não acontece, quem doou não vê nada
 * mudar. Os totais vêm depois, porque só contam o que foi confirmado.
 */
export default function OngDashboard() {
  const { ongId } = useAuth();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-resumo", ongId],
    queryFn: async () => {
      // A agregação vive no banco (`get_impacto_ong`), que já separa confirmado
      // de pendente e checa se quem pergunta administra a ONG.
      const [impacto, projetosRes, recentesRes] = await Promise.all([
        supabase.rpc("get_impacto_ong", { _ong_id: ongId! }),
        supabase.from("projetos").select("id, nome_projeto").eq("id_ong", ongId!),
        supabase
          .from("doacoes")
          .select(
            "id, valor, quantidade, status, data_doacao, confirmada_em, doador_nome, anonima, id_projeto, id_necessidade",
          )
          .eq("id_ong", ongId!)
          .order("data_doacao", { ascending: false })
          .limit(5),
      ]);
      if (impacto.error) throw impacto.error;
      if (projetosRes.error) throw projetosRes.error;
      if (recentesRes.error) throw recentesRes.error;

      const projetos = projetosRes.data ?? [];
      const ids = projetos.map((p) => p.id);
      const recentes = recentesRes.data ?? [];

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

      const idsNecessidades = [...new Set(recentes.map((d) => d.id_necessidade).filter(Boolean))] as string[];
      const nomes = idsNecessidades.length
        ? await supabase.from("necessidades").select("id, nome, unidade").in("id", idsNecessidades)
        : { data: [] as { id: string; nome: string; unidade: string | null }[] };
      const porNecessidade = new Map((nomes.data ?? []).map((n) => [n.id, n]));
      const porProjeto = new Map(projetos.map((p) => [p.id, p.nome_projeto]));

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
        recentes: recentes.map((d) => {
          const necessidade = d.id_necessidade ? porNecessidade.get(d.id_necessidade) : null;
          return {
            id: d.id,
            status: d.status as "pendente" | "confirmada" | "cancelada",
            confirmadaEm: d.confirmada_em,
            data: d.data_doacao,
            doador: nomeDoDoador(d),
            projeto: d.id_projeto ? porProjeto.get(d.id_projeto) ?? VAZIO.semProjeto : "Doação geral",
            // Doação em dinheiro para uma necessidade de dinheiro não tem quantidade.
            oQue: descreverDoacao({ ...d, necessidade }),
          };
        }),
      };
    },
    enabled: Boolean(ongId),
    staleTime: 30_000,
  });

  return (
    <DashboardLayout type="ong">
      <Seo title="Início" noIndex />
      <PageHeader
        title="Início"
        description="O que está esperando você e o que já foi confirmado."
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar o resumo" onRetry={() => refetch()} />
      ) : isPending ? (
        <>
          <Skeleton className="h-44 w-full rounded-destaque" />
          <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-10 h-7 w-56" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          {data.aguardando > 0 ? (
            <section
              aria-labelledby="pendencias-titulo"
              className="grao rounded-[28px_8px] bg-tinta-creme px-6 py-7 sm:px-8 sm:py-8"
            >
              <p className="rotulo-caps">Exige ação sua</p>
              <h2
                id="pendencias-titulo"
                className="mt-2 font-display text-2xl-fluido font-semibold leading-tight"
              >
                <span className="numero">{data.aguardando}</span>{" "}
                {data.aguardando === 1
                  ? "doação aguardando sua confirmação"
                  : "doações aguardando sua confirmação"}
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                {data.valorAguardando > 0 && (
                  <>
                    <span className="numero font-semibold text-foreground">
                      {formatCurrency(data.valorAguardando)}
                    </span>{" "}
                    em dinheiro ainda não contam.{" "}
                  </>
                )}
                A barra do projeto só sobe depois que você confirma o que chegou.
              </p>
              <Button variant="cta" size="lg" className="mt-6" asChild>
                <Link to="/ong/doacoes">
                  Confirmar recebimentos
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          ) : (
            <section
              aria-labelledby="pendencias-titulo"
              className="rounded-[28px_8px] bg-tinta-salvia px-6 py-7 sm:px-8 sm:py-8"
            >
              <p className="rotulo-caps">Fila de confirmação</p>
              <h2
                id="pendencias-titulo"
                className="mt-2 font-display text-2xl-fluido font-semibold leading-tight"
              >
                Nada esperando você
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Tudo que foi registrado já está confirmado. O que traz doação nova é dizer, no
                projeto, o que está faltando.
              </p>
              <Button size="lg" className="mt-6" asChild>
                <Link to={data.projetos === 0 ? "/ong/projetos" : "/ong/necessidades"}>
                  {data.projetos === 0 ? "Criar meu primeiro projeto" : "Publicar o que está faltando"}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat
              valor={formatCurrency(data.valorConfirmado)}
              rotulo="em dinheiro confirmado"
              para="/ong/auditoria"
              className="col-span-2 sm:col-span-1"
            />
            <Stat
              valor={data.confirmadas}
              rotulo={data.confirmadas === 1 ? "recebimento confirmado" : "recebimentos confirmados"}
              para="/ong/doacoes"
            />
            <Stat
              valor={data.necessidadesAbertas}
              rotulo={data.necessidadesAbertas === 1 ? "necessidade aberta" : "necessidades abertas"}
              para="/ong/necessidades"
            />
            <Stat
              valor={data.projetosAtivos}
              rotulo={data.projetosAtivos === 1 ? "projeto no ar" : "projetos no ar"}
              para="/ong/projetos"
            />
            <Stat
              valor={data.voluntarios}
              rotulo={data.voluntarios === 1 ? "voluntário aprovado" : "voluntários aprovados"}
              para="/ong/voluntarios"
            />
          </div>

          {data.projetos === 0 ? (
            <EmptyState
              className="mt-10"
              ilustracao="caixa"
              title="Você ainda não tem projetos"
              description="O projeto é onde você diz o que está faltando. Sem ele, ninguém consegue doar um item certo."
              action={{ label: "Criar meu primeiro projeto", to: "/ong/projetos" }}
            />
          ) : data.necessidadesAbertas === 0 ? (
            <EmptyState
              className="mt-10"
              ilustracao="caixa"
              title="Nenhuma necessidade publicada"
              description="Seus projetos estão cadastrados, mas nenhum diz do que precisa. É a necessidade que o doador lê primeiro."
              action={{ label: "Dizer o que está faltando", to: "/ong/necessidades" }}
            />
          ) : null}

          <section aria-labelledby="recentes-titulo" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="recentes-titulo" className="font-display text-xl font-semibold">
                Últimas doações
              </h2>
              {data.recentes.length > 0 && (
                <Link to="/ong/doacoes" className="link-vivo text-sm font-medium">
                  Ver todas as doações
                </Link>
              )}
            </div>

            {data.recentes.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="Nenhuma doação registrada ainda"
                description="Quando alguém doar, ela aparece aqui para você confirmar o recebimento."
                action={{
                  label: data.projetos === 0 ? "Criar meu primeiro projeto" : "Publicar o que está faltando",
                  to: data.projetos === 0 ? "/ong/projetos" : "/ong/necessidades",
                }}
              />
            ) : (
              <ol className="mt-4 divide-y divide-border rounded-xl border bg-card shadow-sutil">
                {data.recentes.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        <span className="numero">{d.oQue}</span>
                        <span className="text-muted-foreground"> · {d.doador}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {d.projeto} · <span className="numero">{formatDateTime(d.data)}</span>
                      </p>
                    </div>
                    <SeloConfirmacao
                      confirmadaEm={d.confirmadaEm}
                      cancelada={d.status === "cancelada"}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
