import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
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
import { CTA, TERMOS } from "@/lib/copy";
import { exportToCsv } from "@/lib/exportCsv";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const num = (v: unknown) => Number(v ?? 0);

/** Linhas por página do histórico. Vinte cabem numa tela sem rolar a página. */
const POR_PAGINA = 20;

/**
 * Histórico auditável das doações da ONG.
 *
 * O nome do doador não vem por embed (`doacoes.id_usuario` referencia
 * `auth.users`, não `profiles`). E o "total arrecadado" separa confirmado de
 * aguardando: somar tudo seria o oposto da regra que a plataforma vende.
 */
export default function OngAuditoria() {
  const { ongId } = useAuth();
  const [pagina, setPagina] = useState(1);

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
    // progresso pública. Somar doação não confirmada inflaria o histórico.
    const porDoador = new Map<string, { nome: string; total: number; qtd: number }>();
    for (const d of confirmadas) {
      const chave = d.anonima ? `anon-${d.id}` : d.id_usuario || d.doador_email || `sem-id-${d.id}`;
      const nome = d.anonima
        ? "Doador anônimo"
        : d.doador?.nome || d.doador_nome || TERMOS.semIdentificacao;
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

  const totalDePaginas = Math.max(1, Math.ceil((data?.length ?? 0) / POR_PAGINA));
  useEffect(() => {
    if (pagina > totalDePaginas) setPagina(totalDePaginas);
  }, [pagina, totalDePaginas]);
  const inicio = (pagina - 1) * POR_PAGINA;
  const paginaAtual = (data ?? []).slice(inicio, inicio + POR_PAGINA);

  const descreveDoacao = (d: NonNullable<typeof data>[number]) =>
    d.necessidade && d.quantidade !== null
      ? `${d.quantidade} ${d.necessidade.unidade ?? ""} de ${d.necessidade.nome}`.replace(/\s+/g, " ")
      : formatCurrency(d.valor);

  // Os rótulos das colunas alimentam o cabeçalho do arquivo: não mudar.
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
        description="Tudo que foi registrado para a sua ONG: quem doou, quando e se você confirmou."
        action={
          <Button variant="outline" onClick={baixarCsv} disabled={!data?.length}>
            <Download aria-hidden="true" />
            {CTA.exportarCsv}
          </Button>
        }
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar o histórico" onRetry={() => refetch()} />
      ) : isPending ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </>
      ) : data.length === 0 ? (
        <EmptyState
          ilustracao="caixa"
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
            />
            <Stat
              valor={resumo.confirmadas.length}
              rotulo={
                resumo.confirmadas.length === 1
                  ? "doação com recebimento confirmado"
                  : "doações com recebimento confirmado"
              }
            />
            <Stat
              valor={resumo.qtdPendente}
              rotulo={
                resumo.qtdPendente === 1
                  ? "doação aguardando confirmação"
                  : "doações aguardando confirmação"
              }
              para="/ong/doacoes"
            />
            <Stat
              valor={resumo.ranking.length}
              rotulo={
                resumo.ranking.length === 1
                  ? "doador com doação confirmada"
                  : "doadores com doação confirmada"
              }
            />
          </div>

          <Callout tom="confianca" className="mt-6">
            Os números separam o que foi confirmado do que ainda não foi: o progresso de um
            projeto só sobe quando alguém da ONG atesta que recebeu.{" "}
            <span className="numero">{formatCurrency(resumo.valorPendente)}</span> estão registrados
            e ainda não contam.
          </Callout>

          <Card className="mt-8 overflow-hidden">
            <CardHeader>
              <CardTitle>Quem mais doou</CardTitle>
              <p className="text-sm text-muted-foreground">Só doações confirmadas por você.</p>
            </CardHeader>
            <CardContent className="p-0">
              {resumo.ranking.length === 0 ? (
                <EmptyState
                  className="m-4 border-0 bg-transparent"
                  title="Nenhum recebimento confirmado ainda"
                  description="O ranking usa só as doações que você confirmou. É o mesmo número que o doador vê no site."
                  action={{ label: "Ver a fila de confirmação", to: "/ong/doacoes" }}
                />
              ) : (
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doador</TableHead>
                      <TableHead>Doações confirmadas</TableHead>
                      <TableHead className="text-right">Em dinheiro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.ranking.slice(0, 10).map((p, i) => (
                      <TableRow key={`${p.nome}-${i}`}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="numero text-muted-foreground">{p.qtd}</TableCell>
                        <TableCell className="numero text-right font-medium">
                          {p.total > 0 ? formatCurrency(p.total) : <span className="font-normal text-muted-foreground">Só itens</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-8 overflow-hidden">
            <CardHeader>
              <CardTitle>Histórico completo</CardTitle>
              <p className="numero text-sm text-muted-foreground">
                {data.length === 1 ? "1 doação registrada" : `${data.length} doações registradas`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Doador</TableHead>
                    <TableHead>Doação</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginaAtual.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="numero whitespace-nowrap text-muted-foreground">
                        {formatDateTime(d.data_doacao)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {d.anonima
                            ? "Doador anônimo"
                            : d.doador?.nome || d.doador_nome || TERMOS.semIdentificacao}
                        </div>
                        {!d.anonima && (d.doador?.email || d.doador_email) && (
                          <div className="text-xs text-muted-foreground">
                            {d.doador?.email || d.doador_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="numero">{descreveDoacao(d)}</TableCell>
                      <TableCell>
                        {d.status === "confirmada" ? (
                          <Badge variant="success">
                            {d.confirmada_em
                              ? `Confirmada em ${formatDate(d.confirmada_em)}`
                              : "Confirmada"}
                          </Badge>
                        ) : d.status === "cancelada" ? (
                          <Badge variant="neutro">{TERMOS.naoRecebida}</Badge>
                        ) : (
                          <Badge variant="outline">Aguardando você confirmar</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalDePaginas > 1 && (
                <nav
                  aria-label="Páginas do histórico"
                  className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground"
                >
                  <p className="numero">
                    Mostrando {inicio + 1} a {Math.min(inicio + POR_PAGINA, data.length)} de {data.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagina === 1}
                      onClick={() => setPagina((p) => p - 1)}
                    >
                      <ChevronLeft aria-hidden="true" />
                      Anterior
                    </Button>
                    <span className="numero px-1">
                      {pagina} de {totalDePaginas}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagina === totalDePaginas}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Próxima
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </div>
                </nav>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
