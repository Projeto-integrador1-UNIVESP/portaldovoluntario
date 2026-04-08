import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

export default function OngMembros() {
  const { ongId } = useAuth();
  const [membros, setMembros] = useState<any[]>([]);

  useEffect(() => {
    if (!ongId) return;
    supabase.from("usuarios_ong").select("*, profiles:id_usuario(nome, email, telefone)").eq("id_ong", ongId).then(({ data }) => {
      if (data) setMembros(data);
    });
  }, [ongId]);

  return (
    <DashboardLayout type="ong">
      <PageHeader title="Membros" description="Membros vinculados à sua ONG" icon={<Users className="h-6 w-6" />} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membros.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{(m as any).profiles?.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{(m as any).profiles?.email}</TableCell>
                  <TableCell className="text-muted-foreground">{(m as any).profiles?.telefone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(m.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
