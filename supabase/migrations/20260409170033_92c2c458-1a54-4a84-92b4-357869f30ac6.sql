
-- Create a security definer function to check ONG membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_ong_member(_user_id uuid, _ong_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_ong
    WHERE id_usuario = _user_id AND id_ong = _ong_id AND status = true
  )
$$;

-- Fix usuarios_ong policies
DROP POLICY IF EXISTS "ONG members can view their ong members" ON public.usuarios_ong;

CREATE POLICY "ONG members can view their ong members"
ON public.usuarios_ong
FOR SELECT
TO authenticated
USING (is_ong_member(auth.uid(), id_ong));

-- Fix ongs UPDATE policy
DROP POLICY IF EXISTS "ONG members can update their ong" ON public.ongs;

CREATE POLICY "ONG members can update their ong"
ON public.ongs
FOR UPDATE
USING (is_ong_member(auth.uid(), id));

-- Fix projetos policy
DROP POLICY IF EXISTS "ONG members can manage their projects" ON public.projetos;

CREATE POLICY "ONG members can manage their projects"
ON public.projetos
FOR ALL
USING (is_ong_member(auth.uid(), id_ong));

-- Fix doacoes policy
DROP POLICY IF EXISTS "ONG members can view ong donations" ON public.doacoes;

CREATE POLICY "ONG members can view ong donations"
ON public.doacoes
FOR SELECT
USING (is_ong_member(auth.uid(), id_ong));

-- Fix voluntariado policy
DROP POLICY IF EXISTS "ONG members can view project volunteers" ON public.voluntariado;

CREATE POLICY "ONG members can view project volunteers"
ON public.voluntariado
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projetos p
    WHERE p.id = voluntariado.id_projeto
    AND is_ong_member(auth.uid(), p.id_ong)
  )
);
