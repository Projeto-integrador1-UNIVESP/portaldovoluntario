import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Loader2, Trash2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { exportToCsv } from "@/lib/exportCsv";
import { formatDate } from "@/lib/format";

type StatusInscricao = "pendente" | "aprovado" | "rejeitado";

const ROTULOS: Record<StatusInscricao, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

/**
 * Inscrições de voluntariado nos projetos da ONG.
 *
 * A lista antes puxava a tabela `profiles` inteira e cruzava no cliente — ou
 * seja, baixava o cadastro de todo mundo da plataforma para exibir os nomes de
 * meia dúzia de inscritos. Agora o filtro vai no banco.
 */
export default function OngVoluntarios() {
  const { ongId } = useAuth();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<StatusInscricao>("pendente");
  const [aRemover, setARemover] = useState<{ id: string; nome: string } | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-voluntarios", ongId],
    queryFn: async () => {
      const { data: projetos, error: erroProjetos } = await supabase
        .from("projetos")
        .select("id, nome_projeto")
        .eq("id_ong", ongId!);
      if (erroProjetos) throw erroProjetos;

      const projetosLista = projetos ?? [];
      const ids = projetosLista.map((p) => p.id);

      type Inscricao = {
        id: string;
        status: string | null;
        data_inscricao: string;
        id_projeto: string;
        id_usuario: string;
      };

      let linhas: Inscricao[] = [];
      if (ids.length) {
        const { data: inscricoes, error } = await supabase
          .from("voluntariado")
          .select("id, status, data_inscricao, id_projeto, id_usuario")
          .in("id_projeto", ids)
          .order("data_inscricao", { ascending: false });
        if (error) throw error;
        linhas = inscricoes ?? [];
      }

      const idsUsuarios = [...new Set(linhas.map((v) => v.id_usuario).filter(Boolean))];

      const perfis = idsUsuarios.length
        ? await supabase.from("profiles").select("user_id, nome, email, telefone").in("user_id", idsUsuarios)
        : { data: [] };

      const porUsuario = new Map((perfis.data ?? []).map((p) => [p.user_id, p]));
      const porProjeto = new Map((projetos ?? []).map((p) => [p.id, p]));

      return linhas.map((v) => ({
        ...v,
        status: (v.status ?? "pendente") as StatusInscricao,
        pessoa: porUsuario.get(v.id_usuario) ?? null,
        projeto: porProjeto.get(v.id_projeto) ?? null,
      }));
    },
    enabled: Boolean(ongId),
    staleTime: 30_000,
  });

  const alterarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusInscricao }) => {
      const { error } = await supabase.from("voluntariado").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, { status }) => {
      toast.success(
        status === "aprovado" ? "Inscrição aprovada." : "Inscrição recusada.",
      );
      queryClient.invalidateQueries({ queryKey: ["ong-voluntarios", ongId] });
    },
    onError: () => toast.error("Não foi possível atualizar a inscrição."),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voluntariado").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição removida.");
      setARemover(null);
      queryClient.invalidateQueries({ queryKey: ["ong-voluntarios", ongId] });
    },
    onError: () => toast.error("Não foi possível remover a inscrição."),
  });

  const emAndamento = alterarStatus.isPending ? alterarStatus.variables?.id : null;

  const porStatus = useMemo(() => {
    const grupos: Record<StatusInscricao, NonNullable<typeof data>> = {
      pendente: [], aprovado: [], rejeitado: [],
    };
    for (const v of data ?? []) grupos[v.status]?.push(v);
    return grupos;
  }, [data]);

  const lista = porStatus[aba];

  const baixarCsv = () =>
    exportToCsv(
      "voluntarios.csv",
      (data ?? []).map((v) => ({
        nome: v.pessoa?.nome ?? "",
        email: v.pessoa?.email ?? "",
        telefone: v.pessoa?.telefone ?? "",
        projeto: v.projeto?.nome_projeto ?? "",
        data: formatDate(v.data_inscricao),
        status: ROTULOS[v.status],
      })),
    );

  return (
    <DashboardLayout type="ong">
      <Seo title="Voluntários" noIndex />
      <PageHeader
        title="Voluntários"
        description="Quem se inscreveu nos seus projetos e está esperando resposta."
        icon={<UserCheck className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button variant="outline" onClick={baixarCsv} disabled={!data?.length}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Exportar CSV
          </Button>
        }
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar os voluntários" onRetry={() => refetch()} />
      ) : isPending ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </>
      ) : data.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Nenhuma inscrição de voluntário ainda"
          description="As inscrições chegam pela página pública do projeto. Um projeto no ar, com necessidades publicadas, é o que traz voluntário."
          action={{ label: "Ver meus projetos", to: "/ong/projetos" }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              valor={porStatus.pendente.length}
              rotulo={
                porStatus.pendente.length === 1
                  ? "inscrição esperando resposta"
                  : "inscrições esperando resposta"
              }
            />
            <Stat
              valor={porStatus.aprovado.length}
              rotulo={porStatus.aprovado.length === 1 ? "voluntário aprovado" : "voluntários aprovados"}
            />
            <Stat valor={porStatus.rejeitado.length} rotulo="inscrições recusadas" />
          </div>

          <Tabs
            value={aba}
            onValueChange={(v) => setAba(v as StatusInscricao)}
            className="mt-6"
          >
            <TabsList>
              <TabsTrigger value="pendente">Pendentes ({porStatus.pendente.length})</TabsTrigger>
              <TabsTrigger value="aprovado">Aprovados ({porStatus.aprovado.length})</TabsTrigger>
              <TabsTrigger value="rejeitado">Recusados ({porStatus.rejeitado.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="mt-4 overflow-hidden">
            <CardContent className="p-0">
              {lista.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={UserCheck}
                    title={
                      aba === "pendente"
                        ? "Nenhuma inscrição esperando resposta"
                        : aba === "aprovado"
                          ? "Nenhum voluntário aprovado ainda"
                          : "Nenhuma inscrição recusada"
                    }
                    description={
                      aba === "pendente"
                        ? "Tudo que chegou já foi respondido."
                        : "As inscrições aparecem aqui conforme você responde cada uma."
                    }
                    action={{
                      label: "Ver as pendentes",
                      onClick: () => setAba("pendente"),
                    }}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Inscrição</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((v) => {
                      const nome = v.pessoa?.nome || "Voluntário sem cadastro completo";
                      const carregando = emAndamento === v.id;

                      return (
                        <TableRow key={v.id}>
                          <TableCell>
                            <div className="font-medium">{nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {v.pessoa?.email || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {v.projeto?.nome_projeto ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(v.data_inscricao)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                v.status === "aprovado"
                                  ? "default"
                                  : v.status === "rejeitado"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {ROTULOS[v.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {v.status !== "aprovado" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={alterarStatus.isPending}
                                  onClick={() =>
                                    alterarStatus.mutate({ id: v.id, status: "aprovado" })
                                  }
                                >
                                  {carregando ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                                  )}
                                  <span className="sr-only">Aprovar {nome}</span>
                                </Button>
                              )}
                              {v.status !== "rejeitado" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={alterarStatus.isPending}
                                  onClick={() =>
                                    alterarStatus.mutate({ id: v.id, status: "rejeitado" })
                                  }
                                >
                                  {carregando ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <X className="h-4 w-4" aria-hidden="true" />
                                  )}
                                  <span className="sr-only">Recusar inscrição de {nome}</span>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setARemover({ id: v.id, nome })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                                <span className="sr-only">Remover inscrição de {nome}</span>
                              </Button>
                            </div>
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

      <AlertDialog open={Boolean(aRemover)} onOpenChange={(v) => !v && setARemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a inscrição de {aRemover?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa sai da lista e perde o histórico desta inscrição. Se você só não quer
              contar com ela nesta ação, recuse a inscrição em vez de remover.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={remover.isPending}
              onClick={(e) => {
                // O AlertDialogAction fecha o diálogo por padrão; aqui o fechamento
                // acontece quando a remoção volta, para o erro ter onde aparecer.
                e.preventDefault();
                if (aRemover) remover.mutate(aRemover.id);
              }}
            >
              {remover.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
