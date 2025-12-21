-- Adicionar coluna para tamanho do logo no PDF
ALTER TABLE public.empresas 
ADD COLUMN logo_tamanho_pdf TEXT DEFAULT 'medio';