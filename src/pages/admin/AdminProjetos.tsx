import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = { nome_projeto: "", descricao: "", data_inicio: "", data_fim: "", img_url: "", id_ong: "" };

export default function AdminProjetos() {
  const [projetos, setProjetos] = useState<any[]>([]);
  const [ongs, setOngs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(empty);

  const fetchAll = async () => {
    const [p, o] = await Promise.all([
      supabase.from("projetos").select("*").order("created_at", { ascending: false }),
      supabase.from("ongs").select("id, nome").eq("status", true).order("nome"),
    ]);
    const ongMap = new Map((o.data || []).map((ong: any) => [ong.id, ong]));
    if (p.error) toast.error("Erro ao carregar projetos: " + p.error.message);
    setProjetos((p.data || []).map((proj: any) => ({ ...proj, ongs: ongMap.get(proj.id_ong) })));
    if (o.data) setOngs(o.data);
  };
  useEffect(() => { fetchAll(); }, []);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome_projeto.trim() || !form.id_ong || !form.descricao.trim() || !form.data_inicio || !form.data_fim) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (form.data_fim < form.data_inicio) { toast.error("Data fim não pode ser menor que a data de início"); return; }
    const payload: any = {
      nome_projeto: form.nome_projeto,
      descricao: form.descricao || null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      img_url: form.img_url || null,
      id_ong: form.id_ong,
    };
    const { error } = editing
      ? await supabase.from("projetos").update(payload).eq("id", editing.id)
      : await supabase.from("projetos").insert(payload);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success(editing ? "Projeto atualizado" : "Projeto criado");
    setOpen(false); setEditing(null); setForm(empty); fetchAll();
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      nome_projeto: p.nome_projeto || "",
      descricao: p.descricao || "",
      data_inicio: p.data_inicio || "",
      data_fim: p.data_fim || "",
      img_url: p.img_url || "",
      id_ong: p.id_ong || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este projeto?")) return;
    const { error } = await supabase.from("projetos").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Projeto excluído"); fetchAll();
  };

  const toggleStatus = async (p: any) => {
    await supabase.from("projetos").update({ status: !p.status }).eq("id", p.id);
    fetchAll();
  };

  return (
    <DashboardLayout type="admin">
      <PageHeader
        title="Projetos"
        description="Todos os projetos da plataforma"
        icon={<FolderOpen className="h-6 w-6" />}
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo projeto</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome *</Label><Input required maxLength={80} value={form.nome_projeto} onChange={(e) => update("nome_projeto", e.target.value)} /></div>
                <div className="space-y-1">
                  <Label>ONG *</Label>
                  <Select value={form.id_ong} onValueChange={(v) => update("id_ong", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione a ONG" /></SelectTrigger>
                    <SelectContent>
                      {ongs.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Início *</Label><Input required type="date" value={form.data_inicio} onChange={(e) => update("data_inicio", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Fim *</Label><Input required type="date" value={form.data_fim} onChange={(e) => update("data_fim", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>Imagem (URL)</Label><Input value={form.img_url} onChange={(e) => update("img_url", e.target.value)} /></div>
                <div className="space-y-1"><Label>Descrição *</Label><Textarea required maxLength={900} value={form.descricao} onChange={(e) => update("descricao", e.target.value)} /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>ONG</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projetos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-64 break-words">{p.nome_projeto}</TableCell>
                  <TableCell className="text-muted-foreground">{(p as any).ongs?.nome || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.data_inicio ? new Date(p.data_inicio).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.data_fim ? new Date(p.data_fim).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(p)}>
                      <Badge variant={p.status ? "default" : "secondary"}>{p.status ? "Ativo" : "Inativo"}</Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
