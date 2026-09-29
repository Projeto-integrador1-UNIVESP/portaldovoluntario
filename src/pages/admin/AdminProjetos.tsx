import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
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
import { CAUSAS, ehCausa } from "@/lib/constants/causas";
import { CTA, SUCESSO, TERMOS, VAZIO } from "@/lib/copy";
import { formatDate } from "@/lib/format";
import {
  PROJETO_VAZIO, payloadDoProjeto, projetoAdminSchema, projetoParaFormulario,
} from "@/lib/schemas/projeto";
import { normalizeUrl } from "@/lib/validators";
import {
  AlternarStatus, Campo, ExcluirLinha, Paginacao, TabelaAdmin, Vazio,
} from "./_shared";
import { POR_PAGINA, mensagemDeErro, useCorrigirPaginaVazia, useValidacao } from "./_shared-lib";

type FormProjeto = z.input<typeof projetoAdminSchema>;

const FORM_VAZIO: FormProjeto = { ...PROJETO_VAZIO, id_ong: "" };

const COLUNAS = [
  { rotulo: "Projeto" },
  { rotulo: "ONG" },
  { rotulo: "Período" },
  { rotulo: "Causa" },
  { rotulo: "No site" },
  { rotulo: "Ações", className: "text-right" },
];

const VISIBILIDADE = [TERMOS.visivel, TERMOS.oculto] as const;

const limparBusca = (termo: string) => termo.replace(/[,()*%\\]/g, " ").trim();

/**
 * Projetos das organizações.
 *
 * Usa o mesmo schema do painel da ONG: `causa` sai de uma lista fechada, que
 * é a mesma dos filtros do site, e a capa vai para `capa_url` e `img_url`.
 * Sem isso um projeto criado aqui não aparecia em filtro nenhum.
 */
