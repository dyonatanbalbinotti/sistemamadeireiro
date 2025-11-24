import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ItemPedido {
  id: string;
  descricao: string;
  quantidade_m3: number;
  quantidade_produzida: number;
  concluido: boolean;
  produto_id?: string;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  data_pedido: string;
  concluido: boolean;
  observacao?: string;
  itens: ItemPedido[];
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form states
  const [numeroPedido, setNumeroPedido] = useState("");
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<Array<{ descricao: string; quantidade_m3: string; produto_id?: string }>>([
    { descricao: "", quantidade_m3: "", produto_id: "" }
  ]);

  useEffect(() => {
    fetchPedidos();
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', user.user.id)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_id', user.user.id)
        .order('data_pedido', { ascending: false });

      if (pedidosError) throw pedidosError;

      if (pedidosData) {
        const pedidosComItens = await Promise.all(
          pedidosData.map(async (pedido) => {
            const { data: itensData, error: itensError } = await supabase
              .from('itens_pedido')
              .select('*')
              .eq('pedido_id', pedido.id)
              .order('created_at');

            if (itensError) throw itensError;

            return {
              ...pedido,
              itens: itensData || []
            };
          })
        );

        setPedidos(pedidosComItens);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: "Erro ao carregar pedidos",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItens([...itens, { descricao: "", quantidade_m3: "", produto_id: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setItens(newItens);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroPedido || itens.length === 0 || itens.some(item => !item.descricao || !item.quantidade_m3)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o número do pedido e todos os itens.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          empresa_id: user.user.id,
          numero_pedido: numeroPedido,
          data_pedido: dataPedido,
          observacao: observacao || null,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      const itensParaInserir = itens.map(item => ({
        pedido_id: pedido.id,
        descricao: item.descricao,
        quantidade_m3: parseFloat(item.quantidade_m3),
        produto_id: item.produto_id || null,
      }));

      const { error: itensError } = await supabase
        .from('itens_pedido')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast({
        title: "Pedido criado",
        description: "O pedido foi criado com sucesso.",
      });

      setDialogOpen(false);
      setNumeroPedido("");
      setDataPedido(new Date().toISOString().split('T')[0]);
      setObservacao("");
      setItens([{ descricao: "", quantidade_m3: "", produto_id: "" }]);
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: "Erro ao criar pedido",
        description: "Não foi possível criar o pedido.",
        variant: "destructive",
      });
    }
  };

  const updateQuantidadeProduzida = async (pedidoId: string, itemId: string, quantidade: number) => {
    try {
      const item = pedidos.find(p => p.id === pedidoId)?.itens.find(i => i.id === itemId);
      if (!item) return;

      if (quantidade < 0 || quantidade > item.quantidade_m3) {
        toast({
          title: "Quantidade inválida",
          description: `A quantidade produzida deve estar entre 0 e ${item.quantidade_m3.toFixed(2)} m³.`,
          variant: "destructive",
        });
        return;
      }

      const concluido = quantidade >= item.quantidade_m3;

      const { error } = await supabase
        .from('itens_pedido')
        .update({ 
          quantidade_produzida: quantidade,
          concluido: concluido
        })
        .eq('id', itemId);

      if (error) throw error;

      fetchPedidos();

      toast({
        title: "Quantidade atualizada",
        description: "A quantidade produzida foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade produzida:', error);
      toast({
        title: "Erro ao atualizar quantidade",
        description: "Não foi possível atualizar a quantidade produzida.",
        variant: "destructive",
      });
    }
  };

  const toggleItemConcluido = async (pedidoId: string, itemId: string, concluido: boolean) => {
    try {
      const item = pedidos.find(p => p.id === pedidoId)?.itens.find(i => i.id === itemId);
      if (!item) return;

      const novosConcluido = !concluido;
      const novaQuantidade = novosConcluido ? item.quantidade_m3 : 0;

      const { error } = await supabase
        .from('itens_pedido')
        .update({ 
          concluido: novosConcluido,
          quantidade_produzida: novaQuantidade
        })
        .eq('id', itemId);

      if (error) throw error;

      // Atualizar estado local
      setPedidos(pedidos.map(pedido => {
        if (pedido.id === pedidoId) {
          return {
            ...pedido,
            itens: pedido.itens.map(i =>
              i.id === itemId ? { ...i, concluido: novosConcluido, quantidade_produzida: novaQuantidade } : i
            )
          };
        }
        return pedido;
      }));

      // Verificar se todos os itens estão concluídos
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (pedido) {
        const todosItensCompletos = pedido.itens
          .map(i => i.id === itemId ? novosConcluido : i.concluido)
          .every(c => c);

        if (todosItensCompletos) {
          await supabase
            .from('pedidos')
            .update({ concluido: true })
            .eq('id', pedidoId);
          
          fetchPedidos();
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro ao atualizar item",
        description: "Não foi possível atualizar o item.",
        variant: "destructive",
      });
    }
  };

  const togglePedidoConcluido = async (pedidoId: string, concluido: boolean) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ concluido: !concluido })
        .eq('id', pedidoId);

      if (error) throw error;

      // Atualizar todos os itens do pedido
      await supabase
        .from('itens_pedido')
        .update({ concluido: !concluido })
        .eq('pedido_id', pedidoId);

      fetchPedidos();
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast({
        title: "Erro ao atualizar pedido",
        description: "Não foi possível atualizar o pedido.",
        variant: "destructive",
      });
    }
  };

  const deletePedido = async (pedidoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', pedidoId);

      if (error) throw error;

      toast({
        title: "Pedido excluído",
        description: "O pedido foi excluído com sucesso.",
      });

      fetchPedidos();
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast({
        title: "Erro ao excluir pedido",
        description: "Não foi possível excluir o pedido.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-tech font-bold text-foreground mb-2">
            Pedidos
          </h1>
          <p className="text-muted-foreground">Gerencie os pedidos de produção</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Pedido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número do Pedido</Label>
                  <Input
                    id="numero"
                    value={numeroPedido}
                    onChange={(e) => setNumeroPedido(e.target.value)}
                    placeholder="Ex: 001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataPedido}
                    onChange={(e) => setDataPedido(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações sobre o pedido (opcional)"
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Itens do Pedido</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                </div>

                {itens.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      {itens.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Produto (opcional)</Label>
                      <Select
                        value={item.produto_id}
                        onValueChange={(value) => handleItemChange(index, 'produto_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {produtos.map((produto) => (
                            <SelectItem key={produto.id} value={produto.id}>
                              {produto.nome} ({produto.largura}x{produto.espessura}x{produto.comprimento})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        value={item.descricao}
                        onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                        placeholder="Ex: 30 (dimensão do produto)"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Quantidade (m³)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantidade_m3}
                        onChange={(e) => handleItemChange(index, 'quantidade_m3', e.target.value)}
                        placeholder="Ex: 10.00"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Pedido</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando pedidos...</div>
      ) : pedidos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum pedido cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pedidos.map((pedido) => (
            <Card
              key={pedido.id}
              className={`glass-effect neon-border ${
                pedido.concluido ? 'bg-primary/5 border-primary' : ''
              }`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePedidoConcluido(pedido.id, pedido.concluido)}
                        className="p-0 h-6 w-6"
                      >
                        {pedido.concluido ? (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </Button>
                      Pedido {pedido.numero_pedido}
                      {pedido.concluido && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Concluído
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Data: {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                    </p>
                    {pedido.observacao && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Obs: {pedido.observacao}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePedido(pedido.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pedido.itens.map((item) => {
                    const restante = item.quantidade_m3 - item.quantidade_produzida;
                    const percentual = (item.quantidade_produzida / item.quantidade_m3) * 100;
                    
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${
                          item.concluido ? 'bg-primary/5 border-primary/20' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <Checkbox
                            checked={item.concluido}
                            onCheckedChange={() =>
                              toggleItemConcluido(pedido.id, item.id, item.concluido)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                              {item.quantidade_m3.toFixed(2)} m³ de {item.descricao}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Label className="text-xs text-muted-foreground">Produzido:</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={item.quantidade_m3}
                                value={item.quantidade_produzida}
                                onChange={(e) => updateQuantidadeProduzida(pedido.id, item.id, parseFloat(e.target.value) || 0)}
                                className="w-24 h-7 text-sm"
                                disabled={pedido.concluido}
                              />
                              <span className="text-xs text-muted-foreground">m³</span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Restante: {restante.toFixed(2)} m³</span>
                                <span className={`font-medium ${item.concluido ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {percentual.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${item.concluido ? 'bg-primary' : 'bg-primary/60'}`}
                                  style={{ width: `${Math.min(percentual, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium">
                    Total: {pedido.itens.reduce((sum, item) => sum + Number(item.quantidade_m3), 0).toFixed(2)} m³
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Concluídos: {pedido.itens.filter(i => i.concluido).length} de {pedido.itens.length} itens
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
