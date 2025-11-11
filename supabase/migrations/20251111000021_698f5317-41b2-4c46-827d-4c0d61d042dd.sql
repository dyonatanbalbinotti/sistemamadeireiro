-- Adicionar coluna de status à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'operacional' CHECK (status IN ('operacional', 'invalido'));

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Atualizar políticas RLS para permitir que admin gerencie status
CREATE POLICY "Admins podem atualizar status de usuários"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admins podem ver todos os perfis
CREATE POLICY "Admins podem ver todos os perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Atualizar todos os perfis existentes para status operacional
UPDATE public.profiles SET status = 'operacional' WHERE status IS NULL;