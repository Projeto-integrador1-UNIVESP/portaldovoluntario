import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Necessidade } from "@/components/common/NeedItem";

/** O PostgREST devolve numeric como string em alguns caminhos. */
const num = (v: unknown) => Number(v ?? 0);

export type OngDoProjeto = {
  id: string;
  nome: string;
  slug: string | null;
  cidade: string | null;
  estado: string | null;
  pix: string | null;
  pix_nome_recebedor: string | null;
  banco: string | null;
  agencia: number | null;
  conta: number | null;
  verificada_em: string | null;
  endereco_entrega: string | null;
  horarios_recebimento: string | null;
};

export type ProjetoPublico = {
  id: string;
  slug: string | null;
  nome_projeto: string;
  descricao: string | null;
  img_url: string | null;
  capa_url: string | null;
  cidade: string | null;
  causa: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  ong: OngDoProjeto | null;
  necessidades: Necessidade[];
};

/**
 * Busca um projeto por slug ou por id — as duas formas convivem para que os
 * links antigos, que usavam o UUID, continuem funcionando.
 */
export async function buscarProjeto(identificador: string): Promise<ProjetoPublico | null> {
  const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    identificador,
  );

  const { data, error } = await supabase
    .from("projetos")
    .select(
      "id, slug, nome_projeto, descricao, img_url, capa_url, cidade, causa, data_inicio, data_fim, id_ong",
    )
    .eq(ehUuid ? "id" : "slug", identificador)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [{ data: ong }, { data: necessidades }] = await Promise.all([
    supabase
      .from("ongs")
      .select(
        "id, nome, slug, cidade, estado, pix, pix_nome_recebedor, banco, agencia, conta, verificada_em, endereco_entrega, horarios_recebimento",
      )
      .eq("id", data.id_ong)
      .maybeSingle(),
    supabase
      .from("necessidades")
      .select("id, tipo, nome, categoria, unidade, meta, arrecadado, urgencia, prazo")
      .eq("id_projeto", data.id)
      .eq("status", true)
      .order("urgencia", { ascending: false }),
  ]);

  return {
    ...data,
    ong: (ong as OngDoProjeto) ?? null,
    necessidades: (necessidades ?? []).map((n) => ({
      ...n,
      tipo: n.tipo as "item" | "dinheiro",
      meta: num(n.meta),
      arrecadado: num(n.arrecadado),
    })),
  };
}

export const useProjeto = (identificador: string | undefined) =>
  useQuery({
    queryKey: ["projeto", identificador],
    queryFn: () => buscarProjeto(identificador!),
    enabled: Boolean(identificador),
  });
