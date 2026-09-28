import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Building2 } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Seo } from "@/components/common/Seo";
import { toast } from "sonner";

export default function DoarPage() {
  const { ongId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ong, setOng] = useState<any>(null);
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("pix");
  const [loading, setLoading] = useState(false);
  const [minhasDoacoes, setMinhasDoacoes] = useState<any[]>([]);
  const [carregandoOng, setCarregandoOng] = useState(true);

  const fetchMinhasDoacoes = async () => {
    if (!ongId || !user) { setMinhasDoacoes([]); return; }
    const { data } = await supabase
      .from("doacoes")
      .select("id, valor, tipo_doacao, data_doacao")
      .eq("id_ong", ongId)
      .eq("id_usuario", user.id)
      .order("data_doacao", { ascending: false });
    setMinhasDoacoes(data || []);
  };

  useEffect(() => {
    if (!ongId) return;
    supabase.from("ongs").select("*").eq("id", ongId).single().then(({ data }) => {
      if (data) setOng(data);
      // Sem isto, um id de ONG inexistente deixava a tela girando para sempre.
      setCarregandoOng(false);
    });
  }, [ongId]);

  useEffect(() => { fetchMinhasDoacoes(); }, [ongId, user]);

  const handleDoar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate(`/login?redirect=/doar/${ongId}`); return; }
    const parsedValor = parseFloat(valor);
    if (!Number.isFinite(parsedValor) || parsedValor <= 0) {
      toast.error("Informe um valor válido para doação");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("doacoes").insert({
      id_ong: ongId!,
      id_usuario: user.id,
      valor: parsedValor,
      tipo_doacao: tipo,
    });
    setLoading(false);

    if (error) {
      toast.error("Erro ao registrar doação");
    } else {
      toast.success("Doação registrada com sucesso! Obrigado!");
      setValor("");
      fetchMinhasDoacoes();
    }
  };

  if (carregandoOng) return (
    <PublicShell>
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <span className="sr-only">Carregando…</span>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </PublicShell>
  );

  if (!ong) return (
    <PublicShell>
      <Seo title="ONG não encontrada" noIndex />
      <div className="container py-16">
        <EmptyState
          icon={Building2}
          title="ONG não encontrada"
          description="Ela pode ter saído da plataforma ou o link está incorreto."
          action={{ label: "Ver ONGs parceiras", to: "/ongs" }}
        />
      </div>
    </PublicShell>
  );

  return (
    <PublicShell>
      <div className="container py-12 max-w-md">
        {!user && (
          <Card className="mb-4 border-primary/40 bg-primary/5">
            <CardContent className="p-4 text-sm">
              Para concluir uma doação você precisa <a href={`/login?redirect=/doar/${ongId}`} className="font-semibold text-primary hover:underline">entrar na plataforma</a>.
            </CardContent>
          </Card>
        )}
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
        {user && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Minhas doações para esta ONG</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {minhasDoacoes.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma doação registrada ainda.</p>
              ) : minhasDoacoes.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">{new Date(d.data_doacao).toLocaleDateString("pt-BR")} · {d.tipo_doacao}</span>
                  <strong>R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
