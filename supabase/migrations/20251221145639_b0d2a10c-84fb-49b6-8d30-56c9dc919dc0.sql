-- Adicionar campos de cores personalizadas para PDF na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#1e40af',
ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#64748b';