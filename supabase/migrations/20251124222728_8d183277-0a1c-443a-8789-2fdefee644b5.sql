-- Add quantidade_produzida column to itens_pedido table
ALTER TABLE itens_pedido
ADD COLUMN quantidade_produzida numeric DEFAULT 0 NOT NULL;

-- Add check to ensure quantidade_produzida doesn't exceed quantidade_m3
ALTER TABLE itens_pedido
ADD CONSTRAINT quantidade_produzida_check 
CHECK (quantidade_produzida <= quantidade_m3);