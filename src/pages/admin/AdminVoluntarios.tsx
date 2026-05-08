import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Download, Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/exportCsv";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminVoluntarios() {
  const [voluntarios, setVoluntarios] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ id_usuario: "", id_projeto: "", status: "pendente" });

  const fetchAll = async () => {
    const { data } = await supabase
      .from("voluntariado")
      .select("*, projetos(nome_projeto), profiles:id_usuario(nome, email)")
      .order("data_inscricao", { ascending: false });
    if (data) setVoluntarios(data);
  };

  useEffect(() => {
    fetchAll();
    supabase.from("profiles").select("user_id, nome, email").then(({ data }) => data && setUsuarios(data));
    supabase.from("projetos").select("id, nome_projeto").then(({ data }) => data && setProjetos(data));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("voluntariado").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta inscrição?")) return;
    const { error } = await supabase.from("voluntariado").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    fetchAll();
  };

  const create = async () => {
    if (!form.id_usuario || !form.id_projeto) return toast.error("Selecione usuário e projeto");
    const { error } = await supabase.from("voluntariado").insert({
      id_usuario: form.id_usuario,
      id_projeto: form.id_projeto,
      status: form.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Voluntário cadastrado");
    setOpen(false);
    setForm({ id_usuario: "", id_projeto: "", status: "pendente" });
    fetchAll();
  };

  const filtered = (status: string) => voluntarios.filter((v) => v.status === status);

  const renderTable = (items: any[]) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.profiles?.nome || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{v.profiles?.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{v.projetos?.nome_projeto || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(v.data_inscricao).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Badge variant={v.status === "aprovado" ? "default" : v.status === "rejeitado" ? "destructive" : "secondary"}>
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {v.status !== "aprovado" && (
                    <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "aprovado")} title="Aprovar">
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                  )}
                  {v.status !== "rejeitado" && (
                    <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "rejeitado")} title="Rejeitar">
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(v.id)} title="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout type="admin">
      <PageHeader
        title="Voluntários"
        description="Gerencie as inscrições de voluntariado"
        icon={<UserCheck className="h-6 w-6" />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCsv("voluntarios.csv", voluntarios.map((v: any) => ({
              nome: v.profiles?.nome || "",
              email: v.profiles?.email || "",
              projeto: v.projetos?.nome_projeto || "",
              data: new Date(v.data_inscricao).toLocaleDateString("pt-BR"),
              status: v.status,
            })))}>
              <Download className="h-4 w-4 mr-2" />Exportar CSV
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Adicionar voluntário
            </Button>
          </div>
        }
      />
      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({filtered("pendente").length})</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados ({filtered("aprovado").length})</TabsTrigger>
          <TabsTrigger value="rejeitados">Rejeitados ({filtered("rejeitado").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">{renderTable(filtered("pendente"))}</TabsContent>
        <TabsContent value="aprovados">{renderTable(filtered("aprovado"))}</TabsContent>
        <TabsContent value="rejeitados">{renderTable(filtered("rejeitado"))}</TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar voluntário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={form.id_usuario} onValueChange={(v) => setForm({ ...form, id_usuario: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.nome} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={form.id_projeto} onValueChange={(v) => setForm({ ...form, id_projeto: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_projeto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
