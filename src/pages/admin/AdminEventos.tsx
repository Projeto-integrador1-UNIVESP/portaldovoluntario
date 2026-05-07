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
import { Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = { nome: "", descricao: "", data_evento: "", local: "", vagas: "", img_url: "", id_ong: "" };

export default function AdminEventos() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [ongs, setOngs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(empty);

  const fetchAll = async () => {
    const [e, o] = await Promise.all([
      (supabase as any).from("eventos").select("*, ongs(nome)").order("data_evento", { ascending: false }),
      supabase.from("ongs").select("id, nome").eq("status", true).order("nome"),
    ]);
    if (e.data) setEventos(e.data);
    if (o.data) setOngs(o.data);
  };
  useEffect(() => { fetchAll(); }, []);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome || !form.data_evento) { toast.error("Nome e data são obrigatórios"); return; }
    const payload: any = {
      nome: form.nome,
      descricao: form.descricao || null,
      data_evento: form.data_evento,
      local: form.local || null,
      vagas: form.vagas ? parseInt(form.vagas) : null,
      img_url: form.img_url || null,
      id_ong: form.id_ong || null,
    };
    const { error } = editing
      ? await (supabase as any).from("eventos").update(payload).eq("id", editing.id)
      : await (supabase as any).from("eventos").insert(payload);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(editing ? "Evento atualizado" : "Evento criado");
    setOpen(false); setEditing(null); setForm(empty); fetchAll();
  };

  const openEdit = (e: any) => {
    setEditing(e);
    setForm({
      nome: e.nome || "",
      descricao: e.descricao || "",
      data_evento: e.data_evento ? new Date(e.data_evento).toISOString().slice(0, 16) : "",
      local: e.local || "",
      vagas: e.vagas?.toString() || "",
      img_url: e.img_url || "",
      id_ong: e.id_ong || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este evento?")) return;
    const { error } = await (supabase as any).from("eventos").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Evento excluído"); fetchAll();
  };

  const toggleStatus = async (e: any) => {
    await (supabase as any).from("eventos").update({ status: !e.status }).eq("id", e.id);
    fetchAll();
  };

  return (
    <DashboardLayout type="admin">
      <PageHeader
        title="Eventos"
        description="Cadastre e gerencie eventos da plataforma"
        icon={<Calendar className="h-6 w-6" />}
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo evento</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => update("nome", e.target.value)} /></div>
                <div className="space-y-1"><Label>Data e hora *</Label><Input type="datetime-local" value={form.data_evento} onChange={(e) => update("data_evento", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Local</Label><Input value={form.local} onChange={(e) => update("local", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Vagas</Label><Input type="number" value={form.vagas} onChange={(e) => update("vagas", e.target.value)} /></div>
                </div>
                <div className="space-y-1">
                  <Label>ONG (opcional)</Label>
                  <Select value={form.id_ong} onValueChange={(v) => update("id_ong", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione a ONG" /></SelectTrigger>
                    <SelectContent>
                      {ongs.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Imagem (URL)</Label><Input value={form.img_url} onChange={(e) => update("img_url", e.target.value)} /></div>
                <div className="space-y-1"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => update("descricao", e.target.value)} /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar evento"}</Button>
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
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Vagas</TableHead>
                <TableHead>ONG</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(e.data_evento).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-muted-foreground">{e.local || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.vagas ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{(e as any).ongs?.nome || "—"}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(e)}>
                      <Badge variant={e.status ? "default" : "secondary"}>{e.status ? "Ativo" : "Inativo"}</Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {eventos.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum evento cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}