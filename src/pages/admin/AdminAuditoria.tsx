import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Download, Package, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { Stat } from "@/components/common/Stat";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { CTA, TESE, VAZIO } from "@/lib/copy";
import { formatCurrency, formatDateTime, formatQuantidade } from "@/lib/format";
import { Paginacao, TabelaAdmin, Vazio } from "./_shared";
import {
  COLUNAS_DA_DOACAO, POR_PAGINA, baixarCsv, doacoesComRelacionados, mensagemDeErro,
  nomeDoDoador, rotuloDoTipo, situacaoDaDoacao, useCorrigirPaginaVazia,
} from "./_shared-lib";

const TETO_DO_CSV = 5_000;
const TODAS = "todas";

const COLUNAS = [
  { rotulo: "Quando" },
  { rotulo: "Doador" },
  { rotulo: "ONG" },
  { rotulo: "O que" },
  { rotulo: "Recebimento" },
  { rotulo: "Valor", className: "text-right" },
];

/**
 * Extrato de doações.
 *
 * Os agregados vêm do banco: o total da plataforma pela RPC que a home usa e
 * os números por ONG pela `get_impacto_ong`. Os dois somam só o que a ONG
 * confirmou, então o número daqui é o mesmo do site.
 */
export default function AdminAuditoria() {
  const [ongSelecionada, setOngSelecionada] = useState<string>(TODAS);
  const [pagina, setPagina] = useState(0);
  const [exportando, setExportando] = useState(false);

  const { data: ongs } = useQuery({
    queryKey: ["admin-ongs-select"],
    queryFn: async () => {
      const { data: linhasDeOng, error } = await supabase
        .from("ongs")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return linhasDeOng ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: totais, isPending: totaisCarregando } = useQuery({
    queryKey: ["admin-auditoria-totais", ongSelecionada],
    queryFn: async () => {
      if (ongSelecionada === TODAS) {
        const { data: stats, error } = await supabase.rpc("get_public_home_stats");
        if (error) throw error;
        const linha = stats?.[0];
        return {
          confirmado: Number(linha?.valor_arrecadado ?? 0),
          itensConfirmados: Number(linha?.itens_arrecadados ?? 0),
          pendente: null as number | null,
          doadores: null as number | null,
        };
      }

      const { data: impacto, error } = await supabase.rpc("get_impacto_ong", {
        _ong_id: ongSelecionada,
      });
      if (error) throw error;
      const linha = impacto?.[0];
      return {
        confirmado: Number(linha?.total_confirmado ?? 0),
        itensConfirmados: null as number | null,
        pendente: Number(linha?.total_pendente ?? 0),
        doadores: Number(linha?.doadores_distintos ?? 0),
      };
    },
    staleTime: 60_000,
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-auditoria", ongSelecionada, pagina],
    queryFn: async () => {
      let consulta = supabase
        .from("doacoes")
        .select(COLUNAS_DA_DOACAO, { count: "exact" })
        .order("data_doacao", { ascending: false })
        .order("id")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

      if (ongSelecionada !== TODAS) consulta = consulta.eq("id_ong", ongSelecionada);

      const { data: linhas, count, error } = await consulta;
      if (error) throw error;

      return {
        linhas: await doacoesComRelacionados(linhas ?? []),
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

  const exportar = async () => {
    setExportando(true);
    try {
      let consulta = supabase
        .from("doacoes")
        .select(COLUNAS_DA_DOACAO)
        .order("data_doacao", { ascending: false })
        .order("id")
        .limit(TETO_DO_CSV);
      if (ongSelecionada !== TODAS) consulta = consulta.eq("id_ong", ongSelecionada);

      const { data: todas, error } = await consulta;
      if (error) throw error;

      const completas = await doacoesComRelacionados(todas ?? []);
      baixarCsv(
        "auditoria.csv",
        completas.map((d) => ({
          data: formatDateTime(d.data_doacao),
          doador: nomeDoDoador(d),
          email: d.anonima ? "" : d.doador?.email || d.doador_email || "",
          anonima: d.anonima ? "sim" : "não",
          ong: d.ong?.nome ?? "",
          item: d.necessidade?.nome ?? "",
          quantidade: d.quantidade ?? "",
          valor: d.valor,
          tipo: d.tipo_doacao ?? "",
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

  const nomeDaOng = ongs?.find((o) => o.id === ongSelecionada)?.nome;

  return (
    <DashboardLayout type="admin">
      <Seo title="Auditoria de doações" noIndex />
      <PageHeader
        title="Auditoria de doações"
        description="Quem doou, para qual organização, quanto e se o recebimento foi confirmado"
        icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button variant="outline" onClick={exportar} disabled={exportando}>
            <Download aria-hidden="true" />
            {exportando ? "Gerando…" : CTA.exportarCsv}
          </Button>
        }
      />

      <div className="mb-6 sm:max-w-sm">
        <Label htmlFor="auditoria-ong">Organização</Label>
        <Select
          value={ongSelecionada}
          onValueChange={(v) => {
            setOngSelecionada(v);
            setPagina(0);
          }}
          name="ong"
        >
          <SelectTrigger id="auditoria-ong" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as organizações</SelectItem>
            {(ongs ?? []).map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {totaisCarregando ? (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        totais && (
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              destaque
              valor={formatCurrency(totais.confirmado)}
              rotulo={
                ongSelecionada === TODAS
                  ? "doados e confirmados na plataforma"
                  : `doados e confirmados por ${nomeDaOng}`
              }
              icone={BadgeCheck}
            />
            {totais.itensConfirmados !== null && (
              <Stat
                valor={totais.itensConfirmados}
                rotulo="itens recebidos e confirmados"
                icone={Package}
              />
            )}
            {totais.pendente !== null && (
              <Stat
                valor={formatCurrency(totais.pendente)}
                rotulo="registrados e ainda não confirmados"
              />
            )}
            {totais.doadores !== null && (
              <Stat valor={totais.doadores} rotulo="pessoas diferentes já doaram" />
            )}
          </div>
        )
      )}

      <Callout tom="confianca" className="mb-6">
        {TESE} Os valores acima contam só o que a organização confirmou ter
        recebido, o mesmo número do site. O extrato abaixo lista todo lançamento,
        confirmado ou não.
      </Callout>

      <TabelaAdmin
        colunas={COLUNAS}
        carregando={isPending}
        erro={isError}
        tituloErro="Não foi possível carregar o extrato"
        aoTentarDeNovo={() => refetch()}
        vazia={linhas.length === 0}
        vazio={
          <EmptyState
            title={
              ongSelecionada === TODAS
                ? "Nenhuma doação registrada"
                : `Nenhuma doação registrada para ${nomeDaOng}`
            }
            description="Cada doação feita no site entra aqui no mesmo instante, antes mesmo de ser confirmada."
            action={
              ongSelecionada === TODAS
                ? { label: "Ver doações", to: "/admin/doacoes" }
                : { label: "Ver todas as organizações", onClick: () => setOngSelecionada(TODAS) }
            }
          />
        }
        rodape={<Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />}
      >
        {linhas.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="numero whitespace-nowrap text-muted-foreground">{formatDateTime(d.data_doacao)}</TableCell>

            <TableCell className="max-w-56">
              <div className="break-words font-medium">{nomeDoDoador(d)}</div>
              {!d.anonima && (
                <div className="break-all text-xs text-muted-foreground">
                  {d.doador?.email || d.doador_email || ""}
                </div>
              )}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {d.ong?.nome ?? <Vazio texto={VAZIO.semOng} />}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {d.necessidade
                ? `${formatQuantidade(d.quantidade ?? 0, d.necessidade.unidade)} de ${d.necessidade.nome}`
                : rotuloDoTipo(d.tipo_doacao)}
            </TableCell>

            <TableCell>
              <SeloConfirmacao confirmadaEm={d.confirmada_em} cancelada={d.status === "cancelada"} />
            </TableCell>

            <TableCell className="numero whitespace-nowrap text-right font-medium">
              {d.necessidade && !d.valor ? <Vazio texto="Item" /> : formatCurrency(d.valor)}
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>
    </DashboardLayout>
  );
}
