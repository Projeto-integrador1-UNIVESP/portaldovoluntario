import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Clock, Download, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { exportToCsv } from "@/lib/exportCsv";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const num = (v: unknown) => Number(v ?? 0);

/**
 * Histórico auditável das doações da ONG.
 *
 * Dois consertos de fundo aqui. O nome do doador vinha de um embed
 * `profiles:id_usuario(...)` que o PostgREST não resolve: `doacoes.id_usuario`
 * referencia `auth.users`, não `profiles`. E o erro era engolido, deixando a
 * tela inteira vazia. E o "total arrecadado" somava tudo, inclusive o que a ONG
 * nunca confirmou: o oposto da regra que a plataforma vende. Agora confirmado e
 * aguardando aparecem separados.
 */
export default function OngAuditoria() {
  const { ongId } = useAuth();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-auditoria", ongId],
    queryFn: async () => {
      const { data: doacoes, error } = await supabase
        .from("doacoes")
        .select(
          "id, valor, quantidade, status, tipo_doacao, data_doacao, confirmada_em, anonima, doador_nome, doador_email, id_usuario, id_necessidade",
        )
        .eq("id_ong", ongId!)
        .order("data_doacao", { ascending: false });
      if (error) throw error;

      const linhas = doacoes ?? [];
      const idsUsuarios = [...new Set(linhas.map((d) => d.id_usuario).filter(Boolean))] as string[];
      const idsNecessidades = [...new Set(linhas.map((d) => d.id_necessidade).filter(Boolean))] as string[];

      const [perfis, necessidades] = await Promise.all([
        idsUsuarios.length
          ? supabase.from("profiles").select("user_id, nome, email").in("user_id", idsUsuarios)
          : Promise.resolve({ data: [] }),
        idsNecessidades.length
          ? supabase.from("necessidades").select("id, nome, unidade").in("id", idsNecessidades)
          : Promise.resolve({ data: [] }),
      ]);

      const porUsuario = new Map((perfis.data ?? []).map((p) => [p.user_id, p]));
      const porNecessidade = new Map((necessidades.data ?? []).map((n) => [n.id, n]));

      return linhas.map((d) => ({
        ...d,
        valor: num(d.valor),
        quantidade: d.quantidade === null ? null : num(d.quantidade),
        necessidade: d.id_necessidade ? porNecessidade.get(d.id_necessidade) : null,
        doador: d.id_usuario ? porUsuario.get(d.id_usuario) : null,
      }));
    },
    enabled: Boolean(ongId),
    staleTime: 30_000,
  });

  const resumo = useMemo(() => {
    const linhas = data ?? [];
    const confirmadas = linhas.filter((d) => d.status === "confirmada");
    const pendentes = linhas.filter((d) => d.status === "pendente");

    // O ranking conta só o que a ONG confirmou: é a mesma regra da barra de
    // progresso pública. Somar doação não confirmada aqui inflaria o histórico.
    const porDoador = new Map<string, { nome: string; total: number; qtd: number }>();
    for (const d of confirmadas) {
      const chave = d.anonima ? `anon-${d.id}` : d.id_usuario || d.doador_email || `sem-id-${d.id}`;
      const nome = d.anonima
        ? "Doador anônimo"
        : d.doador?.nome || d.doador_nome || "Doador sem cadastro";
      const atual = porDoador.get(chave) ?? { nome, total: 0, qtd: 0 };
      atual.total += d.valor;
      atual.qtd += 1;
      porDoador.set(chave, atual);
    }

    return {
      confirmadas,
      valorConfirmado: confirmadas.reduce((s, d) => s + d.valor, 0),
      valorPendente: pendentes.reduce((s, d) => s + d.valor, 0),
      qtdPendente: pendentes.length,
      ranking: Array.from(porDoador.values()).sort(
        (a, b) => b.total - a.total || b.qtd - a.qtd,
      ),
    };
  }, [data]);

  const descreveDoacao = (d: NonNullable<typeof data>[number]) =>
    d.necessidade
      ? `${d.quantidade ?? 0} ${d.necessidade.unidade ?? ""} de ${d.necessidade.nome}`.replace(/\s+/g, " ")
      : formatCurrency(d.valor);

  const baixarCsv = () =>
    exportToCsv(
      "auditoria-ong.csv",
      (data ?? []).map((d) => ({
        data: formatDateTime(d.data_doacao),
        doador: d.anonima ? "Doador anônimo" : d.doador?.nome || d.doador_nome || "",
        email: d.anonima ? "" : d.doador?.email || d.doador_email || "",
        doacao: descreveDoacao(d),
        valor: d.valor,
        forma: d.tipo_doacao ?? "",
        situacao:
          d.status === "confirmada"
            ? "Confirmada"
            : d.status === "cancelada"
              ? "Não recebida"
              : "Aguardando confirmação",
        confirmada_em: d.confirmada_em ? formatDateTime(d.confirmada_em) : "",
      })),
    );

  return (
    <DashboardLayout type="ong">
      <Seo title="Auditoria de doações" noIndex />
      <PageHeader
        title="Auditoria de doações"
        description="Tudo que foi registrado para a sua ONG, com quem doou, quando e se você confirmou."
        icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button variant="outline" onClick={baixarCsv} disabled={!data?.length}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Exportar CSV
          </Button>
        }
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar o histórico" onRetry={() => refetch()} />
      ) : isPending ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </>
      ) : data.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhuma doação registrada ainda"
          description="Quando alguém doar para a sua ONG, a doação entra aqui, antes e depois de você confirmar o recebimento."
          action={{ label: "Publicar o que está faltando", to: "/ong/necessidades" }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              valor={formatCurrency(resumo.valorConfirmado)}
              rotulo="em dinheiro confirmado por você"
              icone={BadgeCheck}
            />
            <Stat
              valor={resumo.confirmadas.length}
              rotulo={
                resumo.confirmadas.length === 1
                  ? "doação com recebimento confirmado"
                  : "doações com recebimento confirmado"
              }
              icone={BadgeCheck}
            />
            <Stat
              valor={resumo.qtdPendente}
              rotulo={
                resumo.qtdPendente === 1
                  ? "doação aguardando confirmação"
                  : "doações aguardando confirmação"
              }
              icone={Clock}
              para="/ong/doacoes"
              destaque={resumo.qtdPendente > 0}
            />
            <Stat valor={resumo.ranking.length} rotulo="doadores com doação confirmada" />
          </div>

          <Callout tom="confianca" className="mt-6">
            Os números acima separam o que foi confirmado do que ainda não foi porque é essa a
            regra do site: o progresso de um projeto só sobe quando alguém da ONG atesta que
            recebeu. {formatCurrency(resumo.valorPendente)} estão registrados e ainda não contam.
          </Callout>

          <Card className="mt-6 overflow-hidden">
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold">
                Quem mais doou (só confirmadas)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {resumo.ranking.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Clock}
                    title="Nenhum recebimento confirmado ainda"
                    description="O ranking usa só as doações que você confirmou. É o mesmo número que o doador vê no site."
                    action={{ label: "Ver a fila de confirmação", to: "/ong/doacoes" }}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doador</TableHead>
                      <TableHead>Doações confirmadas</TableHead>
                      <TableHead className="text-right">Em dinheiro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.ranking.map((p, i) => (
                      <TableRow key={`${p.nome}-${i}`}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{p.qtd}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(p.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 overflow-hidden">
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold">Histórico completo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Doador</TableHead>
                    <TableHead>Doação</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(d.data_doacao)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {d.anonima
                            ? "Doador anônimo"
                            : d.doador?.nome || d.doador_nome || "Doador sem cadastro"}
                        </div>
                        {!d.anonima && (d.doador?.email || d.doador_email) && (
                          <div className="text-xs text-muted-foreground">
                            {d.doador?.email || d.doador_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{descreveDoacao(d)}</TableCell>
                      <TableCell>
                        {d.status === "confirmada" ? (
                          <Badge className="bg-success text-success-foreground">
                            {d.confirmada_em
                              ? `Confirmada em ${formatDate(d.confirmada_em)}`
                              : "Confirmada"}
                          </Badge>
                        ) : d.status === "cancelada" ? (
                          <Badge variant="secondary">Não recebida</Badge>
                        ) : (
                          <Badge variant="outline">Aguardando você confirmar</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
