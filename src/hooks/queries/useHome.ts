import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { progressoPercent } from "@/lib/format";

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
  projeto: {
    id: string;
    slug: string | null;
    nome_projeto: string;
    /** Causa do projeto, para a foto de capa quando ele não tem a própria. */
    causa?: string | null;
    /** Capa do projeto (`capa_url`, ou a antiga `img_url`). */
    capa?: string | null;
  } | null;
  ong: { nome: string; slug: string | null } | null;
};

/**
 * Dados da home numa chamada por bloco.
 *
 * As necessidades urgentes substituem o antigo carrossel de "notícias", que
 * era texto motivacional fixo sem link para lugar nenhum. Aqui o destaque é
 * o que está faltando agora.
 */
export function useHome() {
  return useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [stats, necessidades, ongs] = await Promise.all([
        supabase.rpc("get_public_home_stats"),
        supabase
          .from("necessidades")
          .select("id, nome, tipo, unidade, meta, arrecadado, urgencia, prazo, id_projeto")
          .eq("status", true)
          .order("urgencia", { ascending: false })
          .limit(6),
        supabase
          .from("ongs")
          .select("id, slug, nome, descricao, missao, cidade, estado, causas, img_url, logo_url, img_capa, capa_url, verificada_em, instagram, site")
          .eq("status", true)
          .limit(4),
      ]);

      // O supabase-js não lança: sem isto, `isError` nunca ficava true e a
      // home sem rede dizia "Nenhuma ONG cadastrada ainda", o que é falso.
      // Os números são complemento: se falharem, a faixa só não aparece.
      if (necessidades.error) throw necessidades.error;
      if (ongs.error) throw ongs.error;

      const idsProjetos = [...new Set((necessidades.data ?? []).map((n) => n.id_projeto))];
      const { data: projetos } = idsProjetos.length
        ? await supabase
            .from("projetos")
            .select("id, slug, nome_projeto, id_ong, causa, capa_url, img_url")
            .in("id", idsProjetos)
        : { data: [] };

      const idsOngs = [...new Set((projetos ?? []).map((p) => p.id_ong))];
      const { data: ongsDasNecessidades } = idsOngs.length
        ? await supabase.from("ongs").select("id, nome, slug").in("id", idsOngs)
        : { data: [] };

      const porProjeto = new Map((projetos ?? []).map((p) => [p.id, p]));
      const porOng = new Map((ongsDasNecessidades ?? []).map((o) => [o.id, o]));

      const urgentes: NecessidadeUrgente[] = (necessidades.data ?? [])
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
              ? {
                  id: projeto.id,
                  slug: projeto.slug,
                  nome_projeto: projeto.nome_projeto,
                  causa: projeto.causa,
                  capa: projeto.capa_url ?? projeto.img_url ?? null,
                }
              : null,
            ong: projeto ? porOng.get(projeto.id_ong) ?? null : null,
          };
        })
        // Uma meta já batida não é urgência; sai do destaque.
        .filter((n) => n.arrecadado < n.meta);

      const s = stats.data?.[0];
      return {
        stats: {
          projetos: num(s?.projetos),
          ongs: num(s?.ongs),
          voluntarios: num(s?.voluntarios),
          itensArrecadados: num(s?.itens_arrecadados),
          valorArrecadado: num(s?.valor_arrecadado),
        },
        urgentes,
        ongs: ongs.data ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Uma doação que a ONG já confirmou ter recebido, com o efeito dela na barra. */
export type UltimaConfirmacao = {
  id: string;
  /** Primeiro nome de quem doou; nulo quando a pessoa pediu anonimato. */
  doador: string | null;
  quantidade: number | null;
  unidade: string | null;
  valor: number;
  necessidadeNome: string | null;
  dataDoacao: string;
  confirmadaEm: string;
  projeto: { id: string; slug: string | null; nome_projeto: string };
  ong: { nome: string; slug: string | null } | null;
  /** Quanto a barra do pedido andou com esta confirmação. */
  barra: {
    antes: number;
    depois: number;
    meta: number;
    arrecadado: number;
    tipo: "item" | "dinheiro";
    unidade: string | null;
  } | null;
};

/** Quantos projetos consultar atrás da confirmação. Uma chamada por projeto. */
const PROJETOS_PARA_CONFIRMACAO = 3;

/**
 * A doação confirmada mais recente da plataforma, para a linha do tempo da
 * home.
 *
 * Consulta própria, fora do `useHome`: não segura o resto da página e, se
 * falhar, vira nulo (a tela mostra um exemplo, marcado como tal). O caminho
 * segue a mesma abordagem do `useConfirmacoes`: a RLS de `doacoes` não libera
 * leitura anônima, então o histórico sai da RPC pública `get_confirmacoes_projeto`.
 * Ela é por projeto, e a amostra vem dos pedidos cujo `arrecadado` mudou por
 * último, que é o que a confirmação faz.
 */
export function useUltimaConfirmacao() {
  return useQuery({
    queryKey: ["home", "ultima-confirmacao"],
    queryFn: buscarUltimaConfirmacao,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

async function buscarUltimaConfirmacao(): Promise<UltimaConfirmacao | null> {
  try {
    const { data: pedidos } = await supabase
      .from("necessidades")
      .select("id, nome, tipo, unidade, meta, arrecadado, id_projeto")
      .gt("arrecadado", 0)
      .order("updated_at", { ascending: false })
      .limit(6);

    const idsProjetos = [...new Set((pedidos ?? []).map((p) => p.id_projeto))].slice(0, PROJETOS_PARA_CONFIRMACAO);
    if (idsProjetos.length === 0) return null;

    const [respostas, { data: projetos }] = await Promise.all([
      Promise.all(
        idsProjetos.map((id) => supabase.rpc("get_confirmacoes_projeto", { _projeto_id: id, _limite: 20 })),
      ),
      supabase.from("projetos").select("id, slug, nome_projeto, id_ong").in("id", idsProjetos),
    ]);

    const candidatas = respostas.flatMap((r, i) =>
      (r.data ?? [])
        .filter((d) => d.status === "confirmada" && d.confirmada_em)
        .map((d) => ({ d, idProjeto: idsProjetos[i] })),
    );
    candidatas.sort((a, b) => Date.parse(b.d.confirmada_em) - Date.parse(a.d.confirmada_em));

    const escolhida = candidatas[0];
    const projeto = escolhida ? (projetos ?? []).find((p) => p.id === escolhida.idProjeto) : undefined;
    if (!escolhida || !projeto) return null;
    const { d } = escolhida;

    const { data: ong } = await supabase
      .from("ongs")
      .select("id, nome, slug")
      .eq("id", projeto.id_ong)
      .maybeSingle();

    // O pedido desta doação, se estiver na amostra: é dele que sai o
    // "subiu de 24% para 31%".
    const pedido = d.necessidade_nome
      ? (pedidos ?? []).find((p) => p.id_projeto === projeto.id && p.nome === d.necessidade_nome) ?? null
      : null;
    const tipo = (pedido?.tipo ?? "item") as "item" | "dinheiro";
    const contribuicao = pedido ? (tipo === "dinheiro" ? num(d.valor) : num(d.quantidade)) : 0;

    return {
      id: d.id,
      doador: d.anonima || !d.doador_nome ? null : d.doador_nome.trim().split(/\s+/)[0],
      quantidade: d.quantidade === null ? null : num(d.quantidade),
      unidade: d.necessidade_unidade,
      valor: num(d.valor),
      necessidadeNome: d.necessidade_nome,
      dataDoacao: d.data_doacao,
      confirmadaEm: d.confirmada_em,
      projeto: { id: projeto.id, slug: projeto.slug, nome_projeto: projeto.nome_projeto },
      ong: ong ? { nome: ong.nome, slug: ong.slug } : null,
      barra:
        pedido && contribuicao > 0
          ? {
              antes: progressoPercent(num(pedido.arrecadado) - contribuicao, num(pedido.meta)),
              depois: progressoPercent(num(pedido.arrecadado), num(pedido.meta)),
              meta: num(pedido.meta),
              arrecadado: num(pedido.arrecadado),
              tipo,
              unidade: pedido.unidade,
            }
          : null,
    };
  } catch {
    return null;
  }
}
