import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Plus, Trash2, Edit, TrendingDown, Calendar, DollarSign, Filter } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Despesa {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  observacao: string | null;
  created_at: string;
}

const CATEGORIAS = [
  "Folha Salarial",
  "Impostos",
  "Energia Elétrica",
  "Água",
  "Combustível",
  "Manutenção",
  "Material de Escritório",
  "Transporte",
  "Alimentação",
  "Empréstimo",
  "Aluguel",
  "Serviços Terceirizados",
  "Outros",
];

// Professional and vibrant color palette for better visualization
const CHART_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#84CC16", // Lime
  "#A855F7", // Purple
  "#64748B", // Slate
];

export default function FluxoFinanceiro() {
  const { user } = useAuth();
  const { empresaId, loading: empresaLoading } = useEmpresaId();
  const { toast } = useToast();
  
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  
  // Form state
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [observacao, setObservacao] = useState("");
  
  // Filtro por mês
  const [mesFiltro, setMesFiltro] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    if (empresaId) {
      fetchDespesas();
    }
  }, [empresaId, mesFiltro]);

  const fetchDespesas = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const dataInicio = startOfMonth(parseISO(`${mesFiltro}-01`));
      const dataFim = endOfMonth(parseISO(`${mesFiltro}-01`));
      
      const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data", format(dataInicio, "yyyy-MM-dd"))
        .lte("data", format(dataFim, "yyyy-MM-dd"))
        .order("data", { ascending: false });
      
      if (error) throw error;
      setDespesas(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar despesas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as despesas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setCategoria("");
    setData(format(new Date(), "yyyy-MM-dd"));
    setObservacao("");
    setEditingDespesa(null);
  };

  const handleOpenDialog = (despesa?: Despesa) => {
    if (despesa) {
      setEditingDespesa(despesa);
      setDescricao(despesa.descricao);
      setValor(despesa.valor.toString());
      setCategoria(despesa.categoria);
      setData(despesa.data);
      setObservacao(despesa.observacao || "");
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!empresaId || !user) return;
    
    if (!descricao.trim() || !valor || !categoria || !data) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const valorNum = parseFloat(valor.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor numérico positivo.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingDespesa) {
        const { error } = await supabase
          .from("despesas")
          .update({
            descricao: descricao.trim(),
            valor: valorNum,
            categoria,
            data,
            observacao: observacao.trim() || null,
          })
          .eq("id", editingDespesa.id);
        
        if (error) throw error;
        toast({ title: "Sucesso", description: "Despesa atualizada!" });
      } else {
        const { error } = await supabase.from("despesas").insert({
          empresa_id: empresaId,
          user_id: user.id,
          tipo: "despesa",
          descricao: descricao.trim(),
          valor: valorNum,
          categoria,
          data,
          observacao: observacao.trim() || null,
        });
        
        if (error) throw error;
        toast({ title: "Sucesso", description: "Despesa adicionada!" });
      }
      
      handleCloseDialog();
      fetchDespesas();
    } catch (error: any) {
      console.error("Erro ao salvar despesa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a despesa.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Despesa excluída!" });
      fetchDespesas();
    } catch (error: any) {
      console.error("Erro ao excluir despesa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a despesa.",
        variant: "destructive",
      });
    }
  };

  // Agrupar por categoria para gráfico
  const despesasPorCategoria = despesas.reduce((acc, d) => {
    const cat = d.categoria;
    acc[cat] = (acc[cat] || 0) + Number(d.valor);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(despesasPorCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);

  if (empresaLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fluxo Financeiro</h1>
          <p className="text-muted-foreground">Gerencie as despesas da empresa</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="w-[180px]"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingDespesa ? "Editar Despesa" : "Adicionar Despesa"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da despesa financeira.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    placeholder="Ex: Pagamento de energia"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input
                    id="valor"
                    type="text"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea
                    id="observacao"
                    placeholder="Observações adicionais..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingDespesa ? "Salvar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(`${mesFiltro}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lançamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{despesas.length}</div>
            <p className="text-xs text-muted-foreground">despesas no mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.length}</div>
            <p className="text-xs text-muted-foreground">categorias utilizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma despesa no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma despesa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    despesas.slice(0, 10).map((despesa) => (
                      <TableRow key={despesa.id}>
                        <TableCell className="text-xs">
                          {format(parseISO(despesa.data), "dd/MM/yy")}
                        </TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate">
                          {despesa.descricao}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {despesa.categoria}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-destructive">
                          R$ {Number(despesa.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDialog(despesa)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(despesa.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Table */}
      {despesas.length > 10 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Todas as Despesas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.map((despesa) => (
                    <TableRow key={despesa.id}>
                      <TableCell>{format(parseISO(despesa.data), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{despesa.descricao}</TableCell>
                      <TableCell>{despesa.categoria}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {despesa.observacao || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        R$ {Number(despesa.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenDialog(despesa)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(despesa.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
