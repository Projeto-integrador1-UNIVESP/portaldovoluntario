\pset pager off
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

\echo ''
\echo '── A. ONG logada de verdade tenta adulterar a quantidade ──'
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  SELECT public.is_ong_member(auth.uid(), 'aaaaaaaa-0000-0000-0000-000000000001') AS eh_membro_da_ong;
  DO $$ BEGIN
    UPDATE public.doacoes SET quantidade = 9999
     WHERE id = 'dddddddd-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALHOU: a ONG alterou a quantidade';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: bloqueado — %', SQLERRM;
  END $$;
ROLLBACK;

\echo ''
\echo '── B. a MESMA ONG consegue confirmar (a policy que faltava) ──'
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  UPDATE public.doacoes SET status = 'confirmada', confirmada_em = now()
   WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  \echo '   (linhas afetadas acima; 0 significaria o no-op silencioso de antes)'
ROLLBACK;

\echo ''
\echo '── C. ONG de fora NÃO confirma doação alheia ──'
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  UPDATE public.doacoes SET status = 'confirmada'
   WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  \echo '   (esperado: UPDATE 0)'
ROLLBACK;

\echo ''
\echo '── D. visitante anônimo enxerga necessidade de projeto ativo ──'
BEGIN;
  SET LOCAL ROLE anon;
  SELECT count(*) AS necessidades_visiveis FROM public.necessidades;
ROLLBACK;

\echo ''
\echo '── E. projeto desativado some da vitrine pública ──'
UPDATE public.projetos SET status = false WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
BEGIN;
  SET LOCAL ROLE anon;
  SELECT count(*) AS necessidades_visiveis, 'esperado: 0' AS esperado FROM public.necessidades;
ROLLBACK;
UPDATE public.projetos SET status = true WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';

\echo ''
\echo '── F. anônimo NÃO consegue inserir doação direto na tabela ──'
\echo '   (por isso a doação sem login passa por Edge Function)'
BEGIN;
  SET LOCAL ROLE anon;
  DO $$ BEGIN
    INSERT INTO public.doacoes (id_ong, valor) VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 1);
    RAISE EXCEPTION 'FALHOU: anônimo inseriu doação';
  EXCEPTION
    WHEN insufficient_privilege THEN RAISE NOTICE 'OK: sem permissão de INSERT';
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
      RAISE NOTICE 'OK: bloqueado — %', SQLERRM;
  END $$;
ROLLBACK;
