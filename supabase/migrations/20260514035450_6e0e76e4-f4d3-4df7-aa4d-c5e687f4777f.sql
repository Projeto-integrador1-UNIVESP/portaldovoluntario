
-- Tabela de códigos de acesso para cadastro de ONGs
CREATE TABLE public.ong_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nome_ong_sugerido TEXT,
  observacoes TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID,
  used_at TIMESTAMPTZ,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ong_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ong codes"
  ON public.ong_access_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Função para validar código (público pode chamar para checar se existe e está válido)
CREATE OR REPLACE FUNCTION public.validate_ong_code(_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ong_access_codes
    WHERE code = _code
      AND used = false
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;
