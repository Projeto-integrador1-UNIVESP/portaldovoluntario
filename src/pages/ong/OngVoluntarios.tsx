import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserCheck, Download, Check, X, Trash2 } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

export default function OngVoluntarios() {
  const { ongId } = useAuth();
  const [voluntarios, setVoluntarios] = useState<any[]>([]);

  const fetchAll = async () => {
    if (!ongId) return;
    const { data: projs } = await supabase.from("projetos").select("id").eq("id_ong", ongId);
    const ids = (projs || []).map((p) => p.id);
    if (!ids.length) { setVoluntarios([]); return; }
    const { data } = await supabase
      .from("voluntariado")
      .select("*, projetos(nome_projeto), profiles:id_usuario(nome, email, telefone)")
      .in("id_projeto", ids)
      .order("data_inscricao", { ascending: false });
    if (data) setVoluntarios(data);
  };

  useEffect(() => { fetchAll(); }, [ongId]);

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
    <DashboardLayout type="ong">
      <PageHeader
        title="Voluntários"
        description="Inscrições nos projetos da sua ONG"
        icon={<UserCheck className="h-6 w-6" />}
        action={
          <Button variant="outline" onClick={() => exportToCsv("voluntarios.csv", voluntarios.map((v: any) => ({
            nome: v.profiles?.nome || "",
            email: v.profiles?.email || "",
            projeto: v.projetos?.nome_projeto || "",
            data: new Date(v.data_inscricao).toLocaleDateString("pt-BR"),
            status: v.status,
          })))}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
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
    </DashboardLayout>
  );
}