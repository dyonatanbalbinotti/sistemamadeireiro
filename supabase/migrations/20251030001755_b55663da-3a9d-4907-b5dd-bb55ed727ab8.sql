-- Adicionar coluna tora_id na tabela producao para relacionar com as toras
ALTER TABLE public.producao 
ADD COLUMN tora_id uuid REFERENCES public.toras(id);

-- Criar índice para melhorar performance nas consultas
CREATE INDEX idx_producao_tora_id ON public.producao(tora_id);