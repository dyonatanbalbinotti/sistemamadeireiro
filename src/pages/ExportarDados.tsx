import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Database, Users, Package, Factory, ShoppingCart, TreeDeciduous, ClipboardList, Wallet, Warehouse, Bell, Shield, FileDown, Copy, Check, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return "\uFEFF" + csvRows.join("\n"); // BOM for Excel UTF-8
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
        // Small delay to prevent browser blocking multiple downloads
        await new Promise(r => setTimeout(r, 300));
      } catch {
        // skip failed tables
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
          <p className="text-muted-foreground text-sm">Exporte os dados do sistema em formato CSV</p>
        </div>
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
    </div>
  );
}
