import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
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
import { formatDateTime } from "@/lib/format";
import { normalizeUrl } from "@/lib/validators";
import {
  AlternarStatus, Campo, ExcluirLinha, Paginacao, TabelaAdmin,
} from "./_shared";
import {
  POR_PAGINA, deCampoDeDataHora, mensagemDeErro, paraCampoDeDataHora,
  useCorrigirPaginaVazia,
} from "./_shared-lib";

const formVazio = {
  nome: "", data_evento: "", local: "", vagas: "", id_ong: "", descricao: "", img_url: "",
};

type FormEvento = typeof formVazio;

const COLUNAS = [
  { rotulo: "Evento" },
  { rotulo: "Quando" },
  { rotulo: "Vagas" },
  { rotulo: "ONG" },
  { rotulo: "Visível no site" },
  { rotulo: "Ações", className: "text-right" },
];

const limparBusca = (termo: string) => termo.replace(/[,()*%\\]/g, " ").trim();

/**
 * Eventos das organizações.
 *
 * O bug que esta versão corrige é de fuso: o formulário carregava a data com
 * `toISOString()` num campo `datetime-local`, que espera hora local. Um evento
 * às 9h aparecia como 12h no formulário e voltava deslocado a cada salvamento.
 */
export default function AdminEventos() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState("");
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string } | null>(null);
  const [form, setForm] = useState<FormEvento>(formVazio);

  const termo = limparBusca(busca);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-eventos", termo, pagina],
    queryFn: async () => {
      let consulta = supabase
        .from("eventos")
        .select("id, nome, descricao, data_evento, local, vagas, img_url, status, id_ong", {
          count: "exact",
        })
        .order("data_evento", { ascending: false })
        .order("id")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

      if (termo) consulta = consulta.ilike("nome", `%${termo}%`);

      const { data: eventos, count, error } = await consulta;
      if (error) throw error;

      const idsOngs = [...new Set((eventos ?? []).map((e) => e.id_ong).filter(Boolean))] as string[];
      const { data: ongs } = idsOngs.length
        ? await supabase.from("ongs").select("id, nome").in("id", idsOngs)
        : { data: [] };
      const porOng = new Map((ongs ?? []).map((o) => [o.id, o.nome]));

      return {
        linhas: (eventos ?? []).map((e) => ({
          ...e,
          ong: e.id_ong ? porOng.get(e.id_ong) ?? null : null,
        })),
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
      if (!form.nome.trim()) throw new Error("Informe o nome do evento.");
      if (!form.data_evento) throw new Error("Informe a data e a hora.");
      if (!form.local.trim()) throw new Error("Informe o local.");
      if (!form.id_ong) throw new Error("Escolha a ONG responsável.");
      const vagas = form.vagas ? Number(form.vagas) : null;
      if (vagas !== null && (!Number.isInteger(vagas) || vagas < 1)) {
        throw new Error("As vagas devem ser um número inteiro a partir de 1.");
      }

      const payload = {
        nome: form.nome.trim(),
        data_evento: deCampoDeDataHora(form.data_evento),
        local: form.local.trim(),
        vagas,
        id_ong: form.id_ong,
        descricao: form.descricao.trim() || null,
        img_url: normalizeUrl(form.img_url) || null,
      };

      const { error } = editando
        ? await supabase.from("eventos").update(payload).eq("id", editando.id)
        : await supabase.from("eventos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editando ? "Evento atualizado." : "Evento criado.");
      fechar();
      queryClient.invalidateQueries({ queryKey: ["admin-eventos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível salvar o evento.")),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("eventos").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status ? "Evento visível no site." : "Evento oculto do site.");
      queryClient.invalidateQueries({ queryKey: ["admin-eventos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível alterar a visibilidade.")),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento excluído.");
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-eventos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível excluir o evento.")),
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

  const abrirEdicao = (e: (typeof linhas)[number]) => {
    setEditando({ id: e.id });
    setForm({
      nome: e.nome ?? "",
      data_evento: paraCampoDeDataHora(e.data_evento),
      local: e.local ?? "",
      vagas: e.vagas === null ? "" : String(e.vagas),
      id_ong: e.id_ong ?? "",
      descricao: e.descricao ?? "",
      img_url: e.img_url ?? "",
    });
    setDialogoAberto(true);
  };

  return (
    <DashboardLayout type="admin">
      <Seo title="Eventos" noIndex />
      <PageHeader
        title="Eventos"
        description="Ações com data e local marcados pelas organizações"
        icon={<Calendar className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo evento
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
            id="busca-eventos"
            type="search"
            autoComplete="off"
            className="pl-9"
            placeholder="Buscar por nome do evento"
            aria-label="Buscar evento por nome"
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
        tituloErro="Não foi possível carregar os eventos"
        aoTentarDeNovo={() => refetch()}
        vazia={linhas.length === 0}
        vazio={
          termo ? (
            <EmptyState
              icon={Search}
              title="Nenhum evento encontrado"
              description={`Nada corresponde a “${busca}”.`}
              action={{ label: "Limpar a busca", onClick: () => setBusca("") }}
            />
          ) : (
            <EmptyState
              icon={Calendar}
              title="Nenhum evento cadastrado"
              description="Cadastre um mutirão, uma entrega ou uma ação de fim de semana."
              action={{ label: "Criar evento", onClick: abrirNovo }}
            />
          )
        }
        rodape={<Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />}
      >
        {linhas.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="max-w-64">
              <div className="break-words font-medium">{e.nome}</div>
              <div className="text-xs text-muted-foreground">{e.local || "Sem local informado"}</div>
            </TableCell>

            <TableCell className="text-muted-foreground">{formatDateTime(e.data_evento)}</TableCell>

            <TableCell className="tabular-nums text-muted-foreground">{e.vagas ?? "Sem limite"}</TableCell>

            <TableCell className="text-muted-foreground">{e.ong ?? "Sem ONG"}</TableCell>

            <TableCell>
              <AlternarStatus
                ativo={Boolean(e.status)}
                rotulo={`Visibilidade do evento ${e.nome}`}
                ocupado={alternarStatus.isPending}
                aoAlternar={() => alternarStatus.mutate({ id: e.id, status: !e.status })}
              />
            </TableCell>

            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Editar ${e.nome}`}
                  onClick={() => abrirEdicao(e)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <ExcluirLinha
                  rotuloAcessivel={`Excluir ${e.nome}`}
                  titulo="Excluir este evento?"
                  descricao="O evento sai do site. Se ele já aconteceu e você quer manter o registro, desative em vez de excluir."
                  aoConfirmar={() => excluir.mutate(e.id)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Dialog open={dialogoAberto} onOpenChange={(aberto) => (aberto ? setDialogoAberto(true) : fechar())}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar evento" : "Novo evento"}</DialogTitle>
            <DialogDescription>
              A data e a hora são as do horário local de quem vai participar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Campo id="evento-nome" rotulo="Nome do evento" obrigatorio>
              <Input
                id="evento-nome"
                autoComplete="off"
                maxLength={120}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="evento-quando" rotulo="Data e hora" obrigatorio>
                <Input
                  id="evento-quando"
                  type="datetime-local"
                  autoComplete="off"
                  value={form.data_evento}
                  onChange={(e) => setForm({ ...form, data_evento: e.target.value })}
                />
              </Campo>
              <Campo id="evento-vagas" rotulo="Vagas" dica="Em branco, sem limite.">
                <Input
                  id="evento-vagas"
                  type="number"
                  min="1"
                  autoComplete="off"
                  value={form.vagas}
                  onChange={(e) => setForm({ ...form, vagas: e.target.value })}
                />
              </Campo>
            </div>

            <Campo id="evento-local" rotulo="Local" obrigatorio>
              <Input
                id="evento-local"
                autoComplete="off"
                maxLength={160}
                placeholder="Endereço ou ponto de encontro"
                value={form.local}
                onChange={(e) => setForm({ ...form, local: e.target.value })}
              />
            </Campo>

            <Campo id="evento-ong" rotulo="ONG responsável" obrigatorio>
              <Select value={form.id_ong} onValueChange={(v) => setForm({ ...form, id_ong: v })}>
                <SelectTrigger id="evento-ong">
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

            <Campo id="evento-descricao" rotulo="Descrição">
              <Textarea
                id="evento-descricao"
                rows={3}
                maxLength={900}
                placeholder="O que vai acontecer e o que levar."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </Campo>

            <Campo id="evento-imagem" rotulo="Imagem (endereço)">
              <Input
                id="evento-imagem"
                autoComplete="off"
                placeholder="https://…/evento.jpg"
                value={form.img_url}
                onChange={(e) => setForm({ ...form, img_url: e.target.value })}
              />
            </Campo>
            {form.img_url && (
              <img
                src={normalizeUrl(form.img_url)}
                alt=""
                className="h-32 w-full rounded-lg border object-cover"
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : editando ? "Salvar alterações" : "Criar evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
