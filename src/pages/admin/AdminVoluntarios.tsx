import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Check, Download, Plus, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableCell, TableRow } from "@/components/ui/table";
import { exportToCsv } from "@/lib/exportCsv";
import { formatDate } from "@/lib/format";
import { isValidEmail } from "@/lib/validators";
import { Campo, ExcluirLinha, Paginacao, TabelaAdmin } from "./_shared";
import { POR_PAGINA, contarLinhas, mensagemDeErro, useCorrigirPaginaVazia } from "./_shared-lib";

type Situacao = "pendente" | "aprovado" | "rejeitado";

const TETO_DO_CSV = 5_000;

const ROTULOS: Record<Situacao, string> = {
  pendente: "Aguardando",
  aprovado: "Aprovados",
  rejeitado: "Recusados",
};

const COLUNAS = [
  { rotulo: "Voluntário" },
  { rotulo: "Projeto" },
  { rotulo: "Inscrição" },
  { rotulo: "Situação" },
  { rotulo: "Ações", className: "text-right" },
];

type Inscricao = {
  id: string;
  status: string | null;
  data_inscricao: string;
  id_usuario: string;
  id_projeto: string;
  pessoa: { nome: string; email: string } | null;
  projeto: string | null;
};

/** Nome da pessoa e do projeto de cada inscrição, em duas consultas por id. */
async function comRelacionados(linhas: { id_usuario: string; id_projeto: string }[]) {
  const idsPessoas = [...new Set(linhas.map((l) => l.id_usuario))];
  const idsProjetos = [...new Set(linhas.map((l) => l.id_projeto))];

  const [pessoas, projetos] = await Promise.all([
    idsPessoas.length
      ? supabase.from("profiles").select("user_id, nome, email").in("user_id", idsPessoas)
      : Promise.resolve({ data: [] }),
    idsProjetos.length
      ? supabase.from("projetos").select("id, nome_projeto").in("id", idsProjetos)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    porPessoa: new Map((pessoas.data ?? []).map((p) => [p.user_id, p])),
    porProjeto: new Map((projetos.data ?? []).map((p) => [p.id, p.nome_projeto])),
  };
}

/**
 * Inscrições de voluntariado.
 *
 * A tela baixava a tabela toda e filtrava as três abas na memória do navegador.
 * Agora cada aba é uma consulta com `.range()`, e os números das abas vêm de
 * contagens no servidor, então continuam certos mesmo com a lista paginada.
 */
export default function AdminVoluntarios() {
  const queryClient = useQueryClient();
  const [parametros, setParametros] = useSearchParams();
  const situacao = (parametros.get("situacao") as Situacao | null) ?? "pendente";
  const [pagina, setPagina] = useState(0);
  const [criando, setCriando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [form, setForm] = useState({ email: "", id_projeto: "", status: "aprovado" as Situacao });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-voluntarios", situacao, pagina],
    queryFn: async () => {
      const [{ data: linhas, count, error }, pendentes, aprovados, rejeitados] = await Promise.all([
        supabase
          .from("voluntariado")
          .select("id, status, data_inscricao, id_usuario, id_projeto", { count: "exact" })
          .eq("status", situacao)
          .order("data_inscricao", { ascending: false })
          .order("id")
          .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1),
        contarLinhas(
          supabase
            .from("voluntariado")
            .select("id", { count: "exact", head: true })
            .eq("status", "pendente"),
        ),
        contarLinhas(
          supabase
            .from("voluntariado")
            .select("id", { count: "exact", head: true })
            .eq("status", "aprovado"),
        ),
        contarLinhas(
          supabase
            .from("voluntariado")
            .select("id", { count: "exact", head: true })
            .eq("status", "rejeitado"),
        ),
      ]);
      if (error) throw error;

      const { porPessoa, porProjeto } = await comRelacionados(linhas ?? []);

      return {
        linhas: (linhas ?? []).map((l) => ({
          ...l,
          pessoa: porPessoa.get(l.id_usuario) ?? null,
          projeto: porProjeto.get(l.id_projeto) ?? null,
        })) as Inscricao[],
        total: count ?? 0,
        contagens: { pendente: pendentes, aprovado: aprovados, rejeitado: rejeitados },
      };
    },
    staleTime: 30_000,
  });

  const linhas = data?.linhas ?? [];

  useCorrigirPaginaVazia({
    pagina,
    total: data?.total ?? 0,
    carregando: isPending,
    aoCorrigir: setPagina,
  });

  const { data: projetos } = useQuery({
    queryKey: ["admin-projetos-select"],
    queryFn: async () => {
      const { data: linhasDeProjeto, error } = await supabase
        .from("projetos")
        .select("id, nome_projeto")
        .eq("status", true)
        .order("nome_projeto");
      if (error) throw error;
      return linhasDeProjeto ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const mudarSituacao = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Situacao }) => {
      const { data: alteradas, error } = await supabase
        .from("voluntariado")
        .update({ status })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!alteradas?.length) throw new Error("Sem permissão para alterar esta inscrição.");
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "aprovado" ? "Inscrição aprovada." : "Inscrição recusada.");
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-voluntarios"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível atualizar a inscrição.")),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voluntariado").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição removida.");
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-voluntarios"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível remover a inscrição.")),
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!isValidEmail(form.email)) throw new Error("Informe o e-mail de quem vai ser inscrito.");
      if (!form.id_projeto) throw new Error("Escolha o projeto.");

      // Buscar a pessoa pelo e-mail evita carregar a tabela de perfis num
      // `Select`, que era o que a versão anterior fazia.
      const { data: pessoa, error: erroDaBusca } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("email", form.email.trim())
        .maybeSingle();
      if (erroDaBusca) throw erroDaBusca;
      if (!pessoa) throw new Error("Não existe conta com esse e-mail na plataforma.");

      const { error } = await supabase.from("voluntariado").insert({
        id_usuario: pessoa.user_id,
        id_projeto: form.id_projeto,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voluntário inscrito.");
      setCriando(false);
      setForm({ email: "", id_projeto: "", status: "aprovado" });
      queryClient.invalidateQueries({ queryKey: ["admin-voluntarios"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível inscrever o voluntário.")),
  });

  const exportar = async () => {
    setExportando(true);
    try {
      const { data: todas, error } = await supabase
        .from("voluntariado")
        .select("id, status, data_inscricao, id_usuario, id_projeto")
        .eq("status", situacao)
        .order("data_inscricao", { ascending: false })
        .order("id")
        .limit(TETO_DO_CSV);
      if (error) throw error;

      const { porPessoa, porProjeto } = await comRelacionados(todas ?? []);
      exportToCsv(
        `voluntarios-${situacao}.csv`,
        (todas ?? []).map((v) => ({
          nome: porPessoa.get(v.id_usuario)?.nome ?? "",
          email: porPessoa.get(v.id_usuario)?.email ?? "",
          projeto: porProjeto.get(v.id_projeto) ?? "",
          inscricao: formatDate(v.data_inscricao),
          situacao: v.status ?? "",
        })),
      );

      const total = data?.total ?? (todas ?? []).length;
      toast.success(
        (todas ?? []).length < total
          ? `${(todas ?? []).length} de ${total} inscrições exportadas. O arquivo traz as mais recentes.`
          : `${(todas ?? []).length} ${(todas ?? []).length === 1 ? "inscrição exportada" : "inscrições exportadas"}.`,
      );
    } catch (erro) {
      toast.error(mensagemDeErro(erro, "Não foi possível gerar o arquivo."));
    } finally {
      setExportando(false);
    }
  };

  const trocarSituacao = (nova: string) => {
    const proximos = new URLSearchParams(parametros);
    if (nova === "pendente") proximos.delete("situacao");
    else proximos.set("situacao", nova);
    setParametros(proximos, { replace: true });
    setPagina(0);
  };

  return (
    <DashboardLayout type="admin">
      <Seo title="Voluntários" noIndex />
      <PageHeader
        title="Voluntários"
        description="Inscrições feitas nos projetos e o que falta responder"
        icon={<UserCheck className="h-6 w-6" aria-hidden="true" />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportar} disabled={exportando}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {exportando ? "Gerando…" : "Exportar CSV"}
            </Button>
            <Button onClick={() => setCriando(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Inscrever voluntário
            </Button>
          </div>
        }
      />

      <Tabs value={situacao} onValueChange={trocarSituacao} className="mb-4">
        <TabsList className="flex-wrap">
          {(Object.keys(ROTULOS) as Situacao[]).map((s) => (
            <TabsTrigger key={s} value={s}>
              {ROTULOS[s]} ({data?.contagens[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <TabelaAdmin
        colunas={COLUNAS}
        carregando={isPending}
        erro={isError}
        tituloErro="Não foi possível carregar as inscrições"
        aoTentarDeNovo={() => refetch()}
        vazia={linhas.length === 0}
        vazio={
          <EmptyState
            icon={UserCheck}
            title={
              situacao === "pendente"
                ? "Nenhuma inscrição aguardando resposta"
                : situacao === "aprovado"
                  ? "Nenhum voluntário aprovado ainda"
                  : "Nenhuma inscrição recusada"
            }
            description={
              situacao === "pendente"
                ? "Quando alguém se inscrever num projeto, a inscrição aparece aqui para você responder."
                : undefined
            }
            action={{ label: "Inscrever voluntário", onClick: () => setCriando(true) }}
          />
        }
        rodape={<Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />}
      >
        {linhas.map((v) => (
          <TableRow key={v.id}>
            <TableCell className="max-w-64">
              <div className="break-words font-medium">{v.pessoa?.nome ?? "Conta removida"}</div>
              <div className="break-all text-xs text-muted-foreground">{v.pessoa?.email ?? ""}</div>
            </TableCell>

            <TableCell className="text-muted-foreground">
              {v.projeto ?? "Projeto removido"}
            </TableCell>

            <TableCell className="text-muted-foreground">{formatDate(v.data_inscricao)}</TableCell>

            <TableCell>
              <Badge
                variant={
                  v.status === "aprovado" ? "default" : v.status === "rejeitado" ? "destructive" : "secondary"
                }
              >
                {v.status === "aprovado" ? "Aprovado" : v.status === "rejeitado" ? "Recusado" : "Aguardando"}
              </Badge>
            </TableCell>

            <TableCell className="text-right">
              <div className="flex flex-wrap justify-end gap-1">
                {v.status !== "aprovado" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mudarSituacao.isPending}
                    onClick={() => mudarSituacao.mutate({ id: v.id, status: "aprovado" })}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Aprovar
                  </Button>
                )}
                {v.status !== "rejeitado" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mudarSituacao.isPending}
                    onClick={() => mudarSituacao.mutate({ id: v.id, status: "rejeitado" })}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Recusar
                  </Button>
                )}
                <ExcluirLinha
                  rotuloAcessivel={`Remover a inscrição de ${v.pessoa?.nome ?? "voluntário"}`}
                  titulo="Remover esta inscrição?"
                  descricao="A pessoa sai da lista do projeto. Ela pode se inscrever de novo pelo site."
                  rotuloConfirmar="Remover"
                  aoConfirmar={() => excluir.mutate(v.id)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscrever voluntário</DialogTitle>
            <DialogDescription>
              Para quem se ofereceu por fora do site. A pessoa precisa já ter conta
              na plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Campo
              id="voluntario-email"
              rotulo="E-mail da pessoa"
              obrigatorio
              dica="O mesmo e-mail que ela usa para entrar na plataforma."
            >
              <Input
                id="voluntario-email"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Campo>

            <Campo id="voluntario-projeto" rotulo="Projeto" obrigatorio>
              <Select
                value={form.id_projeto}
                onValueChange={(v) => setForm({ ...form, id_projeto: v })}
              >
                <SelectTrigger id="voluntario-projeto">
                  <SelectValue placeholder="Escolha o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {(projetos ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_projeto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo id="voluntario-situacao" rotulo="Situação">
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Situacao })}
              >
                <SelectTrigger id="voluntario-situacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="pendente">Aguardando</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
            <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
              {criar.isPending ? "Inscrevendo…" : "Inscrever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
