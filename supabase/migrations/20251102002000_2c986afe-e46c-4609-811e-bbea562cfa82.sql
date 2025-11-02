-- Criar novo enum com todos os roles
CREATE TYPE public.app_role_new AS ENUM ('admin', 'empresa', 'funcionario');

-- Atualizar coluna para usar o novo enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE app_role_new 
  USING (
    CASE 
      WHEN role::text = 'dono' THEN 'empresa'::app_role_new
      WHEN role::text = 'funcionario' THEN 'funcionario'::app_role_new
      ELSE 'funcionario'::app_role_new
    END
  );

-- Dropar o enum antigo e renomear o novo
DROP TYPE IF EXISTS public.app_role CASCADE;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Recriar função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
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

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- Função para verificar se é empresa
CREATE OR REPLACE FUNCTION public.is_empresa(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'empresa'::app_role
  )
$$;

-- Atualizar políticas da tabela producao
DROP POLICY IF EXISTS "Donos podem deletar produção" ON public.producao;
DROP POLICY IF EXISTS "Funcionários e donos podem criar produção" ON public.producao;
DROP POLICY IF EXISTS "Funcionários podem atualizar sua própria produção" ON public.producao;

CREATE POLICY "Admins e empresas podem deletar produção"
ON public.producao FOR DELETE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

CREATE POLICY "Todos autenticados podem criar produção"
ON public.producao FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donos podem atualizar produção de seus funcionários"
ON public.producao FOR UPDATE
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_empresa(auth.uid())
);

-- Atualizar políticas da tabela produtos
DROP POLICY IF EXISTS "Donos podem deletar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Funcionários e donos podem atualizar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Funcionários e donos podem criar produtos" ON public.produtos;

CREATE POLICY "Admins e empresas podem deletar produtos"
ON public.produtos FOR DELETE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

CREATE POLICY "Todos autenticados podem criar produtos"
ON public.produtos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Todos autenticados podem atualizar produtos"
ON public.produtos FOR UPDATE
USING (true);

-- Atualizar políticas da tabela toras
DROP POLICY IF EXISTS "Donos podem deletar toras" ON public.toras;
DROP POLICY IF EXISTS "Funcionários e donos podem criar toras" ON public.toras;

CREATE POLICY "Admins e empresas podem deletar toras"
ON public.toras FOR DELETE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

CREATE POLICY "Todos autenticados podem criar toras"
ON public.toras FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins e empresas podem atualizar toras"
ON public.toras FOR UPDATE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

-- Atualizar políticas da tabela vendas
DROP POLICY IF EXISTS "Donos podem deletar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Funcionários e donos podem criar vendas" ON public.vendas;

CREATE POLICY "Admins e empresas podem deletar vendas"
ON public.vendas FOR DELETE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

CREATE POLICY "Todos autenticados podem criar vendas"
ON public.vendas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins e empresas podem atualizar vendas"
ON public.vendas FOR UPDATE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

-- Atualizar políticas da tabela toras_serradas
DROP POLICY IF EXISTS "Funcionários e donos podem criar toras serradas" ON public.toras_serradas;

CREATE POLICY "Todos autenticados podem criar toras serradas"
ON public.toras_serradas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins e empresas podem deletar toras serradas"
ON public.toras_serradas FOR DELETE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

CREATE POLICY "Admins e empresas podem atualizar toras serradas"
ON public.toras_serradas FOR UPDATE
USING (is_admin(auth.uid()) OR is_empresa(auth.uid()));

-- Atualizar políticas da tabela user_roles
DROP POLICY IF EXISTS "Donos podem ver todos os cargos" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios cargos" ON public.user_roles;

CREATE POLICY "Admins podem ver todos os cargos"
ON public.user_roles FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Empresas e usuários podem ver seus cargos"
ON public.user_roles FOR SELECT
USING (is_empresa(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins podem criar roles"
ON public.user_roles FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar roles"
ON public.user_roles FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar roles"
ON public.user_roles FOR DELETE
USING (is_admin(auth.uid()));

-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_empresa text NOT NULL,
  cnpj text,
  telefone text,
  endereco text,
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas podem ver seus próprios dados"
ON public.empresas FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Empresas podem atualizar seus próprios dados"
ON public.empresas FOR UPDATE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins podem criar empresas"
ON public.empresas FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar empresas"
ON public.empresas FOR DELETE
USING (is_admin(auth.uid()));

-- Adicionar empresa_id aos profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON public.profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON public.empresas(user_id);