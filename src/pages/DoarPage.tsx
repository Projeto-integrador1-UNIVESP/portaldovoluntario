import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function DoarPage() {
  const { ongId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ong, setOng] = useState<any>(null);
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("pix");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ongId) return;
    supabase.from("ongs").select("*").eq("id", ongId).single().then(({ data }) => {
      if (data) setOng(data);
    });
  }, [ongId]);

  const handleDoar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }

    setLoading(true);
    const { error } = await supabase.from("doacoes").insert({
      id_ong: ongId!,
      id_usuario: user.id,
      valor: parseFloat(valor),
      tipo_doacao: tipo,
    });
    setLoading(false);

    if (error) {
      toast.error("Erro ao registrar doação");
    } else {
      toast.success("Doação registrada com sucesso! Obrigado!");
      setValor("");
    }
  };

  if (!ong) return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="container py-12 max-w-md">
        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Fazer uma doação</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1">
              <Building2 className="h-3 w-3" /> {ong.nome}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleDoar}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" min="1" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="50.00" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de doação</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ong.pix && (
                <div className="p-3 rounded-md bg-muted text-sm">
                  <p className="font-medium text-foreground">Chave PIX:</p>
                  <p className="text-muted-foreground">{ong.pix}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Confirmar doação"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
