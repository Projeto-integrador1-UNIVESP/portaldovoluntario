import { useState, type FormEvent } from "react";
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
import { CTA, SUCESSO, TERMOS, VAZIO } from "@/lib/copy";
import { formatDate, hojeLocal } from "@/lib/format";
import { CODIGO_VAZIO, codigoAdminSchema, type CodigoAdminForm } from "@/lib/schemas/admin";
import { Campo, ExcluirLinha, Paginacao, TabelaAdmin, Vazio } from "./_shared";
import {
  POR_PAGINA, ehCodigoDuplicado, fimDoDiaLocal, gerarCodigoDeAcesso, mensagemDeErro,
  useValidacao,
} from "./_shared-lib";

const CHAVE = TERMOS.chave;

const COLUNAS = [
  { rotulo: "Chave" },
  { rotulo: "ONG convidada" },
  { rotulo: "Situação" },
  { rotulo: "Validade" },
  { rotulo: "Gerada em" },
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
  if (c.used) return { rotulo: "Utilizada", variante: "neutro" as const };
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return { rotulo: "Expirada", variante: "destructive" as const };
  }
  return { rotulo: "Disponível", variante: "success" as const };
};

/**
 * Chaves de acesso para cadastro de ONG.
 *
 * Cada chave deixa uma organização criar conta e assumir o painel dela, então
 * vale tratar como credencial: geração criptográfica, validade opcional e
 * remoção só enquanto não foi usada.
 */
export default function AdminCodigos() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<CodigoAdminForm>(CODIGO_VAZIO);
  const { erros, validar, erroDoServidor, limpar } = useValidacao(codigoAdminSchema, "codigo");

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
    mutationFn: async (dados: CodigoAdminForm) => {
      const { data: sessao } = await supabase.auth.getUser();

      const inserir = (code: string) =>
        supabase.from("ong_access_codes").insert({
          code,
          nome_ong_sugerido: dados.nome_ong_sugerido.trim() || null,
          observacoes: dados.observacoes.trim() || null,
          expires_at: dados.expires_at ? fimDoDiaLocal(dados.expires_at) : null,
          created_by: sessao.user?.id ?? null,
        });

      const codigo = dados.code.trim().toUpperCase();
      const { error } = await inserir(codigo);
      if (!error) return codigo;

      // `code` é UNIQUE. Numa colisão, ou numa chave digitada à mão que já
      // existe, gerar outra resolve sem mandar o administrador tentar de novo.
      if (!ehCodigoDuplicado(error)) throw error;

      const alternativo = gerarCodigoDeAcesso();
      const { error: erroDoSegundo } = await inserir(alternativo);
      if (erroDoSegundo) throw erroDoSegundo;
      return alternativo;
    },
    onSuccess: (codigo) => {
      toast.success(SUCESSO.criada(`Chave ${codigo}`));
      fechar();
      queryClient.invalidateQueries({ queryKey: ["admin-codigos"] });
    },
    onError: (erro) => erroDoServidor(erro, `Não foi possível gerar a ${CHAVE}.`),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ong_access_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(SUCESSO.excluida("Chave de acesso"));
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-codigos"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, `Não foi possível remover a ${CHAVE}.`)),
  });

  const abrirNova = () => {
    setForm({ ...CODIGO_VAZIO, code: gerarCodigoDeAcesso() });
    limpar();
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setForm(CODIGO_VAZIO);
    limpar();
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const dados = validar(form);
    if (dados) criar.mutate(dados);
  };

  const copiar = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(SUCESSO.copiado);
    } catch {
      toast.error("O navegador não permitiu copiar. Selecione a chave e copie à mão.");
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
          <Button onClick={abrirNova}>
            <Plus aria-hidden="true" />
            Gerar chave de acesso
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
            title="Nenhuma chave gerada ainda"
            description="Gere uma chave para convidar uma organização a se cadastrar."
            action={{ label: "Gerar chave de acesso", onClick: abrirNova }}
          />
        }
        rodape={<Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />}
      >
        {linhas.map((c) => {
          const estado = situacao(c);
          return (
            <TableRow key={c.id}>
              <TableCell className="font-mono font-semibold">{c.code}</TableCell>
              <TableCell>{c.nome_ong_sugerido || <Vazio />}</TableCell>
              <TableCell>
                <Badge variant={estado.variante}>{estado.rotulo}</Badge>
                {c.used && c.used_at && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    em {formatDate(c.used_at)}
                  </div>
                )}
              </TableCell>
              <TableCell className="numero text-muted-foreground">
                {c.expires_at ? formatDate(c.expires_at) : <Vazio texto={VAZIO.semPrazo} />}
              </TableCell>
              <TableCell className="numero text-muted-foreground">{formatDate(c.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Copiar a chave ${c.code}`}
                    onClick={() => copiar(c.code)}
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                  {!c.used && (
                    <ExcluirLinha
                      rotuloAcessivel={`Remover a chave ${c.code}`}
                      titulo={`Remover a chave ${c.code}?`}
                      descricao="A chave deixa de funcionar na hora. Quem a recebeu não conseguirá concluir o cadastro."
                      rotuloConfirmar={CTA.remover(CHAVE)}
                      aoConfirmar={() => excluir.mutateAsync(c.id)}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TabelaAdmin>

      <Dialog open={aberto} onOpenChange={(v) => (v ? setAberto(true) : fechar())}>
        <DialogContent className="rolagem-contida">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Gerar chave de acesso</DialogTitle>
            <DialogDescription>
              A chave já vem sorteada. Os outros campos servem para você lembrar a
              quem ela foi enviada.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={enviar} className="grid gap-4">
            <Campo
              id="codigo-code"
              rotulo="Chave"
              obrigatorio
              dica="Formato ONG-XXXX-XXXX. Pode editar, desde que mantenha o formato."
              erro={erros.code}
            >
              {(a11y) => (
                <div className="flex gap-2">
                  <Input
                    {...a11y}
                    name="code"
                    className="font-mono"
                    autoComplete="off"
                    autoCapitalize="characters"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm({ ...form, code: gerarCodigoDeAcesso() })}
                  >
                    <RefreshCw aria-hidden="true" />
                    Sortear outra
                  </Button>
                </div>
              )}
            </Campo>

            <Campo id="codigo-nome_ong_sugerido" rotulo="Nome da ONG convidada" erro={erros.nome_ong_sugerido}>
              <Input
                id="codigo-nome_ong_sugerido"
                name="nome_ong_sugerido"
                autoComplete="off"
                maxLength={80}
                value={form.nome_ong_sugerido}
                onChange={(e) => setForm({ ...form, nome_ong_sugerido: e.target.value })}
              />
            </Campo>

            <Campo
              id="codigo-expires_at"
              rotulo="Validade"
              dica="A chave vale até o fim deste dia. Em branco, não expira."
              erro={erros.expires_at}
            >
              <Input
                id="codigo-expires_at"
                name="expires_at"
                type="date"
                autoComplete="off"
                min={hojeLocal()}
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </Campo>

            <Campo id="codigo-observacoes" rotulo="Observações" erro={erros.observacoes}>
              <Input
                id="codigo-observacoes"
                name="observacoes"
                autoComplete="off"
                maxLength={200}
                placeholder="Para quem foi enviada e por qual canal"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </Campo>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fechar}>
                {CTA.cancelar}
              </Button>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? "Gerando…" : "Gerar chave de acesso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
