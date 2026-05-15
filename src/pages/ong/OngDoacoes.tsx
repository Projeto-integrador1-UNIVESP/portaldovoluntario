import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign } from "lucide-react";

export default function OngDoacoes() {
  const { ongId } = useAuth();
  const [doacoes, setDoacoes] = useState<any[]>([]);

  useEffect(() => {
    if (!ongId) return;
    const fetchDoacoes = async () => {
      const { data: rows } = await supabase.from("doacoes").select("*").eq("id_ong", ongId).order("data_doacao", { ascending: false });
      const { data: profiles } = await supabase.from("profiles").select("user_id, nome");
      const map = new Map((profiles || []).map((u: any) => [u.user_id, u]));
      setDoacoes((rows || []).map((d: any) => ({ ...d, profiles: map.get(d.id_usuario) })));
    };
    fetchDoacoes();
  }, [ongId]);

  const total = doacoes.reduce((s, d) => s + d.valor, 0);

  return (
    <DashboardLayout type="ong">
      <PageHeader title="Doações" description={`Total arrecadado: R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={<DollarSign className="h-6 w-6" />} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doador</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doacoes.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma doação registrada.</TableCell></TableRow>
              )}
              {doacoes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{(d as any).profiles?.nome || "Anônimo"}</TableCell>
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
