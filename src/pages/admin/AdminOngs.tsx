import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
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
import { ConfirmarExclusao } from "@/components/common/ConfirmarExclusao";
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
import { CTA, SUCESSO, TERMOS } from "@/lib/copy";
import { formatCep, formatCnpj, formatPhone } from "@/lib/format";
import {
  MAX_DIGITOS_AGENCIA, MAX_DIGITOS_CONTA, ONG_VAZIA, ongAdminSchema, payloadDaOng,
  type OngAdminForm, type OngAdminInput,
} from "@/lib/schemas/admin";
import { normalizeUrl, onlyDigits } from "@/lib/validators";
import { buscarCep } from "@/lib/viacep";
import {
  AlternarStatus, Campo, SeloVerificada, TabelaAdmin, Vazio,
} from "./_shared";
import { contarLinhas, mensagemDeErro, useValidacao } from "./_shared-lib";

type Aba = "ativas" | "inativas" | "sem-selo";
type AbaDoForm = "identidade" | "endereco" | "pagamentos" | "apresentacao";

/** Em que aba cada campo mora, para o erro levar o foco até ele. */
const ABA_DO_CAMPO: Record<keyof OngAdminForm, AbaDoForm> = {
  nome: "identidade", cnpj: "identidade", telefone: "identidade", area_atuacao: "identidade",
  logradouro: "endereco", cep: "endereco", cidade: "endereco", estado: "endereco",
  pix: "pagamentos", banco: "pagamentos", agencia: "pagamentos", conta: "pagamentos",
  missao: "apresentacao", descricao: "apresentacao", site: "apresentacao",
  instagram: "apresentacao", logo: "apresentacao", capa: "apresentacao",
};

/** Cada aba do formulário; a inativa some por classe, não por desmontagem. */
const SECAO = "mt-4 space-y-4 data-[state=inactive]:hidden";

const COLUNAS = [
  { rotulo: "ONG" },
  { rotulo: "CNPJ" },
  { rotulo: "Contato" },
  { rotulo: "Selo" },
  { rotulo: "No site" },
  { rotulo: "Ações", className: "text-right" },
];

const VISIBILIDADE = [TERMOS.visivel, TERMOS.oculto] as const;

/**
 * ONGs parceiras.
 *
 * O selo de verificada é marcado aqui: a coluna `verificada_em` aparece no
 * site público e quem confere o CNPJ é a administração. Não é um `Switch`, e
 * sim uma ação com confirmação, porque o selo dá credibilidade pública à
 * organização e um toggle se aciona por acidente.
 *
 * O formulário tem dezoito campos em quatro abas. A validação acontece antes
 * da mutation, com o schema; cada erro aparece embaixo do campo e o primeiro
 * deles leva o foco, trocando de aba se preciso.
 */
