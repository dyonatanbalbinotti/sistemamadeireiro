-- =============================================
-- ALMOXARIFADO MODULE - DATABASE SCHEMA
-- =============================================

-- 1. Tabela de Categorias de Itens
CREATE TABLE public.almoxarifado_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.almoxarifado_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver categorias da sua empresa"
  ON public.almoxarifado_categorias FOR SELECT
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar categorias para sua empresa"
  ON public.almoxarifado_categorias FOR INSERT
  WITH CHECK (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar categorias da sua empresa"
  ON public.almoxarifado_categorias FOR UPDATE
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar categorias da sua empresa"
  ON public.almoxarifado_categorias FOR DELETE
  USING (user_belongs_to_empresa(empresa_id));

-- 2. Tabela de Itens do Almoxarifado
CREATE TABLE public.almoxarifado_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade_medida TEXT NOT NULL DEFAULT 'UN',
  categoria_id UUID REFERENCES public.almoxarifado_categorias(id) ON DELETE SET NULL,
  estoque_atual NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, codigo)
);

ALTER TABLE public.almoxarifado_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens da sua empresa"
  ON public.almoxarifado_itens FOR SELECT
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar itens para sua empresa"
  ON public.almoxarifado_itens FOR INSERT
  WITH CHECK (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar itens da sua empresa"
  ON public.almoxarifado_itens FOR UPDATE
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar itens da sua empresa"
  ON public.almoxarifado_itens FOR DELETE
  USING (user_belongs_to_empresa(empresa_id));

-- 3. Tabela de Fornecedores
CREATE TABLE public.almoxarifado_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  contato TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.almoxarifado_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver fornecedores da sua empresa"
  ON public.almoxarifado_fornecedores FOR SELECT
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar fornecedores para sua empresa"
  ON public.almoxarifado_fornecedores FOR INSERT
  WITH CHECK (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar fornecedores da sua empresa"
  ON public.almoxarifado_fornecedores FOR UPDATE
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar fornecedores da sua empresa"
  ON public.almoxarifado_fornecedores FOR DELETE
  USING (user_belongs_to_empresa(empresa_id));

-- 4. Tabela de Ordens de Compra
CREATE TABLE public.almoxarifado_ordens_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  numero_ordem TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.almoxarifado_fornecedores(id) ON DELETE SET NULL,
  data_ordem DATE NOT NULL DEFAULT CURRENT_DATE,
  data_aprovacao DATE,
  data_envio DATE,
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  aprovado_por UUID,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('pendente', 'aprovada', 'enviada', 'recebida', 'cancelada'))
);

ALTER TABLE public.almoxarifado_ordens_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver ordens da sua empresa"
  ON public.almoxarifado_ordens_compra FOR SELECT
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar ordens para sua empresa"
  ON public.almoxarifado_ordens_compra FOR INSERT
  WITH CHECK (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar ordens da sua empresa"
  ON public.almoxarifado_ordens_compra FOR UPDATE
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar ordens da sua empresa"
  ON public.almoxarifado_ordens_compra FOR DELETE
  USING (user_belongs_to_empresa(empresa_id));

-- 5. Tabela de Itens da Ordem de Compra
CREATE TABLE public.almoxarifado_ordens_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id UUID NOT NULL REFERENCES public.almoxarifado_ordens_compra(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.almoxarifado_itens(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  quantidade_recebida NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.almoxarifado_ordens_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de ordens da sua empresa"
  ON public.almoxarifado_ordens_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_ordens_compra o
    WHERE o.id = almoxarifado_ordens_itens.ordem_id
    AND user_belongs_to_empresa(o.empresa_id)
  ));

CREATE POLICY "Usuários podem criar itens de ordens para sua empresa"
  ON public.almoxarifado_ordens_itens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.almoxarifado_ordens_compra o
    WHERE o.id = almoxarifado_ordens_itens.ordem_id
    AND user_belongs_to_empresa(o.empresa_id)
  ));

CREATE POLICY "Usuários podem atualizar itens de ordens da sua empresa"
  ON public.almoxarifado_ordens_itens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_ordens_compra o
    WHERE o.id = almoxarifado_ordens_itens.ordem_id
    AND user_belongs_to_empresa(o.empresa_id)
  ));

CREATE POLICY "Usuários podem deletar itens de ordens da sua empresa"
  ON public.almoxarifado_ordens_itens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_ordens_compra o
    WHERE o.id = almoxarifado_ordens_itens.ordem_id
    AND user_belongs_to_empresa(o.empresa_id)
  ));

-- 6. Tabela de Notas Fiscais
CREATE TABLE public.almoxarifado_notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  numero_nf TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data_emissao DATE NOT NULL,
  data_entrada_saida DATE,
  fornecedor_id UUID REFERENCES public.almoxarifado_fornecedores(id) ON DELETE SET NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  ordem_compra_id UUID REFERENCES public.almoxarifado_ordens_compra(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tipo_nf_check CHECK (tipo IN ('entrada', 'saida'))
);

