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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Menu, ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { menuPublico, navPorRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** "/projetos/abc" acende "Projetos"; "/" só acende a si mesma. */
const estaEm = (pathname: string, href: string) =>
  pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

/**
 * Cabeçalho do site público.
 *
 * "Doar" é marinho: terracota é a cor da ação principal de cada página, e o
 * cabeçalho não pode competir com ela. O link ativo ganha uma barra embaixo,
 * não só uma cor diferente, para quem não distingue tons.
 */
export function PublicHeader() {
  const { user, role, profile, signOut } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  const panelLinks = navPorRole(role);
  const primeiroNome = profile?.nome?.split(" ")[0] as string | undefined;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link to="/" aria-label="Voluntá, página inicial" className="rounded-controle">
          <Logo />
        </Link>

        <nav className="hidden h-full items-center gap-7 md:flex" aria-label="Navegação principal">
          {menuPublico.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              aria-current={estaEm(pathname, item.href) ? "page" : undefined}
              className={cn(
                "relative flex h-full items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground",
                // A barra nasce com largura zero e cresce a partir do centro.
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 after:ease-suave aria-[current=page]:after:scale-x-100",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button size="sm" asChild>
            <Link to="/projetos">Doar</Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 pl-1.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground"
                    aria-hidden="true"
                  >
                    {(primeiroNome ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">{primeiroNome || "Minha conta"}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{profile?.nome || "Sua conta"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {panelLinks.length > 0 && (
                  <>
                    <DropdownMenuLabel className="rotulo-caps">
                      Painel {role === "admin" ? "administrativo" : "da ONG"}
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
            <div className="hidden items-center gap-1 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/cadastro">Criar conta</Link>
              </Button>
            </div>
          )}

          {/* Abaixo de 768px a navegação vive nesta gaveta. */}
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 max-w-[85vw] bg-background">
              {/* O diálogo precisa de um título para o leitor de tela; na
                  tela, a marca faz esse papel. */}
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Logo />

              <nav className="mt-8 flex flex-col gap-1" aria-label="Navegação principal">
                {menuPublico.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMenuAberto(false)}
                    aria-current={estaEm(pathname, item.href) ? "page" : undefined}
                    className="relative rounded-controle px-3 py-2.5 font-display text-lg font-semibold hover:bg-accent aria-[current=page]:bg-accent before:absolute before:bottom-2.5 before:left-0 before:top-2.5 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 aria-[current=page]:before:opacity-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-8 space-y-2 border-t pt-6">
                <Button asChild className="w-full" onClick={() => setMenuAberto(false)}>
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
                  <p className="rotulo-caps px-3">
                    Painel {role === "admin" ? "administrativo" : "da ONG"}
                  </p>
                  <nav className="mt-2 flex flex-col gap-1" aria-label="Painel">
                    {panelLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setMenuAberto(false)}
                        className="flex items-center gap-2 rounded-controle px-3 py-2 text-sm hover:bg-accent"
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
