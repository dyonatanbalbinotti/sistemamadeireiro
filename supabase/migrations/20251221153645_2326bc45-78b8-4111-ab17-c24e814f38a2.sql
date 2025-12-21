-- =============================================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA: Políticas RLS
-- Problema: empresa_id = auth.uid() está incorreto
-- Solução: Criar função segura e atualizar todas as políticas
-- =============================================================

-- 1. Criar função segura para verificar se usuário pertence à empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresas
    WHERE id = _empresa_id
      AND user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
$$;

-- 2. Criar função para obter o empresa_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.empresas WHERE user_id = auth.uid() LIMIT 1
$$;

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: produtos
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver produtos da sua empresa" ON public.produtos;
DROP POLICY IF EXISTS "Usuários podem criar produtos para sua empresa" ON public.produtos;
DROP POLICY IF EXISTS "Usuários podem atualizar produtos da sua empresa" ON public.produtos;
DROP POLICY IF EXISTS "Usuários podem deletar produtos da sua empresa" ON public.produtos;

CREATE POLICY "Usuários podem ver produtos da sua empresa" 
ON public.produtos FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar produtos para sua empresa" 
ON public.produtos FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar produtos da sua empresa" 
ON public.produtos FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar produtos da sua empresa" 
ON public.produtos FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: toras
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver toras da sua empresa" ON public.toras;
DROP POLICY IF EXISTS "Usuários podem criar toras para sua empresa" ON public.toras;
DROP POLICY IF EXISTS "Usuários podem atualizar toras da sua empresa" ON public.toras;
DROP POLICY IF EXISTS "Usuários podem deletar toras da sua empresa" ON public.toras;

CREATE POLICY "Usuários podem ver toras da sua empresa" 
ON public.toras FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar toras para sua empresa" 
ON public.toras FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar toras da sua empresa" 
ON public.toras FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar toras da sua empresa" 
ON public.toras FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: toras_serradas
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver toras serradas da sua empresa" ON public.toras_serradas;
DROP POLICY IF EXISTS "Usuários podem criar toras serradas para sua empresa" ON public.toras_serradas;
DROP POLICY IF EXISTS "Usuários podem atualizar toras serradas da sua empresa" ON public.toras_serradas;
DROP POLICY IF EXISTS "Usuários podem deletar toras serradas da sua empresa" ON public.toras_serradas;

CREATE POLICY "Usuários podem ver toras serradas da sua empresa" 
ON public.toras_serradas FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar toras serradas para sua empresa" 
ON public.toras_serradas FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar toras serradas da sua empresa" 
ON public.toras_serradas FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar toras serradas da sua empresa" 
ON public.toras_serradas FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: vendas
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver vendas da sua empresa" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem criar vendas para sua empresa" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem atualizar vendas da sua empresa" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem deletar vendas da sua empresa" ON public.vendas;

CREATE POLICY "Usuários podem ver vendas da sua empresa" 
ON public.vendas FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar vendas para sua empresa" 
ON public.vendas FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar vendas da sua empresa" 
ON public.vendas FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar vendas da sua empresa" 
ON public.vendas FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: vendas_cavaco
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver vendas de cavaco da sua empresa" ON public.vendas_cavaco;
DROP POLICY IF EXISTS "Usuários podem criar vendas de cavaco para sua empresa" ON public.vendas_cavaco;
DROP POLICY IF EXISTS "Usuários podem atualizar vendas de cavaco da sua empresa" ON public.vendas_cavaco;
DROP POLICY IF EXISTS "Usuários podem deletar vendas de cavaco da sua empresa" ON public.vendas_cavaco;

CREATE POLICY "Usuários podem ver vendas de cavaco da sua empresa" 
ON public.vendas_cavaco FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar vendas de cavaco para sua empresa" 
ON public.vendas_cavaco FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar vendas de cavaco da sua empresa" 
ON public.vendas_cavaco FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar vendas de cavaco da sua empresa" 
ON public.vendas_cavaco FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: producao
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver producao da sua empresa" ON public.producao;
DROP POLICY IF EXISTS "Usuários podem criar producao para sua empresa" ON public.producao;
DROP POLICY IF EXISTS "Usuários podem atualizar producao da sua empresa" ON public.producao;
DROP POLICY IF EXISTS "Usuários podem deletar producao da sua empresa" ON public.producao;

