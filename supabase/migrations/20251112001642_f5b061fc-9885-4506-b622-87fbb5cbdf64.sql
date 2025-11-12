-- Criar tabela para configurações de alertas de estoque
CREATE TABLE public.alertas_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('serrado', 'tora')),
  produto_id UUID,
  quantidade_minima INTEGER,
  m3_minimo NUMERIC,
  toneladas_minima NUMERIC,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.alertas_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver alertas da sua empresa"
ON public.alertas_estoque
FOR SELECT
USING (is_admin(auth.uid()) OR (empresa_id = auth.uid()));

CREATE POLICY "Usuários podem criar alertas para sua empresa"
ON public.alertas_estoque
FOR INSERT
WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar alertas da sua empresa"
ON public.alertas_estoque
FOR UPDATE
USING (is_admin(auth.uid()) OR (empresa_id = auth.uid()));

CREATE POLICY "Usuários podem deletar alertas da sua empresa"
ON public.alertas_estoque
FOR DELETE
USING (is_admin(auth.uid()) OR (empresa_id = auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_alertas_estoque_updated_at
BEFORE UPDATE ON public.alertas_estoque
FOR EACH ROW
EXECUTE FUNCTION public.update_configuracoes_updated_at();