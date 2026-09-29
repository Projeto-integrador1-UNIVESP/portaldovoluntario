-- A ONG podia colocar o próprio selo de verificada.
--
-- A policy "ONG members can update their ong" libera UPDATE na linha inteira,
-- sem WITH CHECK e sem proteção por coluna. Na prática, um membro da ONG
-- conseguia gravar `verificada_em` e `status` diretamente pela API — ou seja,
-- o selo que a administração concede era falsificável exatamente por quem ele
-- deveria atestar, e não havia trilha de quem concedeu.
--
-- Reproduzido num Postgres local antes da correção: o UPDATE afetava 1 linha
-- e a ONG passava a constar como verificada.

ALTER TABLE public.ongs
  ADD COLUMN IF NOT EXISTS verificada_por UUID,
  ADD COLUMN IF NOT EXISTS verificacao_observacao TEXT;

COMMENT ON COLUMN public.ongs.verificada_por IS
  'Administrador que concedeu o selo. Preenchido por trigger, não pelo cliente.';

CREATE OR REPLACE FUNCTION public.trg_ong_protege_verificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    -- Só o admin muda o selo, e a autoria fica registrada.
    IF NEW.verificada_em IS DISTINCT FROM OLD.verificada_em THEN
      NEW.verificada_por := CASE WHEN NEW.verificada_em IS NULL THEN NULL ELSE auth.uid() END;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.verificada_em IS DISTINCT FROM OLD.verificada_em THEN
    RAISE EXCEPTION 'O selo de ONG verificada só pode ser concedido pela administração da plataforma.';
  END IF;

  IF NEW.verificada_por IS DISTINCT FROM OLD.verificada_por THEN
    RAISE EXCEPTION 'A autoria da verificação não pode ser alterada.';
  END IF;

  -- Uma ONG também não se reativa sozinha depois de ser desativada.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'A situação da organização é controlada pela administração da plataforma.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ong_protege_verificacao ON public.ongs;
CREATE TRIGGER ong_protege_verificacao
  BEFORE UPDATE ON public.ongs
  FOR EACH ROW EXECUTE FUNCTION public.trg_ong_protege_verificacao();

-- Fecha a policy também pelo lado do WITH CHECK: sem ele, a linha alterada
-- nem precisava continuar pertencendo a quem a alterou.
DROP POLICY IF EXISTS "ONG members can update their ong" ON public.ongs;
CREATE POLICY "ONG members can update their ong"
  ON public.ongs FOR UPDATE
  TO authenticated
  USING (public.is_ong_member(auth.uid(), id))
  WITH CHECK (public.is_ong_member(auth.uid(), id));