CREATE POLICY "Usuários podem ver producao da sua empresa" 
ON public.producao FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar producao para sua empresa" 
ON public.producao FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar producao da sua empresa" 
ON public.producao FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar producao da sua empresa" 
ON public.producao FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: pedidos
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver pedidos da sua empresa" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem criar pedidos para sua empresa" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem atualizar pedidos da sua empresa" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem deletar pedidos da sua empresa" ON public.pedidos;

CREATE POLICY "Usuários podem ver pedidos da sua empresa" 
ON public.pedidos FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar pedidos para sua empresa" 
ON public.pedidos FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar pedidos da sua empresa" 
ON public.pedidos FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar pedidos da sua empresa" 
ON public.pedidos FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: alertas_estoque
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver alertas da sua empresa" ON public.alertas_estoque;
DROP POLICY IF EXISTS "Usuários podem criar alertas para sua empresa" ON public.alertas_estoque;
DROP POLICY IF EXISTS "Usuários podem atualizar alertas da sua empresa" ON public.alertas_estoque;
DROP POLICY IF EXISTS "Usuários podem deletar alertas da sua empresa" ON public.alertas_estoque;

CREATE POLICY "Usuários podem ver alertas da sua empresa" 
ON public.alertas_estoque FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar alertas para sua empresa" 
ON public.alertas_estoque FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar alertas da sua empresa" 
ON public.alertas_estoque FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar alertas da sua empresa" 
ON public.alertas_estoque FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: itens_pedido
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver itens de pedidos da sua empresa" ON public.itens_pedido;
DROP POLICY IF EXISTS "Usuários podem criar itens de pedidos para sua empresa" ON public.itens_pedido;
DROP POLICY IF EXISTS "Usuários podem atualizar itens de pedidos da sua empresa" ON public.itens_pedido;
DROP POLICY IF EXISTS "Usuários podem deletar itens de pedidos da sua empresa" ON public.itens_pedido;

CREATE POLICY "Usuários podem ver itens de pedidos da sua empresa" 
ON public.itens_pedido FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p 
    WHERE p.id = itens_pedido.pedido_id 
    AND public.user_belongs_to_empresa(p.empresa_id)
  )
);

CREATE POLICY "Usuários podem criar itens de pedidos para sua empresa" 
ON public.itens_pedido FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos p 
    WHERE p.id = pedido_id 
    AND public.user_belongs_to_empresa(p.empresa_id)
  )
);

CREATE POLICY "Usuários podem atualizar itens de pedidos da sua empresa" 
ON public.itens_pedido FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p 
    WHERE p.id = itens_pedido.pedido_id 
    AND public.user_belongs_to_empresa(p.empresa_id)
  )
);

CREATE POLICY "Usuários podem deletar itens de pedidos da sua empresa" 
ON public.itens_pedido FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p 
    WHERE p.id = itens_pedido.pedido_id 
    AND public.user_belongs_to_empresa(p.empresa_id)
  )
);

-- =============================================================
-- CORRIGIR POLÍTICAS DA TABELA: historico_anuidades
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver histórico da sua empresa" ON public.historico_anuidades;
DROP POLICY IF EXISTS "Admins podem gerenciar histórico de anuidades" ON public.historico_anuidades;

CREATE POLICY "Usuários podem ver histórico da sua empresa" 
ON public.historico_anuidades FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Admins podem gerenciar histórico de anuidades" 
ON public.historico_anuidades FOR ALL 
USING (public.is_admin(auth.uid()));

-- =============================================================
-- RESTRINGIR VISIBILIDADE DE ROLES
-- =============================================================

DROP POLICY IF EXISTS "Empresas e usuários podem ver seus cargos" ON public.user_roles;

CREATE POLICY "Usuários podem ver apenas seu próprio role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- =============================================================
-- RESTRINGIR VISIBILIDADE DE PROFILES
-- =============================================================

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Admins podem ver todos os perfis" 
ON public.profiles FOR SELECT 
USING (public.is_admin(auth.uid()));