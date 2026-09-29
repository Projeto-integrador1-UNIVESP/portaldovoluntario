import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Confirmacao } from "@/components/common/LinhaDoTempoConfirmacoes";

const num = (v: unknown) => Number(v ?? 0);

/**
 * Histórico de doações de um projeto, para a linha do tempo pública.
 *
 * A RLS de `doacoes` não libera leitura para visitante anônimo, e com razão:
 * a linha guarda nome e e-mail de quem doou. Por isso o histórico vem da RPC
 * pública, que devolve só o que cabe numa prestação de contas e respeita a
 * escolha de quem pediu para doar anonimamente.
 */
export function useConfirmacoes(idProjeto: string | undefined) {
  return useQuery({
    queryKey: ["confirmacoes", idProjeto],
    queryFn: async (): Promise<Confirmacao[]> => {
      const { data, error } = await supabase.rpc("get_confirmacoes_projeto", {
        _projeto_id: idProjeto!,
        _limite: 8,
      });
      if (error) throw error;

      return (data ?? []).map((d) => ({
        id: d.id,
        quantidade: d.quantidade === null ? null : num(d.quantidade),
        valor: num(d.valor),
        confirmadaEm: d.confirmada_em,
        dataDoacao: d.data_doacao,
        anonima: d.anonima,
        doadorNome: d.doador_nome,
        necessidadeNome: d.necessidade_nome,
        unidade: d.necessidade_unidade,
      }));
    },
    enabled: Boolean(idProjeto),
    staleTime: 60_000,
    retry: false,
  });
}
