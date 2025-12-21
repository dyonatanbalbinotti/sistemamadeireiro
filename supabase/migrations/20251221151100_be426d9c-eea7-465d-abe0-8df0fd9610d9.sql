-- Adicionar coluna para posição do logo no PDF
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS logo_posicao_pdf TEXT DEFAULT 'direita';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.empresas.logo_posicao_pdf IS 'Posição do logo no cabeçalho do PDF: esquerda, centro ou direita';