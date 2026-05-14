
-- Allow ONG members to manage volunteer signups for their own projects
CREATE POLICY "ONG members can update project volunteers"
ON public.voluntariado
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.projetos p
  WHERE p.id = voluntariado.id_projeto
    AND public.is_ong_member(auth.uid(), p.id_ong)
));

CREATE POLICY "ONG members can delete project volunteers"
ON public.voluntariado
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.projetos p
  WHERE p.id = voluntariado.id_projeto
    AND public.is_ong_member(auth.uid(), p.id_ong)
));

CREATE POLICY "ONG members can insert project volunteers"
ON public.voluntariado
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projetos p
  WHERE p.id = voluntariado.id_projeto
    AND public.is_ong_member(auth.uid(), p.id_ong)
));
