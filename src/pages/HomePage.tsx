import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { Hero } from "@/components/home/Hero";
import { FaixaDeNumeros, PISO_DE_NUMEROS } from "@/components/home/FaixaDeNumeros";
import { OQueFalta } from "@/components/home/OQueFalta";
import { MarqueeDeCausas } from "@/components/home/MarqueeDeCausas";
import { ComoAContaFecha } from "@/components/home/ComoAContaFecha";
import { Organizacoes } from "@/components/home/Organizacoes";
import { FaixaVoluntariado } from "@/components/home/FaixaVoluntariado";
import { useHome, useUltimaConfirmacao } from "@/hooks/queries/useHome";

/**
 * Página inicial.
 *
 * O destaque é o que está faltando agora, com pedidos reais; a tese da
 * plataforma aparece uma vez, demonstrada numa doação que aconteceu.
 */
export default function HomePage() {
  const { data, isPending, isError, refetch } = useHome();
  const confirmacao = useUltimaConfirmacao();

  const stats = data?.stats;
  const mostrarNumeros =
    Boolean(stats) && stats!.ongs + stats!.projetos + stats!.voluntarios >= PISO_DE_NUMEROS;

  return (
    <PublicShell>
      <Seo description="Veja o que as ONGs perto de você estão pedindo agora: quantidade, prazo e o que já chegou. Doe itens, dinheiro ou tempo direto para a organização, sem taxa." />

      <Hero
        pedido={data?.urgentes[0] ?? null}
        confirmacao={confirmacao.isPending ? undefined : confirmacao.data ?? null}
        carregando={isPending}
      />

      {mostrarNumeros && <FaixaDeNumeros stats={stats!} />}

      <OQueFalta pedidos={data?.urgentes} isPending={isPending} isError={isError} onRetry={() => refetch()} />

      <MarqueeDeCausas />

      <ComoAContaFecha confirmacao={confirmacao.data ?? null} carregando={confirmacao.isPending} />

      <Organizacoes ongs={data?.ongs} isPending={isPending} isError={isError} onRetry={() => refetch()} />

      <FaixaVoluntariado />

      <Footer className="mt-0" />
    </PublicShell>
  );
}
