import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";

export default function AdminProjetos() {
  const [projetos, setProjetos] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("projetos").select("*, ongs(nome)").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setProjetos(data);
    });
  }, []);

  return (
    <DashboardLayout type="admin">
      <PageHeader title="Projetos" description="Todos os projetos da plataforma" icon={<FolderOpen className="h-6 w-6" />} />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {projetos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome_projeto}</TableCell>
                  <TableCell className="text-muted-foreground">{(p as any).ongs?.nome || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.data_inicio ? new Date(p.data_inicio).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.data_fim ? new Date(p.data_fim).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant={p.status ? "default" : "secondary"}>{p.status ? "Ativo" : "Inativo"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
