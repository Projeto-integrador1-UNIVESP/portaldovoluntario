-- A taxa de confirmação é o selo de confiança mais forte do produto: ela é
-- calculada a partir do comportamento real da ONG, não de autodeclaração.
--
-- Mas a RLS de `doacoes` só libera leitura para a própria ONG e para o admin —
-- com razão, porque a linha contém dado do doador. Esta função devolve apenas
-- os dois agregados, sem expor nenhuma doação individual, e por isso pode ser
-- lida por visitante anônimo.

CREATE OR REPLACE FUNCTION public.get_taxa_confirmacao_ong(_ong_id UUID)
RETURNS TABLE (
  confirmadas BIGINT,
  total BIGINT,
  dias_medio_para_confirmar NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE d.status = 'confirmada'),
    -- Doação cancelada não entra na conta: ela não é "deixou de confirmar",
    -- é "a ONG avisou que não chegou", que é o comportamento desejado.
    count(*) FILTER (WHERE d.status IN ('confirmada', 'pendente')),
    round(
      avg(
        EXTRACT(EPOCH FROM (d.confirmada_em - d.data_doacao)) / 86400
      ) FILTER (WHERE d.status = 'confirmada' AND d.confirmada_em IS NOT NULL),
      1
    )
  FROM public.doacoes d
  JOIN public.ongs o ON o.id = d.id_ong
  WHERE d.id_ong = _ong_id
    AND o.status = true;
$$;

COMMENT ON FUNCTION public.get_taxa_confirmacao_ong(UUID) IS
  'Agregado público da reputação da ONG. Não expõe doações individuais.';

GRANT EXECUTE ON FUNCTION public.get_taxa_confirmacao_ong(UUID) TO anon, authenticated;
