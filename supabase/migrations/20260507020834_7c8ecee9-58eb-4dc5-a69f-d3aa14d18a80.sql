
-- Tabela de eventos (separada de projetos)
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL,
  local VARCHAR,
  vagas INTEGER,
  img_url VARCHAR,
  id_ong UUID,
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view eventos" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Admins can manage eventos" ON public.eventos FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ONG members can manage their eventos" ON public.eventos FOR ALL USING (id_ong IS NOT NULL AND public.is_ong_member(auth.uid(), id_ong));

CREATE TRIGGER update_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna ativo em profiles para desativar usuários
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
