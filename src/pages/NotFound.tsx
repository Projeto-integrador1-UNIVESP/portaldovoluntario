import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";

const atalhos = [
  { to: "/projetos", label: "Ver projetos abertos" },
  { to: "/ongs", label: "Conhecer as ONGs" },
  { to: "/como-funciona", label: "Como funciona" },
];

const NotFound = () => {
  const location = useLocation();

  return (
    <PublicShell>
      <Seo title="Página não encontrada" noIndex />
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-14 text-center">
        <Compass className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <p className="mt-6 text-sm font-medium text-muted-foreground">Erro 404</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Esta página não existe</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          O endereço <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{location.pathname}</code>{" "}
          não leva a nada. O endereço pode ter mudado, ou o link chegou incompleto.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="pressionavel">
            <Link to="/">Voltar ao início</Link>
          </Button>
          {atalhos.map((atalho) => (
            <Button key={atalho.to} variant="outline" asChild className="pressionavel">
              <Link to={atalho.to}>{atalho.label}</Link>
            </Button>
          ))}
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
};

export default NotFound;
