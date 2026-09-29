import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, LogOut, Menu } from "lucide-react";
import { LogoSimbolo } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { adminNav, ongNav, type NavItem } from "@/lib/navigation";

/**
 * Painel de ONG e de administração.
 *
 * A sidebar era fixa em 256px sem nenhum tratamento responsivo: no celular ela
 * comia dois terços da tela e a tabela de doações ficava no que sobrava. Agora
 * ela vira um Sheet abaixo de `lg`, como já acontecia no site público.
 */
export function DashboardLayout({
  children,
  type,
}: {
  children: ReactNode;
  type: "admin" | "ong";
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const nav = type === "admin" ? adminNav : ongNav;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <ConteudoDaBarra nav={nav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur-sm lg:hidden">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu do painel">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 border-0 bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">
                Menu do painel {type === "admin" ? "administrativo" : "da ONG"}
              </SheetTitle>
              <ConteudoDaBarra nav={nav} aoNavegar={() => setMenuAberto(false)} />
            </SheetContent>
          </Sheet>

          <span className="font-display font-bold">
            Painel {type === "admin" ? "admin" : "da ONG"}
          </span>
        </header>

        <main className="min-w-0 flex-1">
          {/* Mesmo limite de largura do site público: sem ele, uma tabela de
              cinco colunas se esticava até a borda em monitor largo. */}
          <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ConteudoDaBarra({ nav, aoNavegar }: { nav: NavItem[]; aoNavegar?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border p-4">
        <LogoSimbolo className="h-6 w-6" monocromatico />
        <span className="font-display text-lg font-extrabold tracking-[-0.02em]">Voluntá</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Seções do painel">
        {nav.map((item) => {
          const ativo = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={aoNavegar}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                ativo
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          onClick={() => {
            aoNavegar?.();
            navigate("/");
          }}
        >
          <Home className="mr-3 h-4 w-4" aria-hidden="true" />
          Ir ao site
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-4 w-4" aria-hidden="true" />
          Sair
        </Button>
      </div>
    </div>
  );
}
