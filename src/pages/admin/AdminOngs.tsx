import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Building2, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/common/Seo";
import { EmptyState } from "@/components/common/EmptyState";
import { Callout } from "@/components/common/Callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableCell, TableRow } from "@/components/ui/table";
import { UFS } from "@/lib/constants/ufs";
import { formatCnpj, formatPhone } from "@/lib/format";
import { isValidCep, isValidPhone, normalizeUrl, onlyDigits } from "@/lib/validators";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlternarStatus, Campo, ConfirmarAcao, SeloVerificada, TabelaAdmin,
} from "./_shared";
import { contarLinhas, mensagemDeErro } from "./_shared-lib";

type Aba = "ativas" | "inativas" | "sem-selo";
type AbaDoForm = "identidade" | "endereco" | "pagamentos" | "apresentacao";

/** `conta` e `agencia` são `INT` no banco: mais que isso estoura o tipo. */
const MAX_DIGITOS_CONTA = 9;
const MAX_DIGITOS_AGENCIA = 6;

const formVazio = {
  nome: "", cnpj: "", area_atuacao: "", telefone: "",
  cidade: "", estado: "", cep: "", logradouro: "",
  pix: "", banco: "", conta: "", agencia: "",
  missao: "", descricao: "", site: "", instagram: "", logo: "", capa: "",
};

type FormOng = typeof formVazio;

/** Cada aba do formulário; a inativa some por classe, não por desmontagem. */
const SECAO = "mt-4 space-y-4 data-[state=inactive]:hidden";

const COLUNAS = [
  { rotulo: "ONG" },
  { rotulo: "CNPJ" },
  { rotulo: "Contato" },
  { rotulo: "Selo de verificada" },
  { rotulo: "Ativa no site" },
  { rotulo: "Ações", className: "text-right" },
];

/**
 * ONGs parceiras.
 *
 * Duas mudanças de fundo em relação à versão anterior. A primeira é o selo de
 * verificada: a coluna `verificada_em` existe no banco e é exibida no site
 * público, mas não havia tela nenhuma para marcá-la — quem confere o CNPJ é a
 * administração, então o controle é daqui. Não é um `Switch`, e sim uma ação com
 * confirmação: o selo dá credibilidade pública à organização e um toggle se
 * aciona por acidente.
 *
 * A segunda é o formulário: dezoito campos num diálogo único viravam uma
 * rolagem sem fim. Agora são quatro abas, e um erro de validação leva o foco
 * para a aba onde o campo está.
 */
