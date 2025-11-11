
-- Remover TODAS as políticas que usam get_user_empresa_id antes de dropar a função

-- Produtos
DROP POLICY IF EXISTS "Usuários podem ver produtos da sua empresa" ON produtos;
DROP POLICY IF EXISTS "Usuários podem criar produtos para sua empresa" ON produtos;
DROP POLICY IF EXISTS "Usuários podem atualizar produtos da sua empresa" ON produtos;
DROP POLICY IF EXISTS "Usuários podem deletar produtos da sua empresa" ON produtos;

-- Toras
DROP POLICY IF EXISTS "Usuários podem criar toras para sua empresa" ON toras;
DROP POLICY IF EXISTS "Usuários podem ver toras da sua empresa" ON toras;
DROP POLICY IF EXISTS "Usuários podem atualizar toras da sua empresa" ON toras;
DROP POLICY IF EXISTS "Usuários podem deletar toras da sua empresa" ON toras;

-- Toras Serradas
DROP POLICY IF EXISTS "Usuários podem ver toras serradas da sua empresa" ON toras_serradas;
DROP POLICY IF EXISTS "Usuários podem criar toras serradas para sua empresa" ON toras_serradas;
DROP POLICY IF EXISTS "Usuários podem atualizar toras serradas da sua empresa" ON toras_serradas;
DROP POLICY IF EXISTS "Usuários podem deletar toras serradas da sua empresa" ON toras_serradas;

-- Vendas
DROP POLICY IF EXISTS "Usuários podem criar vendas para sua empresa" ON vendas;
DROP POLICY IF EXISTS "Usuários podem ver vendas da sua empresa" ON vendas;
DROP POLICY IF EXISTS "Usuários podem atualizar vendas da sua empresa" ON vendas;
DROP POLICY IF EXISTS "Usuários podem deletar vendas da sua empresa" ON vendas;

-- Vendas Cavaco
DROP POLICY IF EXISTS "Usuários podem ver vendas de cavaco da sua empresa" ON vendas_cavaco;
DROP POLICY IF EXISTS "Usuários podem criar vendas de cavaco para sua empresa" ON vendas_cavaco;
DROP POLICY IF EXISTS "Usuários podem atualizar vendas de cavaco da sua empresa" ON vendas_cavaco;
DROP POLICY IF EXISTS "Usuários podem deletar vendas de cavaco da sua empresa" ON vendas_cavaco;

-- Producao
DROP POLICY IF EXISTS "Usuários podem criar producao para sua empresa" ON producao;
DROP POLICY IF EXISTS "Usuários podem ver producao da sua empresa" ON producao;
DROP POLICY IF EXISTS "Usuários podem atualizar producao da sua empresa" ON producao;
DROP POLICY IF EXISTS "Usuários podem deletar producao da sua empresa" ON producao;
DROP POLICY IF EXISTS "Usuários podem ver produção da sua empresa" ON producao;
DROP POLICY IF EXISTS "Usuários podem criar produção para sua empresa" ON producao;
DROP POLICY IF EXISTS "Usuários podem atualizar produção da sua empresa" ON producao;
DROP POLICY IF EXISTS "Usuários podem deletar produção da sua empresa" ON producao;

-- Agora podemos dropar as funções
DROP FUNCTION IF EXISTS public.get_user_empresa_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- Recriar as funções simplificadas
CREATE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id;
$$;

CREATE FUNCTION public.is_admin(_user_id UUID)
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
    AND role = 'admin'
  );
$$;

-- Recriar TODAS as políticas simplificadas (sem verificação de status)

-- PRODUTOS
CREATE POLICY "Usuários podem ver produtos da sua empresa"
ON produtos FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem criar produtos para sua empresa"
ON produtos FOR INSERT
TO authenticated
WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar produtos da sua empresa"
ON produtos FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem deletar produtos da sua empresa"
ON produtos FOR DELETE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

-- TORAS
CREATE POLICY "Usuários podem criar toras para sua empresa"
ON toras FOR INSERT
TO authenticated
WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem ver toras da sua empresa"
ON toras FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar toras da sua empresa"
ON toras FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem deletar toras da sua empresa"
ON toras FOR DELETE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

-- TORAS SERRADAS
CREATE POLICY "Usuários podem ver toras serradas da sua empresa"
ON toras_serradas FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem criar toras serradas para sua empresa"
ON toras_serradas FOR INSERT
TO authenticated
WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar toras serradas da sua empresa"
ON toras_serradas FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem deletar toras serradas da sua empresa"
ON toras_serradas FOR DELETE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

-- VENDAS
CREATE POLICY "Usuários podem criar vendas para sua empresa"
ON vendas FOR INSERT
TO authenticated
WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem ver vendas da sua empresa"
ON vendas FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar vendas da sua empresa"
ON vendas FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem deletar vendas da sua empresa"
ON vendas FOR DELETE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

-- VENDAS CAVACO
CREATE POLICY "Usuários podem criar vendas de cavaco para sua empresa"
ON vendas_cavaco FOR INSERT
TO authenticated
WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem ver vendas de cavaco da sua empresa"
ON vendas_cavaco FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar vendas de cavaco da sua empresa"
ON vendas_cavaco FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem deletar vendas de cavaco da sua empresa"
ON vendas_cavaco FOR DELETE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

-- PRODUCAO
CREATE POLICY "Usuários podem criar producao para sua empresa"
ON producao FOR INSERT
TO authenticated
WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem ver producao da sua empresa"
ON producao FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar producao da sua empresa"
ON producao FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());

CREATE POLICY "Usuários podem deletar producao da sua empresa"
ON producao FOR DELETE
TO authenticated
USING (is_admin(auth.uid()) OR empresa_id = auth.uid());
