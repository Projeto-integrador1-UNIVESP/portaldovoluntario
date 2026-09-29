import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FolderOpen, Loader2, Package, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate } from "@/lib/format";

/**
 * Schema do projeto.
 *
 * Fica aqui em vez de `src/lib/schemas/` porque é o único lugar que o usa e
 * porque a validação antes era um `if` com `toast.error`, sem marcar o campo
 * errado nem impedir o envio do formulário duas vezes.
 */
const projetoSchema = z
  .object({
    nome_projeto: z
      .string()
      .trim()
      .min(3, "Dê um nome ao projeto")
      .max(80, "No máximo 80 caracteres"),
    descricao: z
      .string()
      .trim()
      .min(20, "Explique o projeto em pelo menos 20 caracteres")
      .max(900, "No máximo 900 caracteres"),
    data_inicio: z.string().min(1, "Informe quando o projeto começa"),
    data_fim: z.string().min(1, "Informe quando o projeto termina"),
    img_url: z
      .union([z.literal(""), z.string().trim().url("Cole um endereço que comece com https://")])
      .optional(),
  })
  .refine((d) => d.data_fim >= d.data_inicio, {
    path: ["data_fim"],
    message: "A data de fim não pode ser anterior à de início",
  });

type ProjetoInput = z.infer<typeof projetoSchema>;

const VAZIO: ProjetoInput = {
  nome_projeto: "", descricao: "", data_inicio: "", data_fim: "", img_url: "",
};

/**
 * Projetos da ONG.
 *
 * O projeto sozinho não serve para o doador: quem abre o site procura o que
 * está faltando. Por isso criar um projeto leva direto ao cadastro da primeira
 * necessidade, e cada linha da lista tem o caminho para as necessidades dela —
 * antes as duas telas não se conheciam.
 */
