import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, LayoutDashboard } from "lucide-react";

export function PublicHeader() {
  const { user, role, signOut } = useAuth();

  const getDashboardLink = () => {
    if (role === "admin") return "/admin";
    if (role === "ong") return "/ong";
    return "/";
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">Solidariedade</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Projetos
          </Link>
          <Link to="/ongs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            ONGs
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {(role === "admin" || role === "ong") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to={getDashboardLink()}>
                    <LayoutDashboard className="h-4 w-4 mr-1" />
                    Painel
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/cadastro">Cadastrar</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
