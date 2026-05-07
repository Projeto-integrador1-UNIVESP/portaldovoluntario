import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/exportCsv";

export default function AdminVoluntarios() {
  const [voluntarios, setVoluntarios] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("voluntariado").select("*, projetos(nome_projeto), profiles:id_usuario(nome, email)").order("data_inscricao", { ascending: false }).then(({ data }) => {
      if (data) setVoluntarios(data);
    });
  }, []);

  const pendentes = voluntarios.filter((v) => v.status === "pendente");
  const aprovados = voluntarios.filter((v) => v.status === "aprovado");
  const rejeitados = voluntarios.filter((v) => v.status === "rejeitado");

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{(v as any).profiles?.nome || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{(v as any).profiles?.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{(v as any).projetos?.nome_projeto || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(v.data_inscricao).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Badge variant={v.status === "aprovado" ? "default" : v.status === "rejeitado" ? "destructive" : "secondary"}>
                    {v.status}
                  </Badge>
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
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados ({aprovados.length})</TabsTrigger>
          <TabsTrigger value="rejeitados">Rejeitados ({rejeitados.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">{renderTable(pendentes)}</TabsContent>
        <TabsContent value="aprovados">{renderTable(aprovados)}</TabsContent>
        <TabsContent value="rejeitados">{renderTable(rejeitados)}</TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
