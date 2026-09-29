import {
  Building2, Calendar, DollarSign, FolderOpen, KeyRound, Package, ShieldCheck,
  Home, UserCheck, Users, type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/**
 * Fonte única de navegação dos painéis.
 *
 * Antes existiam três listas paralelas, em PublicHeader, DashboardLayout e
 * RolePanelSidebar, e as três já estavam dessincronizadas entre si (o header
 * não tinha Auditoria nem Códigos; a sidebar não tinha Códigos). Todas passam
 * a ler daqui.
 *
 * O primeiro item de cada lista é a raiz do painel: o layout usa isso para o
 * rótulo do breadcrumb e para o link de "Início".
 */
export const adminNav: NavItem[] = [
  { label: "Início", href: "/admin", icon: Home },
  { label: "ONGs", href: "/admin/ongs", icon: Building2 },
  { label: "Doações", href: "/admin/doacoes", icon: DollarSign },
  { label: "Projetos", href: "/admin/projetos", icon: FolderOpen },
  { label: "Voluntários", href: "/admin/voluntarios", icon: UserCheck },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  { label: "Eventos", href: "/admin/eventos", icon: Calendar },
  { label: "Auditoria", href: "/admin/auditoria", icon: ShieldCheck },
  { label: "Chaves de acesso", href: "/admin/codigos", icon: KeyRound },
];

export const ongNav: NavItem[] = [
  { label: "Início", href: "/ong", icon: Home },
  { label: "Doações", href: "/ong/doacoes", icon: DollarSign },
  { label: "Necessidades", href: "/ong/necessidades", icon: Package },
  { label: "Projetos", href: "/ong/projetos", icon: FolderOpen },
  { label: "Voluntários", href: "/ong/voluntarios", icon: UserCheck },
  { label: "Membros", href: "/ong/membros", icon: Users },
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
