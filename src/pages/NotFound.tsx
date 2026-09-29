import { Link, useLocation } from "react-router-dom";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { Ilustracao } from "@/components/common/Ilustracao";
import { Button } from "@/components/ui/button";

const atalhos = [
  { to: "/projetos", label: "Ver o que está faltando" },
  { to: "/ongs", label: "Conhecer as ONGs" },
  { to: "/como-funciona", label: "Como funciona" },
];

const NotFound = () => {
  const location = useLocation();

  return (
    <PublicShell>
      <Seo title="Página não encontrada" noIndex />
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-14 text-center md:py-20">
        <Ilustracao nome="perdido" className="h-32 md:h-40" />
        <p className="rotulo-caps mt-8">Erro 404</p>
        <h1 className="mt-2 font-display text-2xl-fluido font-bold">Esta página não existe</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          O endereço{" "}
          <code className="rounded-sm bg-muted px-1.5 py-0.5 text-sm text-foreground">
            {location.pathname}
          </code>{" "}
          não leva a nada. Ele pode ter mudado, ou o link chegou incompleto.
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
