import {
  Building2, Calendar, DollarSign, FolderOpen, KeyRound, ShieldCheck,
  LayoutDashboard, UserCheck, Users, type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/**
 * Fonte única de navegação dos painéis.
 *
 * Antes existiam três listas paralelas — em PublicHeader, DashboardLayout e
 * RolePanelSidebar — e as três já estavam dessincronizadas entre si (o header
 * não tinha Auditoria nem Códigos; a sidebar não tinha Códigos). Todas passam
 * a ler daqui.
 */
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "ONGs", href: "/admin/ongs", icon: Building2 },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  { label: "Projetos", href: "/admin/projetos", icon: FolderOpen },
  { label: "Eventos", href: "/admin/eventos", icon: Calendar },
  { label: "Doações", href: "/admin/doacoes", icon: DollarSign },
  { label: "Voluntários", href: "/admin/voluntarios", icon: UserCheck },
  { label: "Auditoria", href: "/admin/auditoria", icon: ShieldCheck },
  { label: "Códigos ONG", href: "/admin/codigos", icon: KeyRound },
];

export const ongNav: NavItem[] = [
  { label: "Dashboard", href: "/ong", icon: LayoutDashboard },
  { label: "Projetos", href: "/ong/projetos", icon: FolderOpen },
  { label: "Voluntários", href: "/ong/voluntarios", icon: UserCheck },
  { label: "Membros", href: "/ong/membros", icon: Users },
  { label: "Doações", href: "/ong/doacoes", icon: DollarSign },
  { label: "Auditoria", href: "/ong/auditoria", icon: ShieldCheck },
];

export const navPorRole = (role: string | null | undefined): NavItem[] =>
  role === "admin" ? adminNav : role === "ong" ? ongNav : [];

/** Itens do menu público, usados no header desktop e no Sheet mobile. */
export const menuPublico = [
  { label: "Projetos", href: "/projetos" },
  { label: "ONGs", href: "/ongs" },
  { label: "Como funciona", href: "/como-funciona" },
];
