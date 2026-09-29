import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogOut, Menu, User, ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { menuPublico, navPorRole } from "@/lib/navigation";

export function PublicHeader() {
  const { user, role, profile, signOut } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  const panelLinks = navPorRole(role);

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link to="/" aria-label="Voluntá, página inicial">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação principal">
          {menuPublico.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="cta" size="sm" asChild className="pressionavel shadow-cta">
            <Link to="/projetos">Doar</Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">
                    {profile?.nome?.split(" ")[0] || "Minha conta"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
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
                        <Link to={link.href} className="flex cursor-pointer items-center gap-2">
                          <link.icon className="h-4 w-4" aria-hidden="true" />
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/cadastro">Criar conta</Link>
              </Button>
            </div>
          )}

          {/* Antes de existir este Sheet, abaixo de 768px a navegação
              simplesmente desaparecia e só dava para rolar a home. */}
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>

              <nav className="mt-6 flex flex-col gap-1" aria-label="Navegação principal">
                {menuPublico.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMenuAberto(false)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="rounded-md px-3 py-2 text-base font-medium hover:bg-accent aria-[current=page]:bg-accent"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 space-y-2 border-t pt-6">
                <Button variant="cta" asChild className="w-full" onClick={() => setMenuAberto(false)}>
                  <Link to="/projetos">Doar</Link>
                </Button>

                {!user && (
                  <>
                    <Button variant="outline" asChild className="w-full" onClick={() => setMenuAberto(false)}>
                      <Link to="/login">Entrar</Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full" onClick={() => setMenuAberto(false)}>
                      <Link to="/cadastro">Criar conta</Link>
                    </Button>
                  </>
                )}
              </div>

              {panelLinks.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <p className="px-3 text-xs font-medium text-muted-foreground">
                    Painel {role === "admin" ? "Administrativo" : "da ONG"}
                  </p>
                  <nav className="mt-2 flex flex-col gap-1" aria-label="Painel">
                    {panelLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setMenuAberto(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                      >
                        <link.icon className="h-4 w-4" aria-hidden="true" />
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
