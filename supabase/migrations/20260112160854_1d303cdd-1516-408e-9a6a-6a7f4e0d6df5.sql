-- Permitir que admins atualizem qualquer perfil (para bloquear/desbloquear usuários)
CREATE POLICY "Admins podem atualizar qualquer perfil" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));