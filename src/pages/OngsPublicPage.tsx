import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { EmptyState } from "@/components/common/EmptyState";

export default function OngsPublicPage() {
  const [ongs, setOngs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("ongs").select("*").eq("status", true).then(({ data }) => {
      if (data) setOngs(data);
    });
  }, []);

  return (
    <PublicShell>
      <Seo
        title="ONGs parceiras"
        description="Conheça as organizações da plataforma e veja como contribuir com cada uma."
      />
      <div className="container py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">ONGs parceiras</h1>
        <p className="text-muted-foreground mb-8">Conheça as organizações e contribua</p>

        {ongs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma ONG cadastrada ainda"
            description="Assim que uma organização entrar na plataforma, ela aparece aqui."
            action={{ label: "Ver projetos", to: "/projetos" }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ongs.map((o) => (
              <Card key={o.id} className="animate-fade-in hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{o.nome}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{o.descricao || "Organização parceira"}</p>
                  {o.cidade && <p className="text-xs text-muted-foreground mt-2">{o.cidade}, {o.estado}</p>}
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <Link to={`/doar/${o.id}`}>Doar <ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </PublicShell>
  );
}
