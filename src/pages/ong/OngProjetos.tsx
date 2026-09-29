import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Seo } from "@/components/common/Seo";
import { Capa } from "@/components/common/Capa";
import { CauseTag } from "@/components/common/CauseTag";
import { Callout } from "@/components/common/Callout";
import { ConfirmarExclusao } from "@/components/common/ConfirmarExclusao";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CAUSAS, ehCausa } from "@/lib/constants/causas";
import { CTA, SUCESSO, TERMOS, VAZIO } from "@/lib/copy";
import { ErroAmigavel, mensagemAmigavel } from "@/lib/erros";
import { formatDate } from "@/lib/format";
import {
  PROJETO_VAZIO, capaDoProjeto, payloadDoProjeto, projetoParaFormulario,
  projetoSchema, type ProjetoInput,
} from "@/lib/schemas/projeto";

/**
 * O banco não bloqueia a exclusão (necessidades e inscrições vão junto por
 * CASCADE; doações perdem o vínculo). O bloqueio é daqui, com o mesmo texto
 * que o produto usa quando o banco recusa por chave estrangeira.
 */
const MOTIVO_VINCULOS = mensagemAmigavel(new Error("violates foreign key constraint"), "");

type Vinculos = { necessidades: number; doacoes: number; inscricoes: number };

const SEM_CAUSA = "__sem_causa__";

/**
 * Projetos da ONG.
 *
 * O projeto sozinho não serve para o doador: quem abre o site procura o que
 * está faltando. Por isso criar um projeto leva direto ao cadastro da primeira
 * necessidade, e cada linha da lista tem o caminho para as necessidades dela.
 */
