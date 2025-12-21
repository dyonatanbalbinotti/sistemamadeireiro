-- Adicionar políticas RLS na tabela empresas para permitir leitura
CREATE POLICY "Usuários podem ver sua própria empresa" 
ON public.empresas 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar sua própria empresa" 
ON public.empresas 
FOR UPDATE 
USING (user_id = auth.uid());

-- Também permitir que admins vejam todas as empresas
CREATE POLICY "Admins podem ver todas as empresas" 
ON public.empresas 
FOR SELECT 
USING (is_admin(auth.uid()));