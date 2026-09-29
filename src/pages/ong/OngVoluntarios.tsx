import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CHAVE_PENDENCIAS, DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Seo } from "@/components/common/Seo";
import { Stat } from "@/components/common/Stat";
import { ConfirmarExclusao } from "@/components/common/ConfirmarExclusao";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CTA, TERMOS, VAZIO } from "@/lib/copy";
import { mensagemAmigavel } from "@/lib/erros";
import { exportToCsv } from "@/lib/exportCsv";
import { formatDate } from "@/lib/format";

type StatusInscricao = "pendente" | "aprovado" | "rejeitado";

/** Os mesmos nomes de estado que o admin usa. */
const ROTULOS: Record<StatusInscricao, string> = {
  pendente: TERMOS.aguardando,
  aprovado: TERMOS.aprovado,
  rejeitado: TERMOS.recusado,
};

/**
 * Inscrições de voluntariado nos projetos da ONG.
 *
 * A lista antes puxava a tabela `profiles` inteira e cruzava no cliente, ou
 * seja, baixava o cadastro de todo mundo da plataforma para exibir os nomes de
 * meia dúzia de inscritos. O filtro vai no banco.
 */
export default function OngVoluntarios() {
  const { ongId } = useAuth();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<StatusInscricao>("pendente");

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
      const porProjeto = new Map(projetosLista.map((p) => [p.id, p]));

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

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["ong-voluntarios", ongId] });
    queryClient.invalidateQueries({ queryKey: ["ong-resumo", ongId] });
    queryClient.invalidateQueries({ queryKey: [...CHAVE_PENDENCIAS] });
  };

  const alterarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusInscricao }) => {
      const { error } = await supabase.from("voluntariado").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, { status }) => {
      toast.success(status === "aprovado" ? "Inscrição aprovada" : "Inscrição recusada");
      invalidar();
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível responder a inscrição.")),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voluntariado").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição removida");
      invalidar();
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível remover a inscrição.")),
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

  // Os rótulos das colunas alimentam o cabeçalho do arquivo: não mudar.
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
        action={
          <Button variant="outline" onClick={baixarCsv} disabled={!data?.length}>
            <Download aria-hidden="true" />
            {CTA.exportarCsv}
          </Button>
        }
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar os voluntários" onRetry={() => refetch()} />
      ) : isPending ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </>
      ) : data.length === 0 ? (
        <EmptyState
          title="Nenhuma inscrição de voluntário ainda"
          description="As inscrições chegam pela página pública do projeto. Projeto no ar, com necessidades publicadas, é o que traz voluntário."
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
              destaque={porStatus.pendente.length > 0}
            />
            <Stat
              valor={porStatus.aprovado.length}
              rotulo={porStatus.aprovado.length === 1 ? "voluntário aprovado" : "voluntários aprovados"}
            />
            <Stat
              valor={porStatus.rejeitado.length}
              rotulo={porStatus.rejeitado.length === 1 ? "inscrição recusada" : "inscrições recusadas"}
            />
          </div>

          <Tabs
            value={aba}
            onValueChange={(v) => setAba(v as StatusInscricao)}
            className="mt-8"
          >
            <TabsList>
              <TabsTrigger value="pendente">{TERMOS.aguardando} ({porStatus.pendente.length})</TabsTrigger>
              <TabsTrigger value="aprovado">Aprovados ({porStatus.aprovado.length})</TabsTrigger>
              <TabsTrigger value="rejeitado">Recusados ({porStatus.rejeitado.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="mt-4 overflow-hidden">
            <CardContent className="p-0">
              {lista.length === 0 ? (
                <EmptyState
                  className="m-4 border-0 bg-transparent"
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
                  action={
                    aba === "pendente"
                      ? { label: "Ver os aprovados", onClick: () => setAba("aprovado") }
                      : { label: "Ver as pendentes", onClick: () => setAba("pendente") }
                  }
                />
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
                              {v.pessoa?.email || VAZIO.naoInformado}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {v.projeto?.nome_projeto ?? VAZIO.semProjeto}
                          </TableCell>
                          <TableCell className="numero whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(v.data_inscricao)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                v.status === "aprovado"
                                  ? "success"
                                  : v.status === "rejeitado"
                                    ? "neutro"
                                    : "outline"
                              }
                            >
                              {ROTULOS[v.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {v.status !== "aprovado" && (
                                <Button
                                  size="sm"
                                  disabled={alterarStatus.isPending}
                                  onClick={() =>
                                    alterarStatus.mutate({ id: v.id, status: "aprovado" })
                                  }
                                >
                                  {carregando ? (
                                    <Loader2 className="animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check aria-hidden="true" />
                                  )}
                                  <span aria-hidden="true">Aprovar</span>
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
                                    <Loader2 className="animate-spin" aria-hidden="true" />
                                  ) : (
                                    <X aria-hidden="true" />
                                  )}
                                  <span aria-hidden="true">Recusar</span>
                                  <span className="sr-only">Recusar inscrição de {nome}</span>
                                </Button>
                              )}
                              <ConfirmarExclusao
                                titulo={`Remover a inscrição de ${nome}?`}
                                descricao="A pessoa sai da lista e perde o histórico desta inscrição. Se você só não quer contar com ela nesta ação, recuse em vez de remover."
                                rotuloConfirmar={CTA.remover("inscrição")}
                                onConfirmar={() => remover.mutateAsync(v.id).catch(() => {})}
                              >
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 aria-hidden="true" />
                                  <span aria-hidden="true">Remover</span>
                                  <span className="sr-only">Remover inscrição de {nome}</span>
                                </Button>
                              </ConfirmarExclusao>
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
    </DashboardLayout>
  );
}
