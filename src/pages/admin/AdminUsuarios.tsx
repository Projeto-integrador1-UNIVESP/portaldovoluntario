import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Pencil, Shield, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type AppRole = "admin" | "ong" | "user";

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", cidade: "", estado: "" });
  const [role, setRole] = useState<AppRole>("user");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nome: "", email: "", password: "", role: "user" as AppRole });
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const map = new Map<string, AppRole>();
    roles?.forEach((r: any) => {
      const cur = map.get(r.user_id);
      if (!cur || r.role === "admin" || (r.role === "ong" && cur === "user")) map.set(r.user_id, r.role);
    });
    setUsuarios((profiles || []).map((p: any) => ({ ...p, role: map.get(p.user_id) || "user" })));
  };

  useEffect(() => { fetchAll(); }, []);

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ nome: u.nome || "", telefone: u.telefone || "", cidade: u.cidade || "", estado: u.estado || "" });
    setRole(u.role);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", editing.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    if (role !== editing.role) {
      await supabase.from("user_roles").delete().eq("user_id", editing.user_id);
      await supabase.from("user_roles").insert({ user_id: editing.user_id, role });
    }
    toast.success("Usuário atualizado");
    setOpen(false); setEditing(null); fetchAll();
  };

  const toggleAtivo = async (u: any) => {
    await supabase.from("profiles").update({ ativo: !u.ativo }).eq("id", u.id);
    toast.success(!u.ativo ? "Usuário ativado" : "Usuário desativado");
    fetchAll();
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.nome) {
      toast.error("Preencha nome, email e senha");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "create", ...createForm },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error("Erro ao criar: " + (error?.message || (data as any)?.error));
      return;
    }
    toast.success("Usuário criado");
    setCreateOpen(false);
    setCreateForm({ nome: "", email: "", password: "", role: "user" });
    setTimeout(fetchAll, 500);
  };

  const handleDelete = async (u: any) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", user_id: u.user_id },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error("Erro ao remover: " + (error?.message || (data as any)?.error));
      return;
    }
    toast.success("Usuário removido");
    fetchAll();
  };

  return (
    <DashboardLayout type="admin">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários da plataforma"
        icon={<Users className="h-6 w-6" />}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Novo usuário
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{u.telefone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.cidade || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : u.role === "ong" ? "secondary" : "outline"}>
                      {u.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell><Switch checked={u.ativo !== false} onCheckedChange={() => toggleAtivo(u)} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação remove permanentemente {u.nome} ({u.email}) da plataforma.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(u)} disabled={busy}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
              <div className="space-y-1"><Label>Estado</Label><Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} /></div>
            </div>
            <div className="space-y-1">
              <Label>Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="ong">ONG</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome</Label><Input value={createForm.nome} onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Senha</Label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Função</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="ong">ONG</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={busy} className="w-full">{busy ? "Criando..." : "Criar usuário"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
