import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const emptyOng = { nome: "", cnpj: "", cidade: "", estado: "", logradouro: "", cep: "", telefone: "", pix: "", banco: "", conta: "", agencia: "", descricao: "" };

export default function AdminOngs() {
  const [ongs, setOngs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyOng);

  const fetchOngs = async () => {
    const { data } = await supabase.from("ongs").select("*").order("created_at", { ascending: false });
    if (data) setOngs(data);
  };

  useEffect(() => { fetchOngs(); }, []);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    const payload = {
      nome: form.nome, cnpj: form.cnpj, cidade: form.cidade, estado: form.estado,
      logradouro: form.logradouro, cep: form.cep, telefone: form.telefone, pix: form.pix,
      banco: form.banco, conta: form.conta ? parseInt(form.conta) : null, agencia: form.agencia ? parseInt(form.agencia) : null,
      descricao: form.descricao,
    };

    if (editing) {
      const { error } = await supabase.from("ongs").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("ONG atualizada");
    } else {
      const { error } = await supabase.from("ongs").insert(payload);
      if (error) { toast.error("Erro ao criar ONG"); return; }
      toast.success("ONG criada");
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyOng);
    fetchOngs();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from("ongs").update({ status: !current }).eq("id", id);
    fetchOngs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ONG?")) return;
    await supabase.from("ongs").delete().eq("id", id);
    toast.success("ONG excluída");
    fetchOngs();
  };

  const openEdit = (o: any) => {
    setEditing(o);
    setForm({ nome: o.nome || "", cnpj: o.cnpj || "", cidade: o.cidade || "", estado: o.estado || "", logradouro: o.logradouro || "", cep: o.cep || "", telefone: o.telefone || "", pix: o.pix || "", banco: o.banco || "", conta: o.conta?.toString() || "", agencia: o.agencia?.toString() || "", descricao: o.descricao || "" });
    setOpen(true);
  };

  const ativas = ongs.filter((o) => o.status);
  const inativas = ongs.filter((o) => !o.status);

  return (
    <DashboardLayout type="admin">
      <PageHeader
        title="ONGs"
        description="Gerencie as organizações parceiras"
        icon={<Building2 className="h-6 w-6" />}
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyOng); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova ONG</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar ONG" : "Nova ONG"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => update("nome", e.target.value)} /></div>
                  <div className="space-y-1"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => update("cidade", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Estado</Label><Input value={form.estado} onChange={(e) => update("estado", e.target.value)} /></div>
                  <div className="space-y-1"><Label>CEP</Label><Input value={form.cep} onChange={(e) => update("cep", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Logradouro</Label><Input value={form.logradouro} onChange={(e) => update("logradouro", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} /></div>
                  <div className="space-y-1"><Label>PIX</Label><Input value={form.pix} onChange={(e) => update("pix", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Banco</Label><Input value={form.banco} onChange={(e) => update("banco", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Conta</Label><Input value={form.conta} onChange={(e) => update("conta", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Agência</Label><Input value={form.agencia} onChange={(e) => update("agencia", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => update("descricao", e.target.value)} /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar ONG"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="ativas">
        <TabsList>
          <TabsTrigger value="ativas">Ativas ({ativas.length})</TabsTrigger>
          <TabsTrigger value="inativas">Inativas ({inativas.length})</TabsTrigger>
        </TabsList>
        {["ativas", "inativas"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tab === "ativas" ? ativas : inativas).map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{o.cnpj || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{o.telefone || "—"}</TableCell>
                        <TableCell><Switch checked={o.status} onCheckedChange={() => toggleStatus(o.id, o.status)} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(o.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
