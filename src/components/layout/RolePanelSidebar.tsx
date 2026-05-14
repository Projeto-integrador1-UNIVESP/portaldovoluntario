import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, Users, FolderOpen, DollarSign,
  UserCheck, Calendar, ChevronLeft, ChevronRight, Shield, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "ONGs", href: "/admin/ongs", icon: Building2 },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  { label: "Projetos", href: "/admin/projetos", icon: FolderOpen },
  { label: "Eventos", href: "/admin/eventos", icon: Calendar },
  { label: "Doações", href: "/admin/doacoes", icon: DollarSign },
  { label: "Voluntários", href: "/admin/voluntarios", icon: UserCheck },
  { label: "Auditoria", href: "/admin/auditoria", icon: ShieldCheck },
];

const ongLinks = [
  { label: "Dashboard", href: "/ong", icon: LayoutDashboard },
  { label: "Projetos", href: "/ong/projetos", icon: FolderOpen },
  { label: "Voluntários", href: "/ong/voluntarios", icon: UserCheck },
  { label: "Membros", href: "/ong/membros", icon: Users },
  { label: "Doações", href: "/ong/doacoes", icon: DollarSign },
  { label: "Auditoria", href: "/ong/auditoria", icon: ShieldCheck },
];

export function RolePanelSidebar() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const links = role === "admin" ? adminLinks : role === "ong" ? ongLinks : [];
  if (!links.length) return null;

  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-16 self-start flex-col bg-card border-r border-border transition-all duration-200 h-[calc(100vh-4rem)] z-40",
        collapsed ? "w-14" : "w-60"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Painel {role === "admin" ? "Admin" : "ONG"}
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto p-1 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Recolher painel"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              title={link.label}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}