import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Seo } from "@/components/common/Seo";
import { ConfirmarExclusao } from "@/components/common/ConfirmarExclusao";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ProgressBar } from "@/components/common/ProgressBar";
import { CTA, SUCESSO, TERMOS } from "@/lib/copy";
import { ErroAmigavel, mensagemAmigavel } from "@/lib/erros";
import { formatPrazo } from "@/lib/format";
import {
  CATEGORIAS, NIVEIS_DE_URGENCIA, UNIDADES,
  metaDoTexto, necessidadeSchema, rotuloDaUrgencia, textoDaMeta,
  type NecessidadeInput, type TipoDeNecessidade,
} from "@/lib/schemas/necessidade";

const num = (v: unknown) => Number(v ?? 0);

const VAZIO_FORM: NecessidadeInput = {
  tipo: "item", nome: "", categoria: undefined, unidade: "un",
  meta: undefined as unknown as number, urgencia: 2, prazo: "", status: true,
};

/** Excluir com doação ligada apagaria o vínculo e o "3 un de Cobertor" viraria "R$ 0,00". */
const MOTIVO_VINCULOS = mensagemAmigavel(new Error("violates foreign key constraint"), "");

/**
 * Cadastro das necessidades de um projeto.
 *
 * É aqui que a ONG diz o que está faltando: o dado que a plataforma inteira
 * existe para mostrar.
 */
