import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

const colunas = [
  {
    titulo: "A plataforma",
    links: [
      { label: "Sobre", to: "/sobre" },
      { label: "Como funciona", to: "/como-funciona" },
      { label: "Projetos", to: "/projetos" },
      { label: "ONGs", to: "/ongs" },
    ],
  },
  {
    titulo: "Para ONGs",
    links: [
      { label: "Cadastrar minha ONG", to: "/cadastro" },
      { label: "Entrar", to: "/login" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { label: "Política de Privacidade", to: "/privacidade" },
      { label: "Termos de Uso", to: "/termos" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="container py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              Pedidos publicados por ONGs verificadas. Você doa direto para elas, sem taxa.
            </p>
          </div>

          {colunas.map((coluna) => (
            <nav key={coluna.titulo} aria-label={coluna.titulo}>
              <h2 className="text-sm font-semibold">{coluna.titulo}</h2>
              <ul className="mt-3 space-y-2">
                {coluna.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Voluntá. Projeto Integrador da Univesp.
        </div>
      </div>
    </footer>
  );
}
