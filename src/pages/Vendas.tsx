import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShoppingCart, Edit, Trash2, CalendarIcon, Layers } from "lucide-react";
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
  const [tipoVenda, setTipoVenda] = useState<'madeira' | 'cavaco'>('madeira');
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasCavaco, setVendasCavaco] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [toras, setToras] = useState<any[]>([]);
  const [cavacoDisponivel, setCavacoDisponivel] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos para cálculo de conversão m³ (primeiro passo)
  const [produtoM3, setProdutoM3] = useState("");
  const [quantidadePecas, setQuantidadePecas] = useState("");
  const [totalM3, setTotalM3] = useState("");
  const [valorM3, setValorM3] = useState("");
  
  // Campos para registro da venda (segundo passo)
  const [dataVenda, setDataVenda] = useState<Date>(new Date());
  const [tipo, setTipo] = useState<'serrada' | 'tora'>('serrada');
  const [quantidadeVenda, setQuantidadeVenda] = useState(""); // Quantidade independente para o Passo 2
  const [valorUnitario, setValorUnitario] = useState("");

  // Campos para venda de cavaco
  const [toraIdCavaco, setToraIdCavaco] = useState("");
  const [toneladasVendidas, setToneladasVendidas] = useState("");
  const [valorTonelada, setValorTonelada] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Carregar produtos
        const { data: produtosData } = await supabase
          .from('produtos')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (produtosData) {
          setProdutos(produtosData.map(p => ({
            id: p.id,
            nome: p.nome,
            tipo: p.tipo,
            largura: Number(p.largura || 0),
            espessura: Number(p.espessura || 0),
            comprimento: Number(p.comprimento || 0),
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

        // Carregar toras
        const { data: torasData } = await supabase
          .from('toras')
          .select('*')
          .order('created_at', { ascending: false });

        if (torasData) {
          setToras(torasData);
        }

        // Carregar vendas de cavaco
        const { data: vendasCavacoData } = await supabase
          .from('vendas_cavaco')
          .select('*, toras(descricao)')
          .order('created_at', { ascending: false });

        if (vendasCavacoData) {
          setVendasCavaco(vendasCavacoData);
        }

        // Calcular cavaco disponível
        const { data: producaoData } = await supabase
          .from('producao')
          .select('*, toras(id)')
          .order('created_at', { ascending: false });

        if (torasData && producaoData && vendasCavacoData) {
          const calculoCavaco = torasData.map(tora => {
            const producoesDaTora = producaoData.filter(p => p.tora_id === tora.id);
            const m3Total = producoesDaTora.reduce((sum, p) => sum + Number(p.m3), 0);
            
            const pesoPorM3 = Number(tora.peso_por_m3) || 0.6;
            const toneladasMadeirasSerradas = pesoPorM3 * m3Total;
            const cavacoTotal = Number(tora.toneladas) - toneladasMadeirasSerradas;
            
            const vendasDaTora = vendasCavacoData.filter(v => v.tora_id === tora.id);
            const toneladasVendidas = vendasDaTora.reduce((sum, v) => sum + Number(v.toneladas), 0);
            const cavacoDisponivel = Math.max(0, cavacoTotal - toneladasVendidas);

            return {
              id: tora.id,
              descricao: tora.descricao,
              cavacoDisponivel,
            };
          });

          setCavacoDisponivel(calculoCavaco);
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

  // Calcular automaticamente o Total m³ quando produto ou quantidade mudar
  useEffect(() => {
    if (produtoM3 && quantidadePecas && produtos.length > 0) {
      const prod = produtos.find(p => p.id === produtoM3);
      const qtd = parseFloat(quantidadePecas);
      
      if (prod && !isNaN(qtd) && qtd > 0) {
        // Cálculo: largura * espessura * comprimento * quantidade
        // Os valores já estão em metros no banco de dados
        const m3Total = prod.largura * prod.espessura * prod.comprimento * qtd;
        setTotalM3(m3Total.toFixed(3));
      } else {
        setTotalM3("");
      }
    } else {
      setTotalM3("");
    }
  }, [produtoM3, quantidadePecas, produtos]);

  // Calcular automaticamente o Valor Unitário quando valorM3 ou quantidadePecas mudar
  useEffect(() => {
    if (valorM3 && quantidadePecas) {
      const vm3 = parseFloat(valorM3);
      const qtd = parseFloat(quantidadePecas);
      
      if (!isNaN(vm3) && !isNaN(qtd) && qtd > 0) {
        setValorUnitario((vm3 / qtd).toFixed(2));
      } else {
        setValorUnitario("");
      }
    } else {
      setValorUnitario("");
    }
  }, [valorM3, quantidadePecas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const qtd = parseFloat(quantidadeVenda);
    const valor = parseFloat(valorUnitario);
    
    if (!produtoM3 || isNaN(qtd) || isNaN(valor)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const valorTotal = qtd * valor;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('vendas')
          .update({
            produto_id: produtoM3,
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
          produtoId: produtoM3,
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
            produto_id: produtoM3,
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

  const handleSubmitCavaco = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const toneladas = parseFloat(toneladasVendidas);
    const valor = parseFloat(valorTonelada);
    
    if (!toraIdCavaco || isNaN(toneladas) || isNaN(valor)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const cavacoInfo = cavacoDisponivel.find(c => c.id === toraIdCavaco);
    if (cavacoInfo && toneladas > cavacoInfo.cavacoDisponivel) {
      toast.error(`Apenas ${cavacoInfo.cavacoDisponivel.toFixed(2)} T disponível para esta tora`);
      return;
    }

    const valorTotal = toneladas * valor;

    try {
      if (loadingEmpresaId) {
        toast.error("Aguardando carregamento dos dados da empresa...");
        return;
      }
      
      if (!empresaId) {
        toast.error("Erro ao identificar empresa. Entre em contato com o suporte.");
        return;
      }

      const year = dataVenda.getFullYear();
      const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
      const day = String(dataVenda.getDate()).padStart(2, '0');
      const dataFormatada = `${year}-${month}-${day}`;

      const { data, error } = await supabase
        .from('vendas_cavaco')
        .insert({
          data: dataFormatada,
          tora_id: toraIdCavaco,
          toneladas: toneladas,
          valor_tonelada: valor,
          valor_total: valorTotal,
          user_id: user.id,
          empresa_id: empresaId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setVendasCavaco([data, ...vendasCavaco]);
        
        // Atualizar cavaco disponível
        setCavacoDisponivel(prev => 
          prev.map(c => 
            c.id === toraIdCavaco 
              ? { ...c, cavacoDisponivel: c.cavacoDisponivel - toneladas }
              : c
          )
        );
        
        toast.success(`Venda de cavaco registrada: R$ ${valorTotal.toFixed(2)}`);
      }
      
      resetFormCavaco();
    } catch (error) {
      console.error('Erro ao salvar venda de cavaco:', error);
      toast.error('Erro ao salvar venda de cavaco');
    }
  };

  const resetForm = () => {
    setProdutoM3("");
    setQuantidadePecas("");
    setQuantidadeVenda("");
    setTotalM3("");
    setValorM3("");
    setValorUnitario("");
    setTipo('serrada');
    setDataVenda(new Date());
    setEditingId(null);
  };

  const resetFormCavaco = () => {
    setToraIdCavaco("");
    setToneladasVendidas("");
    setValorTonelada("");
    setDataVenda(new Date());
  };

  const handleEdit = (venda: Venda) => {
    setProdutoM3(venda.produtoId);
    setQuantidadePecas(venda.quantidade.toString());
    setQuantidadeVenda(venda.quantidade.toString());
    setTipo(venda.tipo);
    setValorUnitario(venda.valorUnitario.toString());
    setDataVenda(new Date(venda.data + 'T00:00:00'));
    setEditingId(venda.id);
    
    // Recalcular m³ e valor do m³
    const prod = produtos.find(p => p.id === venda.produtoId);
    if (prod) {
      const m3PorPeca = (prod.largura / 100) * (prod.espessura / 100) * prod.comprimento;
      const m3Total = m3PorPeca * venda.quantidade;
      setTotalM3(m3Total.toFixed(3));
      setValorM3((venda.valorUnitario * venda.quantidade).toFixed(2));
    }
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

  const handleDeleteCavaco = async (id: string) => {
    try {
      const vendaCavaco = vendasCavaco.find(v => v.id === id);
      
      const { error } = await supabase
        .from('vendas_cavaco')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVendasCavaco(vendasCavaco.filter(v => v.id !== id));
      
      // Restaurar cavaco disponível
      if (vendaCavaco) {
        setCavacoDisponivel(prev => 
          prev.map(c => 
            c.id === vendaCavaco.tora_id 
              ? { ...c, cavacoDisponivel: c.cavacoDisponivel + Number(vendaCavaco.toneladas) }
              : c
          )
        );
      }
      
      toast.success("Venda de cavaco excluída");
    } catch (error) {
      console.error('Erro ao excluir venda de cavaco:', error);
      toast.error('Erro ao excluir venda de cavaco');
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

      {/* Botões de seleção de tipo de venda */}
      <div className="flex gap-3">
        <Button
          variant={tipoVenda === 'madeira' ? 'default' : 'outline'}
          onClick={() => setTipoVenda('madeira')}
          className="flex-1"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Vendas de Madeiras Serradas
        </Button>
        <Button
          variant={tipoVenda === 'cavaco' ? 'default' : 'outline'}
          onClick={() => setTipoVenda('cavaco')}
          className="flex-1"
        >
          <Layers className="h-4 w-4 mr-2" />
          Vendas de Cavaco
        </Button>
      </div>

      {tipoVenda === 'madeira' ? (
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Nova Venda de Madeira</CardTitle>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PASSO 1: Cálculo de Conversão m³ */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4 border-2 border-primary/20">
              <h3 className="font-semibold text-lg text-primary">Passo 1: Cálculo de Conversão m³ para Valor Unitário</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="produtoM3">Produto *</Label>
                  <Select 
                    value={produtoM3} 
                    onValueChange={(value) => {
                      setProdutoM3(value);
                    }}
                  >
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          {prod.tipo} - {prod.largura}×{prod.espessura}×{prod.comprimento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidadePecas">Quantidade de Peças *</Label>
                  <Input
                    id="quantidadePecas"
                    type="number"
                    step="1"
                    value={quantidadePecas}
                    onChange={(e) => {
                      setQuantidadePecas(e.target.value);
                    }}
                    placeholder="10"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalM3">Total m³</Label>
                  <div className="relative">
                    <Input
                      id="totalM3"
                      type="text"
                      value={totalM3 || "0.000"}
                      readOnly
                      className="border-input bg-muted/30 font-bold text-lg text-primary"
                    />
                    {!totalM3 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecione um produto e informe a quantidade para calcular
                      </p>
                    )}
                    {totalM3 && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Cálculo realizado: {totalM3} m³
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorM3">Valor do m³ (R$) *</Label>
                  <Input
                    id="valorM3"
                    type="number"
                    step="0.01"
                    value={valorM3}
                    onChange={(e) => setValorM3(e.target.value)}
                    placeholder="1000.00"
                    className="border-input"
                  />
                </div>
              </div>
              
              {valorM3 && quantidadePecas && parseFloat(quantidadePecas) > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Valor unitário calculado: <span className="text-lg font-bold text-primary">
                      R$ {(parseFloat(valorM3) / parseFloat(quantidadePecas)).toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fórmula: Valor do m³ ÷ Quantidade de peças = {valorM3} ÷ {quantidadePecas} = R$ {(parseFloat(valorM3) / parseFloat(quantidadePecas)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* PASSO 2: Registro da Venda */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-border">
              <h3 className="font-semibold text-lg">Passo 2: Registro da Nova Venda</h3>
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
                  <Label htmlFor="produtoDisplay">Produto</Label>
                  <Input
                    id="produtoDisplay"
                    type="text"
                    value={produtoM3 ? produtos.find(p => p.id === produtoM3)?.tipo + ' - ' + 
                           produtos.find(p => p.id === produtoM3)?.largura + '×' + 
                           produtos.find(p => p.id === produtoM3)?.espessura + '×' + 
                           produtos.find(p => p.id === produtoM3)?.comprimento : ''}
                    readOnly
                    placeholder="Produto selecionado acima"
                    className="border-input bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidadeVenda">Quantidade</Label>
                  <Input
                    id="quantidadeVenda"
                    type="number"
                    value={quantidadeVenda}
                    onChange={(e) => setQuantidadeVenda(e.target.value)}
                    placeholder="Digite a quantidade de peças vendidas"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorUnitario">Valor Unitário (R$)</Label>
                  <Input
                    id="valorUnitario"
                    type="text"
                    value={valorUnitario}
                    readOnly
                    placeholder="Calculado automaticamente"
                    className="border-input bg-muted font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorTotal">Valor Total (R$)</Label>
                  <Input
                    id="valorTotal"
                    type="text"
                    value={valorUnitario && quantidadeVenda ? (parseFloat(valorUnitario) * parseFloat(quantidadeVenda)).toFixed(2) : ''}
                    readOnly
                    placeholder="0.00"
                    className="border-input bg-muted font-bold text-primary"
                  />
                </div>
              </div>
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
      ) : (
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Nova Venda de Cavaco</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitCavaco} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataVendaCavaco">Data da Venda</Label>
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
                  <Label htmlFor="toraIdCavaco">Lote (Tora) *</Label>
                  <Select value={toraIdCavaco} onValueChange={setToraIdCavaco}>
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {cavacoDisponivel.map((cavaco) => (
                        <SelectItem key={cavaco.id} value={cavaco.id}>
                          {cavaco.descricao} - Disponível: {cavaco.cavacoDisponivel.toFixed(2)} T
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toneladasVendidas">Toneladas Vendidas *</Label>
                  <Input
                    id="toneladasVendidas"
                    type="number"
                    step="0.01"
                    min="0"
                    value={toneladasVendidas}
                    onChange={(e) => setToneladasVendidas(e.target.value)}
                    placeholder="0.00"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorTonelada">Valor por Tonelada (R$) *</Label>
                  <Input
                    id="valorTonelada"
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorTonelada}
                    onChange={(e) => setValorTonelada(e.target.value)}
                    placeholder="0.00"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="valorTotalCavaco">Valor Total (R$)</Label>
                  <Input
                    id="valorTotalCavaco"
                    type="text"
                    value={toneladasVendidas && valorTonelada ? (parseFloat(toneladasVendidas) * parseFloat(valorTonelada)).toFixed(2) : ''}
                    readOnly
                    placeholder="0.00"
                    className="border-input bg-muted font-bold text-primary text-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Layers className="h-4 w-4 mr-2" />
                  Registrar Venda de Cavaco
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">
            Histórico de Vendas {tipoVenda === 'madeira' ? 'de Madeiras' : 'de Cavaco'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            {tipoVenda === 'madeira' ? (
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
                  {vendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma venda registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendas.map((venda) => {
                      const prod = produtos.find(p => p.id === venda.produtoId);
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
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Data</TableHead>
                    <TableHead>Lote (Tora)</TableHead>
                    <TableHead>Toneladas</TableHead>
                    <TableHead>Valor/Ton</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasCavaco.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma venda de cavaco registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendasCavaco.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell>{formatDateBR(venda.data)}</TableCell>
                        <TableCell className="font-medium">
                          {venda.toras?.descricao || 'N/A'}
                        </TableCell>
                        <TableCell>{Number(venda.toneladas).toFixed(2)} T</TableCell>
                        <TableCell>R$ {Number(venda.valor_tonelada).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-primary">R$ {Number(venda.valor_total).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDeleteCavaco(venda.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
