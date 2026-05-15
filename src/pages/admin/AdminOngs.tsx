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
import { isValidCep, isValidPhone, normalizeUrl, onlyDigits } from "@/lib/validators";

const emptyOng = {
  nome: "", cnpj: "", cidade: "", estado: "", logradouro: "", cep: "",
  telefone: "", pix: "", banco: "", conta: "", agencia: "", descricao: "",
  missao: "", area_atuacao: "", site: "", instagram: "", img_url: "", img_capa: "",
};

export default function AdminOngs() {
  const [ongs, setOngs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyOng);

  const fetchOngs = async () => {
    const { data, error } = await supabase.from("ongs").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar ONGs: " + error.message); return; }
    setOngs(data || []);
  };

  useEffect(() => { fetchOngs(); }, []);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const updateDigits = (field: string, value: string, maxLength: number) => update(field, onlyDigits(value, maxLength));

  const validate = () => {
    const required = [form.nome, form.cnpj, form.cidade, form.estado, form.logradouro, form.cep, form.telefone, form.pix, form.banco, form.conta, form.agencia, form.descricao, form.missao, form.area_atuacao];
    if (required.some((v) => !v.trim())) return "Preencha todos os campos obrigatórios.";
    if (form.nome.length > 80) return "Nome da ONG deve ter no máximo 80 caracteres.";
    if (!isValidPhone(form.telefone)) return "Telefone deve conter 10 ou 11 números.";
    if (!isValidCep(form.cep)) return "CEP deve conter exatamente 8 números.";
    if (!form.conta || !form.agencia) return "Conta e agência devem conter apenas números.";
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) { toast.error(validationError); return; }
    const payload = {
      nome: form.nome.trim(), cnpj: form.cnpj.trim(), cidade: form.cidade.trim(), estado: form.estado.trim().toUpperCase(),
      logradouro: form.logradouro.trim(), cep: form.cep, telefone: form.telefone, pix: form.pix.trim(),
      banco: form.banco.trim(), conta: parseInt(form.conta), agencia: parseInt(form.agencia),
      descricao: form.descricao.trim(),
      missao: form.missao.trim(),
      area_atuacao: form.area_atuacao.trim(),
      site: normalizeUrl(form.site) || null,
      instagram: form.instagram.trim().replace(/^@/, "") || null,
      img_url: normalizeUrl(form.img_url) || null,
      img_capa: normalizeUrl(form.img_capa) || null,
    } as any;

    const { error } = editing
      ? await supabase.from("ongs").update(payload).eq("id", editing.id)
      : await supabase.from("ongs").insert(payload);
    if (error) { toast.error(editing ? "Erro ao atualizar" : "Erro ao criar ONG"); return; }
    toast.success(editing ? "ONG atualizada" : "ONG criada");
    setOpen(false);
    setEditing(null);
    setForm(emptyOng);
    fetchOngs();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const { error } = await supabase.from("ongs").update({ status: !current }).eq("id", id);
    if (error) { toast.error("Erro ao alterar status"); return; }
    fetchOngs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ONG?")) return;
    const { error } = await supabase.from("ongs").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir ONG"); return; }
    toast.success("ONG excluída");
    fetchOngs();
  };

  const openEdit = (o: any) => {
    setEditing(o);
    setForm({
      nome: o.nome || "", cnpj: o.cnpj || "", cidade: o.cidade || "", estado: o.estado || "",
      logradouro: o.logradouro || "", cep: onlyDigits(o.cep || "", 8), telefone: onlyDigits(o.telefone || "", 11), pix: o.pix || "",
      banco: o.banco || "", conta: o.conta?.toString() || "", agencia: o.agencia?.toString() || "",
      descricao: o.descricao || "",
      missao: o.missao || "", area_atuacao: o.area_atuacao || "", site: o.site || "",
      instagram: o.instagram || "", img_url: o.img_url || "", img_capa: o.img_capa || "",
    });
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
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identidade</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Nome *</Label><Input required maxLength={80} value={form.nome} onChange={(e) => update("nome", e.target.value)} /></div>
                  <div className="space-y-1"><Label>CNPJ *</Label><Input required value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Área de atuação *</Label><Input required maxLength={80} placeholder="Educação, Saúde, ..." value={form.area_atuacao} onChange={(e) => update("area_atuacao", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Telefone *</Label><Input required inputMode="numeric" maxLength={11} value={form.telefone} onChange={(e) => updateDigits("telefone", e.target.value, 11)} /></div>
                </div>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Endereço</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Cidade *</Label><Input required maxLength={80} value={form.cidade} onChange={(e) => update("cidade", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Estado *</Label><Input required maxLength={2} value={form.estado} onChange={(e) => update("estado", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} /></div>
                  <div className="space-y-1"><Label>CEP *</Label><Input required inputMode="numeric" maxLength={8} value={form.cep} onChange={(e) => updateDigits("cep", e.target.value, 8)} /></div>
                  <div className="space-y-1"><Label>Logradouro *</Label><Input required maxLength={120} value={form.logradouro} onChange={(e) => update("logradouro", e.target.value)} /></div>
                </div>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Pagamentos</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>PIX *</Label><Input required value={form.pix} onChange={(e) => update("pix", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Banco *</Label><Input required value={form.banco} onChange={(e) => update("banco", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Conta *</Label><Input required inputMode="numeric" value={form.conta} onChange={(e) => updateDigits("conta", e.target.value, 12)} /></div>
                  <div className="space-y-1"><Label>Agência *</Label><Input required inputMode="numeric" value={form.agencia} onChange={(e) => updateDigits("agencia", e.target.value, 8)} /></div>
                </div>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Apresentação no feed</div>
                <div className="space-y-1"><Label>Missão *</Label><Textarea required rows={2} maxLength={500} placeholder="Qual a missão da ONG?" value={form.missao} onChange={(e) => update("missao", e.target.value)} /></div>
                <div className="space-y-1"><Label>Descrição *</Label><Textarea required rows={3} maxLength={900} placeholder="Conte sobre a ONG, projetos, histórico..." value={form.descricao} onChange={(e) => update("descricao", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Site</Label><Input placeholder="https://..." value={form.site} onChange={(e) => update("site", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Instagram</Label><Input placeholder="@nomeong" value={form.instagram} onChange={(e) => update("instagram", e.target.value)} /></div>
                </div>
                <div className="space-y-1">
                  <Label>Logo (URL)</Label>
                  <Input placeholder="https://.../logo.png" value={form.img_url} onChange={(e) => update("img_url", e.target.value)} />
                  {form.img_url && <img src={normalizeUrl(form.img_url)} alt="Prévia logo" className="mt-2 h-16 w-16 rounded-full object-cover border" />}
                </div>
                <div className="space-y-1">
                  <Label>Imagem de capa (URL)</Label>
                  <Input placeholder="https://.../capa.jpg" value={form.img_capa} onChange={(e) => update("img_capa", e.target.value)} />
                  {form.img_capa && <img src={normalizeUrl(form.img_capa)} alt="Prévia capa" className="mt-2 h-28 w-full rounded-md object-cover border" />}
                </div>

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
              <CardContent className="p-0 overflow-x-auto">
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
                        <TableCell className="font-medium max-w-64 break-words">{o.nome}</TableCell>
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
