-- Histórico público de confirmações de um projeto.
--
-- É a prova mais forte que o produto tem: não é a plataforma afirmando que a
-- doação chegou, é a organização assinando embaixo, com data e hora. Nenhuma
-- das plataformas brasileiras pesquisadas expõe isso.
--
-- Vai por função porque a RLS de `doacoes` não libera leitura para visitante
-- anônimo, e com razão: a linha guarda nome e e-mail de quem doou. Aqui só sai
-- o que cabe numa prestação de contas, e o nome é omitido quando a pessoa
-- escolheu doar anonimamente.

CREATE OR REPLACE FUNCTION public.get_confirmacoes_projeto(
  _projeto_id UUID,
  _limite INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  quantidade NUMERIC,
  valor DOUBLE PRECISION,
  status TEXT,
  anonima BOOLEAN,
  data_doacao TIMESTAMPTZ,
  confirmada_em TIMESTAMPTZ,
  doador_nome VARCHAR,
  necessidade_nome VARCHAR,
  necessidade_unidade VARCHAR
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id, d.quantidade, d.valor, d.status, d.anonima,
    d.data_doacao, d.confirmada_em,
    -- Quem pediu anonimato não tem o nome exposto, nem aqui nem em lugar
    -- nenhum. O e-mail nunca sai desta função.
    CASE WHEN d.anonima THEN NULL ELSE d.doador_nome END,
    n.nome, n.unidade
  FROM public.doacoes d
  JOIN public.projetos p ON p.id = d.id_projeto
  JOIN public.ongs o ON o.id = p.id_ong
  LEFT JOIN public.necessidades n ON n.id = d.id_necessidade
  WHERE d.id_projeto = _projeto_id
    AND p.status = true
    AND o.status = true
    -- Doação cancelada não entra: a ONG avisou que não chegou, e listá-la
    -- como histórico confundiria quem lê.
    AND d.status IN ('confirmada', 'pendente')
  ORDER BY COALESCE(d.confirmada_em, d.data_doacao) DESC
  LIMIT LEAST(_limite, 20);
$$;

GRANT EXECUTE ON FUNCTION public.get_confirmacoes_projeto(UUID, INT) TO anon, authenticated;
