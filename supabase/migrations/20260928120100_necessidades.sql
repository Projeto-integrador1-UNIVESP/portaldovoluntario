-- F1: catálogo de necessidades por projeto.
-- É o que hoje falta para uma ONG pedir cobertores, alimento ou fraldas —
-- antes só existia doação em dinheiro, solta, sem vínculo com projeto.

CREATE TABLE IF NOT EXISTS public.necessidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_projeto UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,

  -- 'item' conta em unidades (cobertores, quilos); 'dinheiro' conta em reais.
  tipo TEXT NOT NULL CHECK (tipo IN ('item', 'dinheiro')),
  nome VARCHAR(120) NOT NULL,
  categoria VARCHAR(60),
  unidade VARCHAR(20),

  meta NUMERIC(12,2) NOT NULL CHECK (meta > 0),

  -- Mantida por trigger a partir das doações CONFIRMADAS pela ONG. É coluna,
  -- e não view, porque a home e a listagem ordenam por progresso e urgência.
  arrecadado NUMERIC(12,2) NOT NULL DEFAULT 0,

  urgencia SMALLINT NOT NULL DEFAULT 2 CHECK (urgencia BETWEEN 1 AND 3),
  prazo DATE,
  status BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.necessidades.urgencia IS '1 = baixa, 2 = média, 3 = urgente';
COMMENT ON COLUMN public.necessidades.arrecadado IS
  'Calculado por trigger somando apenas doações com status = confirmada.';

DROP TRIGGER IF EXISTS update_necessidades_updated_at ON public.necessidades;
CREATE TRIGGER update_necessidades_updated_at
  BEFORE UPDATE ON public.necessidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.necessidades ENABLE ROW LEVEL SECURITY;

-- Necessidade é informação pública: é justamente o que o doador precisa ver
-- antes de decidir. Só as ativas, de projetos ativos.
DROP POLICY IF EXISTS "Qualquer um ve necessidades ativas" ON public.necessidades;
CREATE POLICY "Qualquer um ve necessidades ativas"
  ON public.necessidades FOR SELECT
  USING (
    status = true
    AND EXISTS (SELECT 1 FROM public.projetos p WHERE p.id = id_projeto AND p.status = true)
  );

DROP POLICY IF EXISTS "ONG gerencia necessidades dos seus projetos" ON public.necessidades;
CREATE POLICY "ONG gerencia necessidades dos seus projetos"
  ON public.necessidades FOR ALL
  USING (public.is_ong_member_do_projeto(auth.uid(), id_projeto))
  WITH CHECK (public.is_ong_member_do_projeto(auth.uid(), id_projeto));

DROP POLICY IF EXISTS "Admins gerenciam necessidades" ON public.necessidades;
CREATE POLICY "Admins gerenciam necessidades"
  ON public.necessidades FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
