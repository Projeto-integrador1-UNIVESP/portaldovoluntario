-- P2 / achado 16: hoje as imagens são URLs externas coladas à mão no formulário
-- (a capa da ONG é uma miniatura de 225px do Google Imagens, que some a
-- qualquer momento). Passa a existir armazenamento próprio.

-- Público: capas, logos e fotos de atualização. A leitura precisa ser anônima
-- porque o visitante não logado tem que ver as imagens.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'publico', 'publico', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Privado: comprovantes de doação, que contêm dado financeiro do doador.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprovantes', 'comprovantes', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Convenção de caminho: ongs/{ong_id}/...
-- O segundo segmento é o id da ONG, e é ele que autoriza a escrita.
CREATE OR REPLACE FUNCTION public.ong_id_do_caminho(_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  partes TEXT[];
BEGIN
  partes := string_to_array(_name, '/');
  IF array_length(partes, 1) < 2 OR partes[1] <> 'ongs' THEN
    RETURN NULL;
  END IF;
  RETURN partes[2]::UUID;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "Leitura publica do bucket publico" ON storage.objects;
CREATE POLICY "Leitura publica do bucket publico"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'publico');

DROP POLICY IF EXISTS "ONG escreve nas proprias pastas" ON storage.objects;
CREATE POLICY "ONG escreve nas proprias pastas"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'publico'
    AND (
      public.is_ong_member(auth.uid(), public.ong_id_do_caminho(name))
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'publico'
    AND (
      public.is_ong_member(auth.uid(), public.ong_id_do_caminho(name))
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Comprovante: a ONG destinatária e o admin leem; o doador logado lê o próprio.
DROP POLICY IF EXISTS "Comprovantes visiveis a quem interessa" ON storage.objects;
CREATE POLICY "Comprovantes visiveis a quem interessa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.doacoes d
        WHERE d.comprovante_url = storage.objects.name
          AND (d.id_usuario = auth.uid() OR public.is_ong_member(auth.uid(), d.id_ong))
      )
    )
  );