ALTER TABLE public.almoxarifado_notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver NFs da sua empresa"
  ON public.almoxarifado_notas_fiscais FOR SELECT
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar NFs para sua empresa"
  ON public.almoxarifado_notas_fiscais FOR INSERT
  WITH CHECK (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar NFs da sua empresa"
  ON public.almoxarifado_notas_fiscais FOR UPDATE
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar NFs da sua empresa"
  ON public.almoxarifado_notas_fiscais FOR DELETE
  USING (user_belongs_to_empresa(empresa_id));

-- 7. Tabela de Itens da Nota Fiscal
CREATE TABLE public.almoxarifado_nf_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID NOT NULL REFERENCES public.almoxarifado_notas_fiscais(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.almoxarifado_itens(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.almoxarifado_nf_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de NFs da sua empresa"
  ON public.almoxarifado_nf_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_notas_fiscais nf
    WHERE nf.id = almoxarifado_nf_itens.nota_fiscal_id
    AND user_belongs_to_empresa(nf.empresa_id)
  ));

CREATE POLICY "Usuários podem criar itens de NFs para sua empresa"
  ON public.almoxarifado_nf_itens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.almoxarifado_notas_fiscais nf
    WHERE nf.id = almoxarifado_nf_itens.nota_fiscal_id
    AND user_belongs_to_empresa(nf.empresa_id)
  ));

CREATE POLICY "Usuários podem atualizar itens de NFs da sua empresa"
  ON public.almoxarifado_nf_itens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_notas_fiscais nf
    WHERE nf.id = almoxarifado_nf_itens.nota_fiscal_id
    AND user_belongs_to_empresa(nf.empresa_id)
  ));

CREATE POLICY "Usuários podem deletar itens de NFs da sua empresa"
  ON public.almoxarifado_nf_itens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_notas_fiscais nf
    WHERE nf.id = almoxarifado_nf_itens.nota_fiscal_id
    AND user_belongs_to_empresa(nf.empresa_id)
  ));

-- 8. Tabela de Movimentos de Estoque
CREATE TABLE public.almoxarifado_movimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.almoxarifado_itens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  estoque_anterior NUMERIC NOT NULL,
  estoque_posterior NUMERIC NOT NULL,
  nota_fiscal_id UUID REFERENCES public.almoxarifado_notas_fiscais(id) ON DELETE SET NULL,
  ordem_compra_id UUID REFERENCES public.almoxarifado_ordens_compra(id) ON DELETE SET NULL,
  observacao TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tipo_movimento_check CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia'))
);

ALTER TABLE public.almoxarifado_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver movimentos da sua empresa"
  ON public.almoxarifado_movimentos FOR SELECT
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar movimentos para sua empresa"
  ON public.almoxarifado_movimentos FOR INSERT
  WITH CHECK (user_belongs_to_empresa(empresa_id));

-- 9. Tabela de Pedidos do Almoxarifado (requisições internas)
CREATE TABLE public.almoxarifado_pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  numero_pedido TEXT NOT NULL,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  solicitante TEXT NOT NULL,
  setor TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT status_pedido_check CHECK (status IN ('pendente', 'aprovado', 'atendido', 'cancelado'))
);

ALTER TABLE public.almoxarifado_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver pedidos da sua empresa"
  ON public.almoxarifado_pedidos FOR SELECT
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem criar pedidos para sua empresa"
  ON public.almoxarifado_pedidos FOR INSERT
  WITH CHECK (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem atualizar pedidos da sua empresa"
  ON public.almoxarifado_pedidos FOR UPDATE
  USING (user_belongs_to_empresa(empresa_id));

CREATE POLICY "Usuários podem deletar pedidos da sua empresa"
  ON public.almoxarifado_pedidos FOR DELETE
  USING (user_belongs_to_empresa(empresa_id));

-- 10. Tabela de Itens do Pedido
CREATE TABLE public.almoxarifado_pedidos_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.almoxarifado_pedidos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.almoxarifado_itens(id) ON DELETE CASCADE,
  quantidade_solicitada NUMERIC NOT NULL,
  quantidade_atendida NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.almoxarifado_pedidos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de pedidos da sua empresa"
  ON public.almoxarifado_pedidos_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_pedidos p
    WHERE p.id = almoxarifado_pedidos_itens.pedido_id
    AND user_belongs_to_empresa(p.empresa_id)
  ));

CREATE POLICY "Usuários podem criar itens de pedidos para sua empresa"
  ON public.almoxarifado_pedidos_itens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.almoxarifado_pedidos p
    WHERE p.id = almoxarifado_pedidos_itens.pedido_id
    AND user_belongs_to_empresa(p.empresa_id)
  ));

CREATE POLICY "Usuários podem atualizar itens de pedidos da sua empresa"
  ON public.almoxarifado_pedidos_itens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_pedidos p
    WHERE p.id = almoxarifado_pedidos_itens.pedido_id
    AND user_belongs_to_empresa(p.empresa_id)
  ));

CREATE POLICY "Usuários podem deletar itens de pedidos da sua empresa"
  ON public.almoxarifado_pedidos_itens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.almoxarifado_pedidos p
    WHERE p.id = almoxarifado_pedidos_itens.pedido_id
    AND user_belongs_to_empresa(p.empresa_id)
  ));

-- Atualizar CHECK constraint do cargo em profiles para incluir 'almoxarifado'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cargo_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cargo_check 
  CHECK (cargo IS NULL OR cargo IN ('gerente', 'financeiro', 'almoxarifado'));