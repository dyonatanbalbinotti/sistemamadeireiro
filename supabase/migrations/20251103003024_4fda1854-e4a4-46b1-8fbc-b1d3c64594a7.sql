
-- Adicionar novos campos na tabela toras
ALTER TABLE public.toras 
ADD COLUMN IF NOT EXISTS grossura NUMERIC,
ADD COLUMN IF NOT EXISTS peso_carga NUMERIC,
ADD COLUMN IF NOT EXISTS quantidade_toras INTEGER,
ADD COLUMN IF NOT EXISTS peso_por_tora NUMERIC;

-- Adicionar campo quantidade_toras_serradas na tabela toras_serradas
ALTER TABLE public.toras_serradas 
ADD COLUMN IF NOT EXISTS quantidade_toras_serradas INTEGER;

-- Atualizar valores existentes para evitar problemas
UPDATE public.toras 
SET grossura = 0, 
    peso_carga = peso, 
    quantidade_toras = 1, 
    peso_por_tora = peso 
WHERE grossura IS NULL;

UPDATE public.toras_serradas 
SET quantidade_toras_serradas = 1 
WHERE quantidade_toras_serradas IS NULL;
