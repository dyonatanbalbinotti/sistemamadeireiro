-- STEP 1: Remove foreign key constraints first
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_empresa_id_fkey;
ALTER TABLE producao DROP CONSTRAINT IF EXISTS producao_empresa_id_fkey;
ALTER TABLE toras DROP CONSTRAINT IF EXISTS toras_empresa_id_fkey;
ALTER TABLE toras_serradas DROP CONSTRAINT IF EXISTS toras_serradas_empresa_id_fkey;
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_empresa_id_fkey;
ALTER TABLE vendas_cavaco DROP CONSTRAINT IF EXISTS vendas_cavaco_empresa_id_fkey;

-- STEP 2: Update NULL empresa_id values to match user_id
UPDATE producao SET empresa_id = user_id WHERE empresa_id IS NULL;
UPDATE toras SET empresa_id = user_id WHERE empresa_id IS NULL;
UPDATE toras_serradas SET empresa_id = user_id WHERE empresa_id IS NULL;
UPDATE vendas SET empresa_id = user_id WHERE empresa_id IS NULL;
UPDATE vendas_cavaco SET empresa_id = user_id WHERE empresa_id IS NULL;

-- Delete produtos without empresa_id
DELETE FROM produtos WHERE empresa_id IS NULL;

-- STEP 3: Make empresa_id NOT NULL
ALTER TABLE produtos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE producao ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE toras ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE toras_serradas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE vendas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE vendas_cavaco ALTER COLUMN empresa_id SET NOT NULL;