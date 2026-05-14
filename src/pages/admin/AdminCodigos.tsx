import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Plus, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

function genCode() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ONG-${a}-${b}`;
}

export default function AdminCodigos() {
  const [codes, setCodes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", nome_ong_sugerido: "", observacoes: "", expires_at: "" });
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    const { data } = await supabase
      .from("ong_access_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setCodes(data || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openNew = () => {
    setForm({ code: genCode(), nome_ong_sugerido: "", observacoes: "", expires_at: "" });
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("ong_access_codes").insert({
      code: form.code.trim().toUpperCase(),
      nome_ong_sugerido: form.nome_ong_sugerido || null,
      observacoes: form.observacoes || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error("Erro ao gerar código: " + error.message);
      return;
    }
    toast.success("Código gerado!");
    setOpen(false);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este código?")) return;
    const { error } = await supabase.from("ong_access_codes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Código removido.");
    fetchAll();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  return (
    <DashboardLayout type="admin">
      <PageHeader
        title="Códigos de cadastro de ONGs"
        description="Gere códigos exclusivos para que organizações se cadastrem na plataforma."
        icon={<KeyRound className="h-6 w-6 text-primary" />}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" /> Novo código
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar código de cadastro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <div className="flex gap-2">
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: genCode() })}>
                      Gerar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome sugerido da ONG</Label>
                  <Input value={form.nome_ong_sugerido} onChange={(e) => setForm({ ...form, nome_ong_sugerido: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Validade (opcional)</Label>
                  <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
                <Button onClick={save} disabled={busy || !form.code} className="w-full">
                  {busy ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>ONG sugerida</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>{c.nome_ong_sugerido || "—"}</TableCell>
                  <TableCell>
                    {c.used ? (
                      <Badge variant="secondary">Utilizado</Badge>
                    ) : c.expires_at && new Date(c.expires_at) < new Date() ? (
                      <Badge variant="destructive">Expirado</Badge>
                    ) : (
                      <Badge>Disponível</Badge>
                    )}
                  </TableCell>
                  <TableCell>{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => copyCode(c.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!c.used && (
                      <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {codes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum código gerado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}