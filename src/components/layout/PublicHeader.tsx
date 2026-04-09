import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart, LogOut, LayoutDashboard, Building2, Users, FolderOpen,
  DollarSign, UserCheck, User, ChevronDown,
} from "lucide-react";

const adminLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "ONGs", href: "/admin/ongs", icon: Building2 },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  { label: "Projetos", href: "/admin/projetos", icon: FolderOpen },
  { label: "Doações", href: "/admin/doacoes", icon: DollarSign },
  { label: "Voluntários", href: "/admin/voluntarios", icon: UserCheck },
];

const ongLinks = [
  { label: "Dashboard", href: "/ong", icon: LayoutDashboard },
  { label: "Projetos", href: "/ong/projetos", icon: FolderOpen },
  { label: "Membros", href: "/ong/membros", icon: Users },
  { label: "Doações", href: "/ong/doacoes", icon: DollarSign },
];

export function PublicHeader() {
  const { user, role, profile, signOut } = useAuth();

  const panelLinks = role === "admin" ? adminLinks : role === "ong" ? ongLinks : [];

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {profile?.nome?.split(" ")[0] || "Minha conta"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{profile?.nome || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {panelLinks.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Painel {role === "admin" ? "Administrativo" : "da ONG"}
                    </DropdownMenuLabel>
                    {panelLinks.map((link) => (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link to={link.href} className="flex items-center gap-2 cursor-pointer">
                          <link.icon className="h-4 w-4" />
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
