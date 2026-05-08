import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Heart, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function ProjetoDetalhePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<any>(null);
  const [jaInscrito, setJaInscrito] = useState(false);
  const [voluntarios, setVoluntarios] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase.from("projetos").select("*, ongs(nome, id)").eq("id", id).single();
      if (data) setProjeto(data);

      const { count } = await supabase.from("voluntariado").select("id", { count: "exact", head: true }).eq("id_projeto", id);
      setVoluntarios(count || 0);

      if (user) {
        const { data: vol } = await supabase.from("voluntariado").select("id").eq("id_projeto", id).eq("id_usuario", user.id);
        if (vol && vol.length > 0) setJaInscrito(true);
      }
    };
    fetch();
  }, [id, user]);

  const handleParticipar = async () => {
    if (!user) { navigate("/login"); return; }
    const { error } = await supabase.from("voluntariado").insert({ id_projeto: id!, id_usuario: user.id });
    if (error) {
      toast.error("Erro ao se inscrever");
    } else {
      toast.success("Inscrição realizada!");
      setJaInscrito(true);
      setVoluntarios((v) => v + 1);
    }
  };

  if (!projeto) return (
    <PublicShell>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </PublicShell>
  );

  return (
    <PublicShell>
      <div className="container py-12 max-w-3xl">
        <Card className="animate-fade-in">
          {projeto.img_url && (
            <div className="h-56 bg-muted rounded-t-lg overflow-hidden">
              <img src={projeto.img_url} alt={projeto.nome_projeto} className="w-full h-full object-cover" />
            </div>
          )}
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">
                <Building2 className="h-3 w-3 mr-1" /> {projeto.ongs?.nome}
              </Badge>
              <Badge variant={projeto.status ? "default" : "destructive"}>
                {projeto.status ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <CardTitle className="text-2xl">{projeto.nome_projeto}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{projeto.descricao || "Sem descrição disponível."}</p>

            <div className="flex gap-4 text-sm text-muted-foreground">
              {projeto.data_inicio && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(projeto.data_inicio).toLocaleDateString("pt-BR")}
                  {projeto.data_fim && ` – ${new Date(projeto.data_fim).toLocaleDateString("pt-BR")}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {voluntarios} voluntário(s)
              </span>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleParticipar} disabled={jaInscrito} className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                {jaInscrito ? "Já inscrito" : "Participar como voluntário"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate(`/doar/${projeto.ongs?.id}`)}>
                <Heart className="h-4 w-4 mr-2" /> Doar para a ONG
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}
