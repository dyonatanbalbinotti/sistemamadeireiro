-- Criar tabela para vendas de serragem
CREATE TABLE public.vendas_serragem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  toneladas DECIMAL(10,2) NOT NULL,
  valor_tonelada DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para vendas_serragem
ALTER TABLE public.vendas_serragem ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vendas_serragem
CREATE POLICY "Users can view vendas_serragem from their empresa" 
ON public.vendas_serragem 
FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can insert vendas_serragem for their empresa" 
ON public.vendas_serragem 
FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can update vendas_serragem from their empresa" 
ON public.vendas_serragem 
FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can delete vendas_serragem from their empresa" 
ON public.vendas_serragem 
FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- Criar tabela para vendas de casqueiro
CREATE TABLE public.vendas_casqueiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_metro_estereo DECIMAL(10,2) NOT NULL,
  altura DECIMAL(10,2) NOT NULL,
  largura DECIMAL(10,2) NOT NULL,
  comprimento DECIMAL(10,2) NOT NULL,
  total_metro_estereo DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para vendas_casqueiro
ALTER TABLE public.vendas_casqueiro ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vendas_casqueiro
CREATE POLICY "Users can view vendas_casqueiro from their empresa" 
ON public.vendas_casqueiro 
FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can insert vendas_casqueiro for their empresa" 
ON public.vendas_casqueiro 
FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can update vendas_casqueiro from their empresa" 
ON public.vendas_casqueiro 
FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can delete vendas_casqueiro from their empresa" 
ON public.vendas_casqueiro 
FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));