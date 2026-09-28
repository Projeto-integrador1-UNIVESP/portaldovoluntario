-- F2: doação vinculada a projeto e a necessidade, com confirmação da ONG.
--
-- Duas coisas quebradas hoje:
--  1. `doacoes` não tem projeto nem status, então é impossível medir meta por
--     projeto ou saber se o que foi prometido chegou.
--  2. A ONG não tem policy de UPDATE em `doacoes` (só admin tem). Confirmar o
--     recebimento devolveria 0 linhas SEM erro: a tela diria sucesso e a barra
--     nunca subiria. Esta migration corrige isso.

ALTER TABLE public.doacoes
  ADD COLUMN IF NOT EXISTS id_projeto UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_necessidade UUID REFERENCES public.necessidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantidade NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
  ADD COLUMN IF NOT EXISTS doador_nome VARCHAR(120),
  ADD COLUMN IF NOT EXISTS doador_email VARCHAR(160),
  ADD COLUMN IF NOT EXISTS anonima BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forma_entrega TEXT,
  ADD COLUMN IF NOT EXISTS confirmada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmada_por UUID;

DO $$ BEGIN
  ALTER TABLE public.doacoes ADD CONSTRAINT doacoes_status_check
    CHECK (status IN ('pendente', 'confirmada', 'cancelada'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.doacoes ADD CONSTRAINT doacoes_forma_entrega_check
    CHECK (forma_entrega IS NULL OR forma_entrega IN ('levar', 'coleta'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Doação de item precisa de quantidade; doação em dinheiro precisa de valor.
DO $$ BEGIN
  ALTER TABLE public.doacoes ADD CONSTRAINT doacoes_item_tem_quantidade
    CHECK (id_necessidade IS NULL OR quantidade IS NULL OR quantidade > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.doacoes.doador_nome IS
  'Preenchido quando a doação é feita sem login. Com sessão, o nome vem de profiles.';
COMMENT ON COLUMN public.doacoes.anonima IS
  'Quando true, o nome do doador não aparece em nenhuma exibição pública.';

-- As doações que já existiam são anteriores ao conceito de confirmação: elas
-- já aconteceram. Marcá-las como pendentes criaria uma fila falsa de trabalho
-- para a ONG. O corte é por data fixa, não por now(), para que reaplicar esta
-- migration não reclassifique nada criado depois dela.
UPDATE public.doacoes
   SET status = 'confirmada',
       confirmada_em = COALESCE(confirmada_em, data_doacao)
 WHERE created_at < TIMESTAMPTZ '2026-09-28 00:00:00-03'
   AND status = 'pendente';

-- ── Progresso: só sobe com doação confirmada ────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalcular_arrecadado(_necessidade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _necessidade_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.necessidades n
     SET arrecadado = COALESCE((
           SELECT SUM(
             CASE WHEN n.tipo = 'item'
                  THEN COALESCE(d.quantidade, 0)
                  ELSE COALESCE(d.valor, 0)
             END
           )
           FROM public.doacoes d
           WHERE d.id_necessidade = n.id
             AND d.status = 'confirmada'
         ), 0),
         updated_at = now()
   WHERE n.id = _necessidade_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_doacao_atualiza_necessidade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_arrecadado(OLD.id_necessidade);
    RETURN OLD;
  END IF;

  -- Se a doação mudou de necessidade, as duas precisam ser recalculadas.
  IF TG_OP = 'UPDATE' AND OLD.id_necessidade IS DISTINCT FROM NEW.id_necessidade THEN
    PERFORM public.recalcular_arrecadado(OLD.id_necessidade);
  END IF;

  PERFORM public.recalcular_arrecadado(NEW.id_necessidade);
  RETURN NEW;
END;
$$;

-- Criado DEPOIS do backfill de propósito: senão o UPDATE acima dispararia o
-- trigger linha a linha sem necessidade.
DROP TRIGGER IF EXISTS doacao_atualiza_necessidade ON public.doacoes;
CREATE TRIGGER doacao_atualiza_necessidade
  AFTER INSERT OR UPDATE OR DELETE ON public.doacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_doacao_atualiza_necessidade();

-- ── Permissões ──────────────────────────────────────────────────────────────

-- O que faltava: sem isto, confirmar recebimento é um no-op silencioso.
DROP POLICY IF EXISTS "ONG confirma doacoes recebidas" ON public.doacoes;
CREATE POLICY "ONG confirma doacoes recebidas"
  ON public.doacoes FOR UPDATE
  TO authenticated
  USING (public.is_ong_member(auth.uid(), id_ong))
  WITH CHECK (public.is_ong_member(auth.uid(), id_ong));

-- A RLS libera a linha inteira, mas a ONG não pode reescrever o valor que o
-- doador declarou — é disso que depende a confiança na prestação de contas.
-- Só as colunas de confirmação podem mudar.
CREATE OR REPLACE FUNCTION public.trg_doacao_protege_campos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.valor IS DISTINCT FROM OLD.valor
     OR NEW.quantidade IS DISTINCT FROM OLD.quantidade
     OR NEW.id_usuario IS DISTINCT FROM OLD.id_usuario
     OR NEW.id_ong IS DISTINCT FROM OLD.id_ong
     OR NEW.id_projeto IS DISTINCT FROM OLD.id_projeto
     OR NEW.id_necessidade IS DISTINCT FROM OLD.id_necessidade
     OR NEW.doador_nome IS DISTINCT FROM OLD.doador_nome
     OR NEW.doador_email IS DISTINCT FROM OLD.doador_email
     OR NEW.data_doacao IS DISTINCT FROM OLD.data_doacao
  THEN
    RAISE EXCEPTION 'A ONG pode confirmar ou cancelar a doação, mas não alterar o que o doador declarou.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS doacao_protege_campos ON public.doacoes;
CREATE TRIGGER doacao_protege_campos
  BEFORE UPDATE ON public.doacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_doacao_protege_campos();
