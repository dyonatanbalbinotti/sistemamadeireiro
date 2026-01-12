-- Adicionar coluna para mensagem de bloqueio personalizada
ALTER TABLE public.profiles
ADD COLUMN motivo_bloqueio text DEFAULT NULL;