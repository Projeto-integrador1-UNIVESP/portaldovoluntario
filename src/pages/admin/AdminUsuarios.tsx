import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Shield, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { UFS } from "@/lib/constants/ufs";
import { CTA, SUCESSO } from "@/lib/copy";
import { ErroAmigavel } from "@/lib/erros";
import { formatDate, formatPhone } from "@/lib/format";
import {
  novoUsuarioSchema, usuarioAdminSchema,
  type NovoUsuarioForm, type Papel, type UsuarioAdminForm,
} from "@/lib/schemas/admin";
import { onlyDigits } from "@/lib/validators";
import {
  AlternarStatus, Campo, ExcluirLinha, Paginacao, TabelaAdmin, Vazio,
} from "./_shared";
import {
  POR_PAGINA, erroDaFunction, mensagemDeErro, useCorrigirPaginaVazia, useValidacao,
} from "./_shared-lib";

const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: "user", rotulo: "Doador" },
  { valor: "ong", rotulo: "ONG" },
  { valor: "admin", rotulo: "Administrador" },
];

const rotuloDoPapel = (papel: Papel) =>
  PAPEIS.find((p) => p.valor === papel)?.rotulo ?? papel;

const COLUNAS = [
  { rotulo: "Pessoa" },
  { rotulo: "Telefone" },
  { rotulo: "Cidade" },
  { rotulo: "Papel" },
  { rotulo: "Cadastro" },
  { rotulo: "Marcador" },
  { rotulo: "Ações", className: "text-right" },
];

const FORM_VAZIO: UsuarioAdminForm = { nome: "", telefone: "", cidade: "", estado: "", papel: "user" };
const NOVO_VAZIO: NovoUsuarioForm = { nome: "", email: "", senha: "", papel: "user" };

/**
 * O termo entra num filtro `or` do PostgREST, onde vírgula e parêntese são
 * sintaxe. Sem limpar, uma busca por "silva, maria" viraria um filtro inválido.
 */
const limparBusca = (termo: string) => termo.replace(/[,()*%\\]/g, " ").trim();

/**
 * Usuários da plataforma.
 *
 * Duas travas: a lista é paginada e buscada no servidor, e o administrador não
 * consegue rebaixar nem excluir a própria conta, o que trancaria o acesso a
 * `/admin` sem caminho de volta pela interface.
 */
