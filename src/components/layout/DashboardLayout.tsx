import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminNav, ongNav } from "@/lib/navigation";

export function DashboardLayout({ children, type }: { children: ReactNode; type: "admin" | "ong" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const nav = type === "admin" ? adminNav : ongNav;

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-sidebar-border">
          <Heart className="h-6 w-6" />
          <span className="font-bold text-lg">Solidariedade</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4 mr-3" />
            Ir ao site
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 bg-background">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
