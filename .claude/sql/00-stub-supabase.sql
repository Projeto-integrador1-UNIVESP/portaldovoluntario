-- Recria o mínimo do ambiente Supabase (auth, storage) para que as migrations
-- reais rodem num Postgres puro e a gente veja erros de sintaxe/semântica.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- auth.uid() devolve o usuário "logado" da sessão de teste.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TABLE storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public BOOLEAN DEFAULT false,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
