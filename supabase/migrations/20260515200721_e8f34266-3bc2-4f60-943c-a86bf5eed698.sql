DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can manage profiles'
  ) THEN
    CREATE POLICY "Admins can manage profiles"
    ON public.profiles
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can sign up as volunteer" ON public.voluntariado;
CREATE POLICY "Users can sign up as volunteer"
ON public.voluntariado
FOR INSERT
WITH CHECK (
  auth.uid() = id_usuario
  AND NOT public.has_role(auth.uid(), 'ong')
  AND NOT public.has_role(auth.uid(), 'admin')
);

CREATE OR REPLACE FUNCTION public.get_public_home_stats()
RETURNS TABLE(projetos bigint, ongs bigint, voluntarios bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.projetos WHERE status IS TRUE) AS projetos,
    (SELECT count(*) FROM public.ongs WHERE status IS TRUE) AS ongs,
    (SELECT count(DISTINCT id_usuario) FROM public.voluntariado WHERE status = 'aprovado') AS voluntarios;
$$;

CREATE OR REPLACE FUNCTION public.count_project_voluntarios(_project_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT id_usuario)
  FROM public.voluntariado
  WHERE id_projeto = _project_id
    AND status = 'aprovado';
$$;