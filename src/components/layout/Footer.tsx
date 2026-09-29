import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

const colunas = [
  {
    titulo: "Explorar",
    links: [
      { label: "Projetos", to: "/projetos" },
      { label: "ONGs", to: "/ongs" },
      { label: "Como funciona", to: "/como-funciona" },
      { label: "Sobre", to: "/sobre" },
    ],
  },
  {
    titulo: "Para ONGs",
    links: [
      { label: "Cadastrar minha ONG", to: "/cadastro?tipo=ong" },
      { label: "Entrar no painel", to: "/login" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { label: "Privacidade", to: "/privacidade" },
      { label: "Termos de uso", to: "/termos" },
    ],
  },
];

/**
 * Rodapé em tinta marinho, com grão. Sem margem superior própria: a seção
 * anterior de cada página já respira, e o bloco de cor cheia marca o fim.
 */
export function Footer() {
  return (
    <footer className="grao bg-primary text-primary-foreground">
      <div className="container py-14 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            {/* A marca fixa a cor do símbolo e do nome; sobre marinho os dois
                sumiriam. O wrapper força creme até a variante mono herdar a cor. */}
            <Logo
              monocromatico
              className="text-primary-foreground [&_span]:text-primary-foreground [&_svg]:text-primary-foreground"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground/80">
              Pedidos de ONGs verificadas, com quantidade e prazo. Você doa direto
              para elas, sem taxa.
            </p>
          </div>

          {colunas.map((coluna) => (
            <nav key={coluna.titulo} aria-label={coluna.titulo}>
              <h2 className="rotulo-caps font-sans text-primary-foreground/70">{coluna.titulo}</h2>
              <ul className="mt-4 space-y-2.5">
                {coluna.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-primary-foreground/85 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/70">
          <span>© {new Date().getFullYear()} Voluntá</span>
          <span>Projeto Integrador da Univesp</span>
        </div>
      </div>
    </footer>
  );
}
