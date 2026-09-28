-- URLs amigáveis (/projetos/:slug e /ongs/:slug) e os campos que o perfil
-- público da ONG e o card de projeto precisam exibir.
-- Puramente aditiva: nenhum DROP, nenhum dado removido.

-- Gera um slug a partir de um texto em português, sem depender da extensão
-- unaccent (que não está habilitada neste projeto).
CREATE OR REPLACE FUNCTION public.slugify(_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(translate(
          coalesce(_texto, ''),
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
        )),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- Garante unicidade acrescentando um sufixo numérico quando necessário.
CREATE OR REPLACE FUNCTION public.slug_unico(_tabela TEXT, _base TEXT, _id_atual UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidato TEXT;
  sufixo INT := 1;
  existe BOOLEAN;
BEGIN
  candidato := nullif(public.slugify(_base), '');
  IF candidato IS NULL THEN
    candidato := 'registro';
  END IF;

  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I WHERE slug = $1 AND ($2 IS NULL OR id <> $2))',
      _tabela
    ) INTO existe USING candidato, _id_atual;

    EXIT WHEN NOT existe;
    sufixo := sufixo + 1;
    candidato := public.slugify(_base) || '-' || sufixo;
  END LOOP;

  RETURN candidato;
END;
$$;

-- ONGs: perfil público (F3) e selo de verificação (F12)
ALTER TABLE public.ongs
  ADD COLUMN IF NOT EXISTS slug VARCHAR(140),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS capa_url TEXT,
  ADD COLUMN IF NOT EXISTS causas TEXT[],
  ADD COLUMN IF NOT EXISTS verificada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fundada_em DATE,
  ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
  ADD COLUMN IF NOT EXISTS horarios_recebimento TEXT,
  ADD COLUMN IF NOT EXISTS pix_nome_recebedor VARCHAR(120);

COMMENT ON COLUMN public.ongs.pix_nome_recebedor IS
  'Nome que o doador deve ver no app do banco ao pagar. Exibido junto do QR Code.';

-- Projetos: cidade, causa e capa para o card e os filtros (F4)
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS slug VARCHAR(160),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(80),
  ADD COLUMN IF NOT EXISTS causa VARCHAR(60),
  ADD COLUMN IF NOT EXISTS capa_url TEXT;

-- Backfill dos registros existentes antes de criar o índice único
UPDATE public.ongs SET slug = public.slug_unico('ongs', nome, id) WHERE slug IS NULL;
UPDATE public.projetos SET slug = public.slug_unico('projetos', nome_projeto, id) WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ongs_slug_key ON public.ongs (slug);
CREATE UNIQUE INDEX IF NOT EXISTS projetos_slug_key ON public.projetos (slug);

-- Preenche o slug de novos registros e ao renomear
CREATE OR REPLACE FUNCTION public.preencher_slug_ong()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slug_unico('ongs', NEW.nome, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.preencher_slug_projeto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slug_unico('projetos', NEW.nome_projeto, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preencher_slug_ong ON public.ongs;
CREATE TRIGGER preencher_slug_ong
  BEFORE INSERT OR UPDATE ON public.ongs
  FOR EACH ROW EXECUTE FUNCTION public.preencher_slug_ong();

DROP TRIGGER IF EXISTS preencher_slug_projeto ON public.projetos;
CREATE TRIGGER preencher_slug_projeto
  BEFORE INSERT OR UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.preencher_slug_projeto();

-- Saber se o usuário administra a ONG dona de um projeto, sem repetir o join
-- em cada policy e sem recursão de RLS (mesmo padrão do is_ong_member).
CREATE OR REPLACE FUNCTION public.is_ong_member_do_projeto(_user_id UUID, _projeto_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projetos p
    WHERE p.id = _projeto_id AND public.is_ong_member(_user_id, p.id_ong)
  );
$$;
