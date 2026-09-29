-- Ajustes na busca de projetos, a partir de limitações encontradas ao montar
-- a listagem:
--
--  1. Sem parâmetro de ordenação, a tela precisava buscar uma janela maior e
--     ordenar no cliente — o que dá resultado errado assim que a base cresce.
--  2. Sem os dados da necessidade principal, o card não conseguia mostrar o
--     que falta ("faltam 68 cobertores"), que é a regra central do produto.
--  3. `get_public_home_stats` contava projetos sem olhar se a ONG está ativa,
--     divergindo da listagem, que filtra.

DROP FUNCTION IF EXISTS public.buscar_projetos(TEXT, TEXT, TEXT, INT, INT);

CREATE FUNCTION public.buscar_projetos(
  _q TEXT DEFAULT NULL,
  _cidade TEXT DEFAULT NULL,
  _causa TEXT DEFAULT NULL,
  _ordem TEXT DEFAULT 'urgentes',
  _limit INT DEFAULT 12,
  _offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  nome_projeto VARCHAR,
  descricao VARCHAR,
  capa_url TEXT,
  img_url VARCHAR,
  cidade VARCHAR,
  causa VARCHAR,
  data_fim DATE,
  ong_id UUID,
  ong_nome VARCHAR,
  ong_slug VARCHAR,
  ong_verificada BOOLEAN,
  total_necessidades BIGINT,
  progresso_medio NUMERIC,
  urgencia_maxima SMALLINT,
  -- Necessidade principal: a mais urgente ainda em aberto. É dela que sai o
  -- "faltam 68 cobertores" no card.
  necessidade_nome VARCHAR,
  necessidade_tipo TEXT,
  necessidade_unidade VARCHAR,
  necessidade_meta NUMERIC,
  necessidade_arrecadado NUMERIC,
  total_encontrado BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtrados AS (
    SELECT p.*, o.nome AS o_nome, o.slug AS o_slug, o.verificada_em
      FROM public.projetos p
      JOIN public.ongs o ON o.id = p.id_ong
     WHERE p.status = true
       AND o.status = true
       AND (_cidade IS NULL OR p.cidade ILIKE _cidade)
       AND (_causa IS NULL OR p.causa ILIKE _causa)
       AND (
         _q IS NULL OR _q = ''
         -- O texto vem escapado do cliente; `\` como caractere de escape
         -- impede que % ou _ digitados virem curinga.
         OR p.nome_projeto ILIKE '%' || _q || '%' ESCAPE '\'
         OR p.descricao ILIKE '%' || _q || '%' ESCAPE '\'
         OR p.cidade ILIKE '%' || _q || '%' ESCAPE '\'
         OR o.nome ILIKE '%' || _q || '%' ESCAPE '\'
       )
  ),
  com_agregados AS (
    SELECT
      f.*,
      COALESCE(n.total, 0) AS n_total,
      COALESCE(n.progresso, 0) AS n_progresso,
      COALESCE(n.urgencia, 0)::SMALLINT AS n_urgencia,
      prin.nome AS p_nome,
      prin.tipo AS p_tipo,
      prin.unidade AS p_unidade,
      prin.meta AS p_meta,
      prin.arrecadado AS p_arrecadado
    FROM filtrados f
    LEFT JOIN LATERAL (
      SELECT count(*) AS total,
             round(avg(LEAST(100, (nec.arrecadado / NULLIF(nec.meta, 0)) * 100))) AS progresso,
             max(nec.urgencia) AS urgencia
        FROM public.necessidades nec
       WHERE nec.id_projeto = f.id AND nec.status = true
    ) n ON true
    LEFT JOIN LATERAL (
      SELECT nec.nome, nec.tipo, nec.unidade, nec.meta, nec.arrecadado
        FROM public.necessidades nec
       WHERE nec.id_projeto = f.id
         AND nec.status = true
         AND nec.arrecadado < nec.meta
       ORDER BY nec.urgencia DESC, nec.prazo ASC NULLS LAST
       LIMIT 1
    ) prin ON true
  )
  SELECT
    c.id, c.slug, c.nome_projeto, c.descricao, c.capa_url, c.img_url,
    c.cidade, c.causa, c.data_fim,
    c.id_ong, c.o_nome, c.o_slug, (c.verificada_em IS NOT NULL),
    c.n_total, c.n_progresso, c.n_urgencia,
    c.p_nome, c.p_tipo, c.p_unidade, c.p_meta, c.p_arrecadado,
    (SELECT count(*) FROM filtrados)
  FROM com_agregados c
  ORDER BY
    CASE WHEN _ordem = 'urgentes' THEN c.n_urgencia END DESC NULLS LAST,
    CASE WHEN _ordem = 'prazo' THEN c.data_fim END ASC NULLS LAST,
    c.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;

-- Opções de filtro que existem de fato na vitrine pública.
CREATE OR REPLACE FUNCTION public.opcoes_de_filtro_projetos()
RETURNS TABLE (cidades TEXT[], causas TEXT[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(array_agg(DISTINCT p.cidade ORDER BY p.cidade)
             FILTER (WHERE p.cidade IS NOT NULL AND p.cidade <> ''), '{}'),
    COALESCE(array_agg(DISTINCT p.causa ORDER BY p.causa)
             FILTER (WHERE p.causa IS NOT NULL AND p.causa <> ''), '{}')
  FROM public.projetos p
  JOIN public.ongs o ON o.id = p.id_ong
  WHERE p.status = true AND o.status = true;
$$;

-- A home contava projetos sem olhar se a ONG estava ativa, enquanto a
-- listagem filtrava: os dois números discordavam na mesma sessão.
DROP FUNCTION IF EXISTS public.get_public_home_stats();
CREATE FUNCTION public.get_public_home_stats()
RETURNS TABLE (
  projetos BIGINT, ongs BIGINT, voluntarios BIGINT,
  itens_arrecadados NUMERIC, valor_arrecadado NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.projetos p
       JOIN public.ongs o ON o.id = p.id_ong
      WHERE p.status = true AND o.status = true),
    (SELECT count(*) FROM public.ongs WHERE status = true),
    (SELECT count(DISTINCT id_usuario) FROM public.voluntariado WHERE status = 'aprovado'),
    (SELECT COALESCE(sum(d.quantidade), 0) FROM public.doacoes d
      WHERE d.status = 'confirmada' AND d.id_necessidade IS NOT NULL),
    (SELECT COALESCE(sum(d.valor), 0) FROM public.doacoes d WHERE d.status = 'confirmada');
$$;

GRANT EXECUTE ON FUNCTION public.buscar_projetos(TEXT, TEXT, TEXT, TEXT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.opcoes_de_filtro_projetos() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_home_stats() TO anon, authenticated;
