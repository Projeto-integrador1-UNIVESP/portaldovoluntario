
-- Admins podem atualizar e remover doações
CREATE POLICY "Admins can update donations"
ON public.doacoes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete donations"
ON public.doacoes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert donations"
ON public.doacoes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem atualizar e remover voluntariado
CREATE POLICY "Admins can update volunteering"
ON public.voluntariado FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete volunteering"
ON public.voluntariado FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert volunteering"
ON public.voluntariado FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
