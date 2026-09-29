import { useState } from "react";
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
import { senhaSchema } from "@/lib/schemas/auth";
import { formatPhone } from "@/lib/format";
import { isValidEmail, onlyDigits } from "@/lib/validators";
import {
  AlternarStatus, Campo, ExcluirLinha, Paginacao, TabelaAdmin,
} from "./_shared";
import { POR_PAGINA, mensagemDeErro, useCorrigirPaginaVazia } from "./_shared-lib";

type Papel = "admin" | "ong" | "user";

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
  { rotulo: "Ações", className: "text-right" },
];

/**
 * O termo entra num filtro `or` do PostgREST, onde vírgula e parêntese são
 * sintaxe. Sem limpar, uma busca por "silva, maria" viraria um filtro inválido.
 */
const limparBusca = (termo: string) => termo.replace(/[,()*%\\]/g, " ").trim();

/**
 * Usuários da plataforma.
 *
 * Duas travas que faltavam: a tela buscava a tabela inteira de perfis (agora é
 * paginada e com busca no servidor) e deixava o administrador rebaixar ou
 * excluir a própria conta — o que tranca o acesso a `/admin` sem caminho de
 * volta pela interface, já que a rota exige o papel de admin.
 */
export default function AdminUsuarios() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<{
    id: string; user_id: string; nome: string; papel: Papel;
  } | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", cidade: "", estado: "" });
  const [papel, setPapel] = useState<Papel>("user");
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({
    nome: "", email: "", senha: "", papel: "user" as Papel,
  });

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
    mutationFn: async () => {
      if (!editando) return;
      if (!form.nome.trim()) throw new Error("Informe o nome.");

      const { error } = await supabase
        .from("profiles")
        .update({
          nome: form.nome.trim(),
          telefone: onlyDigits(form.telefone, 11) || null,
          cidade: form.cidade.trim() || null,
          estado: form.estado || null,
        })
        .eq("id", editando.id);
      if (error) throw error;

      if (papel === editando.papel) return;

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
        .insert({ user_id: editando.user_id, role: papel });
      if (erroAoInserir) {
        throw new Error(
          "O papel anterior foi removido, mas o novo não foi aplicado. Edite esta pessoa de novo para definir o papel.",
        );
      }
    },
    onSuccess: () => {
      toast.success("Cadastro atualizado.");
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível salvar o cadastro.")),
  });

  const alternarAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("profiles").update({ ativo }).eq("id", id);
      if (error) throw error;
      return ativo;
    },
    onSuccess: (ativo) => {
      toast.success(ativo ? "Cadastro marcado como ativo." : "Cadastro marcado como inativo.");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (erro) => toast.error(mensagemDeErro(erro, "Não foi possível alterar o cadastro.")),
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!novo.nome.trim()) throw new Error("Informe o nome.");
      if (!isValidEmail(novo.email)) throw new Error("Informe um e-mail válido.");
      const senha = senhaSchema.safeParse(novo.senha);
      if (!senha.success) throw new Error(senha.error.issues[0].message);

      const { data: resposta, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          nome: novo.nome.trim(),
          email: novo.email.trim(),
          password: novo.senha,
          role: novo.papel,
        },
      });
      const falha = (resposta as { error?: string } | null)?.error;
      if (error || falha) throw new Error(falha || error?.message || "");
    },
    onSuccess: () => {
      toast.success("Usuário criado.");
      setCriando(false);
      setNovo({ nome: "", email: "", senha: "", papel: "user" });
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (erro) =>
      toast.error(mensagemDeErro(erro, "Não foi possível criar o usuário.")),
  });

  const excluir = useMutation({
    mutationFn: async (userId: string) => {
      const { data: resposta, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: userId },
      });
      const falha = (resposta as { error?: string } | null)?.error;
      if (error || falha) throw new Error(falha || error?.message || "");
    },
    onSuccess: () => {
      toast.success("Usuário removido.");
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
    });
    setPapel(u.papel);
  };

  const souEu = (userId: string) => Boolean(user) && userId === user!.id;

  return (
    <DashboardLayout type="admin">
      <Seo title="Usuários" noIndex />
      <PageHeader
        title="Usuários"
        description="Quem tem conta na plataforma e o que cada um pode fazer"
        icon={<Users className="h-6 w-6" aria-hidden="true" />}
        action={
          <Button onClick={() => setCriando(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
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
              icon={Search}
              title="Nenhum usuário encontrado"
              description={`Nada corresponde a “${busca}”.`}
              action={{ label: "Limpar a busca", onClick: () => setBusca("") }}
            />
          ) : (
            <EmptyState
              icon={Users}
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

            <TableCell className="text-muted-foreground">
              {u.telefone ? formatPhone(u.telefone) : "—"}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {u.cidade ? `${u.cidade}${u.estado ? `, ${u.estado}` : ""}` : "—"}
            </TableCell>

            <TableCell>
              <Badge
                variant={u.papel === "admin" ? "default" : u.papel === "ong" ? "secondary" : "outline"}
              >
                {u.papel === "admin" && <Shield className="mr-1 h-3 w-3" aria-hidden="true" />}
                {rotuloDoPapel(u.papel)}
              </Badge>
            </TableCell>

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
                  <Pencil className="h-4 w-4" aria-hidden="true" />
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
                    <Shield className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <ExcluirLinha
                    rotuloAcessivel={`Remover ${u.nome}`}
                    titulo="Remover este usuário?"
                    descricao={`${u.nome} (${u.email}) perde o acesso e o cadastro sai da plataforma. As doações já registradas continuam, sem o vínculo com a pessoa.`}
                    rotuloConfirmar="Remover"
                    desabilitado={excluir.isPending}
                    aoConfirmar={() => excluir.mutate(u.user_id)}
                  />
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TabelaAdmin>

      <Callout tom="info" className="mt-4">
        O marcador de cadastro ativo é informativo: hoje ele não bloqueia o login.
        Para retirar o acesso de alguém, remova a conta.
      </Callout>

      <Dialog open={Boolean(editando)} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cadastro</DialogTitle>
            <DialogDescription>
              O papel define o que a pessoa vê ao entrar: doador, painel da ONG ou
              painel administrativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Campo id="usuario-nome" rotulo="Nome" obrigatorio>
              <Input
                id="usuario-nome"
                autoComplete="off"
                maxLength={80}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="usuario-telefone" rotulo="Telefone">
                <Input
                  id="usuario-telefone"
                  inputMode="tel"
                  autoComplete="off"
                  value={formatPhone(form.telefone)}
                  onChange={(e) => setForm({ ...form, telefone: onlyDigits(e.target.value, 11) })}
                />
              </Campo>
              <Campo id="usuario-cidade" rotulo="Cidade">
                <Input
                  id="usuario-cidade"
                  autoComplete="off"
                  maxLength={80}
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </Campo>
            </div>

            <Campo id="usuario-estado" rotulo="Estado">
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger id="usuario-estado">
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

            <Campo
              id="usuario-papel"
              rotulo="Papel"
              dica={
                editando && souEu(editando.user_id)
                  ? "Você não pode mudar o seu próprio papel: rebaixar a si mesmo tranca o painel."
                  : undefined
              }
            >
              <Select
                value={papel}
                onValueChange={(v) => setPapel(v as Papel)}
                disabled={Boolean(editando && souEu(editando.user_id))}
              >
                <SelectTrigger id="usuario-papel">
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
            </Campo>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              A conta é criada já confirmada. Combine a senha com a pessoa e peça
              que ela troque depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Campo id="novo-nome" rotulo="Nome" obrigatorio>
              <Input
                id="novo-nome"
                autoComplete="off"
                maxLength={80}
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </Campo>
            <Campo id="novo-email" rotulo="E-mail" obrigatorio>
              <Input
                id="novo-email"
                type="email"
                autoComplete="off"
                value={novo.email}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              />
            </Campo>
            <Campo
              id="novo-senha"
              rotulo="Senha"
              obrigatorio
              dica="Ao menos 8 caracteres, com maiúscula, minúscula e número."
            >
              <Input
                id="novo-senha"
                type="password"
                autoComplete="new-password"
                value={novo.senha}
                onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
              />
            </Campo>
            <Campo id="novo-papel" rotulo="Papel">
              <Select
                value={novo.papel}
                onValueChange={(v) => setNovo({ ...novo, papel: v as Papel })}
              >
                <SelectTrigger id="novo-papel">
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
            </Campo>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
            <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
              {criar.isPending ? "Criando…" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
