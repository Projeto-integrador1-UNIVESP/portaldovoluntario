import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Seo } from "@/components/common/Seo";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ProgressBar } from "@/components/common/ProgressBar";
import {
  CATEGORIAS, NIVEIS_DE_URGENCIA, UNIDADES,
  necessidadeSchema, type NecessidadeInput,
} from "@/lib/schemas/necessidade";

const num = (v: unknown) => Number(v ?? 0);

const VAZIO: NecessidadeInput = {
  tipo: "item", nome: "", categoria: undefined, unidade: "un",
  meta: undefined as unknown as number, urgencia: 2, prazo: "", status: true,
};

/**
 * Cadastro das necessidades de um projeto (F1).
 *
 * É aqui que a ONG diz o que está faltando — o dado que a plataforma inteira
 * existe para mostrar e que, até agora, não tinha onde ser informado.
 */
export default function OngNecessidades() {
  const { ongId } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const projetoSelecionado = params.get("projeto") ?? "";

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string } | null>(null);
  const [aRemover, setARemover] = useState<{ id: string; nome: string } | null>(null);

  const form = useForm<NecessidadeInput>({
    resolver: zodResolver(necessidadeSchema),
    defaultValues: VAZIO,
  });
  const tipo = form.watch("tipo");

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
      toast.success(editando ? "Necessidade atualizada." : "Necessidade publicada.");
      setAberto(false);
      setEditando(null);
      form.reset(VAZIO);
      queryClient.invalidateQueries({ queryKey: ["necessidades", idProjeto] });
    },
    onError: () => toast.error("Não foi possível salvar. Tente novamente."),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("necessidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Necessidade removida.");
      setARemover(null);
      queryClient.invalidateQueries({ queryKey: ["necessidades", idProjeto] });
    },
    onError: () => toast.error("Não foi possível remover."),
  });

  const abrirNova = () => {
    setEditando(null);
    form.reset(VAZIO);
    setAberto(true);
  };

  const abrirEdicao = (n: NonNullable<typeof necessidades>[number]) => {
    setEditando({ id: n.id });
    form.reset({
      tipo: n.tipo as "item" | "dinheiro",
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
        icon={<Package className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={abrirNova} disabled={!idProjeto}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
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
          <Skeleton className="h-10 w-full max-w-sm" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : projetos!.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Você ainda não tem projetos"
          description="As necessidades pertencem a um projeto. Crie um primeiro."
          action={{ label: "Criar projeto", to: "/ong/projetos" }}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-full max-w-sm">
              <label htmlFor="projeto-necessidades" className="text-sm font-medium">
                Projeto
              </label>
              <Select
                value={idProjeto}
                onValueChange={(v) => setParams({ projeto: v })}
              >
                <SelectTrigger id="projeto-necessidades" className="mt-1">
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
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
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
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : necessidades!.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma necessidade publicada neste projeto"
              description="Enquanto não houver uma, o doador só consegue contribuir em dinheiro, sem saber o que falta."
              action={{ label: "Publicar a primeira", onClick: abrirNova }}
            />
          ) : (
            <div className="space-y-3">
              {necessidades!.map((n) => (
                <Card key={n.id} className={n.status ? undefined : "opacity-60"}>
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {n.nome}
                          {!n.status && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (oculta do site)
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {n.tipo === "item" ? "Item" : "Dinheiro"}
                          {n.categoria ? ` · ${n.categoria}` : ""}
                          {` · urgência ${NIVEIS_DE_URGENCIA.find((u) => u.valor === n.urgencia)?.rotulo.toLowerCase()}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => abrirEdicao(n)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Editar {n.nome}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setARemover({ id: n.id, nome: n.nome })}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Remover {n.nome}</span>
                        </Button>
                      </div>
                    </div>

                    <ProgressBar
                      className="mt-3"
                      arrecadado={n.arrecadado}
                      meta={n.meta}
                      tipo={n.tipo as "item" | "dinheiro"}
                      unidade={n.unidade}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar necessidade" : "Nova necessidade"}</DialogTitle>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      <Input placeholder="Cobertor solteiro" maxLength={120} {...field} />
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
                      <FormLabel>{tipo === "item" ? "Quantidade necessária" : "Valor necessário (R$)"}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
                        />
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Visível no site</FormLabel>
                      <FormDescription>Desligue para parar de receber doações deste item.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvar.isPending} className="pressionavel">
                  {salvar.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {editando ? "Salvar" : "Publicar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(aRemover)} onOpenChange={(v) => !v && setARemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover "{aRemover?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As doações já registradas para esta necessidade continuam no histórico, mas
              deixam de ter o vínculo. Se a ideia é só parar de receber, desligue
              "visível no site" em vez de remover.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={remover.isPending}
              onClick={(e) => {
                // O fechamento espera a resposta: se a remoção falhar, o aviso
                // aparece com o diálogo ainda na tela.
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
