import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reputação da ONG medida pelo comportamento dela, não por autodeclaração.
 *
 * Vai por RPC porque a RLS de `doacoes` — corretamente — não deixa visitante
 * anônimo ler doação individual. A função devolve só os agregados, então o
 * dado que sustenta a tese do produto fica visível justamente para quem
 * precisa dele: quem está decidindo se confia.
 */
export function useTaxaConfirmacao(idOng: string | undefined) {
  return useQuery({
    queryKey: ["taxa-confirmacao", idOng],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_taxa_confirmacao_ong", {
        _ong_id: idOng!,
      });
      if (error) throw error;

      const linha = data?.[0];
      if (!linha) return null;

      return {
        confirmadas: Number(linha.confirmadas ?? 0),
        total: Number(linha.total ?? 0),
        diasMedio: linha.dias_medio_para_confirmar === null
          ? null
          : Number(linha.dias_medio_para_confirmar),
      };
    },
    enabled: Boolean(idOng),
    staleTime: 5 * 60 * 1000,
    // Falha aqui não pode derrubar a página: a reputação é um reforço, não o
    // conteúdo principal.
    retry: false,
  });
}
