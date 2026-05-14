import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function OngAuditoria() {
  const { ongId } = useAuth();
  const [doacoes, setDoacoes] = useState<any[]>([]);

  useEffect(() => {
    if (!ongId) return;
    supabase
      .from("doacoes")
      .select("*, profiles:id_usuario(nome, email)")
      .eq("id_ong", ongId)
      .order("data_doacao", { ascending: false })
      .then(({ data }) => data && setDoacoes(data));
  }, [ongId]);

  const total = useMemo(() => doacoes.reduce((s, d) => s + (d.valor || 0), 0), [doacoes]);
  const porDoador = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; qtd: number }>();
    doacoes.forEach((d) => {
      const key = d.id_usuario || "anon";
      const nome = d.profiles?.nome || "Anônimo";
      const cur = map.get(key) || { nome, total: 0, qtd: 0 };
      cur.total += d.valor || 0;
      cur.qtd += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [doacoes]);

  return (
    <DashboardLayout type="ong">
      <PageHeader
        title="Auditoria de Doações"
        description="Acompanhe quem doou, quanto e quando para sua ONG"
        icon={<ShieldCheck className="h-6 w-6" />}
        action={
          <Button variant="outline" onClick={() => exportToCsv("auditoria-ong.csv", doacoes.map((d: any) => ({
            doador: d.profiles?.nome || "Anônimo",
            email: d.profiles?.email || "",
            valor: d.valor,
            tipo: d.tipo_doacao,
            data: new Date(d.data_doacao).toLocaleString("pt-BR"),
          })))}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total arrecadado</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Doações registradas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{doacoes.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Doadores únicos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{porDoador.length}</p></CardContent></Card>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Ranking de doadores</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Doador</TableHead><TableHead>Doações</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {porDoador.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{p.qtd}</TableCell>
                  <TableCell className="font-medium">R$ {p.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico completo</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Doador</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doacoes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-muted-foreground">{new Date(d.data_doacao).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{d.profiles?.nome || "Anônimo"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.profiles?.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground uppercase">{d.tipo_doacao}</TableCell>
                  <TableCell className="font-medium">R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}