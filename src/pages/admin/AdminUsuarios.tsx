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
import { Users, Pencil, Shield } from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "ong" | "user";

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", cidade: "", estado: "" });
  const [role, setRole] = useState<AppRole>("user");

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

  return (
    <DashboardLayout type="admin">
      <PageHeader title="Usuários" description="Gerencie os usuários da plataforma" icon={<Users className="h-6 w-6" />} />
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
    </DashboardLayout>
  );
}