export default function OngProjetos() {
  const { ongId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string; causaOriginal: string | null } | null>(null);
  const [aExcluir, setAExcluir] = useState<{ id: string; nome: string; status: boolean; vinculos: Vinculos } | null>(null);
  const [verificando, setVerificando] = useState<string | null>(null);

  const form = useForm<ProjetoInput>({
    resolver: zodResolver(projetoSchema),
    defaultValues: PROJETO_VAZIO,
  });
  const capaDigitada = form.watch("capa");
  const nomeDigitado = form.watch("nome_projeto");
  const causaDigitada = form.watch("causa");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-projetos", ongId],
    queryFn: async () => {
      const { data: projetos, error } = await supabase
        .from("projetos")
        .select("id, nome_projeto, descricao, slug, status, data_inicio, data_fim, img_url, capa_url, cidade, causa")
        .eq("id_ong", ongId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const lista = projetos ?? [];
      const ids = lista.map((p) => p.id);

      // Quantas necessidades abertas cada projeto tem: é o que diz se ele
      // está pedindo algo ou só ocupando espaço na vitrine.
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

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["ong-projetos", ongId] });
    queryClient.invalidateQueries({ queryKey: ["ong-projetos-simples", ongId] });
    queryClient.invalidateQueries({ queryKey: ["ong-resumo", ongId] });
  };

  const salvar = useMutation({
    mutationFn: async (dados: ProjetoInput) => {
      const payload: Partial<ReturnType<typeof payloadDoProjeto>> = payloadDoProjeto(dados);

      if (editando) {
        // Uma causa gravada fora da lista (texto livre do admin) não é apagada
        // só porque o formulário não conseguiu exibi-la.
        if (editando.causaOriginal && !ehCausa(editando.causaOriginal) && !dados.causa) {
          delete payload.causa;
        }
        const { error } = await supabase.from("projetos").update(payload).eq("id", editando.id);
        if (error) throw error;
        return { id: editando.id, criado: false };
      }

      const { data: criado, error } = await supabase
        .from("projetos")
        .insert({ ...payloadDoProjeto(dados), id_ong: ongId! })
        .select("id")
        .single();
      if (error) throw error;
      return { id: criado.id, criado: true };
    },
    onSuccess: ({ id, criado }) => {
      setAberto(false);
      setEditando(null);
      form.reset(PROJETO_VAZIO);
      invalidar();

      if (!criado) {
        toast.success(SUCESSO.salvo("Projeto"));
        return;
      }
      // Projeto sem necessidade não aparece como pedido em lugar nenhum: o passo
      // seguinte é dizer o que falta, então a tela já leva para lá.
      toast.success("Projeto criado. Agora diga o que está faltando nele.");
      navigate(`/ong/necessidades?projeto=${id}`);
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível salvar o projeto. Tente de novo.")),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("projetos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, { status }) => {
      toast.success(status ? "Projeto visível no site" : "Projeto oculto do site");
      invalidar();
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível mudar a visibilidade do projeto.")),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { data: apagados, error } = await supabase.from("projetos").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!apagados || apagados.length === 0) {
        throw new ErroAmigavel("Sua conta não tem permissão para excluir este projeto.");
      }
    },
    onSuccess: () => {
      toast.success(SUCESSO.excluido("Projeto"));
      setAExcluir(null);
      invalidar();
    },
    onError: (erro) => toast.error(mensagemAmigavel(erro, "Não foi possível excluir o projeto.")),
  });

  /** Conta o que está ligado ao projeto antes de abrir a confirmação. */
  const abrirExclusao = async (p: { id: string; nome_projeto: string; status: boolean | null }) => {
    setVerificando(p.id);
    try {
      const contar = (tabela: "necessidades" | "doacoes" | "voluntariado") =>
        supabase.from(tabela).select("id", { count: "exact", head: true }).eq("id_projeto", p.id);
      const [necessidades, doacoes, inscricoes] = await Promise.all([
        contar("necessidades"), contar("doacoes"), contar("voluntariado"),
      ]);
      const erro = necessidades.error ?? doacoes.error ?? inscricoes.error;
      if (erro) throw erro;
      setAExcluir({
        id: p.id,
        nome: p.nome_projeto,
        status: Boolean(p.status),
        vinculos: {
          necessidades: necessidades.count ?? 0,
          doacoes: doacoes.count ?? 0,
          inscricoes: inscricoes.count ?? 0,
        },
      });
    } catch (erro) {
      toast.error(mensagemAmigavel(erro, "Não foi possível verificar o projeto. Tente de novo."));
    } finally {
      setVerificando(null);
    }
  };

  const abrirNovo = () => {
    setEditando(null);
    form.reset(PROJETO_VAZIO);
    setAberto(true);
  };

  const abrirEdicao = (p: NonNullable<typeof data>[number]) => {
    setEditando({ id: p.id, causaOriginal: p.causa ?? null });
    form.reset(projetoParaFormulario(p));
    setAberto(true);
  };

  const noArSemPedido = (data ?? []).filter((p) => p.status && p.necessidadesAbertas === 0);
  const vinculosDoExcluir = aExcluir
    ? aExcluir.vinculos.necessidades + aExcluir.vinculos.doacoes + aExcluir.vinculos.inscricoes
    : 0;

  return (
    <DashboardLayout type="ong">
      <Seo title="Projetos" noIndex />
      <PageHeader
        title="Projetos"
        description="Cada projeto agrupa o que a sua ONG está pedindo agora."
        action={
          <Button onClick={abrirNovo}>
            <Plus aria-hidden="true" />
            Novo projeto
          </Button>
        }
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar seus projetos" onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          ilustracao="caixa"
          title="Você ainda não tem projetos"
          description="O projeto é o guarda-chuva das suas necessidades: é dentro dele que você diz o que falta e quanto falta."
          action={{ label: "Criar meu primeiro projeto", onClick: abrirNovo }}
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
              className="mb-6"
            >
              <p>
                Sem necessidade publicada, o projeto não entra na vitrine de pedidos e o doador só
                consegue mandar dinheiro solto, sem saber para quê.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to={`/ong/necessidades?projeto=${noArSemPedido[0].id}`}>
                  Publicar a primeira necessidade
                </Link>
              </Button>
            </Callout>
          )}

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table className="min-w-[760px]">
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
                      <TableCell className="min-w-64 max-w-sm">
                        <div className="flex items-start gap-3">
                          {/* Sem `causa` de propósito: em 64px a etiqueta "Imagem
                              ilustrativa" da foto de categoria não cabe. */}
                          <Capa
                            src={capaDoProjeto(p)}
                            alt=""
                            id={p.id}
                            nome={p.nome_projeto}
                            className="h-12 w-16 shrink-0 rounded-md"
                          />
                          <div className="min-w-0">
                            <span className="block break-words font-medium">{p.nome_projeto}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              {p.causa ? <CauseTag causa={p.causa} /> : null}
                              <span>{p.cidade || "Sem cidade"}</span>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="numero whitespace-nowrap text-sm text-muted-foreground">
                        {p.data_inicio ? formatDate(p.data_inicio) : VAZIO.semData}
                        {" até "}
                        {p.data_fim ? formatDate(p.data_fim) : VAZIO.semData}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(p.status)}
                            disabled={alternarStatus.isPending}
                            aria-label={`Mostrar "${p.nome_projeto}" no site`}
                            onCheckedChange={(valor) =>
                              alternarStatus.mutate({ id: p.id, status: valor })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {p.status ? TERMOS.visivel : TERMOS.oculto}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant={p.necessidadesAbertas === 0 ? "default" : "outline"}
                            asChild
                          >
                            <Link to={`/ong/necessidades?projeto=${p.id}`}>
                              {p.necessidadesAbertas === 0
                                ? "Dizer o que falta"
                                : `Necessidades (${p.necessidadesAbertas})`}
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => abrirEdicao(p)}>
                            <Pencil aria-hidden="true" />
                            <span aria-hidden="true">Editar</span>
                            <span className="sr-only">Editar {p.nome_projeto}</span>
                          </Button>
                          {p.status && (
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/projetos/${p.slug ?? p.id}`} target="_blank">
                                <ExternalLink aria-hidden="true" />
                                <span className="sr-only">
                                  Ver {p.nome_projeto} no site, em nova aba
                                </span>
                              </Link>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={verificando === p.id}
                            onClick={() => abrirExclusao(p)}
                          >
                            {verificando === p.id ? (
                              <Loader2 className="animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 aria-hidden="true" />
                            )}
                            <span className="sr-only">Excluir {p.nome_projeto}</span>
                          </Button>
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

      <ConfirmarExclusao
        open={Boolean(aExcluir)}
        onOpenChange={(v) => !v && setAExcluir(null)}
        titulo={`Excluir o projeto ${aExcluir?.nome ?? ""}?`}
        descricao="A página pública do projeto deixa de existir. Se a ideia é só tirar do site por um tempo, oculte em vez de excluir."
        rotuloConfirmar={CTA.excluir("projeto")}
        onConfirmar={() => (aExcluir ? excluir.mutateAsync(aExcluir.id).catch(() => {}) : undefined)}
        bloqueio={
          aExcluir && vinculosDoExcluir > 0
            ? {
                motivo: (
                  <>
                    {descreverVinculos(aExcluir.vinculos)} {MOTIVO_VINCULOS}
                  </>
                ),
                alternativa: aExcluir.status
                  ? {
                      rotulo: "Ocultar do site",
                      onClick: () =>
                        alternarStatus
                          .mutateAsync({ id: aExcluir.id, status: false })
                          .then(() => setAExcluir(null))
                          .catch(() => {}),
                    }
                  : undefined,
              }
            : undefined
        }
      />

      <Dialog
        open={aberto}
        onOpenChange={(v) => {
          setAberto(v);
          if (!v) {
            setEditando(null);
            form.reset(PROJETO_VAZIO);
          }
        }}
      >
        <DialogContent className="rolagem-contida max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold">
              {editando ? "Editar projeto" : "Novo projeto"}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "As mudanças aparecem na página pública do projeto."
                : "Depois de criar, você diz o que está faltando. É isso que o doador lê primeiro."}
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
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="address-level2"
                          maxLength={80}
                          placeholder="Sorocaba"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="causa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Causa</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === SEM_CAUSA ? "" : v)}
                        value={field.value || SEM_CAUSA}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha a causa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={SEM_CAUSA}>Sem causa definida</SelectItem>
                          {CAUSAS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>É por ela que o doador filtra os projetos no site.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                name="capa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto de capa</FormLabel>
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
                    <FormDescription>
                      Opcional. Uma foto do trabalho real ajuda mais que um banner. Sem foto, o site
                      usa a imagem da causa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Capa
                src={capaDigitada?.trim() || null}
                alt=""
                id={editando?.id ?? "novo-projeto"}
                nome={nomeDigitado || "Projeto"}
                causa={causaDigitada || null}
                className="aspect-[16/7] w-full rounded-xl"
              />

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                  {CTA.cancelar}
                </Button>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {salvar.isPending
                    ? editando ? CTA.salvando : CTA.criando
                    : editando ? CTA.salvar("projeto") : CTA.criar("projeto")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function descreverVinculos({ necessidades, doacoes, inscricoes }: Vinculos) {
  const partes = [
    necessidades > 0 && `${necessidades} ${necessidades === 1 ? "necessidade" : "necessidades"}`,
    doacoes > 0 && `${doacoes} ${doacoes === 1 ? "doação" : "doações"}`,
    inscricoes > 0 && `${inscricoes} ${inscricoes === 1 ? "inscrição de voluntário" : "inscrições de voluntário"}`,
  ].filter(Boolean) as string[];
  const lista =
    partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}` : partes[0];
  return `Este projeto tem ${lista}.`;
}
