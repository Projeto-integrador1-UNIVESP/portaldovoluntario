import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { isEndBeforeStart, normalizeUrl } from "@/lib/validators";
import {
  AlternarStatus, Campo, ExcluirLinha, Paginacao, TabelaAdmin,
} from "./_shared";
import { POR_PAGINA, mensagemDeErro, useCorrigirPaginaVazia } from "./_shared-lib";

const formVazio = {
  nome_projeto: "", id_ong: "", data_inicio: "", data_fim: "",
  cidade: "", causa: "", descricao: "", capa: "",
};

type FormProjeto = typeof formVazio;

const COLUNAS = [
  { rotulo: "Projeto" },
  { rotulo: "ONG" },
  { rotulo: "Período" },
  { rotulo: "Causa" },
  { rotulo: "Visível no site" },
  { rotulo: "Ações", className: "text-right" },
];

const limparBusca = (termo: string) => termo.replace(/[,()*%\\]/g, " ").trim();

/**
 * Projetos das organizações.
 *
 * Além de paginar e padronizar os estados, esta versão passa a editar `cidade`,
 * `causa` e a imagem de capa. São exatamente os campos pelos quais a busca
 * pública filtra (`buscar_projetos`): sem eles, um projeto criado aqui não
 * aparecia em nenhum filtro do site.
 */
