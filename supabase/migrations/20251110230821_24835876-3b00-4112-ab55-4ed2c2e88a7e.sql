-- Adicionar campo peso_por_m3 na tabela toras
ALTER TABLE public.toras 
ADD COLUMN peso_por_m3 numeric DEFAULT 0.6;