-- Adicionar campo de vencimento de anuidade na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS data_vencimento_anuidade date DEFAULT (CURRENT_DATE + INTERVAL '1 year');

-- Criar tabela de histórico de anuidades
CREATE TABLE IF NOT EXISTS public.historico_anuidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  valor_pago numeric NOT NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento_anterior date,
  data_novo_vencimento date NOT NULL,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_anuidades ENABLE ROW LEVEL SECURITY;

-- Admins podem ver histórico de anuidades
CREATE POLICY "Admins podem ver histórico de anuidades"
ON public.historico_anuidades
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins podem criar registros de anuidade
CREATE POLICY "Admins podem criar histórico de anuidades"
ON public.historico_anuidades
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Empresas podem ver seu próprio histórico
CREATE POLICY "Empresas podem ver seu histórico de anuidades"
ON public.historico_anuidades
FOR SELECT
USING (empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid()));

-- Atualizar RLS das tabelas principais para bloquear acesso de usuários inativos
DROP POLICY IF EXISTS "Usuários podem ver produção da sua empresa" ON public.producao;
CREATE POLICY "Usuários podem ver produção da sua empresa"
ON public.producao
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

DROP POLICY IF EXISTS "Usuários podem criar produção para sua empresa" ON public.producao;
CREATE POLICY "Usuários podem criar produção para sua empresa"
ON public.producao
FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid()) AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
);

DROP POLICY IF EXISTS "Usuários podem atualizar produção da sua empresa" ON public.producao;
CREATE POLICY "Usuários podem atualizar produção da sua empresa"
ON public.producao
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

DROP POLICY IF EXISTS "Usuários podem deletar produção da sua empresa" ON public.producao;
CREATE POLICY "Usuários podem deletar produção da sua empresa"
ON public.producao
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

-- Aplicar mesma lógica para vendas
DROP POLICY IF EXISTS "Usuários podem ver vendas da sua empresa" ON public.vendas;
CREATE POLICY "Usuários podem ver vendas da sua empresa"
ON public.vendas
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

DROP POLICY IF EXISTS "Usuários podem criar vendas para sua empresa" ON public.vendas;
CREATE POLICY "Usuários podem criar vendas para sua empresa"
ON public.vendas
FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid()) AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
);

DROP POLICY IF EXISTS "Usuários podem atualizar vendas da sua empresa" ON public.vendas;
CREATE POLICY "Usuários podem atualizar vendas da sua empresa"
ON public.vendas
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

DROP POLICY IF EXISTS "Usuários podem deletar vendas da sua empresa" ON public.vendas;
CREATE POLICY "Usuários podem deletar vendas da sua empresa"
ON public.vendas
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

-- Aplicar para toras
DROP POLICY IF EXISTS "Usuários podem ver toras da sua empresa" ON public.toras;
CREATE POLICY "Usuários podem ver toras da sua empresa"
ON public.toras
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

DROP POLICY IF EXISTS "Usuários podem criar toras para sua empresa" ON public.toras;
CREATE POLICY "Usuários podem criar toras para sua empresa"
ON public.toras
FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid()) AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
);

DROP POLICY IF EXISTS "Usuários podem atualizar toras da sua empresa" ON public.toras;
CREATE POLICY "Usuários podem atualizar toras da sua empresa"
ON public.toras
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

DROP POLICY IF EXISTS "Usuários podem deletar toras da sua empresa" ON public.toras;
CREATE POLICY "Usuários podem deletar toras da sua empresa"
ON public.toras
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (
    empresa_id = get_user_empresa_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'operacional')
  )
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_vencimento_anuidade ON public.empresas(data_vencimento_anuidade);
CREATE INDEX IF NOT EXISTS idx_historico_anuidades_empresa ON public.historico_anuidades(empresa_id);