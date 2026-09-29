import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Campo, ExcluirLinha, Paginacao, TabelaAdmin } from "./_shared";
import {
  POR_PAGINA, ehCodigoDuplicado, fimDoDiaLocal, gerarCodigoDeAcesso, mensagemDeErro,
} from "./_shared-lib";

const COLUNAS = [
  { rotulo: "Código" },
  { rotulo: "ONG sugerida" },
  { rotulo: "Situação" },
  { rotulo: "Validade" },
  { rotulo: "Gerado em" },
  { rotulo: "Ações", className: "text-right" },
];

type Codigo = {
  id: string;
  code: string;
  nome_ong_sugerido: string | null;
  observacoes: string | null;
  expires_at: string | null;
  created_at: string;
  used: boolean;
  used_at: string | null;
};

const situacao = (c: Codigo) => {
  if (c.used) return { rotulo: "Utilizado", variante: "secondary" as const };
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return { rotulo: "Expirado", variante: "destructive" as const };
  }
  return { rotulo: "Disponível", variante: "default" as const };
};

/**
 * Chaves de acesso para cadastro de ONG.
 *
 * Cada código deixa uma organização criar conta e assumir o painel dela, então
 * vale tratar como credencial: geração criptográfica, validade opcional e
 * remoção só enquanto não foi usado.
 */
export default function AdminCodigos() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    code: "", nome_ong_sugerido: "", observacoes: "", expires_at: "",
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-codigos", pagina],
    queryFn: async () => {
      const { data: linhas, count, error } = await supabase
        .from("ong_access_codes")
        .select("id, code, nome_ong_sugerido, observacoes, expires_at, created_at, used, used_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("id")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      if (error) throw error;
      return { linhas: (linhas ?? []) as Codigo[], total: count ?? 0 };
    },
    staleTime: 30_000,
  });

  const linhas = data?.linhas ?? [];

  const criar = useMutation({
    mutationFn: async () => {
      const { data: sessao } = await supabase.auth.getUser();

      const inserir = (code: string) =>
        supabase.from("ong_access_codes").insert({
          code,
          nome_ong_sugerido: form.nome_ong_sugerido.trim() || null,
          observacoes: form.observacoes.trim() || null,
          expires_at: form.expires_at ? fimDoDiaLocal(form.expires_at) : null,
          created_by: sessao.user?.id ?? null,
        });

      const codigo = form.code.trim().toUpperCase();
      const { error } = await inserir(codigo);
      if (!error) return codigo;

      // `code` é UNIQUE. Numa colisão — ou num código digitado à mão que já
      // existe — gerar outro resolve sem mandar o administrador tentar de novo.
      if (!ehCodigoDuplicado(error)) throw error;

      const alternativo = gerarCodigoDeAcesso();
      const { error: erroDoSegundo } = await inserir(alternativo);
      if (erroDoSegundo) throw erroDoSegundo;
      return alternativo;
    },
    onSuccess: (codigo) => {
      toast.success(`Código ${codigo} gerado.`);
      setAberto(false);
      queryClient.invalidateQueries({ queryKey: ["admin-codigos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível gerar o código.")),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ong_access_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Código removido.");
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-codigos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível remover o código.")),
  });

  const abrirNovo = () => {
    setForm({ code: gerarCodigoDeAcesso(), nome_ong_sugerido: "", observacoes: "", expires_at: "" });
    setAberto(true);
  };

  const copiar = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado.");
    } catch {
      toast.error("O navegador não permitiu copiar. Selecione o código e copie à mão.");
    }
  };

  return (
    <DashboardLayout type="admin">
      <Seo title="Chaves de acesso de ONG" noIndex />
      <PageHeader
        title="Chaves de acesso de ONG"
        description="Cada chave deixa uma organização criar a conta dela e assumir o painel"
        icon={<KeyRound className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Gerar chave
          </Button>
        }
      />

      <Callout tom="atencao" titulo="Trate como senha" className="mb-4">
        Quem tem a chave entra como a organização e passa a publicar necessidades
        e confirmar doações no nome dela. Envie por um canal privado e, se houver
        dúvida sobre o destinatário, remova a chave antes que ela seja usada.
      </Callout>

      <TabelaAdmin
        colunas={COLUNAS}
        carregando={isPending}
        erro={isError}
        tituloErro="Não foi possível carregar as chaves de acesso"
        aoTentarDeNovo={() => refetch()}
        vazia={linhas.length === 0}
        vazio={
          <EmptyState
            icon={KeyRound}
            title="Nenhuma chave gerada ainda"
            description="Gere uma chave para convidar uma organização a se cadastrar."
            action={{ label: "Gerar chave", onClick: abrirNovo }}
          />
        }
        rodape={<Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />}
      >
        {linhas.map((c) => {
          const estado = situacao(c);
          return (
            <TableRow key={c.id}>
              <TableCell className="font-mono font-semibold">{c.code}</TableCell>
              <TableCell>{c.nome_ong_sugerido || "—"}</TableCell>
              <TableCell>
                <Badge variant={estado.variante}>{estado.rotulo}</Badge>
                {c.used && c.used_at && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    em {formatDate(c.used_at)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {c.expires_at ? formatDate(c.expires_at) : "Sem prazo"}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Copiar o código ${c.code}`}
                    onClick={() => copiar(c.code)}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {!c.used && (
                    <ExcluirLinha
                      rotuloAcessivel={`Remover o código ${c.code}`}
                      titulo="Remover esta chave?"
                      descricao="A chave deixa de funcionar imediatamente. Quem a recebeu não conseguirá concluir o cadastro."
                      rotuloConfirmar="Remover"
                      aoConfirmar={() => excluir.mutate(c.id)}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TabelaAdmin>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar chave de acesso</DialogTitle>
            <DialogDescription>
              O código já vem sorteado. Os outros campos servem para você lembrar
              a quem esta chave foi enviada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Campo id="codigo-chave" rotulo="Código" obrigatorio>
              <div className="flex gap-2">
                <Input
                  id="codigo-chave"
                  className="font-mono"
                  autoComplete="off"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm({ ...form, code: gerarCodigoDeAcesso() })}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Sortear outro
                </Button>
              </div>
            </Campo>

            <Campo id="codigo-ong" rotulo="Nome da ONG convidada">
              <Input
                id="codigo-ong"
                autoComplete="off"
                value={form.nome_ong_sugerido}
                onChange={(e) => setForm({ ...form, nome_ong_sugerido: e.target.value })}
              />
            </Campo>

            <Campo
              id="codigo-validade"
              rotulo="Validade"
              dica="A chave vale até o fim deste dia. Em branco, não expira."
            >
              <Input
                id="codigo-validade"
                type="date"
                autoComplete="off"
                min={new Date().toISOString().slice(0, 10)}
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </Campo>

            <Campo id="codigo-observacoes" rotulo="Observações">
              <Input
                id="codigo-observacoes"
                autoComplete="off"
                placeholder="Para quem foi enviada, por qual canal…"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </Campo>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => criar.mutate()} disabled={criar.isPending || !form.code.trim()}>
              {criar.isPending ? "Gerando…" : "Gerar chave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
