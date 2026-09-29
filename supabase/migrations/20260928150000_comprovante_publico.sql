-- Comprovante de doação acessível por quem doou sem criar conta.
--
-- O problema: as policies de SELECT em `doacoes` cobrem dono da conta, membro
-- da ONG e admin. Uma doação feita sem login grava `id_usuario = NULL`, então
-- o próprio doador não conseguia abrir o comprovante — justamente o caminho
-- que o produto incentiva.
--
-- Por que uma função e não uma policy: abrir SELECT por id na tabela exporia
-- a linha inteira, inclusive o e-mail do doador. Aqui a chave de acesso é o
-- próprio UUID (122 bits, não adivinhável), e o retorno omite o e-mail —
-- quem tem o link vê o recibo, não os dados de contato de quem doou.

CREATE OR REPLACE FUNCTION public.get_comprovante_doacao(_id UUID)
RETURNS TABLE (
  id UUID,
  valor DOUBLE PRECISION,
  quantidade NUMERIC,
  status TEXT,
  anonima BOOLEAN,
  forma_entrega TEXT,
  data_doacao TIMESTAMPTZ,
  confirmada_em TIMESTAMPTZ,
  doador_nome VARCHAR,
  projeto_nome VARCHAR,
  projeto_slug VARCHAR,
  necessidade_nome VARCHAR,
  necessidade_unidade VARCHAR,
  ong_nome VARCHAR,
  ong_slug VARCHAR
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id, d.valor, d.quantidade, d.status, d.anonima, d.forma_entrega,
    d.data_doacao, d.confirmada_em,
    -- O nome é o que a própria pessoa digitou e aparece como "Obrigado, X".
    -- O e-mail fica de fora de propósito: não é preciso para o recibo.
    d.doador_nome,
    p.nome_projeto, p.slug,
    n.nome, n.unidade,
    o.nome, o.slug
  FROM public.doacoes d
  LEFT JOIN public.projetos p ON p.id = d.id_projeto
  LEFT JOIN public.necessidades n ON n.id = d.id_necessidade
  LEFT JOIN public.ongs o ON o.id = d.id_ong
  WHERE d.id = _id;
$$;

COMMENT ON FUNCTION public.get_comprovante_doacao(UUID) IS
  'Recibo por UUID, para doação feita sem conta. Não devolve e-mail do doador.';

GRANT EXECUTE ON FUNCTION public.get_comprovante_doacao(UUID) TO anon, authenticated;
