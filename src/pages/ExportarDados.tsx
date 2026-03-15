import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Database, Users, Package, Factory, ShoppingCart, TreeDeciduous, ClipboardList, Wallet, Warehouse, Bell, Shield, FileDown, Copy, Check, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExportItem {
  id: string;
  label: string;
  description: string;
  table: string;
  icon: React.ElementType;
  category: string;
}

const exportItems: ExportItem[] = [
  { id: "empresas", label: "Empresas", description: "Dados cadastrais das empresas", table: "empresas", icon: Database, category: "Sistema" },
  { id: "profiles", label: "Usuários (Perfis)", description: "Perfis de todos os usuários", table: "profiles", icon: Users, category: "Sistema" },
  { id: "user_roles", label: "Funções de Usuários", description: "Roles atribuídas aos usuários", table: "user_roles", icon: Shield, category: "Sistema" },
  { id: "produtos", label: "Produtos", description: "Catálogo de produtos cadastrados", table: "produtos", icon: Package, category: "Operacional" },
  { id: "producao", label: "Produção", description: "Registros de produção", table: "producao", icon: Factory, category: "Operacional" },
  { id: "vendas", label: "Vendas", description: "Vendas de produtos serrados", table: "vendas", icon: ShoppingCart, category: "Operacional" },
  { id: "vendas_cavaco", label: "Vendas de Cavaco", description: "Vendas de cavaco", table: "vendas_cavaco", icon: ShoppingCart, category: "Resíduos" },
  { id: "vendas_serragem", label: "Vendas de Serragem", description: "Vendas de serragem", table: "vendas_serragem", icon: ShoppingCart, category: "Resíduos" },
  { id: "vendas_casqueiro", label: "Vendas de Casqueiro", description: "Vendas de casqueiro", table: "vendas_casqueiro", icon: ShoppingCart, category: "Resíduos" },
  { id: "toras", label: "Toras", description: "Registros de toras recebidas", table: "toras", icon: TreeDeciduous, category: "Operacional" },
  { id: "toras_serradas", label: "Toras Serradas", description: "Registros de toras serradas", table: "toras_serradas", icon: TreeDeciduous, category: "Operacional" },
  { id: "pedidos", label: "Pedidos", description: "Pedidos cadastrados", table: "pedidos", icon: ClipboardList, category: "Operacional" },
  { id: "itens_pedido", label: "Itens de Pedido", description: "Itens dos pedidos", table: "itens_pedido", icon: ClipboardList, category: "Operacional" },
  { id: "despesas", label: "Despesas", description: "Fluxo financeiro - despesas e receitas", table: "despesas", icon: Wallet, category: "Financeiro" },
  { id: "almoxarifado_itens", label: "Almoxarifado - Itens", description: "Itens do almoxarifado", table: "almoxarifado_itens", icon: Warehouse, category: "Almoxarifado" },
  { id: "almoxarifado_movimentos", label: "Almoxarifado - Movimentos", description: "Movimentações do estoque", table: "almoxarifado_movimentos", icon: Warehouse, category: "Almoxarifado" },
  { id: "almoxarifado_notas_fiscais", label: "Almoxarifado - Notas Fiscais", description: "Notas fiscais registradas", table: "almoxarifado_notas_fiscais", icon: Warehouse, category: "Almoxarifado" },
  { id: "almoxarifado_ordens_compra", label: "Almoxarifado - Ordens de Compra", description: "Ordens de compra", table: "almoxarifado_ordens_compra", icon: Warehouse, category: "Almoxarifado" },
  { id: "almoxarifado_fornecedores", label: "Almoxarifado - Fornecedores", description: "Fornecedores cadastrados", table: "almoxarifado_fornecedores", icon: Warehouse, category: "Almoxarifado" },
  { id: "almoxarifado_categorias", label: "Almoxarifado - Categorias", description: "Categorias do almoxarifado", table: "almoxarifado_categorias", icon: Warehouse, category: "Almoxarifado" },
  { id: "alertas_estoque", label: "Alertas de Estoque", description: "Configurações de alertas", table: "alertas_estoque", icon: Bell, category: "Sistema" },
  { id: "audit_logs", label: "Logs de Auditoria", description: "Registros de auditoria do sistema", table: "audit_logs", icon: Shield, category: "Sistema" },
];

