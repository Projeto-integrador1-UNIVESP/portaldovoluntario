import { Contador } from "@/components/common/Contador";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Stats = {
  ongs: number;
  projetos: number;
  itensArrecadados: number;
  valorArrecadado: number;
};

/** Piso de prova social: "1 ONG ativa" avisa que ninguém usa, então some. */
export const PISO_DE_NUMEROS = 6;

/**
 * Números da plataforma, sem card: só o valor em Fraunces, a legenda em caixa
 * alta e uma linha tintada entre eles. Cada legenda diz o que o número mede.
 */
export function FaixaDeNumeros({ stats, className }: { stats: Stats; className?: string }) {
  const itens = [
    { valor: stats.ongs, rotulo: stats.ongs === 1 ? "ONG cadastrada" : "ONGs cadastradas" },
    { valor: stats.projetos, rotulo: stats.projetos === 1 ? "projeto com pedidos abertos" : "projetos com pedidos abertos" },
    { valor: stats.itensArrecadados, rotulo: "itens que chegaram e a ONG confirmou" },
    { valor: stats.valorArrecadado, rotulo: "em dinheiro, confirmado por quem recebeu", moeda: true },
  ].filter((i) => i.valor > 0);

  if (itens.length < 3) return null;

  return (
    <section aria-label="Números da plataforma" className={cn("border-y", className)}>
      <div
        className={cn(
          "container grid grid-cols-2 gap-y-10 py-10 md:py-12",
          itens.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3",
        )}
      >
        {itens.map((item, i) => (
          <div
            key={item.rotulo}
            className={cn(
              "px-5 first:pl-0",
              // Linha vertical entre os números: no celular só na 2ª coluna.
              i % 2 === 1 && "border-l",
              i > 0 && "md:border-l",
            )}
          >
            <p className="numero font-display text-2xl-fluido font-semibold leading-none tracking-[-0.02em] text-primary">
              <Contador
                valor={item.valor}
                formatar={item.moeda ? (n) => formatCurrency(Math.round(n)) : undefined}
              />
            </p>
            <p className="rotulo-caps mt-3 max-w-[14rem] normal-case tracking-normal">{item.rotulo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
