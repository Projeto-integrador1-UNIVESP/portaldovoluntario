import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderOpen, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const emptyProjeto = { nome_projeto: "", descricao: "", data_inicio: "", data_fim: "", img_url: "" };

export default function OngProjetos() {
  const { ongId } = useAuth();
  const [projetos, setProjetos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyProjeto);

  const fetchProjetos = async () => {
    if (!ongId) return;
    const { data } = await supabase.from("projetos").select("*").eq("id_ong", ongId).order("created_at", { ascending: false });
    if (data) setProjetos(data);
  };

  useEffect(() => { fetchProjetos(); }, [ongId]);

  const update = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.nome_projeto.trim() || !form.descricao.trim() || !form.data_inicio || !form.data_fim) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (form.data_fim < form.data_inicio) { toast.error("Data fim não pode ser menor que a data de início"); return; }
    const payload = { ...form, nome_projeto: form.nome_projeto.trim(), descricao: form.descricao.trim(), id_ong: ongId!, data_inicio: form.data_inicio, data_fim: form.data_fim };
    if (editing) {
      const { error } = await supabase.from("projetos").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Projeto atualizado");
    } else {
      const { error } = await supabase.from("projetos").insert(payload);
      if (error) { toast.error("Erro ao criar projeto"); return; }
      toast.success("Projeto criado");
    }
    setOpen(false); setEditing(null); setForm(emptyProjeto);
    fetchProjetos();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from("projetos").update({ status: !current }).eq("id", id);
    fetchProjetos();
  };

  return (
    <DashboardLayout type="ong">
      <PageHeader
        title="Projetos"
        description="Gerencie os projetos da sua ONG"
        icon={<FolderOpen className="h-6 w-6" />}
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyProjeto); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Projeto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Projeto" : "Novo Projeto"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome *</Label><Input required maxLength={80} value={form.nome_projeto} onChange={(e) => update("nome_projeto", e.target.value)} /></div>
                <div className="space-y-1"><Label>Descrição *</Label><Textarea required maxLength={900} value={form.descricao} onChange={(e) => update("descricao", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Data início *</Label><Input required type="date" value={form.data_inicio} onChange={(e) => update("data_inicio", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Data fim *</Label><Input required type="date" value={form.data_fim} onChange={(e) => update("data_fim", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>URL da imagem</Label><Input value={form.img_url} onChange={(e) => update("img_url", e.target.value)} /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar Projeto"}</Button>
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
                  <TableCell className="text-muted-foreground">{p.data_inicio ? new Date(p.data_inicio).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.data_fim ? new Date(p.data_fim).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Switch checked={p.status} onCheckedChange={() => toggleStatus(p.id, p.status)} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setForm({ nome_projeto: p.nome_projeto, descricao: p.descricao || "", data_inicio: p.data_inicio || "", data_fim: p.data_fim || "", img_url: p.img_url || "" }); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
