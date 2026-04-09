
-- Drop the recursive policy
DROP POLICY IF EXISTS "ONG members can view their ong members" ON public.usuarios_ong;

-- Recreate without self-referencing the same table
CREATE POLICY "ONG members can view their ong members"
ON public.usuarios_ong
FOR SELECT
TO authenticated
USING (
  id_ong IN (
    SELECT uo.id_ong FROM public.usuarios_ong uo
    WHERE uo.id_usuario = auth.uid() AND uo.status = true
  )
);
