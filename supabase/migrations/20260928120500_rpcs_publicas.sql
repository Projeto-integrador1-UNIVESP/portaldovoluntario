-- P3: a home faz 3 consultas e a listagem faz N+1 (projetos, depois ONGs).
-- Estas funções resolvem cada tela em uma chamada.

-- Estatísticas da home. Substitui a versão anterior acrescentando métricas de
-- impacto (F1/F6) às três contagens que já existiam. Trocar o tipo de retorno
-- exige DROP: CREATE OR REPLACE não altera assinatura.
DROP FUNCTION IF EXISTS public.get_public_home_stats();
CREATE FUNCTION public.get_public_home_stats()
RETURNS TABLE (
  projetos BIGINT,
  ongs BIGINT,
  voluntarios BIGINT,
  itens_arrecadados NUMERIC,
  valor_arrecadado NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.projetos WHERE status = true),
    (SELECT count(*) FROM public.ongs WHERE status = true),
    (SELECT count(DISTINCT id_usuario) FROM public.voluntariado WHERE status = 'aprovado'),
    (SELECT COALESCE(sum(d.quantidade), 0)
       FROM public.doacoes d
      WHERE d.status = 'confirmada' AND d.id_necessidade IS NOT NULL),
    (SELECT COALESCE(sum(d.valor), 0)
       FROM public.doacoes d
      WHERE d.status = 'confirmada');
$$;

-- Listagem e busca de projetos (F4), já com o nome da ONG e o progresso da
-- necessidade principal — evita o N+1 que a tela faria buscando ONG por ONG.
CREATE OR REPLACE FUNCTION public.buscar_projetos(
  _q TEXT DEFAULT NULL,
  _cidade TEXT DEFAULT NULL,
  _causa TEXT DEFAULT NULL,
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
         OR p.nome_projeto ILIKE '%' || _q || '%'
         OR p.descricao ILIKE '%' || _q || '%'
         OR p.cidade ILIKE '%' || _q || '%'
         OR o.nome ILIKE '%' || _q || '%'
       )
  )
  SELECT
    f.id, f.slug, f.nome_projeto, f.descricao, f.capa_url, f.img_url,
    f.cidade, f.causa, f.data_fim,
    f.id_ong, f.o_nome, f.o_slug, (f.verificada_em IS NOT NULL),
    COALESCE(n.total, 0),
    COALESCE(n.progresso, 0),
    (SELECT count(*) FROM filtrados)
  FROM filtrados f
  LEFT JOIN LATERAL (
    SELECT count(*) AS total,
           round(avg(LEAST(100, (nec.arrecadado / NULLIF(nec.meta, 0)) * 100))) AS progresso
      FROM public.necessidades nec
     WHERE nec.id_projeto = f.id AND nec.status = true
  ) n ON true
  ORDER BY f.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;

-- Painel de impacto da ONG (F11): agregados em uma chamada, em vez de a tela
-- baixar todas as doações e somar no cliente.
CREATE OR REPLACE FUNCTION public.get_impacto_ong(_ong_id UUID)
RETURNS TABLE (
  total_confirmado NUMERIC,
  total_pendente NUMERIC,
  doacoes_confirmadas BIGINT,
  doacoes_pendentes BIGINT,
  doadores_distintos BIGINT,
  projetos_ativos BIGINT,
  voluntarios_aprovados BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(sum(d.valor) FILTER (WHERE d.status = 'confirmada'), 0),
    COALESCE(sum(d.valor) FILTER (WHERE d.status = 'pendente'), 0),
    count(*) FILTER (WHERE d.status = 'confirmada'),
    count(*) FILTER (WHERE d.status = 'pendente'),
    count(DISTINCT d.id_usuario) FILTER (WHERE d.id_usuario IS NOT NULL),
    (SELECT count(*) FROM public.projetos p WHERE p.id_ong = _ong_id AND p.status = true),
    (SELECT count(DISTINCT v.id_usuario)
       FROM public.voluntariado v
       JOIN public.projetos p ON p.id = v.id_projeto
      WHERE p.id_ong = _ong_id AND v.status = 'aprovado')
  FROM public.doacoes d
  WHERE d.id_ong = _ong_id
    -- Só quem administra a ONG (ou o admin) enxerga os números dela.
    AND (public.is_ong_member(auth.uid(), _ong_id) OR public.has_role(auth.uid(), 'admin'));
$$;
