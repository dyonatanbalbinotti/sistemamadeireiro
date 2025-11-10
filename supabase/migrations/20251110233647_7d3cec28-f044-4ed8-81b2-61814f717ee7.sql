-- Criar tabela para vendas de cavaco
CREATE TABLE public.vendas_cavaco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  tora_id UUID NOT NULL REFERENCES public.toras(id) ON DELETE CASCADE,
  toneladas NUMERIC NOT NULL,
  valor_tonelada NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  user_id UUID NOT NULL,
  empresa_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendas_cavaco ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Usuários podem ver vendas de cavaco da sua empresa" 
ON public.vendas_cavaco 
FOR SELECT 
USING (is_admin(auth.uid()) OR (empresa_id = get_user_empresa_id(auth.uid())));

CREATE POLICY "Usuários podem criar vendas de cavaco para sua empresa" 
ON public.vendas_cavaco 
FOR INSERT 
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Usuários podem atualizar vendas de cavaco da sua empresa" 
ON public.vendas_cavaco 
FOR UPDATE 
USING (is_admin(auth.uid()) OR (empresa_id = get_user_empresa_id(auth.uid())));

CREATE POLICY "Usuários podem deletar vendas de cavaco da sua empresa" 
ON public.vendas_cavaco 
FOR DELETE 
USING (is_admin(auth.uid()) OR (empresa_id = get_user_empresa_id(auth.uid())));