-- Adicionar coluna cargo na tabela profiles para funcionários
ALTER TABLE public.profiles 
ADD COLUMN cargo TEXT CHECK (cargo IN ('gerente', 'financeiro'));

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.cargo IS 'Cargo do funcionário: gerente (acesso operacional) ou financeiro (acesso apenas a relatórios)';