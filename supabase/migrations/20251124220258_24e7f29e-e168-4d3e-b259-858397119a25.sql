-- Criar tabela de pedidos
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  numero_pedido TEXT NOT NULL,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens do pedido
CREATE TABLE public.itens_pedido (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  quantidade_m3 NUMERIC NOT NULL,
  descricao TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pedidos
CREATE POLICY "Usuários podem ver pedidos da sua empresa"
  ON public.pedidos FOR SELECT
  USING (is_admin(auth.uid()) OR (empresa_id = auth.uid()));

CREATE POLICY "Usuários podem criar pedidos para sua empresa"
  ON public.pedidos FOR INSERT
  WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "Usuários podem atualizar pedidos da sua empresa"
  ON public.pedidos FOR UPDATE
  USING (is_admin(auth.uid()) OR (empresa_id = auth.uid()));

CREATE POLICY "Usuários podem deletar pedidos da sua empresa"
  ON public.pedidos FOR DELETE
  USING (is_admin(auth.uid()) OR (empresa_id = auth.uid()));

-- Políticas RLS para itens_pedido
CREATE POLICY "Usuários podem ver itens de pedidos da sua empresa"
  ON public.itens_pedido FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = itens_pedido.pedido_id
      AND (is_admin(auth.uid()) OR pedidos.empresa_id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem criar itens de pedidos da sua empresa"
  ON public.itens_pedido FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = itens_pedido.pedido_id
      AND pedidos.empresa_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar itens de pedidos da sua empresa"
  ON public.itens_pedido FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = itens_pedido.pedido_id
      AND (is_admin(auth.uid()) OR pedidos.empresa_id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem deletar itens de pedidos da sua empresa"
  ON public.itens_pedido FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = itens_pedido.pedido_id
      AND (is_admin(auth.uid()) OR pedidos.empresa_id = auth.uid())
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_pedidos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pedidos_updated_at();