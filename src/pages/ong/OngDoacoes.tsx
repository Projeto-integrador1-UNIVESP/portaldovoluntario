import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, DollarSign, Package, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatCurrency, formatDateTime } from "@/lib/format";

type StatusDoacao = "pendente" | "confirmada" | "cancelada";

const num = (v: unknown) => Number(v ?? 0);

/**
 * Doações recebidas, com confirmação.
 *
 * Esta tela é o que faz o progresso do projeto andar: o valor arrecadado de
 * uma necessidade soma apenas doações confirmadas. Enquanto a ONG não
 * registra o recebimento, a barra pública não se mexe — é isso que mantém os
 * números honestos para quem doou.
 */
export default function OngDoacoes() {
  const { ongId, user } = useAuth();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<StatusDoacao>("pendente");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-doacoes", ongId],
    queryFn: async () => {
      const { data: doacoes, error } = await supabase
        .from("doacoes")
        .select(
          "id, valor, quantidade, status, tipo_doacao, data_doacao, doador_nome, doador_email, anonima, forma_entrega, id_usuario, id_projeto, id_necessidade",
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
        throw new Error("Sem permissão para alterar esta doação.");
      }
    },
    onSuccess: (_r, { status }) => {
      toast.success(
        status === "confirmada"
          ? "Recebimento confirmado. O progresso do projeto foi atualizado."
          : status === "cancelada"
            ? "Doação marcada como não recebida."
            : "Doação voltou para pendente.",
      );
      queryClient.invalidateQueries({ queryKey: ["ong-doacoes", ongId] });
      queryClient.invalidateQueries({ queryKey: ["projeto"] });
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível atualizar a doação."),
  });

  const porStatus = useMemo(() => {
    const vazio = { pendente: [], confirmada: [], cancelada: [] } as Record<StatusDoacao, typeof data>;
    for (const d of data ?? []) (vazio[d.status as StatusDoacao] ??= []).push(d as never);
    return vazio;
  }, [data]);

  const totalConfirmado = (porStatus.confirmada ?? []).reduce((s, d) => s + d.valor, 0);
  const totalPendente = (porStatus.pendente ?? []).reduce((s, d) => s + d.valor, 0);

  const lista = porStatus[aba] ?? [];

  return (
    <DashboardLayout type="ong">
      <PageHeader
        title="Doações"
        description={
          isPending
            ? "Carregando…"
            : `${formatCurrency(totalConfirmado)} confirmados · ${formatCurrency(totalPendente)} aguardando sua confirmação`
        }
        icon={<DollarSign className="h-6 w-6" />}
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar as doações" onRetry={() => refetch()} />
      ) : (
        <>
          <Tabs value={aba} onValueChange={(v) => setAba(v as StatusDoacao)} className="mb-4">
            <TabsList>
              <TabsTrigger value="pendente">
                Aguardando ({porStatus.pendente?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="confirmada">
                Confirmadas ({porStatus.confirmada?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="cancelada">
                Não recebidas ({porStatus.cancelada?.length ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {aba === "pendente" && (porStatus.pendente?.length ?? 0) > 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              O progresso das necessidades só aumenta depois que você confirma o
              recebimento. Confirme apenas o que chegou de fato.
            </p>
          )}

          <Card>
            <CardContent className="p-0">
              {isPending ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : lista.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Clock}
                    title={
                      aba === "pendente"
                        ? "Nenhuma doação aguardando confirmação"
                        : aba === "confirmada"
                          ? "Nenhuma doação confirmada ainda"
                          : "Nenhuma doação marcada como não recebida"
                    }
                    description={
                      aba === "pendente"
                        ? "Quando alguém doar, a doação aparece aqui para você confirmar."
                        : undefined
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doador</TableHead>
                      <TableHead>O que</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          {d.anonima ? (
                            <span className="text-muted-foreground">Doador anônimo</span>
                          ) : (
                            <>
                              <div className="font-medium">
                                {d.doador?.nome || d.doador_nome || "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {d.doador?.email || d.doador_email || ""}
                              </div>
                            </>
                          )}
                        </TableCell>

                        <TableCell>
                          {d.necessidade ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                              {d.quantidade} {d.necessidade.unidade ?? ""} de {d.necessidade.nome}
                            </span>
                          ) : (
                            <span className="font-medium">{formatCurrency(d.valor)}</span>
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

                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(d.data_doacao)}
                        </TableCell>

                        <TableCell className="text-right">
                          {d.status === "pendente" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={alterarStatus.isPending}
                                onClick={() => alterarStatus.mutate({ id: d.id, status: "confirmada" })}
                              >
                                <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                                Recebi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={alterarStatus.isPending}
                                onClick={() => alterarStatus.mutate({ id: d.id, status: "cancelada" })}
                              >
                                <X className="mr-1 h-4 w-4" aria-hidden="true" />
                                Não chegou
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Badge
                                className={
                                  d.status === "confirmada"
                                    ? "bg-success text-success-foreground"
                                    : undefined
                                }
                                variant={d.status === "confirmada" ? "default" : "secondary"}
                              >
                                {d.status === "confirmada" ? "Confirmada" : "Não recebida"}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={alterarStatus.isPending}
                                onClick={() => alterarStatus.mutate({ id: d.id, status: "pendente" })}
                              >
                                <Undo2 className="mr-1 h-4 w-4" aria-hidden="true" />
                                Desfazer
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