export default function AdminProjetos() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState("");
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string } | null>(null);
  const [form, setForm] = useState<FormProjeto>(formVazio);

  const termo = limparBusca(busca);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-projetos", termo, pagina],
    queryFn: async () => {
      let consulta = supabase
        .from("projetos")
        .select(
          "id, nome_projeto, descricao, data_inicio, data_fim, cidade, causa, capa_url, img_url, status, id_ong",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .order("id")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

      if (termo) consulta = consulta.ilike("nome_projeto", `%${termo}%`);

      const { data: projetos, count, error } = await consulta;
      if (error) throw error;

      const idsOngs = [...new Set((projetos ?? []).map((p) => p.id_ong))];
      const { data: ongs } = idsOngs.length
        ? await supabase.from("ongs").select("id, nome").in("id", idsOngs)
        : { data: [] };
      const porOng = new Map((ongs ?? []).map((o) => [o.id, o.nome]));

      return {
        linhas: (projetos ?? []).map((p) => ({ ...p, ong: porOng.get(p.id_ong) ?? null })),
        total: count ?? 0,
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

  const { data: ongs } = useQuery({
    queryKey: ["admin-ongs-select"],
    queryFn: async () => {
      const { data: linhasDeOng, error } = await supabase
        .from("ongs")
        .select("id, nome")
        .eq("status", true)
        .order("nome");
      if (error) throw error;
      return linhasDeOng ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.nome_projeto.trim()) throw new Error("Informe o nome do projeto.");
      if (!form.id_ong) throw new Error("Escolha a ONG responsável.");
      if (!form.descricao.trim()) throw new Error("Escreva a descrição — é o que o doador lê.");
      if (!form.data_inicio) throw new Error("Informe a data de início.");
      if (!form.data_fim) throw new Error("Informe a data de término.");
      if (isEndBeforeStart(form.data_inicio, form.data_fim)) {
        throw new Error("O término não pode ser antes do início.");
      }

      const capa = normalizeUrl(form.capa) || null;
      const payload = {
        nome_projeto: form.nome_projeto.trim(),
        id_ong: form.id_ong,
        descricao: form.descricao.trim(),
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        cidade: form.cidade.trim() || null,
        causa: form.causa.trim() || null,
        // Mesmo motivo da tela de ONGs: o site prefere `capa_url` e as telas
        // antigas só escreviam `img_url`.
        capa_url: capa,
        img_url: capa,
      };

      const { error } = editando
        ? await supabase.from("projetos").update(payload).eq("id", editando.id)
        : await supabase.from("projetos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editando ? "Projeto atualizado." : "Projeto criado.");
      fechar();
      queryClient.invalidateQueries({ queryKey: ["admin-projetos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível salvar o projeto.")),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("projetos").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status ? "Projeto visível no site." : "Projeto oculto do site.");
      queryClient.invalidateQueries({ queryKey: ["admin-projetos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível alterar a visibilidade.")),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projetos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto excluído.");
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-projetos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível excluir o projeto.")),
  });

  const fechar = () => {
    setDialogoAberto(false);
    setEditando(null);
    setForm(formVazio);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(formVazio);
    setDialogoAberto(true);
  };

  const abrirEdicao = (p: (typeof linhas)[number]) => {
    setEditando({ id: p.id });
    setForm({
      nome_projeto: p.nome_projeto ?? "",
      id_ong: p.id_ong ?? "",
      data_inicio: p.data_inicio ?? "",
      data_fim: p.data_fim ?? "",
      cidade: p.cidade ?? "",
      causa: p.causa ?? "",
      descricao: p.descricao ?? "",
      capa: p.capa_url ?? p.img_url ?? "",
    });
    setDialogoAberto(true);
  };

  return (
    <DashboardLayout type="admin">
      <Seo title="Projetos" noIndex />
      <PageHeader
        title="Projetos"
        description="Projetos das organizações e o que aparece na busca do site"
        icon={<FolderOpen className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo projeto
          </Button>
        }
      />

      <div className="mb-4 sm:max-w-sm">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="busca-projetos"
            type="search"
            autoComplete="off"
            className="pl-9"
            placeholder="Buscar por nome do projeto"
            aria-label="Buscar projeto por nome"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
          />
        </div>
      </div>

      <TabelaAdmin
        colunas={COLUNAS}
        carregando={isPending}
        erro={isError}
        tituloErro="Não foi possível carregar os projetos"
        aoTentarDeNovo={() => refetch()}
        vazia={linhas.length === 0}
        vazio={
          termo ? (
            <EmptyState
              icon={Search}
              title="Nenhum projeto encontrado"
              description={`Nada corresponde a “${busca}”.`}
              action={{ label: "Limpar a busca", onClick: () => setBusca("") }}
            />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Nenhum projeto cadastrado"
              description="É no projeto que a ONG publica o que está faltando. Sem projeto, não há necessidade para o doador ver."
              action={{ label: "Criar projeto", onClick: abrirNovo }}
            />
          )
        }
        rodape={<Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />}
      >
        {linhas.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="max-w-64">
              <div className="break-words font-medium">{p.nome_projeto}</div>
              <div className="text-xs text-muted-foreground">
                {p.cidade || "Sem cidade — não aparece no filtro por cidade"}
              </div>
            </TableCell>

            <TableCell className="text-muted-foreground">{p.ong ?? "—"}</TableCell>

            <TableCell className="text-muted-foreground">
              {p.data_inicio ? formatDate(p.data_inicio) : "—"}
              {p.data_fim ? ` a ${formatDate(p.data_fim)}` : ""}
            </TableCell>

            <TableCell className="text-muted-foreground">{p.causa || "—"}</TableCell>

            <TableCell>
              <AlternarStatus
                ativo={Boolean(p.status)}
                rotulo={`Visibilidade do projeto ${p.nome_projeto}`}
                ocupado={alternarStatus.isPending}
                aoAlternar={() => alternarStatus.mutate({ id: p.id, status: !p.status })}
              />
            </TableCell>

            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Editar ${p.nome_projeto}`}
                  onClick={() => abrirEdicao(p)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <ExcluirLinha
                  rotuloAcessivel={`Excluir ${p.nome_projeto}`}
                  titulo="Excluir este projeto?"
                  descricao="As necessidades publicadas nele são apagadas, e as doações feitas para essas necessidades perdem o vínculo com o item — elas continuam no histórico, mas sem dizer a que se referiam. Para tirar do ar sem perder nada, desative."
                  aoConfirmar={() => excluir.mutate(p.id)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Dialog open={dialogoAberto} onOpenChange={(aberto) => (aberto ? setDialogoAberto(true) : fechar())}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            <DialogDescription>
              Cidade e causa são o que faz o projeto aparecer nos filtros da busca
              pública. Vale preencher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Campo id="projeto-nome" rotulo="Nome do projeto" obrigatorio>
              <Input
                id="projeto-nome"
                autoComplete="off"
                maxLength={80}
                value={form.nome_projeto}
                onChange={(e) => setForm({ ...form, nome_projeto: e.target.value })}
              />
            </Campo>

            <Campo id="projeto-ong" rotulo="ONG responsável" obrigatorio>
              <Select value={form.id_ong} onValueChange={(v) => setForm({ ...form, id_ong: v })}>
                <SelectTrigger id="projeto-ong">
                  <SelectValue placeholder="Escolha a organização" />
                </SelectTrigger>
                <SelectContent>
                  {(ongs ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="projeto-inicio" rotulo="Início" obrigatorio>
                <Input
                  id="projeto-inicio"
                  type="date"
                  autoComplete="off"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </Campo>
              <Campo id="projeto-fim" rotulo="Término" obrigatorio>
                <Input
                  id="projeto-fim"
                  type="date"
                  autoComplete="off"
                  min={form.data_inicio || undefined}
                  value={form.data_fim}
                  onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="projeto-cidade" rotulo="Cidade" dica="Usada no filtro por cidade do site.">
                <Input
                  id="projeto-cidade"
                  autoComplete="off"
                  maxLength={80}
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </Campo>
              <Campo id="projeto-causa" rotulo="Causa" dica="Ex.: alimentação, moradia, educação.">
                <Input
                  id="projeto-causa"
                  autoComplete="off"
                  maxLength={40}
                  value={form.causa}
                  onChange={(e) => setForm({ ...form, causa: e.target.value })}
                />
              </Campo>
            </div>

            <Campo id="projeto-descricao" rotulo="Descrição" obrigatorio>
              <Textarea
                id="projeto-descricao"
                rows={4}
                maxLength={900}
                placeholder="O que o projeto faz, quem atende e por que precisa de ajuda."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </Campo>

            <Campo id="projeto-capa" rotulo="Capa (endereço da imagem)">
              <Input
                id="projeto-capa"
                autoComplete="off"
                placeholder="https://…/capa.jpg"
                value={form.capa}
                onChange={(e) => setForm({ ...form, capa: e.target.value })}
              />
            </Campo>
            {form.capa && (
              <img
                src={normalizeUrl(form.capa)}
                alt=""
                className="h-32 w-full rounded-lg border object-cover"
              />
            )}

            <Callout tom="info">
              O que falta arrecadar é publicado pela própria ONG, no painel dela,
              como necessidade do projeto.
            </Callout>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : editando ? "Salvar alterações" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
