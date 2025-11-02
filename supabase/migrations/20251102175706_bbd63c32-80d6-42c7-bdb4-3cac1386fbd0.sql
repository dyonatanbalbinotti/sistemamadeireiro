-- Criar função para obter empresa_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT empresa_id FROM public.profiles WHERE id = _user_id),
    (SELECT id FROM public.empresas WHERE user_id = _user_id)
  )
$$;

-- Adicionar empresa_id nas tabelas que precisam de isolamento
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.producao ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.toras ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.toras_serradas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_producao_empresa_id ON public.producao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_toras_empresa_id ON public.toras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_toras_serradas_empresa_id ON public.toras_serradas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_id ON public.vendas(empresa_id);

-- PRODUTOS: Remover todas as políticas antigas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'produtos' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.produtos', pol.policyname);
    END LOOP;
END $$;

-- PRODUTOS: Criar novas políticas
CREATE POLICY "Usuários podem ver produtos da sua empresa"
ON public.produtos FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem criar produtos para sua empresa"
ON public.produtos FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem atualizar produtos da sua empresa"
ON public.produtos FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem deletar produtos da sua empresa"
ON public.produtos FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- PRODUÇÃO: Remover todas as políticas antigas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'producao' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.producao', pol.policyname);
    END LOOP;
END $$;

-- PRODUÇÃO: Criar novas políticas
CREATE POLICY "Usuários podem ver produção da sua empresa"
ON public.producao FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem criar produção para sua empresa"
ON public.producao FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem atualizar produção da sua empresa"
ON public.producao FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem deletar produção da sua empresa"
ON public.producao FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- TORAS: Remover todas as políticas antigas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'toras' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.toras', pol.policyname);
    END LOOP;
END $$;

-- TORAS: Criar novas políticas
CREATE POLICY "Usuários podem ver toras da sua empresa"
ON public.toras FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem criar toras para sua empresa"
ON public.toras FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem atualizar toras da sua empresa"
ON public.toras FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem deletar toras da sua empresa"
ON public.toras FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- TORAS SERRADAS: Remover todas as políticas antigas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'toras_serradas' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.toras_serradas', pol.policyname);
    END LOOP;
END $$;

-- TORAS SERRADAS: Criar novas políticas
CREATE POLICY "Usuários podem ver toras serradas da sua empresa"
ON public.toras_serradas FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem criar toras serradas para sua empresa"
ON public.toras_serradas FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem atualizar toras serradas da sua empresa"
ON public.toras_serradas FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem deletar toras serradas da sua empresa"
ON public.toras_serradas FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- VENDAS: Remover todas as políticas antigas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vendas' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendas', pol.policyname);
    END LOOP;
END $$;

-- VENDAS: Criar novas políticas
CREATE POLICY "Usuários podem ver vendas da sua empresa"
ON public.vendas FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem criar vendas para sua empresa"
ON public.vendas FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem atualizar vendas da sua empresa"
ON public.vendas FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Usuários podem deletar vendas da sua empresa"
ON public.vendas FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  empresa_id = get_user_empresa_id(auth.uid())
);