import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { DollarSign, Download, Eye, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
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
import { CTA, TERMOS, VAZIO } from "@/lib/copy";
import { formatCurrency, formatDateTime, maskCurrency, parseCurrency } from "@/lib/format";
import {
  DOACAO_VAZIA, TIPOS_DE_DOACAO, doacaoAdminSchema, type DoacaoAdminForm,
} from "@/lib/schemas/admin";
import { Campo, ExcluirLinha, Paginacao, TabelaAdmin, Vazio } from "./_shared";
import {
  COLUNAS_DA_DOACAO, POR_PAGINA, baixarCsv, doacoesComRelacionados, mensagemDeErro,
  nomeDoDoador, rotuloDoTipo, situacaoDaDoacao, useCorrigirPaginaVazia, useValidacao,
  type DoacaoDetalhada,
} from "./_shared-lib";

type Filtro = "todas" | "pendente" | "confirmada" | "cancelada";

/** Teto do CSV. Acima disso o navegador monta um arquivo que ninguém abre. */
const TETO_DO_CSV = 5_000;

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "pendente", rotulo: TERMOS.pendente },
  { valor: "confirmada", rotulo: TERMOS.confirmada },
  { valor: "cancelada", rotulo: TERMOS.naoRecebida },
];

const COLUNAS = [
  { rotulo: "Doador" },
  { rotulo: "ONG" },
  { rotulo: "O que" },
  { rotulo: "Recebimento" },
  { rotulo: "Data" },
  { rotulo: "Ações", className: "text-right" },
];

/**
 * Todas as doações da plataforma.
 *
 * A consulta é paginada no servidor e o filtro por situação também, o que
 * permite chegar aqui pelo Início direto nas doações que a ONG não confirmou.
 *
 * O administrador não confirma recebimento: quem atesta que o item chegou é a
 * organização. Esta tela mostra a situação, não a altera.
 */
