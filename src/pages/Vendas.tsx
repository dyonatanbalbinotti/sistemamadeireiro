import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShoppingCart, Edit, Trash2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Venda } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { formatDateBR, getTodayBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

export default function Vendas() {
  const { user } = useAuth();
  const { empresaId, loading: loadingEmpresaId } = useEmpresaId();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [producao, setProducao] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [produtoId, setProdutoId] = useState("");
  const [tipo, setTipo] = useState<'serrada' | 'tora'>('serrada');
  const [quantidade, setQuantidade] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [dataVenda, setDataVenda] = useState<Date>(new Date());
  
  // Campos para cálculo de conversão m³
  const [valorM3, setValorM3] = useState("");
  const [quantidadePecas, setQuantidadePecas] = useState("");
  const [totalM3, setTotalM3] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Carregar produção
        const { data: producaoData } = await supabase
          .from('producao')
          .select(`
            *,
            produtos (nome, tipo, largura, espessura, comprimento)
          `)
          .order('created_at', { ascending: false });
        
        if (producaoData) {
          setProducao(producaoData.map(p => ({
            id: p.id,
            produtoId: p.produto_id,
            tipo: p.produtos?.tipo || '',
            largura: Number(p.produtos?.largura || 0),
            espessura: Number(p.produtos?.espessura || 0),
            comprimento: Number(p.produtos?.comprimento || 0),
          })));
        }

        // Carregar vendas
        const { data: vendasData } = await supabase
          .from('vendas')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (vendasData) {
          setVendas(vendasData.map(v => ({
            id: v.id,
            data: v.data,
            produtoId: v.produto_id,
            tipo: v.tipo as 'serrada' | 'tora',
            quantidade: Number(v.quantidade),
            unidadeMedida: v.unidade_medida as 'unidade' | 'm3' | 'tonelada',
            valorUnitario: Number(v.valor_unitario),
            valorTotal: Number(v.valor_total),
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const qtd = parseFloat(quantidade);
    const valor = parseFloat(valorUnitario);
    
    if (!produtoId || isNaN(qtd) || isNaN(valor)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const valorTotal = qtd * valor;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('vendas')
          .update({
            produto_id: produtoId,
            tipo,
            quantidade: qtd,
            unidade_medida: 'unidade',
            valor_unitario: valor,
            valor_total: valorTotal,
          })
          .eq('id', editingId);

        if (error) throw error;

        setVendas(vendas.map(v => v.id === editingId ? {
          ...v,
          produtoId,
          tipo,
          quantidade: qtd,
          unidadeMedida: 'unidade',
          valorUnitario: valor,
          valorTotal,
        } : v));
        
        toast.success("Venda atualizada com sucesso!");
      } else {
        if (loadingEmpresaId) {
          toast.error("Aguardando carregamento dos dados da empresa...");
          return;
        }
        
        if (!empresaId) {
          toast.error("Erro ao identificar empresa. Entre em contato com o suporte.");
          console.error('empresaId não disponível:', { user: user?.id, empresaId });
          return;
        }

        // Formatar data como YYYY-MM-DD para evitar problemas de fuso horário
        const year = dataVenda.getFullYear();
        const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
        const day = String(dataVenda.getDate()).padStart(2, '0');
        const dataFormatada = `${year}-${month}-${day}`;

        const { data, error } = await supabase
          .from('vendas')
          .insert({
            data: dataFormatada,
            produto_id: produtoId,
            tipo,
            quantidade: qtd,
            unidade_medida: 'unidade',
            valor_unitario: valor,
            valor_total: valorTotal,
            user_id: user.id,
            empresa_id: empresaId,
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao inserir venda:', error);
          throw error;
        }

        if (data) {
          const novaVenda: Venda = {
            id: data.id,
            data: data.data,
            produtoId: data.produto_id,
            tipo: data.tipo as 'serrada' | 'tora',
            quantidade: Number(data.quantidade),
            unidadeMedida: 'unidade',
            valorUnitario: Number(data.valor_unitario),
            valorTotal: Number(data.valor_total),
          };

          setVendas([novaVenda, ...vendas]);
          toast.success(`Venda registrada: R$ ${valorTotal.toFixed(2)}`);
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      toast.error('Erro ao salvar venda');
    }
  };

  const resetForm = () => {
    setProdutoId("");
    setTipo('serrada');
    setQuantidade("");
    setValorUnitario("");
    setDataVenda(new Date());
    setEditingId(null);
    setValorM3("");
    setQuantidadePecas("");
    setTotalM3("");
  };

  const handleEdit = (venda: Venda) => {
    setProdutoId(venda.produtoId);
    setTipo(venda.tipo);
    setQuantidade(venda.quantidade.toString());
    setValorUnitario(venda.valorUnitario.toString());
    setDataVenda(new Date(venda.data + 'T00:00:00'));
    setEditingId(venda.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVendas(vendas.filter(v => v.id !== id));
      toast.success("Venda excluída");
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast.error('Erro ao excluir venda');
    }
  };

  if (loading || loadingEmpresaId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Registro e controle de vendas</p>
        </div>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Nova Venda</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dataVenda">Data da Venda</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-input",
                        !dataVenda && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataVenda ? formatDateBR(dataVenda) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataVenda}
                      onSelect={(date) => date && setDataVenda(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Produto</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as 'serrada' | 'tora')}>
                  <SelectTrigger className="border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serrada">Madeira Serrada</SelectItem>
                    <SelectItem value="tora">Tora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="produtoId">Produto</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger className="border-input">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {producao.map((prod) => (
                      <SelectItem key={prod.id} value={prod.produtoId}>
                        {prod.tipo} - {prod.largura}×{prod.espessura}×{prod.comprimento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade (Unidades)</Label>
                <Input
                  id="quantidade"
                  type="number"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="10"
                  className="border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorUnitario">Valor Unitário (R$)</Label>
                <Input
                  id="valorUnitario"
                  type="number"
                  step="0.01"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  placeholder="100.00"
                  className="border-input"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h3 className="font-semibold text-sm">Cálculo de Conversão m³ para Valor Unitário</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="valorM3">Valor do m³ (R$)</Label>
                  <Input
                    id="valorM3"
                    type="number"
                    step="0.01"
                    value={valorM3}
                    onChange={(e) => {
                      setValorM3(e.target.value);
                      // Calcular valor unitário automaticamente
                      const vm3 = parseFloat(e.target.value);
                      const tm3 = parseFloat(totalM3);
                      if (!isNaN(vm3) && !isNaN(tm3) && tm3 > 0) {
                        setValorUnitario((vm3 / tm3).toFixed(2));
                      }
                    }}
                    placeholder="1000.00"
                    className="border-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantidadePecas">Quantidade Peças</Label>
                  <Input
                    id="quantidadePecas"
                    type="number"
                    step="1"
                    value={quantidadePecas}
                    onChange={(e) => {
                      setQuantidadePecas(e.target.value);
                      setQuantidade(e.target.value); // Sincronizar com quantidade principal
                    }}
                    placeholder="10"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalM3">Total m³</Label>
                  <Input
                    id="totalM3"
                    type="number"
                    step="0.001"
                    value={totalM3}
                    onChange={(e) => {
                      setTotalM3(e.target.value);
                      // Recalcular valor unitário se houver valorM3
                      const vm3 = parseFloat(valorM3);
                      const tm3 = parseFloat(e.target.value);
                      if (!isNaN(vm3) && !isNaN(tm3) && tm3 > 0) {
                        setValorUnitario((vm3 / tm3).toFixed(2));
                      }
                    }}
                    placeholder="5.5"
                    className="border-input"
                  />
                </div>
              </div>
              
              {valorM3 && totalM3 && parseFloat(totalM3) > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Valor unitário calculado: <span className="text-lg font-bold text-primary">
                      R$ {(parseFloat(valorM3) / parseFloat(totalM3)).toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fórmula: Valor do m³ ÷ Total m³ = {valorM3} ÷ {totalM3} = R$ {(parseFloat(valorM3) / parseFloat(totalM3)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {editingId ? "Atualizar" : "Registrar"} Venda
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((venda) => {
                  const prod = producao.find(p => p.id === venda.produtoId);
                  return (
                    <TableRow key={venda.id}>
                      <TableCell>{formatDateBR(venda.data)}</TableCell>
                      <TableCell className="font-medium">
                        {prod ? `${prod.tipo} ${prod.largura}×${prod.espessura}×${prod.comprimento}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {venda.quantidade} un
                      </TableCell>
                      <TableCell>R$ {venda.valorUnitario.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-primary">R$ {venda.valorTotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(venda)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDelete(venda.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
