import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, FolderOpen, DollarSign, Users } from "lucide-react";

export default function OngDashboard() {
  const { ongId } = useAuth();
  const [stats, setStats] = useState({ projetos: 0, voluntarios: 0, totalDoado: 0 });

  useEffect(() => {
    if (!ongId) return;
    const fetch = async () => {
      const [proj, doac] = await Promise.all([
        supabase.from("projetos").select("id", { count: "exact", head: true }).eq("id_ong", ongId),
        supabase.from("doacoes").select("valor").eq("id_ong", ongId),
      ]);
      // count volunteers across all projects of this ONG
      const { data: projIds } = await supabase.from("projetos").select("id").eq("id_ong", ongId);
      let volCount = 0;
      if (projIds && projIds.length > 0) {
        const { count } = await supabase.from("voluntariado").select("id", { count: "exact", head: true }).in("id_projeto", projIds.map(p => p.id));
        volCount = count || 0;
      }
      setStats({
        projetos: proj.count || 0,
        voluntarios: volCount,
        totalDoado: doac.data?.reduce((s, d) => s + d.valor, 0) || 0,
      });
    };
    fetch();
  }, [ongId]);

  const cards = [
    { title: "Projetos ativos", value: stats.projetos, icon: <FolderOpen className="h-5 w-5" /> },
    { title: "Voluntários", value: stats.voluntarios, icon: <Users className="h-5 w-5" /> },
    { title: "Total arrecadado", value: `R$ ${stats.totalDoado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: <DollarSign className="h-5 w-5" /> },
  ];

  return (
    <DashboardLayout type="ong">
      <PageHeader title="Painel da ONG" description="Visão geral da sua organização" icon={<LayoutDashboard className="h-6 w-6" />} />
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <span className="text-primary">{c.icon}</span>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{c.value}</p></CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