export default function AdminProjetos() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState("");
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string; causaAntiga: string | null } | null>(null);
  const [form, setForm] = useState<FormProjeto>(FORM_VAZIO);
  const { erros, validar, erroDoServidor, limpar } = useValidacao(projetoAdminSchema, "projeto");

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
    mutationFn: async (dados: z.output<typeof projetoAdminSchema>) => {
      const payload = { ...payloadDoProjeto(dados), id_ong: dados.id_ong };
      const { error } = editando
        ? await supabase.from("projetos").update(payload).eq("id", editando.id)
        : await supabase.from("projetos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editando ? SUCESSO.salvo("Projeto") : SUCESSO.criado("Projeto"));
      fechar();
      queryClient.invalidateQueries({ queryKey: ["admin-projetos"] });
    },
    onError: (erro) => erroDoServidor(erro, "Não foi possível salvar o projeto."),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("projetos").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status ? "Projeto visível no site" : "Projeto oculto do site");
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
      toast.success(SUCESSO.excluido("Projeto"));
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-projetos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível excluir o projeto.")),
  });

  const fechar = () => {
    setDialogoAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
    limpar();
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    limpar();
    setDialogoAberto(true);
  };

  const abrirEdicao = (p: (typeof linhas)[number]) => {
    // Uma causa fora da lista (texto livre de antes) não entra no Select. A
    // tela avisa em vez de gravar em silêncio; sem escolha, o projeto fica sem causa.
    setEditando({ id: p.id, causaAntiga: p.causa && !ehCausa(p.causa) ? p.causa : null });
    setForm({ ...projetoParaFormulario(p), id_ong: p.id_ong ?? "" });
    limpar();
    setDialogoAberto(true);
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const dados = validar({ ...form, capa: normalizeUrl(form.capa ?? "") });
    if (dados) salvar.mutate(dados);
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
            <Plus aria-hidden="true" />
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
            name="busca"
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
              ilustracao="caixa"
              title="Nenhum projeto encontrado"
              description={`Nada corresponde a “${busca}”.`}
              action={{ label: "Limpar a busca", onClick: () => setBusca("") }}
            />
          ) : (
            <EmptyState
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
                {p.cidade || <Vazio />}
              </div>
            </TableCell>

            <TableCell className="text-muted-foreground">{p.ong ?? <Vazio texto={VAZIO.semOng} />}</TableCell>

            <TableCell className="numero text-muted-foreground">
              {p.data_inicio ? formatDate(p.data_inicio) : <Vazio texto={VAZIO.semData} />}
              {p.data_fim ? ` a ${formatDate(p.data_fim)}` : ""}
            </TableCell>

            <TableCell className="text-muted-foreground">{p.causa || <Vazio />}</TableCell>

            <TableCell>
              <AlternarStatus
                ativo={Boolean(p.status)}
                rotulo={`Visibilidade do projeto ${p.nome_projeto}`}
                rotulos={VISIBILIDADE}
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
                  <Pencil aria-hidden="true" />
                </Button>
                <ExcluirLinha
                  rotuloAcessivel={`Excluir ${p.nome_projeto}`}
                  titulo={`Excluir o projeto ${p.nome_projeto}?`}
                  descricao="As necessidades publicadas nele são apagadas. As doações feitas para elas continuam no histórico, mas sem dizer a que se referiam. Para tirar do ar sem perder nada, oculte o projeto."
                  rotuloConfirmar={CTA.excluir("projeto")}
                  aoConfirmar={() => excluir.mutateAsync(p.id)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Dialog open={dialogoAberto} onOpenChange={(aberto) => (aberto ? setDialogoAberto(true) : fechar())}>
        <DialogContent className="rolagem-contida max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editando ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            <DialogDescription>
              Cidade e causa são o que faz o projeto aparecer nos filtros da busca
              pública. Vale preencher.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={enviar} className="grid gap-4">
            <Campo id="projeto-nome_projeto" rotulo="Nome do projeto" obrigatorio erro={erros.nome_projeto}>
              <Input
                id="projeto-nome_projeto"
                name="nome_projeto"
                autoComplete="off"
                maxLength={80}
                value={form.nome_projeto}
                onChange={(e) => setForm({ ...form, nome_projeto: e.target.value })}
              />
            </Campo>

            <Campo id="projeto-id_ong" rotulo="ONG responsável" obrigatorio erro={erros.id_ong}>
              {(a11y) => (
                <Select value={form.id_ong} onValueChange={(v) => setForm({ ...form, id_ong: v })} name="id_ong">
                  <SelectTrigger {...a11y}>
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
              )}
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="projeto-data_inicio" rotulo="Início" obrigatorio erro={erros.data_inicio}>
                <Input
                  id="projeto-data_inicio"
                  name="data_inicio"
                  type="date"
                  autoComplete="off"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </Campo>
              <Campo id="projeto-data_fim" rotulo="Término" obrigatorio erro={erros.data_fim}>
                <Input
                  id="projeto-data_fim"
                  name="data_fim"
                  type="date"
                  autoComplete="off"
                  min={form.data_inicio || undefined}
                  value={form.data_fim}
                  onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="projeto-cidade" rotulo="Cidade" dica="Usada no filtro por cidade do site." erro={erros.cidade}>
                <Input
                  id="projeto-cidade"
                  name="cidade"
                  autoComplete="off"
                  maxLength={80}
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </Campo>
              <Campo
                id="projeto-causa"
                rotulo="Causa"
                erro={erros.causa}
                dica={
                  editando?.causaAntiga
                    ? `Este projeto tinha a causa “${editando.causaAntiga}”, que não está na lista. Escolha uma para ele entrar nos filtros.`
                    : "A mesma lista dos filtros do site."
                }
              >
                {(a11y) => (
                  <Select
                    value={form.causa || ""}
                    onValueChange={(v) => setForm({ ...form, causa: v as FormProjeto["causa"] })}
                    name="causa"
                  >
                    <SelectTrigger {...a11y}>
                      <SelectValue placeholder="Escolha a causa" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAUSAS.map((causa) => (
                        <SelectItem key={causa} value={causa}>
                          {causa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Campo>
            </div>

            <Campo id="projeto-descricao" rotulo="Descrição" obrigatorio erro={erros.descricao}>
              <Textarea
                id="projeto-descricao"
                name="descricao"
                rows={4}
                maxLength={900}
                placeholder="O que o projeto faz, quem atende e por que precisa de ajuda."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </Campo>

            <Campo id="projeto-capa" rotulo="Capa (endereço da imagem)" erro={erros.capa}>
              <Input
                id="projeto-capa"
                name="capa"
                type="url"
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
                className="h-32 w-full rounded-xl border object-cover"
              />
            )}

            <Callout tom="info">
              O que falta arrecadar é publicado pela própria ONG, no painel dela,
              como necessidade do projeto.
            </Callout>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fechar}>
                {CTA.cancelar}
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? CTA.salvando : editando ? CTA.salvar("projeto") : CTA.criar("projeto")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
