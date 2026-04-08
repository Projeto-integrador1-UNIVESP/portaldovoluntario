
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'ong', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  telefone VARCHAR,
  data_nascimento DATE,
  cidade VARCHAR,
  estado VARCHAR,
  cep VARCHAR,
  logradouro VARCHAR,
  numero INT,
  contato_ong BOOLEAN DEFAULT false,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ONGs table
CREATE TABLE public.ongs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR NOT NULL,
  cnpj VARCHAR,
  cidade VARCHAR,
  estado VARCHAR,
  logradouro VARCHAR,
  cep VARCHAR,
  telefone VARCHAR,
  status BOOLEAN DEFAULT true,
  conta INT,
  agencia INT,
  banco VARCHAR,
  img_url VARCHAR,
  descricao VARCHAR,
  pix VARCHAR,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ongs ENABLE ROW LEVEL SECURITY;

-- Projetos table
CREATE TABLE public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ong UUID REFERENCES public.ongs(id) ON DELETE CASCADE NOT NULL,
  nome_projeto VARCHAR NOT NULL,
  descricao VARCHAR,
  data_inicio DATE,
  data_fim DATE,
  img_url VARCHAR,
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

-- Voluntariado table
CREATE TABLE public.voluntariado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_projeto UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  id_usuario UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_inscricao TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_projeto, id_usuario)
);
ALTER TABLE public.voluntariado ENABLE ROW LEVEL SECURITY;

-- Doações table
CREATE TABLE public.doacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  id_ong UUID REFERENCES public.ongs(id) ON DELETE CASCADE NOT NULL,
  valor DOUBLE PRECISION NOT NULL,
  data_doacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo_doacao VARCHAR DEFAULT 'pix',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doacoes ENABLE ROW LEVEL SECURITY;

-- Usuarios_ONG table (membership)
CREATE TABLE public.usuarios_ong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  id_ong UUID REFERENCES public.ongs(id) ON DELETE CASCADE NOT NULL,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_usuario, id_ong)
);
ALTER TABLE public.usuarios_ong ENABLE ROW LEVEL SECURITY;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ongs_updated_at BEFORE UPDATE ON public.ongs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- user_roles: users can see their own roles, admins can manage
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ongs
CREATE POLICY "Anyone can view active ongs" ON public.ongs FOR SELECT USING (true);
CREATE POLICY "Admins can manage ongs" ON public.ongs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ONG members can update their ong" ON public.ongs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.usuarios_ong WHERE id_usuario = auth.uid() AND id_ong = ongs.id AND status = true)
);

-- projetos
CREATE POLICY "Anyone can view active projects" ON public.projetos FOR SELECT USING (true);
CREATE POLICY "Admins can manage projects" ON public.projetos FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ONG members can manage their projects" ON public.projetos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.usuarios_ong WHERE id_usuario = auth.uid() AND id_ong = projetos.id_ong AND status = true)
);

-- voluntariado
CREATE POLICY "Users can view own volunteering" ON public.voluntariado FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY "Users can sign up as volunteer" ON public.voluntariado FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "Admins can view all volunteering" ON public.voluntariado FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ONG members can view project volunteers" ON public.voluntariado FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projetos p JOIN public.usuarios_ong uo ON uo.id_ong = p.id_ong WHERE p.id = voluntariado.id_projeto AND uo.id_usuario = auth.uid() AND uo.status = true)
);

-- doacoes
CREATE POLICY "Users can view own donations" ON public.doacoes FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY "Users can create donations" ON public.doacoes FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "Admins can view all donations" ON public.doacoes FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ONG members can view ong donations" ON public.doacoes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.usuarios_ong WHERE id_usuario = auth.uid() AND id_ong = doacoes.id_ong AND status = true)
);

-- usuarios_ong
CREATE POLICY "Users can view own memberships" ON public.usuarios_ong FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY "Admins can manage memberships" ON public.usuarios_ong FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ONG members can view their ong members" ON public.usuarios_ong FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.usuarios_ong uo WHERE uo.id_usuario = auth.uid() AND uo.id_ong = usuarios_ong.id_ong AND uo.status = true)
);
