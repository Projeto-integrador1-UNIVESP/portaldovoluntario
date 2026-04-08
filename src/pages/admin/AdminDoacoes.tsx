import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign } from "lucide-react";

export default function AdminDoacoes() {
  const [doacoes, setDoacoes] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("doacoes").select("*, ongs(nome), profiles:id_usuario(nome)").order("data_doacao", { ascending: false }).then(({ data }) => {
      if (data) setDoacoes(data);
    });
  }, []);

  return (
    <DashboardLayout type="admin">
      <PageHeader title="Doações" description="Todas as doações da plataforma" icon={<DollarSign className="h-6 w-6" />} />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {doacoes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{(d as any).profiles?.nome || "Anônimo"}</TableCell>
                  <TableCell className="text-muted-foreground">{(d as any).ongs?.nome}</TableCell>
                  <TableCell className="font-medium">R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-muted-foreground uppercase">{d.tipo_doacao}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(d.data_doacao).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