export default function AdminOngs() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [parametros, setParametros] = useSearchParams();
  const aba = (parametros.get("aba") as Aba | null) ?? "ativas";

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: string } | null>(null);
  const [form, setForm] = useState<OngAdminForm>(ONG_VAZIA);
  const [abaDoForm, setAbaDoForm] = useState<AbaDoForm>("identidade");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const cepConsultado = useRef("");

  const irParaAbaDoCampo = useCallback(
    (campo: string) => setAbaDoForm(ABA_DO_CAMPO[campo as keyof OngAdminForm] ?? "identidade"),
    [],
  );
  const { erros, validar, erroDoServidor, limpar } = useValidacao(ongAdminSchema, "ong", {
    aoFalhar: irParaAbaDoCampo,
  });

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

  const atualizar = <C extends keyof OngAdminForm>(campo: C, valor: string) =>
    setForm((anterior) => ({ ...anterior, [campo]: valor }));

  const atualizarDigitos = (campo: keyof OngAdminForm, valor: string, maximo: number) =>
    atualizar(campo, onlyDigits(valor, maximo));

  /**
   * `conta` e `agencia` são `INT` no banco, então zero à esquerda não sobrevive
   * ao salvar: "0001" volta como 1. Perder o dígito em silêncio mostraria ao
   * doador um dado bancário errado, então o campo já recusa o zero inicial: o
   * que está na tela é o que ficou gravado.
   */
  const atualizarNumeroBancario = (campo: keyof OngAdminForm, valor: string, maximo: number) =>
    atualizar(campo, onlyDigits(valor, maximo).replace(/^0+/, ""));

  /**
   * Com 8 dígitos, consulta o ViaCEP. Cidade e estado vêm do CEP, então são
   * substituídos; o logradouro só é preenchido se estiver vazio, para não
   * apagar o número e o complemento que alguém já digitou. Resposta de um CEP
   * que já não é o do campo é descartada.
   */
  const aoMudarCep = async (valor: string) => {
    const digitos = onlyDigits(valor, 8);
    atualizar("cep", digitos);
    if (digitos.length !== 8 || digitos === cepConsultado.current) return;

    cepConsultado.current = digitos;
    setBuscandoCep(true);
    const endereco = await buscarCep(digitos);
    setBuscandoCep(false);
    if (!endereco || cepConsultado.current !== digitos) return;

    setForm((anterior) => ({
      ...anterior,
      cidade: endereco.cidade || anterior.cidade,
      estado: endereco.estado || anterior.estado,
      logradouro: anterior.logradouro.trim() ? anterior.logradouro : endereco.logradouro,
    }));
  };

  /** Quantos erros cada aba do formulário tem, para sinalizar no gatilho. */
  const errosPorAba = useMemo(() => {
    const contagem: Record<AbaDoForm, number> = { identidade: 0, endereco: 0, pagamentos: 0, apresentacao: 0 };
    for (const campo of Object.keys(erros)) {
      const abaDoCampo = ABA_DO_CAMPO[campo as keyof OngAdminForm];
      if (abaDoCampo) contagem[abaDoCampo] += 1;
    }
    return contagem;
  }, [erros]);

  const salvar = useMutation({
    mutationFn: async (dados: OngAdminInput) => {
      const payload = payloadDaOng(dados);
      const { error } = editando
        ? await supabase.from("ongs").update(payload).eq("id", editando.id)
        : await supabase.from("ongs").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editando ? SUCESSO.salva("ONG") : SUCESSO.criada("ONG"));
      fecharDialogo();
      queryClient.invalidateQueries({ queryKey: ["admin-ongs"] });
    },
    onError: (erro) => erroDoServidor(erro, "Não foi possível salvar a ONG. Tente de novo."),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("ongs").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status ? "ONG visível no site" : "ONG oculta do site");
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
          ? "Selo aplicado. A ONG aparece como verificada no site"
          : "Selo removido. A ONG deixa de aparecer como verificada",
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
      toast.success(SUCESSO.excluida("ONG"));
      queryClient.invalidateQueries({ queryKey: ["admin-ongs"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível excluir a ONG.")),
  });

  const fecharDialogo = () => {
    setDialogoAberto(false);
    setEditando(null);
    setForm(ONG_VAZIA);
    setAbaDoForm("identidade");
    limpar();
  };

  const abrirNova = () => {
    setEditando(null);
    setForm(ONG_VAZIA);
    setAbaDoForm("identidade");
    limpar();
    setDialogoAberto(true);
  };

  const abrirEdicao = (o: (typeof ongs)[number]) => {
    setEditando({ id: o.id });
    cepConsultado.current = onlyDigits(o.cep ?? "", 8);
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
    limpar();
    setDialogoAberto(true);
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const dados = validar(form);
    if (dados) salvar.mutate(dados);
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
            <Plus aria-hidden="true" />
            Nova ONG
          </Button>
        }
      />

      {porAba["sem-selo"].length > 0 && aba !== "sem-selo" && (
        <Callout tom="atencao" titulo={`ONGs ${TERMOS.aguardandoVerificacao.toLowerCase()}`} className="mb-4">
          {porAba["sem-selo"].length === 1
            ? "Uma ONG visível no site ainda não tem o selo de verificada."
            : `${porAba["sem-selo"].length} ONGs visíveis no site ainda não têm o selo de verificada.`}{" "}
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
            <TabsTrigger value="ativas">Visíveis ({porAba.ativas.length})</TabsTrigger>
            <TabsTrigger value="inativas">Ocultas ({porAba.inativas.length})</TabsTrigger>
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
            name="busca"
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
              ilustracao="caixa"
              title="Nenhuma ONG encontrada"
              description={`Nada corresponde a “${busca}” nesta aba.`}
              action={{ label: "Limpar a busca", onClick: () => setBusca("") }}
            />
          ) : (
            <EmptyState
              title={
                aba === "sem-selo"
                  ? "Todas as ONGs visíveis estão verificadas"
                  : aba === "inativas"
                    ? "Nenhuma ONG oculta"
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
                {o.cidade ? `${o.cidade}${o.estado ? `, ${o.estado}` : ""}` : <Vazio />}
              </div>
            </TableCell>

            <TableCell className="numero text-muted-foreground">
              {o.cnpj ? formatCnpj(o.cnpj) : <Vazio />}
            </TableCell>

            <TableCell className="numero text-muted-foreground">
              {o.telefone ? formatPhone(o.telefone) : <Vazio />}
            </TableCell>

            <TableCell>
              <div className="flex flex-col items-start gap-1.5">
                <SeloVerificada verificadaEm={o.verificada_em} variante="completo" mostrarPendente />
                {o.verificada_em ? (
                  <ConfirmarExclusao
                    titulo={`Remover o selo de verificada de ${o.nome}?`}
                    descricao="A ONG deixa de aparecer como verificada no site. Faça isso se o CNPJ não confere mais ou se a organização foi suspensa."
                    rotuloConfirmar={CTA.remover("selo de verificada")}
                    rotuloCarregando="Removendo…"
                    tom="atencao"
                    onConfirmar={() => alternarSelo.mutateAsync({ id: o.id, verificar: false })}
                  >
                    <Button size="sm" variant="ghost" className="h-auto px-1 py-0.5 text-xs">
                      <ShieldOff aria-hidden="true" />
                      Remover selo
                    </Button>
                  </ConfirmarExclusao>
                ) : (
                  <ConfirmarExclusao
                    tom="neutro"
                    rotuloCarregando="Aplicando…"
                    titulo={`Aplicar o selo de verificada a ${o.nome}?`}
                    descricao={`Confirme só depois de checar o CNPJ ${o.cnpj ? formatCnpj(o.cnpj) : "da organização"} na Receita Federal. O selo aparece para quem está decidindo se confia nessa ONG.`}
                    rotuloConfirmar="Aplicar selo de verificada"
                    onConfirmar={() => alternarSelo.mutateAsync({ id: o.id, verificar: true })}
                  >
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <ShieldCheck aria-hidden="true" />
                      Aplicar selo
                    </Button>
                  </ConfirmarExclusao>
                )}
              </div>
            </TableCell>

            <TableCell>
              <AlternarStatus
                ativo={Boolean(o.status)}
                rotulo={`Visibilidade de ${o.nome} no site`}
                rotulos={VISIBILIDADE}
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
                  <Pencil aria-hidden="true" />
                </Button>
                <ExcluirOng
                  ong={o}
                  aoExcluir={() => excluir.mutateAsync(o.id)}
                  aoDesativar={() => alternarStatus.mutateAsync({ id: o.id, status: false })}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Dialog open={dialogoAberto} onOpenChange={(aberto) => (aberto ? setDialogoAberto(true) : fecharDialogo())}>
        <DialogContent className="rolagem-contida max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editando ? "Editar ONG" : "Nova ONG"}</DialogTitle>
            <DialogDescription>
              Os campos marcados com * são obrigatórios. Missão e descrição são o
              que o doador lê no site.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={enviar} className="grid gap-4">
            <Tabs value={abaDoForm} onValueChange={(v) => setAbaDoForm(v as AbaDoForm)}>
              <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
                {(
                  [
                    ["identidade", "Identidade"],
                    ["endereco", "Endereço"],
                    ["pagamentos", "Recebimento"],
                    ["apresentacao", "No site"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <TabsTrigger key={valor} value={valor}>
                    {rotulo}
                    {errosPorAba[valor] > 0 && (
                      <>
                        <span
                          aria-hidden="true"
                          className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-destructive"
                        />
                        <span className="sr-only">
                          , {errosPorAba[valor] === 1 ? "1 campo com erro" : `${errosPorAba[valor]} campos com erro`}
                        </span>
                      </>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* `forceMount` mantém as quatro seções montadas: a validação aponta
                  um campo de outra aba sem perder o que já foi digitado, e o
                  `aria-controls` de cada gatilho continua apontando para um
                  painel que existe. Quem esconde a seção inativa é a classe. */}
              <TabsContent value="identidade" forceMount className={SECAO}>
                <Campo id="ong-nome" rotulo="Nome da ONG" obrigatorio erro={erros.nome}>
                  <Input
                    id="ong-nome"
                    name="nome"
                    autoComplete="organization"
                    maxLength={80}
                    value={form.nome}
                    onChange={(e) => atualizar("nome", e.target.value)}
                  />
                </Campo>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id="ong-cnpj"
                    rotulo="CNPJ"
                    obrigatorio
                    dica="14 números; a pontuação entra sozinha."
                    erro={erros.cnpj}
                  >
                    <Input
                      id="ong-cnpj"
                      name="cnpj"
                      inputMode="numeric"
                      autoComplete="off"
                      value={formatCnpj(form.cnpj)}
                      onChange={(e) => atualizarDigitos("cnpj", e.target.value, 14)}
                    />
                  </Campo>
                  <Campo id="ong-telefone" rotulo="Telefone" obrigatorio erro={erros.telefone}>
                    <Input
                      id="ong-telefone"
                      name="telefone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={formatPhone(form.telefone)}
                      onChange={(e) => atualizarDigitos("telefone", e.target.value, 11)}
                    />
                  </Campo>
                </div>
                <Campo id="ong-area_atuacao" rotulo="Área de atuação" obrigatorio erro={erros.area_atuacao}>
                  <Input
                    id="ong-area_atuacao"
                    name="area_atuacao"
                    autoComplete="off"
                    maxLength={80}
                    placeholder="Acolhimento de crianças, por exemplo"
                    value={form.area_atuacao}
                    onChange={(e) => atualizar("area_atuacao", e.target.value)}
                  />
                </Campo>
              </TabsContent>

              <TabsContent value="endereco" forceMount className={SECAO}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Campo
                    id="ong-cep"
                    rotulo="CEP"
                    obrigatorio
                    dica={buscandoCep ? "Buscando o endereço…" : "Com o CEP, o endereço vem preenchido."}
                    erro={erros.cep}
                  >
                    <Input
                      id="ong-cep"
                      name="cep"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={formatCep(form.cep)}
                      onChange={(e) => void aoMudarCep(e.target.value)}
                    />
                  </Campo>
                  <Campo id="ong-cidade" rotulo="Cidade" obrigatorio erro={erros.cidade}>
                    <Input
                      id="ong-cidade"
                      name="cidade"
                      autoComplete="address-level2"
                      maxLength={80}
                      value={form.cidade}
                      onChange={(e) => atualizar("cidade", e.target.value)}
                    />
                  </Campo>
                  <Campo id="ong-estado" rotulo="Estado" obrigatorio erro={erros.estado}>
                    {(a11y) => (
                      <Select value={form.estado} onValueChange={(v) => atualizar("estado", v)} name="estado">
                        <SelectTrigger {...a11y}>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {UFS.map((uf) => (
                            <SelectItem key={uf.sigla} value={uf.sigla}>
                              {uf.sigla} ({uf.nome})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </Campo>
                </div>
                <Campo id="ong-logradouro" rotulo="Logradouro" obrigatorio erro={erros.logradouro}>
                  <Input
                    id="ong-logradouro"
                    name="logradouro"
                    autoComplete="street-address"
                    maxLength={120}
                    placeholder="Rua, número e bairro"
                    value={form.logradouro}
                    onChange={(e) => atualizar("logradouro", e.target.value)}
                  />
                </Campo>
              </TabsContent>

              <TabsContent value="pagamentos" forceMount className={SECAO}>
                <Callout tom="confianca">
                  O Pix vai direto para a conta da organização. A plataforma não
                  retém nada, então confira cada dado antes de salvar.
                </Callout>
                <Campo
                  id="ong-pix"
                  rotulo="Chave Pix"
                  obrigatorio
                  dica="CNPJ, e-mail, telefone ou chave aleatória."
                  erro={erros.pix}
                >
                  <Input
                    id="ong-pix"
                    name="pix"
                    autoComplete="off"
                    value={form.pix}
                    onChange={(e) => atualizar("pix", e.target.value)}
                  />
                </Campo>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Campo id="ong-banco" rotulo="Banco" obrigatorio erro={erros.banco}>
                    <Input
                      id="ong-banco"
                      name="banco"
                      autoComplete="off"
                      maxLength={60}
                      value={form.banco}
                      onChange={(e) => atualizar("banco", e.target.value)}
                    />
                  </Campo>
                  <Campo
                    id="ong-agencia"
                    rotulo="Agência"
                    obrigatorio
                    dica="Só números, sem zero à esquerda."
                    erro={erros.agencia}
                  >
                    <Input
                      id="ong-agencia"
                      name="agencia"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.agencia}
                      onChange={(e) => atualizarNumeroBancario("agencia", e.target.value, MAX_DIGITOS_AGENCIA)}
                    />
                  </Campo>
                  <Campo
                    id="ong-conta"
                    rotulo="Conta"
                    obrigatorio
                    dica="Sem o dígito verificador e sem zero à esquerda."
                    erro={erros.conta}
                  >
                    <Input
                      id="ong-conta"
                      name="conta"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.conta}
                      onChange={(e) => atualizarNumeroBancario("conta", e.target.value, MAX_DIGITOS_CONTA)}
                    />
                  </Campo>
                </div>
              </TabsContent>

              <TabsContent value="apresentacao" forceMount className={SECAO}>
                <Campo
                  id="ong-missao"
                  rotulo="Missão"
                  obrigatorio
                  dica="Uma ou duas frases. É o que aparece no card da ONG."
                  erro={erros.missao}
                >
                  <Textarea
                    id="ong-missao"
                    name="missao"
                    rows={2}
                    maxLength={500}
                    value={form.missao}
                    onChange={(e) => atualizar("missao", e.target.value)}
                  />
                </Campo>
                <Campo id="ong-descricao" rotulo="Descrição" obrigatorio erro={erros.descricao}>
                  <Textarea
                    id="ong-descricao"
                    name="descricao"
                    rows={4}
                    maxLength={900}
                    placeholder="Como a organização trabalha e quem ela atende."
                    value={form.descricao}
                    onChange={(e) => atualizar("descricao", e.target.value)}
                  />
                </Campo>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo id="ong-site" rotulo="Site" erro={erros.site}>
                    <Input
                      id="ong-site"
                      name="site"
                      type="url"
                      autoComplete="url"
                      placeholder="https://…"
                      value={form.site}
                      onChange={(e) => atualizar("site", e.target.value)}
                    />
                  </Campo>
                  <Campo id="ong-instagram" rotulo="Instagram" erro={erros.instagram}>
                    <Input
                      id="ong-instagram"
                      name="instagram"
                      autoComplete="off"
                      placeholder="@organizacao"
                      value={form.instagram}
                      onChange={(e) => atualizar("instagram", e.target.value)}
                    />
                  </Campo>
                </div>
                <Campo id="ong-logo" rotulo="Logo (endereço da imagem)" erro={erros.logo}>
                  <Input
                    id="ong-logo"
                    name="logo"
                    type="url"
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
                <Campo id="ong-capa" rotulo="Capa (endereço da imagem)" erro={erros.capa}>
                  <Input
                    id="ong-capa"
                    name="capa"
                    type="url"
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
                    className="h-28 w-full rounded-xl border object-cover"
                  />
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharDialogo}>
                {CTA.cancelar}
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? CTA.salvando : editando ? CTA.salvar("ONG") : "Cadastrar ONG"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

/**
 * Exclusão de ONG com checagem de vínculos.
 *
 * `doacoes.id_ong` é `ON DELETE CASCADE`: excluir a organização apaga em
 * silêncio todas as doações dela, inclusive as já confirmadas: o histórico que
 * sustenta a barra de progresso do site. O banco não reclama, então a trava tem
 * que estar aqui: havendo doação registrada, a saída é desativar.
 */
function ExcluirOng({
  ong, aoExcluir, aoDesativar,
}: {
  ong: { id: string; nome: string; status: boolean | null };
  aoExcluir: () => Promise<unknown>;
  aoDesativar: () => Promise<unknown>;
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

  /* O onError da mutation já mostra o toast; aqui só se evita a rejeição solta. */

  const conferido = !isPending && !isError && vinculos;
  const temDoacoes = Boolean(conferido) && vinculos!.doacoes > 0;

  const bloqueio = isPending
    ? {
        motivo: (
          <>
            <span className="sr-only">Verificando o que está ligado a esta ONG…</span>
            <span aria-hidden="true" className="brilho-papel block h-4 w-full rounded-md bg-muted" />
            <span aria-hidden="true" className="brilho-papel mt-2 block h-4 w-2/3 rounded-md bg-muted" />
          </>
        ),
      }
    : isError
      ? {
          motivo:
            "Não foi possível checar o que está ligado a esta organização. Sem essa conferência a exclusão pode apagar doações, então ela fica bloqueada. Tente de novo em instantes.",
        }
      : temDoacoes
        ? {
            motivo: (
              <>
                Excluir apagaria{" "}
                <strong>
                  {vinculos!.doacoes === 1 ? "1 doação" : `${vinculos!.doacoes} doações`}
                </strong>{" "}
                do histórico, incluindo as que já foram confirmadas. É esse histórico
                que sustenta o progresso mostrado no site.
                <span className="mt-2 block">
                  {ong.status
                    ? "Para tirar a organização do site sem perder nada, desative."
                    : "A organização já está oculta do site; o histórico fica preservado."}
                </span>
              </>
            ),
            alternativa: ong.status
              ? { rotulo: "Desativar a ONG", onClick: aoDesativar }
              : undefined,
          }
        : undefined;

  const descricao = conferido && !temDoacoes && (
    <>
      Não há doação registrada para esta organização, então nada de histórico se
      perde.
      {(vinculos!.projetos > 0 || vinculos!.eventos > 0) && (
        <span className="mt-2 block">
          Saem com ela{" "}
          {vinculos!.projetos > 0 &&
            `${vinculos!.projetos} ${vinculos!.projetos === 1 ? "projeto" : "projetos"}`}
          {vinculos!.projetos > 0 && vinculos!.eventos > 0 && " e "}
          {vinculos!.eventos > 0 &&
            `${vinculos!.eventos} ${vinculos!.eventos === 1 ? "evento" : "eventos"}`}
          , com as necessidades publicadas neles.
        </span>
      )}
    </>
  );

  return (
    <ConfirmarExclusao
      open={aberto}
      onOpenChange={setAberto}
      titulo={temDoacoes ? "Esta ONG tem doações registradas" : `Excluir ${ong.nome}?`}
      descricao={descricao || undefined}
      rotuloConfirmar={CTA.excluir("ONG")}
      onConfirmar={aoExcluir}
      bloqueio={bloqueio}
    >
      <Button
        size="icon"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        aria-label={`Excluir ${ong.nome}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </ConfirmarExclusao>
  );
}