export default function OngNecessidades() {
  const { ongId } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const projetoSelecionado = params.get("projeto") ?? "";

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string } | null>(null);
  const [aExcluir, setAExcluir] = useState<{ id: string; nome: string; status: boolean; doacoes: number } | null>(null);
  const [verificando, setVerificando] = useState<string | null>(null);

  const form = useForm<NecessidadeInput>({
    resolver: zodResolver(necessidadeSchema),
    defaultValues: VAZIO_FORM,
  });
  const tipo = form.watch("tipo") as TipoDeNecessidade;

  const {
    data: projetos,
    isPending: carregandoProjetos,
    isError: erroProjetos,
    refetch: recarregarProjetos,
  } = useQuery({
    queryKey: ["ong-projetos-simples", ongId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome_projeto, slug")
        .eq("id_ong", ongId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(ongId),
  });

  const idProjeto = projetoSelecionado || projetos?.[0]?.id || "";
  const projetoAtual = projetos?.find((p) => p.id === idProjeto);

  const { data: necessidades, isPending, isError, refetch } = useQuery({
    queryKey: ["necessidades", idProjeto],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades")
        .select("id, tipo, nome, categoria, unidade, meta, arrecadado, urgencia, prazo, status")
        .eq("id_projeto", idProjeto)
        .order("urgencia", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((n) => ({ ...n, meta: num(n.meta), arrecadado: num(n.arrecadado) }));
    },
    enabled: Boolean(idProjeto),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["necessidades", idProjeto] });
    queryClient.invalidateQueries({ queryKey: ["ong-projetos", ongId] });
    queryClient.invalidateQueries({ queryKey: ["ong-resumo", ongId] });
  };

  const salvar = useMutation({
    mutationFn: async (dados: NecessidadeInput) => {
      const payload = {
        id_projeto: idProjeto,
        tipo: dados.tipo,
        nome: dados.nome.trim(),
        categoria: dados.categoria || null,
        unidade: dados.tipo === "item" ? dados.unidade : null,
        meta: dados.meta,
        urgencia: dados.urgencia,
        prazo: dados.prazo || null,
        status: dados.status,
      };
      const { error } = editando
        ? await supabase.from("necessidades").update(payload).eq("id", editando.id)
        : await supabase.from("necessidades").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editando ? SUCESSO.salva("Necessidade") : "Necessidade publicada");
      setAberto(false);
      setEditando(null);
      form.reset(VAZIO_FORM);
      invalidar();
    },
    onError: (erro) =>
      toast.error(mensagemAmigavel(erro, "Não foi possível salvar a necessidade. Tente de novo.")),
  });

  const ocultar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("necessidades").update({ status: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Necessidade oculta do site");
      setAExcluir(null);
      invalidar();
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível ocultar a necessidade.")),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { data: apagadas, error } = await supabase.from("necessidades").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!apagadas || apagadas.length === 0) {
        throw new ErroAmigavel("Sua conta não tem permissão para excluir esta necessidade.");
      }
    },
    onSuccess: () => {
      toast.success(SUCESSO.excluida("Necessidade"));
      setAExcluir(null);
      invalidar();
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível excluir a necessidade.")),
  });

  /** Conta as doações ligadas antes de abrir a confirmação. */
  const abrirExclusao = async (n: { id: string; nome: string; status: boolean | null }) => {
    setVerificando(n.id);
    try {
      const { count, error } = await supabase
        .from("doacoes")
        .select("id", { count: "exact", head: true })
        .eq("id_necessidade", n.id);
      if (error) throw error;
      setAExcluir({ id: n.id, nome: n.nome, status: Boolean(n.status), doacoes: count ?? 0 });
    } catch (erro) {
      toast.error(mensagemAmigavel(erro, "Não foi possível verificar a necessidade. Tente de novo."));
    } finally {
      setVerificando(null);
    }
  };

  const abrirNova = () => {
    setEditando(null);
    form.reset(VAZIO_FORM);
    setAberto(true);
  };

  const abrirEdicao = (n: NonNullable<typeof necessidades>[number]) => {
    setEditando({ id: n.id });
    form.reset({
      tipo: n.tipo as TipoDeNecessidade,
      nome: n.nome,
      categoria: n.categoria ?? undefined,
      unidade: n.unidade ?? "un",
      meta: n.meta,
      urgencia: n.urgencia,
      prazo: n.prazo ?? "",
      status: n.status,
    });
    setAberto(true);
  };

  return (
    <DashboardLayout type="ong">
      <Seo title="Necessidades" noIndex />
      <PageHeader
        title="Necessidades"
        description="Diga o que está faltando. É isso que o doador vê primeiro."
        action={
          <Button onClick={abrirNova} disabled={!idProjeto}>
            <Plus aria-hidden="true" />
            Nova necessidade
          </Button>
        }
      />

      {/* Sem esta guarda a tela piscava "você ainda não tem projetos" enquanto a
          lista de projetos carregava. */}
      {erroProjetos ? (
        <ErrorState
          title="Não foi possível carregar seus projetos"
          onRetry={() => recarregarProjetos()}
        />
      ) : carregandoProjetos ? (
        <div className="space-y-3">
          <Skeleton className="h-11 w-full max-w-sm" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : projetos!.length === 0 ? (
        <EmptyState
          ilustracao="caixa"
          title="Você ainda não tem projetos"
          description="As necessidades vivem dentro de um projeto. Crie um antes."
          action={{ label: "Criar meu primeiro projeto", to: "/ong/projetos" }}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <div className="w-full max-w-sm">
              <Label htmlFor="projeto-necessidades">Projeto</Label>
              <Select value={idProjeto} onValueChange={(v) => setParams({ projeto: v })}>
                <SelectTrigger id="projeto-necessidades" className="mt-2">
                  <SelectValue placeholder="Escolha o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projetos!.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_projeto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {projetoAtual && (
              <Button variant="outline" asChild>
                <Link to={`/projetos/${projetoAtual.slug ?? projetoAtual.id}`} target="_blank">
                  <ExternalLink aria-hidden="true" />
                  Ver como o doador vê
                </Link>
              </Button>
            )}
          </div>

          {isError ? (
            <ErrorState title="Não foi possível carregar as necessidades" onRetry={() => refetch()} />
          ) : isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : necessidades!.length === 0 ? (
            <EmptyState
              ilustracao="caixa"
              title="Nenhuma necessidade publicada neste projeto"
              description="Sem nenhuma, o doador só consegue mandar dinheiro sem saber o que está faltando."
              action={{ label: "Dizer o que está faltando", onClick: abrirNova }}
            />
          ) : (
            <ul className="space-y-3">
              {necessidades!.map((n) => {
                const prazo = n.prazo ? formatPrazo(n.prazo) : "";
                return (
                  <li
                    key={n.id}
                    className={
                      n.status
                        ? "rounded-xl border bg-card p-5 shadow-sutil"
                        : "rounded-xl border border-dashed bg-card/60 p-5"
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold leading-tight">{n.nome}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant={n.urgencia === 3 ? "urgente" : "neutro"}>
                            Urgência {rotuloDaUrgencia(n.urgencia).toLowerCase()}
                          </Badge>
                          {!n.status && <Badge variant="outline">{TERMOS.oculto}</Badge>}
                          <span>{n.tipo === "item" ? "Item" : "Dinheiro"}</span>
                          {n.categoria && <span>· {n.categoria}</span>}
                          {prazo && <span>· {prazo}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => abrirEdicao(n)}>
                          <Pencil aria-hidden="true" />
                          <span aria-hidden="true">Editar</span>
                          <span className="sr-only">Editar {n.nome}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={verificando === n.id}
                          onClick={() => abrirExclusao(n)}
                        >
                          {verificando === n.id ? (
                            <Loader2 className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 aria-hidden="true" />
                          )}
                          <span className="sr-only">Excluir {n.nome}</span>
                        </Button>
                      </div>
                    </div>

                    <ProgressBar
                      className="mt-4"
                      arrecadado={n.arrecadado}
                      meta={n.meta}
                      tipo={n.tipo as TipoDeNecessidade}
                      unidade={n.unidade}
                      destacarFalta
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="rolagem-contida max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold">
              {editando ? "Editar necessidade" : "Nova necessidade"}
            </DialogTitle>
            <DialogDescription>
              Seja específico: "cobertor solteiro" ajuda mais que "roupas".
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => salvar.mutate(d))} noValidate className="space-y-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        // A meta muda de unidade com o tipo: 100 reais não são 100 cobertores.
                        form.setValue("meta", undefined as unknown as number);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="item">Item físico</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O que está faltando</FormLabel>
                    <FormControl>
                      <Input placeholder="Cobertor solteiro" maxLength={120} autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="meta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tipo === "item" ? "Quantidade necessária" : "Valor necessário"}</FormLabel>
                      <FormControl>
                        {tipo === "dinheiro" ? (
                          <Input
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="R$ 0,00"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={textoDaMeta(field.value, "dinheiro")}
                            onChange={(e) => field.onChange(metaDoTexto(e.target.value, "dinheiro"))}
                          />
                        ) : (
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            autoComplete="off"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={textoDaMeta(field.value, "item")}
                            onChange={(e) => field.onChange(metaDoTexto(e.target.value, "item"))}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipo === "item" && (
                  <FormField
                    control={form.control}
                    name="unidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgência</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NIVEIS_DE_URGENCIA.map((u) => (
                            <SelectItem key={u.valor} value={String(u.valor)}>{u.rotulo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Alta aparece primeiro no site e com aviso de urgência.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="prazo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>
                      Opcional. Aparece como "faltam X dias" para o doador.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
                    <div className="space-y-1">
                      <FormLabel>Visível no site</FormLabel>
                      <FormDescription>Desligue para parar de receber doações deste item.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                  {CTA.cancelar}
                </Button>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {salvar.isPending
                    ? CTA.salvando
                    : editando ? CTA.salvar("necessidade") : CTA.publicar("necessidade")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        open={Boolean(aExcluir)}
        onOpenChange={(v) => !v && setAExcluir(null)}
        titulo={`Excluir a necessidade ${aExcluir?.nome ?? ""}?`}
        descricao="Ela some do site e do painel. Se a ideia é só parar de receber, oculte em vez de excluir."
        rotuloConfirmar={CTA.excluir("necessidade")}
        onConfirmar={() => (aExcluir ? excluir.mutateAsync(aExcluir.id).catch(() => {}) : undefined)}
        bloqueio={
          aExcluir && aExcluir.doacoes > 0
            ? {
                motivo: `Esta necessidade tem ${aExcluir.doacoes} ${
                  aExcluir.doacoes === 1 ? "doação registrada" : "doações registradas"
                }. ${MOTIVO_VINCULOS}`,
                alternativa: aExcluir.status
                  ? {
                      rotulo: "Ocultar do site",
                      onClick: () => ocultar.mutateAsync(aExcluir.id).catch(() => {}),
                    }
                  : undefined,
              }
            : undefined
        }
      />
    </DashboardLayout>
  );
}
