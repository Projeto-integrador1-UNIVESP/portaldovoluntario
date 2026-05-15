import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Download, Plus, Trash2, Eye } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminDoacoes() {
  const [doacoes, setDoacoes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [ongs, setOngs] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [form, setForm] = useState({ id_usuario: "", id_ong: "", valor: "", tipo_doacao: "pix" });

  const fetchAll = async () => {
    const { data: rows, error } = await supabase.from("doacoes").select("*").order("data_doacao", { ascending: false });
    if (error) { toast.error("Erro ao carregar doações: " + error.message); return; }
    const [profilesRes, ongsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, nome, email, telefone, cidade, estado"),
      supabase.from("ongs").select("id, nome"),
    ]);
    const profiles = new Map((profilesRes.data || []).map((u: any) => [u.user_id, u]));
    const ongMap = new Map((ongsRes.data || []).map((o: any) => [o.id, o]));
    setDoacoes((rows || []).map((d: any) => ({ ...d, profiles: profiles.get(d.id_usuario), ongs: ongMap.get(d.id_ong) })));
  };

  useEffect(() => {
    fetchAll();
    supabase.from("profiles").select("user_id, nome, email").then(({ data }) => data && setUsuarios(data));
    supabase.from("ongs").select("id, nome").then(({ data }) => data && setOngs(data));
  }, []);

  const create = async () => {
    if (!form.id_ong || !form.valor) return toast.error("ONG e valor obrigatórios");
    const { error } = await supabase.from("doacoes").insert({
      id_usuario: form.id_usuario || null,
      id_ong: form.id_ong,
      valor: parseFloat(form.valor),
      tipo_doacao: form.tipo_doacao,
    });
    if (error) return toast.error(error.message);
    toast.success("Doação cadastrada");
    setOpenCreate(false);
    setForm({ id_usuario: "", id_ong: "", valor: "", tipo_doacao: "pix" });
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta doação?")) return;
    const { error } = await supabase.from("doacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    fetchAll();
  };

  return (
    <DashboardLayout type="admin">
      <PageHeader
        title="Doações"
        description="Todas as doações da plataforma"
        icon={<DollarSign className="h-6 w-6" />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCsv("doacoes.csv", doacoes.map((d: any) => ({
              doador: d.profiles?.nome || "Anônimo",
              email: d.profiles?.email || "",
              ong: d.ongs?.nome || "",
              valor: d.valor,
              tipo: d.tipo_doacao,
              data: new Date(d.data_doacao).toLocaleDateString("pt-BR"),
            })))}>
              <Download className="h-4 w-4 mr-2" />Exportar CSV
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Nova doação
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doador</TableHead>
                <TableHead>ONG</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doacoes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma doação registrada.</TableCell></TableRow>
              )}
              {doacoes.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.profiles?.nome || "Anônimo"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.ongs?.nome}</TableCell>
                  <TableCell className="font-medium">R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-muted-foreground uppercase">{d.tipo_doacao}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(d.data_doacao).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewing(d)} title="Ver doador">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(d.id)} title="Remover">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova doação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Doador (opcional)</Label>
              <Select value={form.id_usuario} onValueChange={(v) => setForm({ ...form, id_usuario: v })}>
                <SelectTrigger><SelectValue placeholder="Anônimo" /></SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.nome} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ONG</Label>
              <Select value={form.id_ong} onValueChange={(v) => setForm({ ...form, id_ong: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma ONG" /></SelectTrigger>
                <SelectContent>
                  {ongs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo_doacao} onValueChange={(v) => setForm({ ...form, tipo_doacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={create}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Informações do doador</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nome:</span> <strong>{viewing.profiles?.nome || "Anônimo"}</strong></p>
              <p><span className="text-muted-foreground">Email:</span> {viewing.profiles?.email || "—"}</p>
              <p><span className="text-muted-foreground">Telefone:</span> {viewing.profiles?.telefone || "—"}</p>
              <p><span className="text-muted-foreground">Localização:</span> {viewing.profiles?.cidade ? `${viewing.profiles.cidade}, ${viewing.profiles.estado || ""}` : "—"}</p>
              <hr className="my-3" />
              <p><span className="text-muted-foreground">ONG:</span> {viewing.ongs?.nome}</p>
              <p><span className="text-muted-foreground">Valor:</span> R$ {viewing.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p><span className="text-muted-foreground">Tipo:</span> {viewing.tipo_doacao}</p>
              <p><span className="text-muted-foreground">Data:</span> {new Date(viewing.data_doacao).toLocaleString("pt-BR")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
