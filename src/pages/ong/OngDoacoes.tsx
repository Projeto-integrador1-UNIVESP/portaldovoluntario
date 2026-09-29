import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CHAVE_PENDENCIAS, DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { Callout } from "@/components/common/Callout";
import { ConfirmarExclusao } from "@/components/common/ConfirmarExclusao";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { TERMOS } from "@/lib/copy";
import { ErroAmigavel, mensagemAmigavel } from "@/lib/erros";
import { formatCurrency, formatDateTime, formatQuantidade } from "@/lib/format";
import { descreverDoacao, nomeDoDoador } from "@/lib/doacao";

type StatusDoacao = "pendente" | "confirmada" | "cancelada";

const num = (v: unknown) => Number(v ?? 0);

/**
 * Doações recebidas, com confirmação.
 *
 * Esta tela é o que faz o progresso do projeto andar: o valor arrecadado de
 * uma necessidade soma apenas doações confirmadas. Enquanto a ONG não
 * registra o recebimento, a barra pública não se mexe.
 */
export default function OngDoacoes() {
  const { ongId, user } = useAuth();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<StatusDoacao>("pendente");
  // Quem acabou de ser confirmada fica na aba Aguardando, com o selo pulsando,
  // até a pessoa trocar de aba: sumir da lista no clique esconde o efeito.
  const [recemConfirmadas, setRecemConfirmadas] = useState<Set<string>>(() => new Set());

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-doacoes", ongId],
    queryFn: async () => {
      const { data: doacoes, error } = await supabase
        .from("doacoes")
        .select(
          "id, valor, quantidade, status, tipo_doacao, data_doacao, confirmada_em, doador_nome, doador_email, anonima, forma_entrega, id_usuario, id_projeto, id_necessidade",
        )
        .eq("id_ong", ongId!)
        .order("data_doacao", { ascending: false });
      if (error) throw error;

      const linhas = doacoes ?? [];
      const idsProjetos = [...new Set(linhas.map((d) => d.id_projeto).filter(Boolean))] as string[];
      const idsNecessidades = [...new Set(linhas.map((d) => d.id_necessidade).filter(Boolean))] as string[];
      const idsUsuarios = [...new Set(linhas.map((d) => d.id_usuario).filter(Boolean))] as string[];

      const [projetos, necessidades, perfis] = await Promise.all([
        idsProjetos.length
          ? supabase.from("projetos").select("id, nome_projeto").in("id", idsProjetos)
          : Promise.resolve({ data: [] }),
        idsNecessidades.length
          ? supabase.from("necessidades").select("id, nome, unidade").in("id", idsNecessidades)
          : Promise.resolve({ data: [] }),
        idsUsuarios.length
          ? supabase.from("profiles").select("user_id, nome, email").in("user_id", idsUsuarios)
          : Promise.resolve({ data: [] }),
      ]);

      const porProjeto = new Map((projetos.data ?? []).map((p) => [p.id, p]));
      const porNecessidade = new Map((necessidades.data ?? []).map((n) => [n.id, n]));
      const porUsuario = new Map((perfis.data ?? []).map((p) => [p.user_id, p]));

      return linhas.map((d) => ({
        ...d,
        valor: num(d.valor),
        quantidade: d.quantidade === null ? null : num(d.quantidade),
        projeto: d.id_projeto ? porProjeto.get(d.id_projeto) : null,
        necessidade: d.id_necessidade ? porNecessidade.get(d.id_necessidade) : null,
        // Doação sem login não tem perfil; o nome vem do próprio formulário.
        doador: d.id_usuario ? porUsuario.get(d.id_usuario) : null,
      }));
    },
    enabled: Boolean(ongId),
    staleTime: 30_000,
  });

  const alterarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusDoacao }) => {
      const { data: alteradas, error } = await supabase
        .from("doacoes")
        .update({
          status,
          confirmada_em: status === "confirmada" ? new Date().toISOString() : null,
          confirmada_por: status === "confirmada" ? user?.id ?? null : null,
        })
        .eq("id", id)
        .select("id");

      if (error) throw error;
      // Zero linhas com RLS significa que a permissão não alcançou o registro.
      // Sem esta checagem, a tela diria "confirmado" sem nada ter mudado.
      if (!alteradas || alteradas.length === 0) {
        throw new ErroAmigavel("Sem permissão para alterar esta doação.");
      }
    },
    onSuccess: (_r, { id, status }) => {
      if (status === "confirmada") {
        setRecemConfirmadas((atual) => new Set(atual).add(id));
        toast.success("Recebimento confirmado. O progresso do projeto já subiu.");
      } else {
        setRecemConfirmadas((atual) => {
          if (!atual.has(id)) return atual;
          const proximo = new Set(atual);
          proximo.delete(id);
          return proximo;
        });
        toast.success(
          status === "cancelada" ? "Doação marcada como não recebida" : "Doação voltou para a fila",
        );
      }
      queryClient.invalidateQueries({ queryKey: ["ong-doacoes", ongId] });
      queryClient.invalidateQueries({ queryKey: ["ong-resumo", ongId] });
      queryClient.invalidateQueries({ queryKey: ["ong-auditoria", ongId] });
      queryClient.invalidateQueries({ queryKey: [...CHAVE_PENDENCIAS] });
      queryClient.invalidateQueries({ queryKey: ["projeto"] });
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível atualizar a doação.")),
  });

  // Em ação que mexe com dinheiro, travar a tela inteira esconde qual linha está
  // sendo alterada: só a doação clicada mostra o carregamento.
  const linhaEmAndamento = alterarStatus.isPending ? alterarStatus.variables?.id : null;

  const porStatus = useMemo(() => {
    const vazio = { pendente: [], confirmada: [], cancelada: [] } as Record<StatusDoacao, NonNullable<typeof data>>;
    for (const d of data ?? []) (vazio[d.status as StatusDoacao] ??= []).push(d);
    return vazio;
  }, [data]);

  const totalConfirmado = (porStatus.confirmada ?? []).reduce((s, d) => s + d.valor, 0);
  const totalPendente = (porStatus.pendente ?? []).reduce((s, d) => s + d.valor, 0);
  const qtdPendente = porStatus.pendente?.length ?? 0;

  const lista = useMemo(
    () =>
      (data ?? []).filter(
        (d) => d.status === aba || (aba === "pendente" && recemConfirmadas.has(d.id)),
      ),
    [data, aba, recemConfirmadas],
  );

  const trocarAba = (v: string) => {
    setAba(v as StatusDoacao);
    setRecemConfirmadas(new Set());
  };

  return (
    <DashboardLayout type="ong">
      <Seo title="Doações" noIndex />
      <PageHeader
        title="Doações"
        description="O que chegou, o que ainda não, e o que você já confirmou."
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar as doações" onRetry={() => refetch()} />
      ) : (
        <>
          {isPending ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                valor={qtdPendente}
                rotulo={
                  qtdPendente === 1
                    ? "doação aguardando sua confirmação"
                    : "doações aguardando sua confirmação"
                }
              />
              <Stat valor={formatCurrency(totalPendente)} rotulo="em dinheiro ainda não confirmado" />
              <Stat valor={formatCurrency(totalConfirmado)} rotulo="em dinheiro já confirmado" />
            </div>
          )}

          <Tabs value={aba} onValueChange={trocarAba} className="mt-8">
            <TabsList>
              <TabsTrigger value="pendente">Aguardando ({qtdPendente})</TabsTrigger>
              <TabsTrigger value="confirmada">
                Confirmadas ({porStatus.confirmada?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="cancelada">
                Não recebidas ({porStatus.cancelada?.length ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {aba === "pendente" && qtdPendente > 0 && (
            <Callout tom="confianca" className="mt-4">
              A barra do projeto só sobe depois que você confirma. Confirme apenas o que chegou.
            </Callout>
          )}

          <Card className="mt-4 overflow-hidden">
            <CardContent className="p-0">
              {isPending ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : lista.length === 0 ? (
                <EmptyState
                  className="m-4 border-0 bg-transparent"
                  ilustracao={aba === "pendente" ? "caixa" : "vazio"}
                  title={
                    aba === "pendente"
                      ? "Nenhuma doação aguardando confirmação"
                      : aba === "confirmada"
                        ? "Nenhuma doação confirmada ainda"
                        : "Nenhuma doação marcada como não recebida"
                  }
                  description={
                    aba === "pendente"
                      ? "Quando alguém doar, a doação aparece aqui para você confirmar. Publicar o que está faltando é o que traz doação específica."
                      : aba === "confirmada"
                        ? "Assim que você confirmar um recebimento, ele aparece nesta aba."
                        : "Doações que você marcou como não recebidas ficam aqui e não contam no progresso."
                  }
                  action={
                    aba === "pendente"
                      ? { label: "Publicar o que está faltando", to: "/ong/necessidades" }
                      : { label: "Ver a fila de confirmação", onClick: () => trocarAba("pendente") }
                  }
                />
              ) : (
                <Table className="min-w-[880px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doador</TableHead>
                      <TableHead>O que</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((d) => {
                      const carregando = linhaEmAndamento === d.id;
                      const nome = nomeDoDoador(d);

                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className={d.anonima ? "text-muted-foreground" : "font-medium"}>{nome}</div>
                            {!d.anonima && (d.doador?.email || d.doador_email) && (
                              <div className="text-xs text-muted-foreground">
                                {d.doador?.email || d.doador_email}
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            {d.necessidade && d.quantidade !== null ? (
                              <span className="numero font-medium">
                                {descreverDoacao(d)}
                              </span>
                            ) : (
                              <span className="numero font-medium">{formatCurrency(d.valor)}</span>
                            )}
                            {d.forma_entrega && (
                              <div className="text-xs text-muted-foreground">
                                {d.forma_entrega === "levar" ? "Vai levar no local" : "Pediu coleta"}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {d.projeto?.nome_projeto ?? "Doação geral"}
                          </TableCell>

                          <TableCell className="numero whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTime(d.data_doacao)}
                          </TableCell>

                          <TableCell className="text-right">
                            {d.status === "pendente" ? (
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  disabled={alterarStatus.isPending}
                                  onClick={() =>
                                    alterarStatus.mutate({ id: d.id, status: "confirmada" })
                                  }
                                >
                                  {carregando ? (
                                    <Loader2 className="animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check aria-hidden="true" />
                                  )}
                                  Confirmar que recebi
                                </Button>
                                <ConfirmarExclusao
                                  tom="atencao"
                                  titulo={`Marcar a doação de ${nome} como não recebida?`}
                                  descricao="Ela sai da fila e não conta no progresso do projeto. Se chegar depois, dá para voltar."
                                  rotuloConfirmar="Marcar como não recebida"
                                  rotuloCarregando="Marcando…"
                                  onConfirmar={() =>
                                    alterarStatus.mutateAsync({ id: d.id, status: "cancelada" })
                                  }
                                >
                                  <Button size="sm" variant="outline" disabled={alterarStatus.isPending}>
                                    <X aria-hidden="true" />
                                    Não chegou
                                  </Button>
                                </ConfirmarExclusao>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {d.status === "confirmada" && !d.confirmada_em ? (
                                  // Doação confirmada antes de existir a coluna de data.
                                  <Badge variant="success">Confirmada</Badge>
                                ) : (
                                  <SeloConfirmacao
                                    confirmadaEm={d.confirmada_em}
                                    cancelada={d.status === "cancelada"}
                                    animar={recemConfirmadas.has(d.id)}
                                  />
                                )}
                                <ConfirmarExclusao
                                  tom="atencao"
                                  titulo="Voltar esta doação para a fila?"
                                  descricao="Ela deixa de contar no progresso até você confirmar de novo."
                                  rotuloConfirmar="Voltar para pendente"
                                  rotuloCarregando="Voltando…"
                                  onConfirmar={() =>
                                    alterarStatus.mutateAsync({ id: d.id, status: "pendente" })
                                  }
                                >
                                  <Button size="sm" variant="ghost" disabled={alterarStatus.isPending}>
                                    {carregando ? (
                                      <Loader2 className="animate-spin" aria-hidden="true" />
                                    ) : (
                                      <Undo2 aria-hidden="true" />
                                    )}
                                    Voltar para pendente
                                  </Button>
                                </ConfirmarExclusao>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
