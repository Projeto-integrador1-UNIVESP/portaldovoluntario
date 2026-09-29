import { useReducedMotion } from "motion/react";
import { TINTAS } from "@/components/common/CauseTag";
import { Marquee } from "@/components/common/Marquee";
import { CAUSAS, type Causa } from "@/lib/constants/causas";
import { capaDaCausa } from "@/lib/capasPorCausa";


/**
 * Faixa com as causas atendidas, cada uma com a miniatura da foto da causa.
 *
 * Os chips não são links: a listagem filtra por estado interno, e um link
 * dentro do clone `aria-hidden` do marquee seria focável sem ser anunciado.
 * Quem pediu menos movimento vê os chips parados, em linhas: uma faixa
 * rolável sem nada focável dentro é barreira para teclado.
 */
export function MarqueeDeCausas() {
  const reduzido = useReducedMotion();
  const chips = CAUSAS.map((causa, i) => (
    <ChipDeCausa key={causa} causa={causa} tinta={TINTAS[i % TINTAS.length]} />
  ));

  return (
    <section className="border-y bg-tinta-creme/50 py-10 md:py-12" aria-labelledby="titulo-causas">
      <p id="titulo-causas" className="rotulo-caps container">
        Causas atendidas
      </p>
      {reduzido ? (
        <div className="container mt-5 flex flex-wrap gap-3">{chips}</div>
      ) : (
        <Marquee rotulo="Causas atendidas" duracao={44} className="mt-5">
          {chips}
        </Marquee>
      )}
    </section>
  );
}

function ChipDeCausa({ causa, tinta }: { causa: Causa; tinta: string }) {
  const foto = capaDaCausa(causa);

  return (
    <span className="inline-flex items-center gap-3 rounded-full border bg-card py-1.5 pl-1.5 pr-5 shadow-sutil">
      {foto ? (
        <img
          src={foto.src}
          srcSet={foto.srcSet}
          sizes="44px"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-11 w-11 rounded-full object-cover"
        />
      ) : (
        // Causa ainda sem foto: disco tintado com a inicial, em vez de repetir
        // a mesma imagem genérica em cinco chips.
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full font-display text-lg font-semibold text-foreground ${tinta}`}
          aria-hidden="true"
        >
          {causa.charAt(0)}
        </span>
      )}
      <span className="whitespace-nowrap font-display text-lg font-semibold">{causa}</span>
    </span>
  );
}