const tableSchemas: Record<string, string> = {
  user_roles: `-- Enum type (criar antes das tabelas):
CREATE TYPE public.app_role AS ENUM ('admin', 'empresa', 'funcionario', 'user');

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);`,
  profiles: `CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  nome text NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  status text DEFAULT 'operacional',
  avatar_url text,
  motivo_bloqueio text,
  cargo text,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  empresas: `CREATE TABLE public.empresas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome_empresa text NOT NULL,
  cnpj text,
  telefone text,
  endereco text,
  logo_url text,
  cor_primaria text DEFAULT '#1e40af',
  cor_secundaria text DEFAULT '#64748b',
  logo_posicao_pdf text DEFAULT 'direita',
  logo_tamanho_pdf text DEFAULT 'medio',
  data_vencimento_anuidade date DEFAULT (CURRENT_DATE + interval '1 year'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  historico_anuidades: `CREATE TABLE public.historico_anuidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  valor_pago numeric NOT NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento_anterior date,
  data_novo_vencimento date NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  produtos: `CREATE TABLE public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL,
  largura numeric NOT NULL,
  espessura numeric NOT NULL,
  comprimento numeric NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  producao: `CREATE TABLE public.producao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade integer NOT NULL,
  m3 numeric NOT NULL,
  tora_id uuid REFERENCES public.toras(id),
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  vendas: `CREATE TABLE public.vendas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  tipo text NOT NULL,
  quantidade numeric NOT NULL,
  unidade_medida text NOT NULL,
  valor_unitario numeric NOT NULL,
  valor_total numeric NOT NULL,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  vendas_cavaco: `CREATE TABLE public.vendas_cavaco (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  tora_id uuid NOT NULL REFERENCES public.toras(id),
  toneladas numeric NOT NULL,
  valor_tonelada numeric NOT NULL,
  valor_total numeric NOT NULL,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  vendas_serragem: `CREATE TABLE public.vendas_serragem (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  toneladas numeric NOT NULL,
  valor_tonelada numeric NOT NULL,
  valor_total numeric NOT NULL,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  vendas_casqueiro: `CREATE TABLE public.vendas_casqueiro (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor_metro_estereo numeric NOT NULL,
  altura numeric NOT NULL,
  largura numeric NOT NULL,
  comprimento numeric NOT NULL,
  total_metro_estereo numeric NOT NULL,
  valor_total numeric NOT NULL,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  toras: `CREATE TABLE public.toras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  descricao text NOT NULL,
  peso numeric NOT NULL,
  toneladas numeric NOT NULL,
  numero_lote text,
  grossura numeric,
  peso_carga numeric,
  quantidade_toras integer,
  peso_por_tora numeric,
  peso_por_m3 numeric DEFAULT 0.6,
  valor_por_tonelada numeric,
  valor_total_carga numeric,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  toras_serradas: `CREATE TABLE public.toras_serradas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  tora_id uuid NOT NULL REFERENCES public.toras(id),
  peso numeric NOT NULL,
  toneladas numeric NOT NULL,
  quantidade_toras_serradas integer,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  pedidos: `CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  numero_pedido text NOT NULL,
  data_pedido date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  itens_pedido: `CREATE TABLE public.itens_pedido (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id),
  produto_id uuid REFERENCES public.produtos(id),
  descricao text NOT NULL,
  quantidade_m3 numeric NOT NULL,
  quantidade_pecas integer NOT NULL DEFAULT 0,
  quantidade_pecas_produzidas integer NOT NULL DEFAULT 0,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  despesas: `CREATE TABLE public.despesas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  categoria text NOT NULL,
  tipo text NOT NULL DEFAULT 'despesa',
  observacao text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_categorias: `CREATE TABLE public.almoxarifado_categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_fornecedores: `CREATE TABLE public.almoxarifado_fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  cnpj_cpf text,
  telefone text,
  email text,
  endereco text,
  contato text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_itens: `CREATE TABLE public.almoxarifado_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  unidade_medida text NOT NULL DEFAULT 'UN',
  categoria_id uuid REFERENCES public.almoxarifado_categorias(id),
  estoque_atual numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_movimentos: `CREATE TABLE public.almoxarifado_movimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.almoxarifado_itens(id),
  tipo text NOT NULL,
  quantidade numeric NOT NULL,
  estoque_anterior numeric NOT NULL,
  estoque_posterior numeric NOT NULL,
  nota_fiscal_id uuid REFERENCES public.almoxarifado_notas_fiscais(id),
  ordem_compra_id uuid REFERENCES public.almoxarifado_ordens_compra(id),
  observacao text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_notas_fiscais: `CREATE TABLE public.almoxarifado_notas_fiscais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  numero_nf text NOT NULL,
  tipo text NOT NULL,
  data_emissao date NOT NULL,
  data_entrada_saida date,
  fornecedor_id uuid REFERENCES public.almoxarifado_fornecedores(id),
  valor_total numeric NOT NULL DEFAULT 0,
  observacao text,
  ordem_compra_id uuid REFERENCES public.almoxarifado_ordens_compra(id),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_ordens_compra: `CREATE TABLE public.almoxarifado_ordens_compra (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  numero_ordem text NOT NULL,
  fornecedor_id uuid REFERENCES public.almoxarifado_fornecedores(id),
  data_ordem date NOT NULL DEFAULT CURRENT_DATE,
  data_aprovacao date,
  data_envio date,
  data_recebimento date,
  status text NOT NULL DEFAULT 'pendente',
  valor_total numeric NOT NULL DEFAULT 0,
  observacao text,
  aprovado_por uuid,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_ordens_itens: `CREATE TABLE public.almoxarifado_ordens_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id uuid NOT NULL REFERENCES public.almoxarifado_ordens_compra(id),
  item_id uuid NOT NULL REFERENCES public.almoxarifado_itens(id),
  quantidade numeric NOT NULL,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  quantidade_recebida numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_pedidos: `CREATE TABLE public.almoxarifado_pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  numero_pedido text NOT NULL,
  data_pedido date NOT NULL DEFAULT CURRENT_DATE,
  solicitante text NOT NULL,
  setor text,
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_pedidos_itens: `CREATE TABLE public.almoxarifado_pedidos_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.almoxarifado_pedidos(id),
  item_id uuid NOT NULL REFERENCES public.almoxarifado_itens(id),
  quantidade_solicitada numeric NOT NULL,
  quantidade_atendida numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  almoxarifado_nf_itens: `CREATE TABLE public.almoxarifado_nf_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id uuid NOT NULL REFERENCES public.almoxarifado_notas_fiscais(id),
  item_id uuid NOT NULL REFERENCES public.almoxarifado_itens(id),
  quantidade numeric NOT NULL,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  alertas_estoque: `CREATE TABLE public.alertas_estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  tipo text NOT NULL,
  produto_id uuid,
  quantidade_minima integer,
  m3_minimo numeric,
  toneladas_minima numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  audit_logs: `CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  empresa_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  configuracoes: `CREATE TABLE public.configuracoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL,
  valor text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
};

const allTablesSQL = Object.entries(tableSchemas)
  .map(([name, sql]) => `-- ======= ${name} =======\n${sql}`)
  .join('\n\n');

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map(h => `"${h}"`).join(","),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];
  return "\uFEFF" + csvRows.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SQLBlock({ sql, label }: { sql: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-muted/50 border border-border rounded-t-lg px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <ScrollArea className="max-h-[300px]">
        <pre className="bg-muted/30 border border-t-0 border-border rounded-b-lg p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre">
          {sql}
        </pre>
      </ScrollArea>
    </div>
  );
}

export default function ExportarDados() {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

  const exportTable = async (item: ExportItem) => {
    setLoadingId(item.id);
    try {
      const { data, error } = await supabase.from(item.table as any).select("*");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Sem dados", description: `A tabela "${item.label}" está vazia.` });
        return;
      }
      const csv = convertToCSV(data as unknown as Record<string, unknown>[]);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `${item.table}_${date}.csv`);
      toast({ title: "Exportado!", description: `${item.label} exportado com ${data.length} registros.` });
    } catch (err: any) {
      toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const exportAll = async () => {
    setLoadingAll(true);
    let exported = 0;
    for (const item of exportItems) {
      try {
        const { data, error } = await supabase.from(item.table as any).select("*");
        if (error || !data || data.length === 0) continue;
        const csv = convertToCSV(data as unknown as Record<string, unknown>[]);
        const date = new Date().toISOString().slice(0, 10);
        downloadCSV(csv, `${item.table}_${date}.csv`);
        exported++;
        await new Promise(r => setTimeout(r, 300));
      } catch {
        // skip
      }
    }
    toast({ title: "Exportação completa", description: `${exported} tabelas exportadas com sucesso.` });
    setLoadingAll(false);
  };

  const categories = [...new Set(exportItems.map(i => i.category))];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
          <p className="text-muted-foreground text-sm">Exporte dados em CSV ou copie o SQL das tabelas para migração</p>
        </div>
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="csv" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar CSV
          </TabsTrigger>
          <TabsTrigger value="sql" className="gap-2">
            <Code className="h-4 w-4" />
            SQL das Tabelas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button onClick={exportAll} disabled={loadingAll} size="lg" className="gap-2">
              {loadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Exportar Tudo
            </Button>
          </div>

          {categories.map(category => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{category}</h2>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {exportItems
                  .filter(i => i.category === category)
                  .map(item => {
                    const Icon = item.icon;
                    const isLoading = loadingId === item.id;
                    return (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm">{item.label}</CardTitle>
                          </div>
                          <CardDescription className="text-xs">{item.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => exportTable(item)}
                            disabled={isLoading || loadingAll}
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sql" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">SQL Completo - Todas as Tabelas</CardTitle>
                  <CardDescription>Copie todo o SQL necessário para recriar as tabelas do sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SQLBlock sql={allTablesSQL} label="Todas as tabelas (SQL completo)" />
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">SQL por Tabela</h2>
          <div className="space-y-4">
            {Object.entries(tableSchemas).map(([tableName, sql]) => (
              <SQLBlock key={tableName} sql={sql} label={tableName} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