export default function OngProjetos() {
  const { ongId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string } | null>(null);

  const form = useForm<ProjetoInput>({
    resolver: zodResolver(projetoSchema),
    defaultValues: VAZIO,
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-projetos", ongId],
    queryFn: async () => {
      const { data: projetos, error } = await supabase
        .from("projetos")
        .select("id, nome_projeto, descricao, slug, status, data_inicio, data_fim, img_url")
        .eq("id_ong", ongId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const lista = projetos ?? [];
      const ids = lista.map((p) => p.id);

      // Quantas necessidades abertas cada projeto tem. É o que diz se o projeto
      // está pedindo algo de fato ou só ocupando espaço na vitrine.
      const contagem = new Map<string, number>();
      if (ids.length) {
        const { data: necessidades, error: erroNecessidades } = await supabase
          .from("necessidades")
          .select("id_projeto")
          .in("id_projeto", ids)
          .eq("status", true);
        if (erroNecessidades) throw erroNecessidades;
        for (const n of necessidades ?? []) {
          contagem.set(n.id_projeto, (contagem.get(n.id_projeto) ?? 0) + 1);
        }
      }

      return lista.map((p) => ({ ...p, necessidadesAbertas: contagem.get(p.id) ?? 0 }));
    },
    enabled: Boolean(ongId),
    staleTime: 30_000,
  });

  const salvar = useMutation({
    mutationFn: async (dados: ProjetoInput) => {
      const payload = {
        nome_projeto: dados.nome_projeto.trim(),
        descricao: dados.descricao.trim(),
        data_inicio: dados.data_inicio,
        data_fim: dados.data_fim,
        img_url: dados.img_url?.trim() || null,
      };

      if (editando) {
        const { error } = await supabase.from("projetos").update(payload).eq("id", editando.id);
        if (error) throw error;
        return { id: editando.id, criado: false };
      }

      const { data: criado, error } = await supabase
        .from("projetos")
        .insert({ ...payload, id_ong: ongId! })
        .select("id")
        .single();
      if (error) throw error;
      return { id: criado.id, criado: true };
    },
    onSuccess: ({ id, criado }) => {
      setAberto(false);
      setEditando(null);
      form.reset(VAZIO);
      queryClient.invalidateQueries({ queryKey: ["ong-projetos", ongId] });
      queryClient.invalidateQueries({ queryKey: ["ong-projetos-simples", ongId] });

      if (!criado) {
        toast.success("Projeto atualizado.");
        return;
      }
      // Projeto sem necessidade não aparece como pedido em lugar nenhum: o passo
      // seguinte é dizer o que falta, então a tela já leva para lá.
      toast.success("Projeto criado. Agora diga o que está faltando nele.");
      navigate(`/ong/necessidades?projeto=${id}`);
    },
    onError: () => toast.error("Não foi possível salvar o projeto. Tente novamente."),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("projetos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, { status }) => {
      toast.success(status ? "Projeto visível no site." : "Projeto escondido do site.");
      queryClient.invalidateQueries({ queryKey: ["ong-projetos", ongId] });
    },
    onError: () => toast.error("Não foi possível mudar a visibilidade do projeto."),
  });

  const abrirNovo = () => {
    setEditando(null);
    form.reset(VAZIO);
    setAberto(true);
  };

  const abrirEdicao = (p: NonNullable<typeof data>[number]) => {
    setEditando({ id: p.id });
    form.reset({
      nome_projeto: p.nome_projeto,
      descricao: p.descricao ?? "",
      data_inicio: p.data_inicio ?? "",
      data_fim: p.data_fim ?? "",
      img_url: p.img_url ?? "",
    });
    setAberto(true);
  };

  const noArSemPedido = (data ?? []).filter((p) => p.status && p.necessidadesAbertas === 0);

  return (
    <DashboardLayout type="ong">
      <Seo title="Projetos" noIndex />
      <PageHeader
        title="Projetos"
        description="Cada projeto agrupa o que a sua ONG está pedindo agora."
        icon={<FolderOpen className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={abrirNovo} className="pressionavel">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Novo projeto
          </Button>
        }
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar seus projetos" onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Você ainda não tem projetos"
          description="O projeto é o guarda-chuva das suas necessidades: é dentro dele que você diz o que está faltando e quanto falta."
          action={{ label: "Criar o primeiro projeto", onClick: abrirNovo }}
        />
      ) : (
        <>
          {noArSemPedido.length > 0 && (
            <Callout
              tom="atencao"
              titulo={
                noArSemPedido.length === 1
                  ? "1 projeto no ar sem dizer o que falta"
                  : `${noArSemPedido.length} projetos no ar sem dizer o que falta`
              }
              className="mb-4"
            >
              <p>
                Sem necessidade publicada, o projeto não entra na vitrine de pedidos e o doador só
                consegue mandar dinheiro solto, sem saber para quê.
              </p>
              <Button variant="outline" size="sm" className="mt-3 bg-card" asChild>
                <Link to={`/ong/necessidades?projeto=${noArSemPedido[0].id}`}>
                  Publicar a primeira necessidade
                </Link>
              </Button>
            </Callout>
          )}

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Visível no site</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-72 font-medium">
                        <span className="block break-words">{p.nome_projeto}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {p.data_inicio ? formatDate(p.data_inicio) : "—"}
                        {" até "}
                        {p.data_fim ? formatDate(p.data_fim) : "—"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={Boolean(p.status)}
                          disabled={alternarStatus.isPending}
                          aria-label={`Mostrar "${p.nome_projeto}" no site`}
                          onCheckedChange={(valor) =>
                            alternarStatus.mutate({ id: p.id, status: valor })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant={p.necessidadesAbertas === 0 ? "default" : "outline"}
                            asChild
                          >
                            <Link to={`/ong/necessidades?projeto=${p.id}`}>
                              <Package className="mr-1.5 h-4 w-4" aria-hidden="true" />
                              {p.necessidadesAbertas === 0
                                ? "Dizer o que falta"
                                : `Necessidades (${p.necessidadesAbertas})`}
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => abrirEdicao(p)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Editar {p.nome_projeto}</span>
                          </Button>
                          {p.status && (
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/projetos/${p.slug ?? p.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                <span className="sr-only">
                                  Ver {p.nome_projeto} no site, em nova aba
                                </span>
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={aberto}
        onOpenChange={(v) => {
          setAberto(v);
          if (!v) {
            setEditando(null);
            form.reset(VAZIO);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "As mudanças aparecem na página pública do projeto."
                : "Depois de criar, você diz o que está faltando — é isso que o doador vê primeiro."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => salvar.mutate(d))}
              noValidate
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="nome_projeto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do projeto</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="off"
                        maxLength={80}
                        placeholder="Campanha do agasalho 2026"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O que o projeto faz</FormLabel>
                    <FormControl>
                      <Textarea rows={4} maxLength={900} {...field} />
                    </FormControl>
                    <FormDescription>
                      Quem é atendido e o que muda para essas pessoas. Aparece na página pública.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="data_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Começa em</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Termina em</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="img_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem do projeto</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        placeholder="https://…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Opcional. Uma foto do trabalho real ajuda mais que um banner.</FormDescription>
                    <FormMessage />
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
                  {editando ? "Salvar" : "Criar projeto"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