export default function AdminOngs() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [parametros, setParametros] = useSearchParams();
  const aba = (parametros.get("aba") as Aba | null) ?? "ativas";

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string } | null>(null);
  const [form, setForm] = useState<FormOng>(formVazio);
  const [abaDoForm, setAbaDoForm] = useState<AbaDoForm>("identidade");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-ongs"],
    queryFn: async () => {
      const { data: ongs, error } = await supabase
        .from("ongs")
        .select(
          "id, nome, cnpj, telefone, cidade, estado, cep, logradouro, area_atuacao, pix, banco, conta, agencia, missao, descricao, site, instagram, img_url, img_capa, logo_url, capa_url, status, verificada_em",
        )
        .order("created_at", { ascending: false })
        .order("id");
      if (error) throw error;
      return ongs ?? [];
    },
    staleTime: 30_000,
  });

  const ongs = useMemo(() => data ?? [], [data]);

  const porAba = useMemo(() => ({
    ativas: ongs.filter((o) => o.status),
    inativas: ongs.filter((o) => !o.status),
    "sem-selo": ongs.filter((o) => o.status && !o.verificada_em),
  }), [ongs]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = onlyDigits(busca);
    if (!termo) return porAba[aba];
    return porAba[aba].filter((o) =>
      o.nome.toLowerCase().includes(termo) ||
      (o.cidade ?? "").toLowerCase().includes(termo) ||
      (digitos.length > 0 && onlyDigits(o.cnpj ?? "").includes(digitos)),
    );
  }, [porAba, aba, busca]);

  const atualizar = <C extends keyof FormOng>(campo: C, valor: string) =>
    setForm((anterior) => ({ ...anterior, [campo]: valor }));

  const atualizarDigitos = (campo: keyof FormOng, valor: string, maximo: number) =>
    atualizar(campo, onlyDigits(valor, maximo));

  /**
   * `conta` e `agencia` são `INT` no banco, então zero à esquerda não sobrevive
   * ao salvar: "0001" volta como 1. Em vez de perder o dígito em silêncio — e
   * mostrar ao doador um dado bancário errado —, o campo já recusa o zero
   * inicial, e o que está na tela é o que ficou gravado.
   */
  const atualizarNumeroBancario = (campo: keyof FormOng, valor: string, maximo: number) =>
    atualizar(campo, onlyDigits(valor, maximo).replace(/^0+/, ""));

  const validar = (): { aba: AbaDoForm; mensagem: string } | null => {
    const nome = form.nome.trim();
    if (nome.length < 3) return { aba: "identidade", mensagem: "Informe o nome da ONG (ao menos 3 letras)." };
    if (nome.length > 80) return { aba: "identidade", mensagem: "O nome da ONG deve ter no máximo 80 caracteres." };
    if (onlyDigits(form.cnpj).length !== 14) return { aba: "identidade", mensagem: "O CNPJ deve ter 14 números." };
    if (!form.area_atuacao.trim()) return { aba: "identidade", mensagem: "Informe a área de atuação." };
    if (!isValidPhone(form.telefone)) return { aba: "identidade", mensagem: "O telefone precisa de DDD e 8 ou 9 números." };

    if (!form.cidade.trim()) return { aba: "endereco", mensagem: "Informe a cidade." };
    if (!form.estado) return { aba: "endereco", mensagem: "Selecione o estado." };
    if (!isValidCep(form.cep)) return { aba: "endereco", mensagem: "O CEP deve ter 8 números." };
    if (!form.logradouro.trim()) return { aba: "endereco", mensagem: "Informe o logradouro." };

    if (!form.pix.trim()) return { aba: "pagamentos", mensagem: "Informe a chave Pix da organização." };
    if (!form.banco.trim()) return { aba: "pagamentos", mensagem: "Informe o banco." };
    if (!form.conta) return { aba: "pagamentos", mensagem: "Informe a conta, só números e sem o dígito verificador." };
    if (!form.agencia) return { aba: "pagamentos", mensagem: "Informe a agência, só números." };

    if (!form.missao.trim()) return { aba: "apresentacao", mensagem: "Informe a missão — é o texto que aparece no site." };
    if (!form.descricao.trim()) return { aba: "apresentacao", mensagem: "Informe a descrição da organização." };
    return null;
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const logo = normalizeUrl(form.logo) || null;
      const capa = normalizeUrl(form.capa) || null;

      const payload = {
        nome: form.nome.trim(),
        cnpj: onlyDigits(form.cnpj, 14),
        area_atuacao: form.area_atuacao.trim(),
        telefone: onlyDigits(form.telefone, 11),
        cidade: form.cidade.trim(),
        estado: form.estado,
        cep: form.cep,
        logradouro: form.logradouro.trim(),
        pix: form.pix.trim(),
        banco: form.banco.trim(),
        conta: Number(form.conta),
        agencia: Number(form.agencia),
        missao: form.missao.trim(),
        descricao: form.descricao.trim(),
        site: normalizeUrl(form.site) || null,
        instagram: form.instagram.trim().replace(/^@/, "") || null,
        // O banco tem dois pares de colunas de imagem e o site público prefere
        // `logo_url`/`capa_url`. Escrever só `img_url` fazia a edição do admin
        // não aparecer em lugar nenhum quando o par novo já estava preenchido.
        logo_url: logo,
        img_url: logo,
        capa_url: capa,
        img_capa: capa,
      };

      const { error } = editando
        ? await supabase.from("ongs").update(payload).eq("id", editando.id)
        : await supabase.from("ongs").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editando ? "ONG atualizada." : "ONG cadastrada.");
      fecharDialogo();
      queryClient.invalidateQueries({ queryKey: ["admin-ongs"] });
    },
    onError: (erro) =>
      toast.error(mensagemDeErro(erro, "Não foi possível salvar a ONG. Tente de novo.")),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("ongs").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status ? "ONG visível no site." : "ONG oculta do site.");
      queryClient.invalidateQueries({ queryKey: ["admin-ongs"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível alterar a visibilidade.")),
  });

  const alternarSelo = useMutation({
    mutationFn: async ({ id, verificar }: { id: string; verificar: boolean }) => {
      const { error } = await supabase
        .from("ongs")
        .update({ verificada_em: verificar ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return verificar;
    },
    onSuccess: (verificou) => {
      toast.success(
        verificou
          ? "Selo aplicado. A ONG aparece como verificada no site."
          : "Selo removido. A ONG deixa de aparecer como verificada.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-ongs"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível alterar o selo.")),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ongs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ONG excluída.");
      queryClient.invalidateQueries({ queryKey: ["admin-ongs"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível excluir a ONG.")),
  });

  const fecharDialogo = () => {
    setDialogoAberto(false);
    setEditando(null);
    setForm(formVazio);
    setAbaDoForm("identidade");
  };

  const abrirNova = () => {
    setEditando(null);
    setForm(formVazio);
    setAbaDoForm("identidade");
    setDialogoAberto(true);
  };

  const abrirEdicao = (o: (typeof ongs)[number]) => {
    setEditando({ id: o.id });
    setForm({
      nome: o.nome ?? "",
      cnpj: onlyDigits(o.cnpj ?? "", 14),
      area_atuacao: o.area_atuacao ?? "",
      telefone: onlyDigits(o.telefone ?? "", 11),
      cidade: o.cidade ?? "",
      estado: o.estado ?? "",
      cep: onlyDigits(o.cep ?? "", 8),
      logradouro: o.logradouro ?? "",
      pix: o.pix ?? "",
      banco: o.banco ?? "",
      conta: o.conta === null ? "" : String(o.conta),
      agencia: o.agencia === null ? "" : String(o.agencia),
      missao: o.missao ?? "",
      descricao: o.descricao ?? "",
      site: o.site ?? "",
      instagram: o.instagram ?? "",
      logo: o.logo_url ?? o.img_url ?? "",
      capa: o.capa_url ?? o.img_capa ?? "",
    });
    setAbaDoForm("identidade");
    setDialogoAberto(true);
  };

  const enviar = () => {
    const problema = validar();
    if (problema) {
      setAbaDoForm(problema.aba);
      toast.error(problema.mensagem);
      return;
    }
    salvar.mutate();
  };

  const trocarAba = (nova: string) => {
    const proximos = new URLSearchParams(parametros);
    if (nova === "ativas") proximos.delete("aba");
    else proximos.set("aba", nova);
    setParametros(proximos, { replace: true });
  };

  return (
    <DashboardLayout type="admin">
      <Seo title="ONGs" noIndex />
      <PageHeader
        title="ONGs"
        description="Cadastro, visibilidade no site e verificação de CNPJ"
        icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={abrirNova}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova ONG
          </Button>
        }
      />

      {porAba["sem-selo"].length > 0 && aba !== "sem-selo" && (
        <Callout tom="atencao" titulo="ONGs esperando verificação" className="mb-4">
          {porAba["sem-selo"].length === 1
            ? "Uma ONG ativa ainda não tem o selo de verificada."
            : `${porAba["sem-selo"].length} ONGs ativas ainda não têm o selo de verificada.`}{" "}
          Quem confere o CNPJ é a administração.
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => trocarAba("sem-selo")}>
              Ver só essas
            </Button>
          </div>
        </Callout>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={aba} onValueChange={trocarAba}>
          <TabsList>
            <TabsTrigger value="ativas">Ativas ({porAba.ativas.length})</TabsTrigger>
            <TabsTrigger value="inativas">Inativas ({porAba.inativas.length})</TabsTrigger>
            <TabsTrigger value="sem-selo">Sem selo ({porAba["sem-selo"].length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="busca-ongs"
            type="search"
            autoComplete="off"
            className="pl-9"
            placeholder="Buscar por nome, cidade ou CNPJ"
            aria-label="Buscar ONG por nome, cidade ou CNPJ"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <TabelaAdmin
        colunas={COLUNAS}
        carregando={isPending}
        erro={isError}
        tituloErro="Não foi possível carregar as ONGs"
        aoTentarDeNovo={() => refetch()}
        vazia={lista.length === 0}
        vazio={
          busca ? (
            <EmptyState
              icon={Search}
              title="Nenhuma ONG encontrada"
              description={`Nada corresponde a “${busca}” nesta aba.`}
              action={{ label: "Limpar a busca", onClick: () => setBusca("") }}
            />
          ) : (
            <EmptyState
              icon={Building2}
              title={
                aba === "sem-selo"
                  ? "Todas as ONGs ativas estão verificadas"
                  : aba === "inativas"
                    ? "Nenhuma ONG inativa"
                    : "Nenhuma ONG cadastrada"
              }
              description={
                aba === "sem-selo"
                  ? "Quando uma organização nova entrar, ela aparece aqui para conferência de CNPJ."
                  : "Cadastre a primeira organização parceira para que ela apareça no site."
              }
              action={{ label: "Cadastrar ONG", onClick: abrirNova }}
            />
          )
        }
      >
        {lista.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="max-w-64">
              <div className="break-words font-medium">{o.nome}</div>
              <div className="text-xs text-muted-foreground">
                {o.cidade ? `${o.cidade}${o.estado ? `, ${o.estado}` : ""}` : "Sem cidade informada"}
              </div>
            </TableCell>

            <TableCell className="tabular-nums text-muted-foreground">
              {o.cnpj ? formatCnpj(o.cnpj) : "—"}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {o.telefone ? formatPhone(o.telefone) : "—"}
            </TableCell>

            <TableCell>
              <div className="flex flex-col items-start gap-1.5">
                <SeloVerificada verificadaEm={o.verificada_em} />
                {o.verificada_em ? (
                  <ConfirmarAcao
                    titulo="Remover o selo de verificada?"
                    descricao={`${o.nome} deixa de aparecer como verificada no site. Faça isso se o CNPJ não confere mais ou se a organização foi suspensa.`}
                    rotuloConfirmar="Remover selo"
                    destrutivo
                    aoConfirmar={() => alternarSelo.mutate({ id: o.id, verificar: false })}
                  >
                    <Button size="sm" variant="ghost" className="h-auto px-1 py-0.5 text-xs">
                      <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                      Remover selo
                    </Button>
                  </ConfirmarAcao>
                ) : (
                  <ConfirmarAcao
                    titulo="Marcar esta ONG como verificada?"
                    descricao={`Confirme apenas depois de checar o CNPJ ${o.cnpj ? formatCnpj(o.cnpj) : "da organização"} na Receita Federal. O selo aparece para quem está decidindo se confia em ${o.nome}.`}
                    rotuloConfirmar="Conferi o CNPJ, aplicar o selo"
                    aoConfirmar={() => alternarSelo.mutate({ id: o.id, verificar: true })}
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Verificar
                    </Button>
                  </ConfirmarAcao>
                )}
              </div>
            </TableCell>

            <TableCell>
              <AlternarStatus
                ativo={Boolean(o.status)}
                rotulo={`Visibilidade de ${o.nome} no site`}
                ocupado={alternarStatus.isPending}
                aoAlternar={() => alternarStatus.mutate({ id: o.id, status: !o.status })}
              />
            </TableCell>

            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Editar ${o.nome}`}
                  onClick={() => abrirEdicao(o)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <ExcluirOng
                  ong={o}
                  aoExcluir={() => excluir.mutate(o.id)}
                  aoDesativar={() => alternarStatus.mutate({ id: o.id, status: false })}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Dialog open={dialogoAberto} onOpenChange={(aberto) => (aberto ? setDialogoAberto(true) : fecharDialogo())}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar ONG" : "Nova ONG"}</DialogTitle>
            <DialogDescription>
              Os campos marcados com * são obrigatórios. Missão e descrição são o
              que o doador lê no site.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={abaDoForm} onValueChange={(v) => setAbaDoForm(v as AbaDoForm)}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="identidade">Identidade</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="pagamentos">Recebimento</TabsTrigger>
              <TabsTrigger value="apresentacao">No site</TabsTrigger>
            </TabsList>

            {/* `forceMount` mantém as quatro seções montadas: a validação aponta
                um campo de outra aba sem perder o que já foi digitado, e o
                `aria-controls` de cada gatilho continua apontando para um
                painel que existe. Quem esconde a seção inativa é a classe. */}
            <TabsContent value="identidade" forceMount className={SECAO}>
              <Campo id="ong-nome" rotulo="Nome da ONG" obrigatorio>
                <Input
                  id="ong-nome"
                  autoComplete="organization"
                  maxLength={80}
                  value={form.nome}
                  onChange={(e) => atualizar("nome", e.target.value)}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="ong-cnpj" rotulo="CNPJ" obrigatorio dica="Só números.">
                  <Input
                    id="ong-cnpj"
                    inputMode="numeric"
                    autoComplete="off"
                    value={formatCnpj(form.cnpj)}
                    onChange={(e) => atualizarDigitos("cnpj", e.target.value, 14)}
                  />
                </Campo>
                <Campo id="ong-telefone" rotulo="Telefone" obrigatorio>
                  <Input
                    id="ong-telefone"
                    inputMode="tel"
                    autoComplete="off"
                    value={formatPhone(form.telefone)}
                    onChange={(e) => atualizarDigitos("telefone", e.target.value, 11)}
                  />
                </Campo>
              </div>
              <Campo id="ong-area" rotulo="Área de atuação" obrigatorio>
                <Input
                  id="ong-area"
                  autoComplete="off"
                  maxLength={80}
                  placeholder="Educação, saúde, assistência social…"
                  value={form.area_atuacao}
                  onChange={(e) => atualizar("area_atuacao", e.target.value)}
                />
              </Campo>
            </TabsContent>

            <TabsContent value="endereco" forceMount className={SECAO}>
              <Campo id="ong-logradouro" rotulo="Logradouro" obrigatorio>
                <Input
                  id="ong-logradouro"
                  autoComplete="off"
                  maxLength={120}
                  value={form.logradouro}
                  onChange={(e) => atualizar("logradouro", e.target.value)}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo id="ong-cep" rotulo="CEP" obrigatorio>
                  <Input
                    id="ong-cep"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.cep}
                    onChange={(e) => atualizarDigitos("cep", e.target.value, 8)}
                  />
                </Campo>
                <Campo id="ong-cidade" rotulo="Cidade" obrigatorio>
                  <Input
                    id="ong-cidade"
                    autoComplete="off"
                    maxLength={80}
                    value={form.cidade}
                    onChange={(e) => atualizar("cidade", e.target.value)}
                  />
                </Campo>
                <Campo id="ong-estado" rotulo="Estado" obrigatorio>
                  <Select value={form.estado} onValueChange={(v) => atualizar("estado", v)}>
                    <SelectTrigger id="ong-estado">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {UFS.map((uf) => (
                        <SelectItem key={uf.sigla} value={uf.sigla}>
                          {uf.sigla} — {uf.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
              </div>
            </TabsContent>

            <TabsContent value="pagamentos" forceMount className={SECAO}>
              <Callout tom="confianca">
                O Pix vai direto para a conta da organização. A plataforma não
                retém nada, então estes dados precisam estar exatos.
              </Callout>
              <Campo id="ong-pix" rotulo="Chave Pix" obrigatorio>
                <Input
                  id="ong-pix"
                  autoComplete="off"
                  value={form.pix}
                  onChange={(e) => atualizar("pix", e.target.value)}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo id="ong-banco" rotulo="Banco" obrigatorio>
                  <Input
                    id="ong-banco"
                    autoComplete="off"
                    value={form.banco}
                    onChange={(e) => atualizar("banco", e.target.value)}
                  />
                </Campo>
                <Campo id="ong-agencia" rotulo="Agência" obrigatorio dica="Só números, sem zero à esquerda.">
                  <Input
                    id="ong-agencia"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.agencia}
                    onChange={(e) => atualizarNumeroBancario("agencia", e.target.value, MAX_DIGITOS_AGENCIA)}
                  />
                </Campo>
                <Campo id="ong-conta" rotulo="Conta" obrigatorio dica="Sem o dígito verificador e sem zero à esquerda.">
                  <Input
                    id="ong-conta"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.conta}
                    onChange={(e) => atualizarNumeroBancario("conta", e.target.value, MAX_DIGITOS_CONTA)}
                  />
                </Campo>
              </div>
            </TabsContent>

            <TabsContent value="apresentacao" forceMount className={SECAO}>
              <Campo id="ong-missao" rotulo="Missão" obrigatorio dica="Uma ou duas frases. É o que aparece no card da ONG.">
                <Textarea
                  id="ong-missao"
                  rows={2}
                  maxLength={500}
                  value={form.missao}
                  onChange={(e) => atualizar("missao", e.target.value)}
                />
              </Campo>
              <Campo id="ong-descricao" rotulo="Descrição" obrigatorio>
                <Textarea
                  id="ong-descricao"
                  rows={4}
                  maxLength={900}
                  placeholder="Histórico, projetos e como a organização trabalha."
                  value={form.descricao}
                  onChange={(e) => atualizar("descricao", e.target.value)}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="ong-site" rotulo="Site">
                  <Input
                    id="ong-site"
                    autoComplete="off"
                    placeholder="https://…"
                    value={form.site}
                    onChange={(e) => atualizar("site", e.target.value)}
                  />
                </Campo>
                <Campo id="ong-instagram" rotulo="Instagram">
                  <Input
                    id="ong-instagram"
                    autoComplete="off"
                    placeholder="@organizacao"
                    value={form.instagram}
                    onChange={(e) => atualizar("instagram", e.target.value)}
                  />
                </Campo>
              </div>
              <Campo id="ong-logo" rotulo="Logo (endereço da imagem)">
                <Input
                  id="ong-logo"
                  autoComplete="off"
                  placeholder="https://…/logo.png"
                  value={form.logo}
                  onChange={(e) => atualizar("logo", e.target.value)}
                />
              </Campo>
              {form.logo && (
                <img
                  src={normalizeUrl(form.logo)}
                  alt=""
                  className="h-16 w-16 rounded-full border object-cover"
                />
              )}
              <Campo id="ong-capa" rotulo="Capa (endereço da imagem)">
                <Input
                  id="ong-capa"
                  autoComplete="off"
                  placeholder="https://…/capa.jpg"
                  value={form.capa}
                  onChange={(e) => atualizar("capa", e.target.value)}
                />
              </Campo>
              {form.capa && (
                <img
                  src={normalizeUrl(form.capa)}
                  alt=""
                  className="h-28 w-full rounded-lg border object-cover"
                />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={fecharDialogo}>
              Cancelar
            </Button>
            <Button onClick={enviar} disabled={salvar.isPending}>
              {salvar.isPending
                ? "Salvando…"
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar ONG"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

/**
 * Exclusão de ONG com checagem de vínculos.
 *
 * `doacoes.id_ong` é `ON DELETE CASCADE`: excluir a organização apaga em
 * silêncio todas as doações dela, inclusive as já confirmadas — o histórico que
 * sustenta a barra de progresso do site. O banco não reclama, então a trava tem
 * que estar aqui: havendo doação registrada, a saída é desativar.
 */
function ExcluirOng({
  ong, aoExcluir, aoDesativar,
}: {
  ong: { id: string; nome: string; status: boolean | null };
  aoExcluir: () => void;
  aoDesativar: () => void;
}) {
  const [aberto, setAberto] = useState(false);

  const { data: vinculos, isPending, isError } = useQuery({
    queryKey: ["admin-ong-vinculos", ong.id],
    queryFn: async () => {
      const [doacoes, projetos, eventos] = await Promise.all([
        contarLinhas(
          supabase.from("doacoes").select("id", { count: "exact", head: true }).eq("id_ong", ong.id),
        ),
        contarLinhas(
          supabase.from("projetos").select("id", { count: "exact", head: true }).eq("id_ong", ong.id),
        ),
        contarLinhas(
          supabase.from("eventos").select("id", { count: "exact", head: true }).eq("id_ong", ong.id),
        ),
      ]);
      return { doacoes, projetos, eventos };
    },
    enabled: aberto,
    staleTime: 0,
  });

  const temDoacoes = (vinculos?.doacoes ?? 0) > 0;

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={`Excluir ${ong.nome}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPending || isError
              ? `Excluir ${ong.nome}?`
              : temDoacoes
                ? "Esta ONG tem doações registradas"
                : `Excluir ${ong.nome}?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {isPending ? (
                <>
                  <span className="sr-only">Verificando o que está ligado a esta ONG…</span>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </>
              ) : isError ? (
                <p>
                  Não foi possível checar o que está ligado a esta organização. Sem essa
                  conferência a exclusão pode apagar doações, então ela fica bloqueada —
                  tente de novo em instantes.
                </p>
              ) : temDoacoes ? (
                <>
                  <p>
                    Excluir apagaria{" "}
                    <strong>
                      {vinculos!.doacoes === 1 ? "1 doação" : `${vinculos!.doacoes} doações`}
                    </strong>{" "}
                    do histórico, incluindo as que já foram confirmadas. É esse histórico
                    que sustenta o progresso mostrado no site.
                  </p>
                  <p>
                    Para tirar a organização do ar sem perder nada, desative.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Não há doação registrada para esta organização, então nada de
                    histórico se perde.
                  </p>
                  {(vinculos!.projetos > 0 || vinculos!.eventos > 0) && (
                    <p>
                      Saem com ela{" "}
                      {vinculos!.projetos > 0 &&
                        `${vinculos!.projetos} ${vinculos!.projetos === 1 ? "projeto" : "projetos"}`}
                      {vinculos!.projetos > 0 && vinculos!.eventos > 0 && " e "}
                      {vinculos!.eventos > 0 &&
                        `${vinculos!.eventos} ${vinculos!.eventos === 1 ? "evento" : "eventos"}`}
                      , com as necessidades publicadas neles.
                    </p>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {!isPending && !isError && temDoacoes && ong.status && (
            <AlertDialogAction onClick={aoDesativar}>Desativar a ONG</AlertDialogAction>
          )}
          {!isPending && !isError && !temDoacoes && (
            <AlertDialogAction
              onClick={aoExcluir}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
