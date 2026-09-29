import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BadgeCheck, Building2, Calendar, DollarSign, FolderOpen, LayoutDashboard, UserCheck, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TESE, TERMOS, VAZIO } from "@/lib/copy";
import { formatCurrency, formatQuantidade } from "@/lib/format";
import { descreverDoacao } from "@/lib/doacao";
import {
  COLUNAS_DA_DOACAO, contarLinhas as contar, diasDesde, doacoesComRelacionados, nomeDoDoador,
} from "./_shared-lib";

/** A partir daqui uma doação parada deixa de ser espera e passa a ser problema. */
const DIAS_ATE_DOACAO_TRAVAR = 7;

/** Quantas doações paradas a lista curta mostra. */
const PARADAS_NA_LISTA = 5;

/**
 * Início do painel administrativo.
 *
 * O que o administrador precisa ver primeiro não é contagem: são as ONGs
 * esperando verificação de CNPJ e as doações que a ONG não confirmou há dias.
 * Enquanto ninguém confirma, o progresso público do projeto não anda. Por isso
 * a tela abre com o bloco do que exige ação, e só depois com os números.
 *
 * As contagens usam `head: true`: o servidor devolve só o total, sem trafegar
 * linha. O total em dinheiro vem da RPC que já soma no banco.
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

  // Consulta separada: se ela falhar, o painel continua de pé sem a lista.
  const paradas = useQuery({
    queryKey: ["admin-dashboard-paradas"],
    queryFn: async () => {
      const { data: linhas, error } = await supabase
        .from("doacoes")
        .select(COLUNAS_DA_DOACAO)
        .eq("status", "pendente")
        .order("data_doacao", { ascending: true })
        .order("id")
        .limit(PARADAS_NA_LISTA);
      if (error) throw error;
      return doacoesComRelacionados(linhas ?? []);
    },
    staleTime: 60_000,
  });

  const pendencias = data
    ? [
        data.ongsSemSelo > 0 && {
          chave: "selo",
          numero: data.ongsSemSelo,
          texto:
            data.ongsSemSelo === 1
              ? `ONG ${TERMOS.aguardandoVerificacao.toLowerCase()}`
              : `ONGs ${TERMOS.aguardandoVerificacao.toLowerCase()}`,
          acao: "Ver ONGs sem selo",
          para: "/admin/ongs?aba=sem-selo",
        },
        data.doacoesTravadas > 0 && {
          chave: "travadas",
          numero: data.doacoesTravadas,
          texto: `${data.doacoesTravadas === 1 ? "doação" : "doações"} sem confirmação há mais de ${DIAS_ATE_DOACAO_TRAVAR} dias`,
          acao: "Ver doações paradas",
          para: "/admin/doacoes?status=pendente",
        },
        data.voluntariosPendentes > 0 && {
          chave: "voluntarios",
          numero: data.voluntariosPendentes,
          texto: `${data.voluntariosPendentes === 1 ? "inscrição" : "inscrições"} de voluntário aguardando resposta`,
          acao: "Responder inscrições",
          para: "/admin/voluntarios",
        },
      ].filter((p): p is Exclude<typeof p, false> => Boolean(p))
    : [];

  return (
    <DashboardLayout type="admin">
      <Seo title="Início" noIndex />
      <PageHeader
        title="Início"
        description="O que precisa de você agora e como a plataforma está"
        icon={<LayoutDashboard className="h-6 w-6" aria-hidden="true" />}
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar o painel" onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-10">
          <Skeleton className="h-52 w-full rounded-[28px_8px]" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <section
            aria-labelledby="titulo-fila"
            className="grao rounded-[28px_8px] bg-tinta-creme p-6 md:p-8"
          >
            <p className="rotulo-caps">Precisa de você</p>
            <h2 id="titulo-fila" className="mt-1 font-display text-2xl font-semibold">
              {pendencias.length === 0
                ? "Nada esperando resposta"
                : pendencias.length === 1
                  ? "Uma pendência"
                  : `${pendencias.length} pendências`}
            </h2>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">{TESE}</p>

            {pendencias.length === 0 ? (
              <p className="mt-6 max-w-prose text-foreground">
                Toda ONG visível tem selo, nenhuma doação está parada há mais de{" "}
                {DIAS_ATE_DOACAO_TRAVAR} dias e não há inscrição sem resposta.
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-primary/10">
                {pendencias.map((p) => (
                  <li
                    key={p.chave}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0"
                  >
                    <p className="flex items-baseline gap-3">
                      <span className="numero font-display text-2xl font-semibold leading-none">
                        {p.numero.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-foreground">{p.texto}</span>
                    </p>
                    <Button variant="default" size="sm" asChild>
                      <Link to={p.para}>{p.acao}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="titulo-plataforma">
            <p className="rotulo-caps">A plataforma hoje</p>
            <h2 id="titulo-plataforma" className="mt-1 font-display text-2xl font-semibold">
              Os números
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat
                destaque
                valor={formatCurrency(data.totalConfirmado)}
                rotulo="doados e confirmados pelas ONGs"
                icone={BadgeCheck}
                para="/admin/auditoria"
                className="col-span-2"
              />
              <Stat valor={data.ongs} rotulo={data.ongs === 1 ? "ONG" : "ONGs"} icone={Building2} para="/admin/ongs" />
              <Stat valor={data.projetos} rotulo={data.projetos === 1 ? "projeto" : "projetos"} icone={FolderOpen} para="/admin/projetos" />
              <Stat valor={data.doacoes} rotulo={data.doacoes === 1 ? "doação registrada" : "doações registradas"} icone={DollarSign} para="/admin/doacoes" />
              <Stat valor={data.doacoesPendentes} rotulo="aguardando a ONG confirmar" icone={UserCheck} para="/admin/doacoes?status=pendente" />
              <Stat valor={data.usuarios} rotulo={data.usuarios === 1 ? "usuário" : "usuários"} icone={Users} para="/admin/usuarios" />
              <Stat valor={data.eventos} rotulo={data.eventos === 1 ? "evento" : "eventos"} icone={Calendar} para="/admin/eventos" />
            </div>
          </section>

          {paradas.data && paradas.data.length > 0 && (
            <section aria-labelledby="titulo-paradas">
              <p className="rotulo-caps">Doações paradas há mais tempo</p>
              <h2 id="titulo-paradas" className="mt-1 font-display text-2xl font-semibold">
                Quem ainda não viu o próprio efeito
              </h2>
              <Card className="mt-6 divide-y divide-border">
                {paradas.data.map((d) => {
                  const dias = diasDesde(d.data_doacao);
                  return (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{nomeDoDoador(d)}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {d.ong?.nome ?? VAZIO.semOng}
                          {" · "}
                          {descreverDoacao(d)}
                        </p>
                      </div>
                      <p className={`numero text-sm ${dias > DIAS_ATE_DOACAO_TRAVAR ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                        {dias === 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`}
                      </p>
                    </div>
                  );
                })}
              </Card>
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/doacoes?status=pendente">Ver todas as doações aguardando confirmação</Link>
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