export default function AdminDoacoes() {
  const queryClient = useQueryClient();
  const [parametros, setParametros] = useSearchParams();
  const filtro = (parametros.get("status") as Filtro | null) ?? "todas";
  const [pagina, setPagina] = useState(0);
  const [criando, setCriando] = useState(false);
  const [detalhe, setDetalhe] = useState<DoacaoDetalhada | null>(null);
  const [exportando, setExportando] = useState(false);
  const [form, setForm] = useState<DoacaoAdminForm>(DOACAO_VAZIA);
  const { erros, validar, erroDoServidor, limpar } = useValidacao(doacaoAdminSchema, "doacao");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-doacoes", filtro, pagina],
    queryFn: async () => {
      let consulta = supabase
        .from("doacoes")
        .select(COLUNAS_DA_DOACAO, { count: "exact" })
        // `id` como segunda chave: com só a data, linhas de mesmo instante
        // saem em ordem indefinida e uma delas pode aparecer em duas páginas.
        .order("data_doacao", { ascending: false })
        .order("id")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

      if (filtro !== "todas") consulta = consulta.eq("status", filtro);

      const { data: linhas, count, error } = await consulta;
      if (error) throw error;

      return {
        linhas: await doacoesComRelacionados(linhas ?? []),
        total: count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  // A lista de ONGs do formulário é curta e não muda a cada página.
  const { data: ongs } = useQuery({
    queryKey: ["admin-ongs-select"],
    queryFn: async () => {
      const { data: linhas, error } = await supabase
        .from("ongs")
        .select("id, nome")
        .eq("status", true)
        .order("nome");
      if (error) throw error;
      return linhas ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useCorrigirPaginaVazia({
    pagina,
    total: data?.total ?? 0,
    carregando: isPending,
    aoCorrigir: setPagina,
  });

  const linhas = data?.linhas ?? [];

  const criar = useMutation({
    mutationFn: async (dados: DoacaoAdminForm) => {
      const { error } = await supabase.from("doacoes").insert({
        id_ong: dados.id_ong,
        valor: parseCurrency(dados.valor),
        tipo_doacao: dados.tipo_doacao,
        doador_nome: dados.doador_nome.trim() || null,
        doador_email: dados.doador_email.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Doação registrada. A ONG ainda precisa confirmar o recebimento");
      fecharCriacao();
      queryClient.invalidateQueries({ queryKey: ["admin-doacoes"] });
    },
    onError: (erro) => erroDoServidor(erro, "Não foi possível registrar a doação."),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Doação removida");
      // Se era a única linha da página, recuar antes de recarregar evita que a
      // tela pisque o estado vazio de uma página que deixou de existir.
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-doacoes"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível remover a doação.")),
  });

  /** O CSV faz a consulta dele: com paginação, exportar "a tela" seria exportar 25 linhas. */
  const exportar = async () => {
    setExportando(true);
    try {
      let consulta = supabase
        .from("doacoes")
        .select(COLUNAS_DA_DOACAO)
        .order("data_doacao", { ascending: false })
        .order("id")
        .limit(TETO_DO_CSV);
      if (filtro !== "todas") consulta = consulta.eq("status", filtro);

      const { data: todas, error } = await consulta;
      if (error) throw error;

      const completas = await doacoesComRelacionados(todas ?? []);
      baixarCsv(
        `doacoes-${filtro}.csv`,
        completas.map((d) => ({
          data: formatDateTime(d.data_doacao),
          doador: nomeDoDoador(d),
          email: d.anonima ? "" : d.doador?.email || d.doador_email || "",
          ong: d.ong?.nome ?? "",
          valor: d.valor,
          quantidade: d.quantidade ?? "",
          item: d.necessidade?.nome ?? "",
          tipo: d.tipo_doacao ?? "",
          anonima: d.anonima ? "sim" : "não",
          situacao: situacaoDaDoacao(d.status),
          confirmada_em: d.confirmada_em ? formatDateTime(d.confirmada_em) : "",
        })),
        data?.total ?? completas.length,
      );
    } catch (erro) {
      toast.error(mensagemDeErro(erro, "Não foi possível gerar o arquivo."));
    } finally {
      setExportando(false);
    }
  };

  const fecharCriacao = () => {
    setCriando(false);
    setForm(DOACAO_VAZIA);
    limpar();
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const dados = validar(form);
    if (dados) criar.mutate(dados);
  };

  const trocarFiltro = (novo: string) => {
    const proximos = new URLSearchParams(parametros);
    if (novo === "todas") proximos.delete("status");
    else proximos.set("status", novo);
    setParametros(proximos, { replace: true });
    setPagina(0);
  };

  return (
    <DashboardLayout type="admin">
      <Seo title="Doações" noIndex />
      <PageHeader
        title="Doações"
        description="Toda doação registrada na plataforma e em que pé está a confirmação"
        icon={<DollarSign className="h-6 w-6" aria-hidden="true" />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportar} disabled={exportando}>
              <Download aria-hidden="true" />
              {exportando ? "Gerando…" : CTA.exportarCsv}
            </Button>
            <Button onClick={() => setCriando(true)}>
              <Plus aria-hidden="true" />
              Registrar doação
            </Button>
          </div>
        }
      />

      <Tabs value={filtro} onValueChange={trocarFiltro} className="mb-4">
        <TabsList className="h-auto flex-wrap justify-start">
          {FILTROS.map((f) => (
            <TabsTrigger key={f.valor} value={f.valor}>
              {f.rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtro === "pendente" && linhas.length > 0 && (
        <Callout tom="atencao" className="mb-4">
          Enquanto a ONG não confirma o recebimento, a barra do projeto não sobe
          e quem doou não vê o próprio efeito. Quem confirma é a organização:
          daqui o que dá para fazer é cobrar.
        </Callout>
      )}

      <TabelaAdmin
        colunas={COLUNAS}
        carregando={isPending}
        erro={isError}
        tituloErro="Não foi possível carregar as doações"
        aoTentarDeNovo={() => refetch()}
        vazia={linhas.length === 0}
        vazio={
          <EmptyState
            title={
              filtro === "todas"
                ? "Nenhuma doação registrada"
                : filtro === "pendente"
                  ? "Nenhuma doação aguardando confirmação"
                  : filtro === "confirmada"
                    ? "Nenhuma doação confirmada ainda"
                    : "Nenhuma doação marcada como não recebida"
            }
            description={
              filtro === "todas"
                ? "As doações feitas no site aparecem aqui. Você também pode registrar uma que chegou por fora."
                : "Nada nesta situação no momento."
            }
            action={
              filtro === "todas"
                ? { label: "Registrar doação", onClick: () => setCriando(true) }
                : { label: "Ver todas as doações", onClick: () => trocarFiltro("todas") }
            }
          />
        }
        rodape={
          <Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />
        }
      >
        {linhas.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium">{nomeDoDoador(d)}</TableCell>

            <TableCell className="text-muted-foreground">
              {d.ong?.nome ?? <Vazio texto={VAZIO.semOng} />}
            </TableCell>

            <TableCell>
              {d.necessidade ? (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="numero">
                    {d.quantidade} {d.necessidade.unidade ?? ""}
                  </span>
                  <span className="text-muted-foreground">de {d.necessidade.nome}</span>
                </span>
              ) : (
                <span className="numero font-medium">{formatCurrency(d.valor)}</span>
              )}
            </TableCell>

            <TableCell>
              <SeloConfirmacao confirmadaEm={d.confirmada_em} cancelada={d.status === "cancelada"} />
            </TableCell>

            <TableCell className="numero whitespace-nowrap text-muted-foreground">{formatDateTime(d.data_doacao)}</TableCell>

            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Ver detalhes da doação de ${nomeDoDoador(d)}`}
                  onClick={() => setDetalhe(d)}
                >
                  <Eye aria-hidden="true" />
                </Button>
                <ExcluirLinha
                  rotuloAcessivel={`Remover a doação de ${nomeDoDoador(d)}`}
                  titulo="Remover esta doação do histórico?"
                  descricao="O registro sai da plataforma e, se estava confirmada, o progresso do projeto é recalculado para baixo. Use só para corrigir um lançamento errado."
                  rotuloConfirmar={CTA.remover("doação")}
                  aoConfirmar={() => excluir.mutateAsync(d.id)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Dialog open={criando} onOpenChange={(aberto) => (aberto ? setCriando(true) : fecharCriacao())}>
        <DialogContent className="rolagem-contida">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Registrar doação</DialogTitle>
            <DialogDescription>
              Para lançar uma doação que chegou por fora do site. Ela entra como
              aguardando confirmação: quem atesta o recebimento é a ONG.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={enviar} className="grid gap-4">
            <Campo id="doacao-id_ong" rotulo="ONG que recebeu" obrigatorio erro={erros.id_ong}>
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
              <Campo id="doacao-valor" rotulo="Valor" obrigatorio erro={erros.valor}>
                <Input
                  id="doacao-valor"
                  name="valor"
                  inputMode="numeric"
                  autoComplete="off"
                  value={maskCurrency(form.valor)}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </Campo>
              <Campo id="doacao-tipo_doacao" rotulo="Forma" erro={erros.tipo_doacao}>
                {(a11y) => (
                  <Select
                    value={form.tipo_doacao}
                    onValueChange={(v) => setForm({ ...form, tipo_doacao: v as DoacaoAdminForm["tipo_doacao"] })}
                    name="tipo_doacao"
                  >
                    <SelectTrigger {...a11y}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DE_DOACAO.map((t) => (
                        <SelectItem key={t.valor} value={t.valor}>
                          {t.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="doacao-doador_nome"
                rotulo="Nome de quem doou"
                dica="Deixe vazio se a doação foi anônima."
                erro={erros.doador_nome}
              >
                <Input
                  id="doacao-doador_nome"
                  name="doador_nome"
                  autoComplete="off"
                  maxLength={80}
                  value={form.doador_nome}
                  onChange={(e) => setForm({ ...form, doador_nome: e.target.value })}
                />
              </Campo>
              <Campo id="doacao-doador_email" rotulo="E-mail de quem doou" erro={erros.doador_email}>
                <Input
                  id="doacao-doador_email"
                  name="doador_email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={form.doador_email}
                  onChange={(e) => setForm({ ...form, doador_email: e.target.value })}
                />
              </Campo>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharCriacao}>
                {CTA.cancelar}
              </Button>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? "Registrando…" : "Registrar doação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detalhe)} onOpenChange={(aberto) => !aberto && setDetalhe(null)}>
        <DialogContent className="rolagem-contida">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Detalhes da doação</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4">
              <SeloConfirmacao
                variante="completo"
                confirmadaEm={detalhe.confirmada_em}
                cancelada={detalhe.status === "cancelada"}
              />
              <dl className="space-y-2 text-sm">
                <Linha rotulo="Doador" valor={nomeDoDoador(detalhe)} />
                {!detalhe.anonima && (
                  <>
                    <Linha rotulo="E-mail" valor={detalhe.doador?.email || detalhe.doador_email || VAZIO.naoInformado} />
                    <Linha rotulo="Telefone" valor={detalhe.doador?.telefone || VAZIO.naoInformado} />
                    <Linha
                      rotulo="Cidade"
                      valor={
                        detalhe.doador?.cidade
                          ? `${detalhe.doador.cidade}${detalhe.doador.estado ? `, ${detalhe.doador.estado}` : ""}`
                          : VAZIO.naoInformado
                      }
                    />
                  </>
                )}
                <Linha rotulo="ONG" valor={detalhe.ong?.nome ?? VAZIO.semOng} />
                <Linha
                  rotulo="O que"
                  valor={
                    detalhe.necessidade
                      ? `${detalhe.quantidade ?? 0} ${detalhe.necessidade.unidade ?? ""} de ${detalhe.necessidade.nome}`
                      : formatCurrency(detalhe.valor)
                  }
                />
                <Linha rotulo="Forma" valor={rotuloDoTipo(detalhe.tipo_doacao)} />
                {detalhe.forma_entrega && (
                  <Linha
                    rotulo="Entrega"
                    valor={detalhe.forma_entrega === "levar" ? "O doador vai levar" : "Pediu coleta"}
                  />
                )}
                <Linha rotulo="Registrada em" valor={formatDateTime(detalhe.data_doacao)} />
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{rotulo}:</dt>
      <dd className="min-w-0 break-words font-medium">{valor}</dd>
    </div>
  );
}
