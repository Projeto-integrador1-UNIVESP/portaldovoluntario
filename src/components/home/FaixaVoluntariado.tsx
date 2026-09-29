import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FOTOS } from "@/lib/fotos";

/**
 * Faixa de voluntariado: foto de ponta a ponta sob um véu marinho, título em
 * creme e uma ação de contorno. A seção já ocupa a largura toda, então não
 * precisa de `.sangria`; o véu a 80% garante o contraste sobre qualquer foto.
 */
export function FaixaVoluntariado() {
  return (
    <section className="relative isolate overflow-hidden bg-primary" aria-labelledby="titulo-voluntariado">
      <img
        src={FOTOS.voluntariado.src}
        srcSet={FOTOS.voluntariado.srcSet}
        sizes="100vw"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-primary/80" aria-hidden="true" />

      <div className="container py-20 text-primary-foreground md:py-28">
        <p className="rotulo-caps text-primary-foreground">Voluntariado</p>
        <h2 id="titulo-voluntariado" className="mt-3 max-w-2xl font-display text-2xl-fluido font-semibold">
          Separar doações num sábado de manhã também conta.
        </h2>
        <p className="mt-4 max-w-xl text-base text-primary-foreground/85">
          Várias organizações precisam de gente para triar roupas, montar cestas e
          acompanhar entregas. Escolha um projeto e se inscreva; a ONG responde pelo painel.
        </p>
        <Button
          variant="outline"
          size="lg"
          asChild
          className="pressionavel mt-8 border-primary-foreground/50 bg-transparent text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-primary-foreground focus-visible:ring-offset-primary"
        >
          <Link to="/projetos">Ver projetos com vagas</Link>
        </Button>
      </div>
    </section>
  );
}
