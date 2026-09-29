import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const num = (v: unknown) => Number(v ?? 0);

export type NecessidadeUrgente = {
  id: string;
  nome: string;
  tipo: "item" | "dinheiro";
  unidade: string | null;
  meta: number;
  arrecadado: number;
  urgencia: number;
  prazo: string | null;
  projeto: { id: string; slug: string | null; nome_projeto: string } | null;
  ong: { nome: string; slug: string | null } | null;
};

/**
 * Dados da home numa chamada por bloco.
 *
 * As necessidades urgentes substituem o antigo carrossel de "notícias", que
 * era texto motivacional fixo sem link para lugar nenhum. Aqui o destaque é
 * o que de fato está faltando agora.
 */
export function useHome() {
  return useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [{ data: stats }, { data: necessidades }, { data: ongs }] = await Promise.all([
        supabase.rpc("get_public_home_stats"),
        supabase
          .from("necessidades")
          .select("id, nome, tipo, unidade, meta, arrecadado, urgencia, prazo, id_projeto")
          .eq("status", true)
          .order("urgencia", { ascending: false })
          .limit(6),
        supabase
          .from("ongs")
          .select("id, slug, nome, descricao, missao, cidade, estado, img_url, logo_url, img_capa, capa_url, verificada_em, instagram, site")
          .eq("status", true)
          .limit(4),
      ]);

      const idsProjetos = [...new Set((necessidades ?? []).map((n) => n.id_projeto))];
      const { data: projetos } = idsProjetos.length
        ? await supabase
            .from("projetos")
            .select("id, slug, nome_projeto, id_ong")
            .in("id", idsProjetos)
        : { data: [] };

      const idsOngs = [...new Set((projetos ?? []).map((p) => p.id_ong))];
      const { data: ongsDasNecessidades } = idsOngs.length
        ? await supabase.from("ongs").select("id, nome, slug").in("id", idsOngs)
        : { data: [] };

      const porProjeto = new Map((projetos ?? []).map((p) => [p.id, p]));
      const porOng = new Map((ongsDasNecessidades ?? []).map((o) => [o.id, o]));

      const urgentes: NecessidadeUrgente[] = (necessidades ?? [])
        .map((n) => {
          const projeto = porProjeto.get(n.id_projeto) ?? null;
          return {
            id: n.id,
            nome: n.nome,
            tipo: n.tipo as "item" | "dinheiro",
            unidade: n.unidade,
            meta: num(n.meta),
            arrecadado: num(n.arrecadado),
            urgencia: n.urgencia,
            prazo: n.prazo,
            projeto: projeto
              ? { id: projeto.id, slug: projeto.slug, nome_projeto: projeto.nome_projeto }
              : null,
            ong: projeto ? porOng.get(projeto.id_ong) ?? null : null,
          };
        })
        // Uma meta já batida não é urgência; sai do destaque.
        .filter((n) => n.arrecadado < n.meta);

      const s = stats?.[0];
      return {
        stats: {
          projetos: num(s?.projetos),
          ongs: num(s?.ongs),
          voluntarios: num(s?.voluntarios),
          itensArrecadados: num(s?.itens_arrecadados),
          valorArrecadado: num(s?.valor_arrecadado),
        },
        urgentes,
        ongs: ongs ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
