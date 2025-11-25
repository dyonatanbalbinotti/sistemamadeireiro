-- Adicionar colunas de valor por tonelada e valor total na tabela toras
ALTER TABLE public.toras 
ADD COLUMN IF NOT EXISTS valor_por_tonelada numeric,
ADD COLUMN IF NOT EXISTS valor_total_carga numeric;