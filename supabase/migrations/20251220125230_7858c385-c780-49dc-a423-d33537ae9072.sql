-- Adiciona campo numero_lote na tabela toras
ALTER TABLE public.toras ADD COLUMN IF NOT EXISTS numero_lote text;