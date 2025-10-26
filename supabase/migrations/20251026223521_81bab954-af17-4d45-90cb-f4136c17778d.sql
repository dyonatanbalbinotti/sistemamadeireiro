-- Criar enum para cargos
CREATE TYPE public.app_role AS ENUM ('dono', 'funcionario');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Tabela de cargos
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar cargo (security definer para evitar recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policies para user_roles
CREATE POLICY "Usuários podem ver seus próprios cargos"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Donos podem ver todos os cargos"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'dono'));

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  largura NUMERIC NOT NULL,
  espessura NUMERIC NOT NULL,
  comprimento NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver produtos"
  ON public.produtos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Funcionários e donos podem criar produtos"
  ON public.produtos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'funcionario') OR 
    public.has_role(auth.uid(), 'dono')
  );

CREATE POLICY "Funcionários e donos podem atualizar produtos"
  ON public.produtos FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'funcionario') OR 
    public.has_role(auth.uid(), 'dono')
  );

CREATE POLICY "Donos podem deletar produtos"
  ON public.produtos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dono'));

-- Tabela de produção
CREATE TABLE public.producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  quantidade INTEGER NOT NULL,
  m3 NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver produção"
  ON public.producao FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Funcionários e donos podem criar produção"
  ON public.producao FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(), 'funcionario') OR 
      public.has_role(auth.uid(), 'dono')
    )
  );

CREATE POLICY "Funcionários podem atualizar sua própria produção"
  ON public.producao FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(), 'funcionario') OR 
      public.has_role(auth.uid(), 'dono')
    )
  );

CREATE POLICY "Donos podem deletar produção"
  ON public.producao FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dono'));

-- Tabela de toras
CREATE TABLE public.toras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  peso NUMERIC NOT NULL,
  toneladas NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.toras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver toras"
  ON public.toras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Funcionários e donos podem criar toras"
  ON public.toras FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(), 'funcionario') OR 
      public.has_role(auth.uid(), 'dono')
    )
  );

CREATE POLICY "Donos podem deletar toras"
  ON public.toras FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dono'));

-- Tabela de toras serradas
CREATE TABLE public.toras_serradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  tora_id UUID REFERENCES public.toras(id) ON DELETE CASCADE NOT NULL,
  peso NUMERIC NOT NULL,
  toneladas NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.toras_serradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver toras serradas"
  ON public.toras_serradas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Funcionários e donos podem criar toras serradas"
  ON public.toras_serradas FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(), 'funcionario') OR 
      public.has_role(auth.uid(), 'dono')
    )
  );

-- Tabela de vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('serrada', 'tora')),
  quantidade NUMERIC NOT NULL,
  unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('unidade', 'm3', 'tonelada')),
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver vendas"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Funcionários e donos podem criar vendas"
  ON public.vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(), 'funcionario') OR 
      public.has_role(auth.uid(), 'dono')
    )
  );

CREATE POLICY "Donos podem deletar vendas"
  ON public.vendas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dono'));

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar realtime para todas as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.producao;
ALTER PUBLICATION supabase_realtime ADD TABLE public.toras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.toras_serradas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;