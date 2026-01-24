-- Create table for financial expenses
CREATE TABLE public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'despesa',
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  categoria TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view expenses from their company" 
ON public.despesas 
FOR SELECT 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can create expenses for their company" 
ON public.despesas 
FOR INSERT 
WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can update expenses from their company" 
ON public.despesas 
FOR UPDATE 
USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "Users can delete expenses from their company" 
ON public.despesas 
FOR DELETE 
USING (public.user_belongs_to_empresa(empresa_id));

-- Create trigger for updated_at
CREATE TRIGGER update_despesas_updated_at
BEFORE UPDATE ON public.despesas
FOR EACH ROW
EXECUTE FUNCTION public.update_pedidos_updated_at();

-- Create index for performance
CREATE INDEX idx_despesas_empresa_id ON public.despesas(empresa_id);
CREATE INDEX idx_despesas_data ON public.despesas(data);
CREATE INDEX idx_despesas_categoria ON public.despesas(categoria);