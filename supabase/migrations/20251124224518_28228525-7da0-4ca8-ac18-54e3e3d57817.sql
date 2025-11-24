-- Adicionar coluna quantidade_pecas na tabela itens_pedido
ALTER TABLE itens_pedido 
ADD COLUMN IF NOT EXISTS quantidade_pecas integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantidade_pecas_produzidas integer NOT NULL DEFAULT 0;

-- Remover a coluna quantidade_produzida em m³ que não será mais usada
ALTER TABLE itens_pedido 
DROP COLUMN IF EXISTS quantidade_produzida;