export default function AdminUsuarios() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<{
    id: string; user_id: string; nome: string; papel: Papel;
  } | null>(null);
  const [form, setForm] = useState<UsuarioAdminForm>(FORM_VAZIO);
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState<NovoUsuarioForm>(NOVO_VAZIO);

  const edicao = useValidacao(usuarioAdminSchema, "usuario");
  const criacao = useValidacao(novoUsuarioSchema, "novo");

  const termo = limparBusca(busca);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-usuarios", termo, pagina],
    queryFn: async () => {
      let consulta = supabase
        .from("profiles")
        .select("id, user_id, nome, email, telefone, cidade, estado, ativo, created_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("id")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

      if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`);

      const { data: perfis, count, error } = await consulta;
      if (error) throw error;

      // Papéis só de quem está na página: `user_roles` inteira não é necessária.
      const ids = (perfis ?? []).map((p) => p.user_id);
      const { data: papeis, error: erroDosPapeis } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [], error: null };
      if (erroDosPapeis) throw erroDosPapeis;

      const maisAlto = new Map<string, Papel>();
      for (const linha of papeis ?? []) {
        const atual = maisAlto.get(linha.user_id);
        const novoPapel = linha.role as Papel;
        const ordem: Papel[] = ["user", "ong", "admin"];
        if (!atual || ordem.indexOf(novoPapel) > ordem.indexOf(atual)) {
          maisAlto.set(linha.user_id, novoPapel);
        }
      }

      return {
        linhas: (perfis ?? []).map((p) => ({
          ...p,
          papel: maisAlto.get(p.user_id) ?? ("user" as Papel),
        })),
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

  const salvar = useMutation({
    mutationFn: async (dados: UsuarioAdminForm) => {
      if (!editando) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          nome: dados.nome.trim(),
          telefone: onlyDigits(dados.telefone, 11) || null,
          cidade: dados.cidade.trim() || null,
          estado: dados.estado || null,
        })
        .eq("id", editando.id);
      if (error) throw error;

      if (dados.papel === editando.papel) return;

      // Trocar papel são duas operações sem transação do lado do cliente. A
      // ordem é apagar e então inserir: se a inserção falhar, a pessoa fica sem
      // papel (recuperável editando de novo) em vez de acumular o papel antigo
      // com o novo, o que manteria um acesso que deveria ter sido retirado.
      const { error: erroAoLimpar } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editando.user_id);
      if (erroAoLimpar) throw erroAoLimpar;

      const { error: erroAoInserir } = await supabase
        .from("user_roles")
        .insert({ user_id: editando.user_id, role: dados.papel });
      if (erroAoInserir) {
        throw new ErroAmigavel(
          "O papel anterior foi removido, mas o novo não foi aplicado. Edite esta pessoa de novo para definir o papel.",
        );
      }
    },
    onSuccess: () => {
      toast.success(SUCESSO.salvo("Cadastro"));
      fecharEdicao();
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (erro) => edicao.erroDoServidor(erro, "Não foi possível salvar o cadastro."),
  });

  const alternarAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("profiles").update({ ativo }).eq("id", id);
      if (error) throw error;
      return ativo;
    },
    onSuccess: (ativo) => {
      toast.success(ativo ? "Cadastro marcado como ativo" : "Cadastro marcado como inativo");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível alterar o cadastro.")),
  });

  const criar = useMutation({
    mutationFn: async (dados: NovoUsuarioForm) => {
      const { data: resposta, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          nome: dados.nome.trim(),
          email: dados.email.trim(),
          password: dados.senha,
          role: dados.papel,
        },
      });
      const falha = (resposta as { error?: string } | null)?.error;
      if (error || falha) throw await erroDaFunction(error, resposta);
    },
    onSuccess: () => {
      toast.success(SUCESSO.criado("Usuário"));
      fecharCriacao();
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (erro) => criacao.erroDoServidor(erro, "Não foi possível criar o usuário."),
  });

  const excluir = useMutation({
    mutationFn: async (userId: string) => {
      const { data: resposta, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: userId },
      });
      const falha = (resposta as { error?: string } | null)?.error;
      if (error || falha) throw await erroDaFunction(error, resposta);
    },
    onSuccess: () => {
      toast.success("Usuário removido");
      if (linhas.length === 1 && pagina > 0) setPagina(pagina - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível remover o usuário.")),
  });

  const abrirEdicao = (u: (typeof linhas)[number]) => {
    setEditando({ id: u.id, user_id: u.user_id, nome: u.nome, papel: u.papel });
    setForm({
      nome: u.nome ?? "",
      telefone: onlyDigits(u.telefone ?? "", 11),
      cidade: u.cidade ?? "",
      estado: u.estado ?? "",
      papel: u.papel,
    });
    edicao.limpar();
  };

  const fecharEdicao = () => {
    setEditando(null);
    edicao.limpar();
  };

  const fecharCriacao = () => {
    setCriando(false);
    setNovo(NOVO_VAZIO);
    criacao.limpar();
  };

  const enviarEdicao = (evento: FormEvent) => {
    evento.preventDefault();
    const dados = edicao.validar(form);
    if (dados) salvar.mutate(dados);
  };

  const enviarCriacao = (evento: FormEvent) => {
    evento.preventDefault();
    const dados = criacao.validar(novo);
    if (dados) criar.mutate(dados);
  };

  const souEu = (userId: string) => Boolean(user) && userId === user!.id;
  const editandoAMim = Boolean(editando && souEu(editando.user_id));

  return (
    <DashboardLayout type="admin">
      <Seo title="Usuários" noIndex />
      <PageHeader
        title="Usuários"
        description="Quem tem conta na plataforma e o que cada um pode fazer"
        icon={<Users className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={() => setCriando(true)}>
            <UserPlus aria-hidden="true" />
            Novo usuário
          </Button>
        }
      />

      <div className="mb-4 sm:max-w-sm">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="busca-usuarios"
            name="busca"
            type="search"
            autoComplete="off"
            className="pl-9"
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar usuário por nome ou e-mail"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
          />
        </div>
      </div>

      <TabelaAdmin
        colunas={COLUNAS}
        carregando={isPending}
        erro={isError}
        tituloErro="Não foi possível carregar os usuários"
        aoTentarDeNovo={() => refetch()}
        vazia={linhas.length === 0}
        vazio={
          termo ? (
            <EmptyState
              ilustracao="caixa"
              title="Nenhum usuário encontrado"
              description={`Nada corresponde a “${busca}”.`}
              action={{ label: "Limpar a busca", onClick: () => setBusca("") }}
            />
          ) : (
            <EmptyState
              title="Nenhum usuário cadastrado"
              description="Quem se cadastra pelo site aparece aqui. Você também pode criar uma conta direto."
              action={{ label: "Criar usuário", onClick: () => setCriando(true) }}
            />
          )
        }
        rodape={<Paginacao pagina={pagina} total={data?.total ?? 0} aoMudar={setPagina} />}
      >
        {linhas.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="max-w-64">
              <div className="break-words font-medium">
                {u.nome}
                {souEu(u.user_id) && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(você)</span>
                )}
              </div>
              <div className="break-all text-xs text-muted-foreground">{u.email}</div>
            </TableCell>

            <TableCell className="numero text-muted-foreground">
              {u.telefone ? formatPhone(u.telefone) : <Vazio />}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {u.cidade ? `${u.cidade}${u.estado ? `, ${u.estado}` : ""}` : <Vazio />}
            </TableCell>

            <TableCell>
              <Badge
                variant={u.papel === "admin" ? "default" : u.papel === "ong" ? "secondary" : "outline"}
              >
                {u.papel === "admin" && <Shield aria-hidden="true" />}
                {rotuloDoPapel(u.papel)}
              </Badge>
            </TableCell>

            <TableCell className="numero text-muted-foreground">{formatDate(u.created_at)}</TableCell>

            <TableCell>
              <AlternarStatus
                ativo={u.ativo !== false}
                rotulo={`Marcar o cadastro de ${u.nome} como ativo`}
                ocupado={alternarAtivo.isPending}
                aoAlternar={() => alternarAtivo.mutate({ id: u.id, ativo: u.ativo === false })}
              />
            </TableCell>

            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Editar ${u.nome}`}
                  onClick={() => abrirEdicao(u)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                {souEu(u.user_id) ? (
                  // Excluir a própria conta tranca o acesso ao painel: a rota
                  // exige papel de admin e não há como devolvê-lo pela interface.
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled
                    aria-label="Você não pode remover a sua própria conta"
                    title="Você não pode remover a sua própria conta"
                  >
                    <Shield aria-hidden="true" />
                  </Button>
                ) : (
                  <ExcluirLinha
                    rotuloAcessivel={`Remover ${u.nome}`}
                    titulo={`Remover ${u.nome} da plataforma?`}
                    descricao={`${u.email} perde o acesso e o cadastro sai da plataforma. As doações já registradas continuam, sem o vínculo com a pessoa.`}
                    rotuloConfirmar={CTA.remover("usuário")}
                    desabilitado={excluir.isPending}
                    aoConfirmar={() => excluir.mutateAsync(u.user_id)}
                  />
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Callout tom="info" className="mt-4">
        O marcador de cadastro ativo é só informativo: hoje ele não bloqueia o login.
        Para retirar o acesso de alguém, remova a conta.
      </Callout>

      <Dialog open={Boolean(editando)} onOpenChange={(aberto) => !aberto && fecharEdicao()}>
        <DialogContent className="rolagem-contida">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar cadastro</DialogTitle>
            <DialogDescription>
              O papel define o que a pessoa vê ao entrar: doador, painel da ONG ou
              painel administrativo.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={enviarEdicao} className="grid gap-4">
            <Campo id="usuario-nome" rotulo="Nome" obrigatorio erro={edicao.erros.nome}>
              <Input
                id="usuario-nome"
                name="nome"
                autoComplete="off"
                maxLength={80}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="usuario-telefone" rotulo="Telefone" erro={edicao.erros.telefone}>
                <Input
                  id="usuario-telefone"
                  name="telefone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={formatPhone(form.telefone)}
                  onChange={(e) => setForm({ ...form, telefone: onlyDigits(e.target.value, 11) })}
                />
              </Campo>
              <Campo id="usuario-cidade" rotulo="Cidade" erro={edicao.erros.cidade}>
                <Input
                  id="usuario-cidade"
                  name="cidade"
                  autoComplete="off"
                  maxLength={80}
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </Campo>
            </div>

            <Campo id="usuario-estado" rotulo="Estado" erro={edicao.erros.estado}>
              {(a11y) => (
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })} name="estado">
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

            <Campo
              id="usuario-papel"
              rotulo="Papel"
              erro={edicao.erros.papel}
              dica={
                editandoAMim
                  ? "Você não pode mudar o seu próprio papel: rebaixar a si mesmo tranca o painel."
                  : undefined
              }
            >
              {(a11y) => (
                <Select
                  value={form.papel}
                  onValueChange={(v) => setForm({ ...form, papel: v as Papel })}
                  disabled={editandoAMim}
                  name="papel"
                >
                  <SelectTrigger {...a11y}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEIS.map((p) => (
                      <SelectItem key={p.valor} value={p.valor}>
                        {p.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Campo>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharEdicao}>
                {CTA.cancelar}
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? CTA.salvando : CTA.salvar("cadastro")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={criando} onOpenChange={(aberto) => (aberto ? setCriando(true) : fecharCriacao())}>
        <DialogContent className="rolagem-contida">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Novo usuário</DialogTitle>
            <DialogDescription>
              A conta é criada já confirmada. Combine a senha com a pessoa e peça
              que ela troque depois.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={enviarCriacao} className="grid gap-4">
            <Campo id="novo-nome" rotulo="Nome" obrigatorio erro={criacao.erros.nome}>
              <Input
                id="novo-nome"
                name="nome"
                autoComplete="off"
                maxLength={80}
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </Campo>
            <Campo id="novo-email" rotulo="E-mail" obrigatorio erro={criacao.erros.email}>
              <Input
                id="novo-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={novo.email}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              />
            </Campo>
            <Campo
              id="novo-senha"
              rotulo="Senha"
              obrigatorio
              dica="Ao menos 8 caracteres, com letra maiúscula, minúscula e número."
              erro={criacao.erros.senha}
            >
              <Input
                id="novo-senha"
                name="senha"
                type="password"
                autoComplete="new-password"
                value={novo.senha}
                onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
              />
            </Campo>
            <Campo id="novo-papel" rotulo="Papel" erro={criacao.erros.papel}>
              {(a11y) => (
                <Select
                  value={novo.papel}
                  onValueChange={(v) => setNovo({ ...novo, papel: v as Papel })}
                  name="papel"
                >
                  <SelectTrigger {...a11y}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEIS.map((p) => (
                      <SelectItem key={p.valor} value={p.valor}>
                        {p.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Campo>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharCriacao}>
                {CTA.cancelar}
              </Button>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? CTA.criando : CTA.criar("usuário")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
