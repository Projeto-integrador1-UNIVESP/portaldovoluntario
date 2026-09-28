\set ON_ERROR_STOP on
\pset pager off

-- Cenário realista: Sítio Agar pede 100 cobertores.
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'gestor@agar.org'),
  ('22222222-2222-2222-2222-222222222222', 'doador@exemplo.com');

INSERT INTO public.ongs (id, nome, cidade, estado, pix)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Sítio Ágar & Cia', 'Cajamar', 'SP', 'agar@pix.com');

INSERT INTO public.usuarios_ong (id_usuario, id_ong)
VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001');

INSERT INTO public.projetos (id, id_ong, nome_projeto, descricao, cidade)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'Campanha do Agasalho 2026', 'Arrecadação de cobertores', 'Cajamar');

INSERT INTO public.necessidades (id, id_projeto, tipo, nome, unidade, meta, urgencia)
VALUES ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
        'item', 'Cobertor solteiro', 'un', 100, 3);

\echo ''
\echo '── 1. slug gerado a partir do nome, sem acento e sem pontuação ──'
SELECT nome, slug FROM public.ongs;
SELECT nome_projeto, slug FROM public.projetos;

\echo ''
\echo '── 2. slug duplicado ganha sufixo em vez de estourar ──'
INSERT INTO public.ongs (nome, cidade, estado) VALUES ('Sítio Ágar & Cia', 'Jundiaí', 'SP');
SELECT slug FROM public.ongs ORDER BY slug;

\echo ''
\echo '── 3. doação PENDENTE não move a barra (critério central da spec) ──'
INSERT INTO public.doacoes (id, id_ong, id_usuario, id_projeto, id_necessidade, valor, quantidade, status)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000001', 0, 30, 'pendente');
SELECT nome, meta, arrecadado, 'esperado: 0' AS esperado FROM public.necessidades;

\echo ''
\echo '── 4. ONG confirma o recebimento: agora sim a barra sobe ──'
UPDATE public.doacoes SET status = 'confirmada', confirmada_em = now()
 WHERE id = 'dddddddd-0000-0000-0000-000000000001';
SELECT nome, meta, arrecadado, 'esperado: 30' AS esperado FROM public.necessidades;

\echo ''
\echo '── 5. cancelar devolve o progresso ──'
UPDATE public.doacoes SET status = 'cancelada' WHERE id = 'dddddddd-0000-0000-0000-000000000001';
SELECT nome, arrecadado, 'esperado: 0' AS esperado FROM public.necessidades;

\echo ''
\echo '── 6. doação anônima, sem login, some com id_usuario ──'
UPDATE public.doacoes SET status = 'confirmada' WHERE id = 'dddddddd-0000-0000-0000-000000000001';
INSERT INTO public.doacoes (id_ong, id_projeto, id_necessidade, valor, quantidade, status, doador_nome, doador_email, anonima)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000001', 0, 20, 'confirmada', 'Maria', 'maria@x.com', true);
SELECT nome, arrecadado, 'esperado: 50' AS esperado FROM public.necessidades;

\echo ''
\echo '── 7. meta <= 0 é recusada pelo banco ──'
DO $$ BEGIN
  INSERT INTO public.necessidades (id_projeto, tipo, nome, meta)
  VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'item', 'Inválida', 0);
  RAISE EXCEPTION 'FALHOU: meta 0 foi aceita';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: meta 0 recusada pelo CHECK';
END $$;

\echo ''
\echo '── 8. status inventado é recusado ──'
DO $$ BEGIN
  UPDATE public.doacoes SET status = 'sei-la' WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FALHOU: status inválido foi aceito';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: status inválido recusado pelo CHECK';
END $$;

\echo ''
\echo '── 9. a ONG NÃO pode reescrever o valor que o doador declarou ──'
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
DO $$ BEGIN
  UPDATE public.doacoes SET quantidade = 9999 WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FALHOU: a ONG conseguiu alterar a quantidade';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
  RAISE NOTICE 'OK: trigger bloqueou — %', SQLERRM;
END $$;

\echo ''
\echo '── 10. RPC de busca devolve projeto, ONG e progresso numa chamada ──'
SELECT nome_projeto, ong_nome, cidade, total_necessidades, progresso_medio, total_encontrado
  FROM public.buscar_projetos('agasalho');

\echo ''
\echo '── 11. RPC de estatísticas da home ──'
SELECT * FROM public.get_public_home_stats();
