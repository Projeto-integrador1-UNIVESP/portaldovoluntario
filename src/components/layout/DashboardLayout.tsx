import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { OngAvatar } from "@/components/common/OngAvatar";
import { SeloVerificada } from "@/components/common/SeloVerificada";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { adminNav, ongNav, type NavItem } from "@/lib/navigation";

type TipoDePainel = "admin" | "ong";

const ROTULO: Record<TipoDePainel, string> = {
  admin: "Painel administrativo",
  ong: "Painel da ONG",
};

/**
 * Chave das pendências do menu. As telas que mudam o estado de uma doação ou
 * de uma inscrição invalidam esta chave para o número do menu acompanhar.
 */
export const CHAVE_PENDENCIAS = ["painel-pendencias"] as const;

/** Texto para leitor de tela de cada contador, por rota. Sem o objeto: o
 *  rótulo do item já o nomeia ("Doações, 3 para confirmar"). */
const LEGENDA_PENDENCIA: Record<string, (n: number) => string> = {
  "/ong/doacoes": (n) => `${n} para confirmar`,
  "/ong/voluntarios": (n) => `${n} para responder`,
  "/admin/ongs": (n) => `${n} para verificar`,
  "/admin/doacoes": (n) => `${n} pendentes`,
};

/**
 * Painel de ONG e de administração.
 *
 * A sidebar vira um Sheet abaixo de `lg`. Ela carrega a identidade de quem está
 * logado (a ONG, com avatar e selo; ou a pessoa, no admin) e o número de
 * pendências ao lado das seções que exigem ação. As consultas daqui são
 * acessórias: se falharem, o painel continua inteiro, só sem o nome e sem o
 * número.
 */
export function DashboardLayout({
  children,
  type,
}: {
  children: ReactNode;
  type: TipoDePainel;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  const nav = type === "admin" ? adminNav : ongNav;
  const raiz = nav[0];
  const secao = nav.find((item) => item.href === pathname && item.href !== raiz.href);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <ConteudoDaBarra type={type} nav={nav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu do painel">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-0 bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">Menu do {ROTULO[type].toLowerCase()}</SheetTitle>
              <ConteudoDaBarra type={type} nav={nav} aoNavegar={() => setMenuAberto(false)} />
            </SheetContent>
          </Sheet>

          <nav aria-label="Onde você está" className="min-w-0 text-sm">
            <ol className="flex min-w-0 items-center gap-2">
              <li className="min-w-0 truncate">
                {secao ? (
                  <Link to={raiz.href} className="text-muted-foreground hover:text-foreground">
                    {ROTULO[type]}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground" aria-current="page">
                    {ROTULO[type]}
                  </span>
                )}
              </li>
              {secao && (
                <>
                  <li aria-hidden="true" className="text-muted-foreground/60">/</li>
                  <li className="truncate font-semibold text-foreground" aria-current="page">
                    {secao.label}
                  </li>
                </>
              )}
            </ol>
          </nav>
        </header>

        <main className="min-w-0 flex-1">
          <div className="container py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ConteudoDaBarra({
  type,
  nav,
  aoNavegar,
}: {
  type: TipoDePainel;
  nav: NavItem[];
  aoNavegar?: () => void;
}) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const pendencias = usePendencias(type);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        {/* A mesma marca do site, herdando a cor da tinta. */}
        <Link
          to="/"
          className="inline-flex text-sidebar-foreground [&_*]:text-inherit"
          aria-label="Voluntá, ir ao site"
        >
          <Logo monocromatico />
        </Link>
      </div>

      <Identidade type={type} />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Seções do painel">
        {nav.map((item) => {
          const ativo = pathname === item.href;
          const pendente = pendencias?.[item.href] ?? 0;
          const legenda = LEGENDA_PENDENCIA[item.href];
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={aoNavegar}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-controle px-3 py-2 text-sm font-medium transition-colors duration-150",
                ativo
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-cta"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {pendente > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="numero rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-sidebar-primary-foreground"
                  >
                    {pendente > 99 ? "99+" : pendente}
                  </span>
                  {legenda && <span className="sr-only">, {legenda(pendente)}</span>}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          asChild
        >
          <Link to="/" onClick={aoNavegar}>
            <ExternalLink aria-hidden="true" />
            Ver o site
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut aria-hidden="true" />
          Sair
        </Button>
      </div>
    </div>
  );
}

/** Quem está no painel: a ONG (com selo) ou a pessoa da administração. */
function Identidade({ type }: { type: TipoDePainel }) {
  const { ongId, profile, user } = useAuth();
  const { data: ong } = useQuery({
    queryKey: ["painel-ong", ongId],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("ongs")
          .select("id, nome, logo_url, img_url, verificada_em")
          .eq("id", ongId!)
          .maybeSingle();
        return data ?? null;
      } catch {
        return null;
      }
    },
    enabled: type === "ong" && Boolean(ongId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (type === "admin") {
    const nome = (profile?.nome as string | undefined) || user?.email || "";
    return (
      <div className="mx-3 rounded-xl bg-sidebar-accent/50 px-3 py-3">
        <p className="rotulo-caps text-sidebar-foreground/70">Administração</p>
        {nome && <p className="mt-1 truncate text-sm font-semibold">{nome}</p>}
      </div>
    );
  }

  return (
    <div className="mx-3 flex items-center gap-3 rounded-xl bg-sidebar-accent/50 px-3 py-3">
      <OngAvatar
        nome={ong?.nome ?? ROTULO.ong}
        logoUrl={ong?.logo_url}
        imgUrl={ong?.img_url}
        tamanho="sm"
        className="border-sidebar-border"
      />
      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold leading-tight">
          {ong?.nome ?? ROTULO.ong}
        </p>
        {ong && (
          // O selo tem cor verde escura, feita para o papel: sobre a tinta
          // marinho ele precisa de um fundo claro por baixo.
          <span className="mt-1.5 inline-flex rounded-full bg-sidebar-primary px-2 py-0.5">
            <SeloVerificada verificadaEm={ong.verificada_em} mostrarPendente />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Pendências por rota: doações aguardando confirmação e inscrições sem resposta
 * (ONG); ONGs sem verificação e doações pendentes (admin). Inscrição com
 * `status` nulo é pendente, como a tela de voluntários trata.
 */
function usePendencias(type: TipoDePainel): Record<string, number> | undefined {
  const { ongId } = useAuth();
  const { data } = useQuery({
    queryKey: [...CHAVE_PENDENCIAS, type, ongId],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        if (type === "ong") {
          const [doacoes, inscricoes] = await Promise.all([
            supabase
              .from("doacoes")
              .select("id", { count: "exact", head: true })
              .eq("id_ong", ongId!)
              .eq("status", "pendente"),
            supabase
              .from("voluntariado")
              .select("id, projetos!inner(id_ong)", { count: "exact", head: true })
              .eq("projetos.id_ong", ongId!)
              .or("status.is.null,status.eq.pendente"),
          ]);
          return {
            "/ong/doacoes": doacoes.count ?? 0,
            "/ong/voluntarios": inscricoes.count ?? 0,
          };
        }
        const [ongs, doacoes] = await Promise.all([
          supabase.from("ongs").select("id", { count: "exact", head: true }).is("verificada_em", null),
          supabase.from("doacoes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        ]);
        return {
          "/admin/ongs": ongs.count ?? 0,
          "/admin/doacoes": doacoes.count ?? 0,
        };
      } catch {
        return {};
      }
    },
    enabled: type === "admin" || Boolean(ongId),
    staleTime: 60_000,
    retry: false,
  });
  return data;
}
