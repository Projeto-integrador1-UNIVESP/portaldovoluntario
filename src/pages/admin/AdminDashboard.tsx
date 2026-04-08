import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Building2, Users, DollarSign, FolderOpen } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ ongs: 0, usuarios: 0, projetos: 0, doacoes: 0, totalDoado: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [ongs, usuarios, projetos, doacoes] = await Promise.all([
        supabase.from("ongs").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("projetos").select("id", { count: "exact", head: true }),
        supabase.from("doacoes").select("valor"),
      ]);
      const total = doacoes.data?.reduce((s, d) => s + d.valor, 0) || 0;
      setStats({
        ongs: ongs.count || 0,
        usuarios: usuarios.count || 0,
        projetos: projetos.count || 0,
        doacoes: doacoes.data?.length || 0,
        totalDoado: total,
      });
    };
    fetch();
  }, []);

  const cards = [
    { title: "ONGs", value: stats.ongs, icon: <Building2 className="h-5 w-5" />, color: "text-primary" },
    { title: "Usuários", value: stats.usuarios, icon: <Users className="h-5 w-5" />, color: "text-success" },
    { title: "Projetos", value: stats.projetos, icon: <FolderOpen className="h-5 w-5" />, color: "text-warning" },
    { title: "Total doado", value: `R$ ${stats.totalDoado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: <DollarSign className="h-5 w-5" />, color: "text-primary" },
  ];

  return (
    <DashboardLayout type="admin">
      <PageHeader title="Painel Administrativo" description="Visão geral da plataforma" icon={<LayoutDashboard className="h-6 w-6" />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <span className={c.color}>{c.icon}</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
