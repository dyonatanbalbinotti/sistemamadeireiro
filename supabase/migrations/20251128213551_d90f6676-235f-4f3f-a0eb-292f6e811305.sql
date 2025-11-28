-- Cria políticas RLS para a tabela configuracoes
-- Apenas administradores podem visualizar configurações
CREATE POLICY "Apenas admins podem visualizar configurações"
ON public.configuracoes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Apenas administradores podem inserir configurações
CREATE POLICY "Apenas admins podem inserir configurações"
ON public.configuracoes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Apenas administradores podem atualizar configurações
CREATE POLICY "Apenas admins podem atualizar configurações"
ON public.configuracoes
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Apenas administradores podem deletar configurações
CREATE POLICY "Apenas admins podem deletar configurações"
ON public.configuracoes
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));