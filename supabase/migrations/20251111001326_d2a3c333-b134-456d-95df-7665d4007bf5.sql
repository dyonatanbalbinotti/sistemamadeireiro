-- Criar tabela para configurações do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  valor text NOT NULL,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Admins podem ver configurações
CREATE POLICY "Admins podem ver configurações"
ON public.configuracoes
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins podem atualizar configurações
CREATE POLICY "Admins podem atualizar configurações"
ON public.configuracoes
FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins podem criar configurações
CREATE POLICY "Admins podem criar configurações"
ON public.configuracoes
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Inserir valor padrão de anuidade
INSERT INTO public.configuracoes (chave, valor, descricao)
VALUES ('valor_anuidade', '1000', 'Valor da anuidade anual em reais')
ON CONFLICT (chave) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_configuracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_configuracoes_updated_at();