import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Factory, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { calcularCubagem } from "@/lib/storage";
import { MadeiraProduzida, Tora, ToraSerrada, Produto } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { getTodayBR, formatDateBR } from "@/lib/dateUtils";
import { subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export default function Producao() {
  const { user } = useAuth();
  const { empresaId, loading: loadingEmpresaId } = useEmpresaId();
  const [producao, setProducao] = useState<MadeiraProduzida[]>([]);
  const [toras, setToras] = useState<Tora[]>([]);
  const [torasSerradas, setTorasSerradas] = useState<ToraSerrada[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states - Produção
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [toraSelecionada, setToraSelecionada] = useState("");
  const [dataProducao, setDataProducao] = useState("");

  // Form states - Produtos
  const [nomeProduto, setNomeProduto] = useState("");
  const [tipoProduto, setTipoProduto] = useState("");
  const [larguraProduto, setLarguraProduto] = useState("");
  const [espessuraProduto, setEspessuraProduto] = useState("");
  const [comprimentoProduto, setComprimentoProduto] = useState("");

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
            largura: Number(p.largura),
            espessura: Number(p.espessura),
            comprimento: Number(p.comprimento),
          })));
        }

        // Carregar toras
        const { data: torasData } = await supabase
          .from('toras')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (torasData) {
          setToras(torasData.map(t => ({
            id: t.id,
            data: t.data,
            descricao: t.descricao,
            peso: Number(t.peso),
            toneladas: Number(t.toneladas),
            grossura: t.grossura ? Number(t.grossura) : undefined,
            pesoCarga: t.peso_carga ? Number(t.peso_carga) : undefined,
            quantidadeToras: t.quantidade_toras ? Number(t.quantidade_toras) : undefined,
            pesoPorTora: t.peso_por_tora ? Number(t.peso_por_tora) : undefined,
          })));
        }

        // Carregar produção
        const { data: producaoData } = await supabase
          .from('producao')
          .select(`
            *,
            produtos (nome, tipo, largura, espessura, comprimento),
            toras (descricao)
          `)
          .order('created_at', { ascending: false });
        
        if (producaoData) {
          setProducao(producaoData.map(p => ({
            id: p.id,
            data: p.data,
            produtoId: p.produto_id,
            produtoNome: p.produtos?.nome || '',
            tipo: p.produtos?.tipo || '',
            largura: Number(p.produtos?.largura || 0),
            espessura: Number(p.produtos?.espessura || 0),
            comprimento: Number(p.produtos?.comprimento || 0),
            quantidade: p.quantidade,
            m3: Number(p.m3),
            toraId: p.tora_id,
            toraDescricao: p.toras?.descricao,
          })));
        }

        // Carregar toras serradas
        const { data: torasSerradasData } = await supabase
          .from('toras_serradas')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (torasSerradasData) {
          setTorasSerradas(torasSerradasData.map(ts => ({
            id: ts.id,
            data: ts.data,
            toraId: ts.tora_id,
            peso: Number(ts.peso),
            toneladas: Number(ts.toneladas),
            quantidadeTorasSerradas: ts.quantidade_toras_serradas ? Number(ts.quantidade_toras_serradas) : undefined,
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

  const handleSubmitProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const l = parseFloat(larguraProduto);
    const es = parseFloat(espessuraProduto);
    const c = parseFloat(comprimentoProduto);
    
    if (!nomeProduto || !tipoProduto || isNaN(l) || isNaN(es) || isNaN(c)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    if (!empresaId) {
      toast.error("Erro ao identificar empresa");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('produtos')
        .insert({
          nome: nomeProduto,
          tipo: tipoProduto,
          largura: l,
          espessura: es,
          comprimento: c,
          empresa_id: empresaId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const novoProduto: Produto = {
          id: data.id,
          nome: data.nome,
          tipo: data.tipo,
          largura: Number(data.largura),
          espessura: Number(data.espessura),
          comprimento: Number(data.comprimento),
        };

        setProdutos([novoProduto, ...produtos]);
        toast.success("Produto cadastrado com sucesso!");
        setNomeProduto("");
        setTipoProduto("");
        setLarguraProduto("");
        setEspessuraProduto("");
        setComprimentoProduto("");
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
      toast.error('Erro ao cadastrar produto');
    }
  };

  const handleSubmitProducao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const q = parseInt(quantidade);
    
    if (!produtoSelecionado || isNaN(q)) {
      toast.error("Selecione um produto e informe a quantidade");
      return;
    }

    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) {
      toast.error("Produto não encontrado");
      return;
    }

    const tora = toraSelecionada ? toras.find(t => t.id === toraSelecionada) : undefined;
    const m3 = calcularCubagem(produto.largura, produto.espessura, produto.comprimento, q);

    try {
      // Garantir que a data seja salva no formato correto YYYY-MM-DD (GMT-3)
      const dataSalvar = dataProducao || getTodayBR();
      
      if (editingId) {
        const { error } = await supabase
          .from('producao')
          .update({
            data: dataSalvar,
            produto_id: produto.id,
            quantidade: q,
            m3: m3,
            tora_id: tora?.id || null,
          })
          .eq('id', editingId);

        if (error) throw error;

        setProducao(producao.map(p => p.id === editingId ? {
          ...p,
          data: dataSalvar,
          produtoId: produto.id,
          produtoNome: produto.nome,
          tipo: produto.tipo,
          largura: produto.largura,
          espessura: produto.espessura,
          comprimento: produto.comprimento,
          quantidade: q,
          m3,
          toraId: tora?.id,
          toraDescricao: tora?.descricao,
        } : p));
        
        toast.success("Produção atualizada com sucesso!");
      } else {
        if (!empresaId) {
          toast.error("Erro ao identificar empresa");
          return;
        }

        const { data, error } = await supabase
          .from('producao')
          .insert({
            data: dataSalvar,
            produto_id: produto.id,
            quantidade: q,
            m3: m3,
            tora_id: tora?.id || null,
            user_id: user.id,
            empresa_id: empresaId,
          })
          .select(`
            *,
            produtos (nome, tipo, largura, espessura, comprimento),
            toras (descricao)
          `)
          .single();

        if (error) throw error;

        if (data) {
          const novaProd: MadeiraProduzida = {
            id: data.id,
            data: data.data,
            produtoId: data.produto_id,
            produtoNome: data.produtos?.nome || produto.nome,
            tipo: data.produtos?.tipo || produto.tipo,
            largura: Number(data.produtos?.largura || produto.largura),
            espessura: Number(data.produtos?.espessura || produto.espessura),
            comprimento: Number(data.produtos?.comprimento || produto.comprimento),
            quantidade: data.quantidade,
            m3: Number(data.m3),
            toraId: data.tora_id,
            toraDescricao: data.toras?.descricao,
          };

          setProducao([novaProd, ...producao]);
          toast.success(`Produção lançada: ${m3.toFixed(2)} m³`);
        }
      }
      
      resetFormProducao();
    } catch (error) {
      console.error('Erro ao salvar produção:', error);
      toast.error('Erro ao salvar produção');
    }
  };

  const resetFormProducao = () => {
    setProdutoSelecionado("");
    setQuantidade("");
    setToraSelecionada("");
    setDataProducao("");
    setEditingId(null);
  };

  const handleEdit = (prod: MadeiraProduzida) => {
    setProdutoSelecionado(prod.produtoId);
    setQuantidade(prod.quantidade.toString());
    setToraSelecionada(prod.toraId || "");
    // Garantir que a data seja exibida corretamente no formato YYYY-MM-DD
    const dataFormatada = prod.data.includes('T') ? prod.data.split('T')[0] : prod.data;
    setDataProducao(dataFormatada);
    setEditingId(prod.id);
  };

  const handleDeleteProduto = async (id: string) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProdutos(produtos.filter(p => p.id !== id));
      toast.success("Produto excluído");
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('producao')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducao(producao.filter(p => p.id !== id));
      toast.success("Produção excluída");
    } catch (error) {
      console.error('Erro ao excluir produção:', error);
      toast.error('Erro ao excluir produção');
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
        <Factory className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produção</h1>
          <p className="text-muted-foreground">Cadastro de produtos e lançamento de produção</p>
        </div>
      </div>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="produtos">Cadastrar Produtos</TabsTrigger>
          <TabsTrigger value="producao">Lançar Produção</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-6">
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Novo Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProduto} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nomeProduto">Nome do Produto</Label>
                    <Input
                      id="nomeProduto"
                      value={nomeProduto}
                      onChange={(e) => setNomeProduto(e.target.value)}
                      placeholder="Ex: Tábua 10x2.5x3"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipoProduto">Tipo de Madeira</Label>
                    <Input
                      id="tipoProduto"
                      value={tipoProduto}
                      onChange={(e) => setTipoProduto(e.target.value)}
                      placeholder="Ex: Pinus, Eucalipto"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="larguraProduto">Largura (cm)</Label>
                    <Input
                      id="larguraProduto"
                      type="number"
                      step="0.01"
                      value={larguraProduto}
                      onChange={(e) => setLarguraProduto(e.target.value)}
                      placeholder="10"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="espessuraProduto">Espessura (cm)</Label>
                    <Input
                      id="espessuraProduto"
                      type="number"
                      step="0.01"
                      value={espessuraProduto}
                      onChange={(e) => setEspessuraProduto(e.target.value)}
                      placeholder="2.5"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comprimentoProduto">Comprimento (m)</Label>
                    <Input
                      id="comprimentoProduto"
                      type="number"
                      step="0.01"
                      value={comprimentoProduto}
                      onChange={(e) => setComprimentoProduto(e.target.value)}
                      placeholder="3"
                      className="border-input"
                    />
                  </div>
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Produto
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Produtos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dimensões</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell>{produto.tipo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {produto.largura}×{produto.espessura}×{produto.comprimento}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDeleteProduto(produto.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producao" className="space-y-6">
          <Card className="glass-effect neon-border shadow-elegant">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Produção Diária (Últimos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  const nowBR = toZonedTime(new Date(), 'America/Sao_Paulo');
                  const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const date = subDays(nowBR, 6 - i);
                    return format(date, 'yyyy-MM-dd');
                  });
                  
                  return last7Days.map(date => {
                    const dayProduction = producao.filter(p => {
                      // Extrair apenas a parte da data (YYYY-MM-DD) sem considerar timezone
                      const prodDate = p.data.includes('T') ? p.data.split('T')[0] : p.data;
                      return prodDate === date;
                    });
                    const total = dayProduction.reduce((sum, p) => sum + p.m3, 0);
                    return {
                      data: format(new Date(date + 'T12:00:00'), 'dd/MM'),
                      total: parseFloat(total.toFixed(2))
                    };
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="data" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} m³`, 'Produção']}
                  />
                  <Bar dataKey="total" fill="hsl(var(--chart-purple))" radius={[8, 8, 0, 0]} className="dark:fill-[hsl(var(--primary))]" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Nova Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProducao} className="space-y-4">
                <div className={`grid gap-4 ${editingId ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                  <div className="space-y-2">
                    <Label htmlFor="produto">Produto</Label>
                    <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                      <SelectTrigger className="border-input">
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.nome} - {produto.tipo} ({produto.largura}×{produto.espessura}×{produto.comprimento})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidade">Quantidade (peças)</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      placeholder="100"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tora">Tora (Lote)</Label>
                    <Select value={toraSelecionada} onValueChange={setToraSelecionada}>
                      <SelectTrigger className="border-input">
                        <SelectValue placeholder="Selecione uma tora" />
                      </SelectTrigger>
                      <SelectContent>
                        {toras.map((tora) => (
                          <SelectItem key={tora.id} value={tora.id}>
                            {tora.descricao} - {tora.toneladas.toFixed(2)} T
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editingId && (
                    <div className="space-y-2">
                      <Label htmlFor="dataProducao">Data</Label>
                      <Input
                        id="dataProducao"
                        type="date"
                        value={dataProducao}
                        onChange={(e) => setDataProducao(e.target.value)}
                        className="border-input"
                      />
                    </div>
                  )}
                </div>
                {produtoSelecionado && quantidade && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Total: <span className="text-lg font-bold text-primary">
                        {(() => {
                          const produto = produtos.find(p => p.id === produtoSelecionado);
                          const q = parseInt(quantidade);
                          if (produto && !isNaN(q)) {
                            return calcularCubagem(produto.largura, produto.espessura, produto.comprimento, q).toFixed(2);
                          }
                          return "0.00";
                        })()} m³
                      </span>
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    {editingId ? "Atualizar" : "Lançar"} Produção
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetFormProducao}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-effect neon-border shadow-elegant">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Conversão por Lote de Toras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Lote (Tora)</TableHead>
                      <TableHead>Toneladas</TableHead>
                      <TableHead>m³ Serrados</TableHead>
                      <TableHead className="text-primary font-semibold">Conversão (T/m³)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const conversoes = toras.map(tora => {
                        const producoesDoLote = producao.filter(p => p.toraId === tora.id);
                        const m3Total = producoesDoLote.reduce((sum, p) => sum + p.m3, 0);
                        
                        // Buscar toneladas das toras serradas ao invés do peso total do lote
                        const torasSerradasDoLote = torasSerradas.filter(ts => ts.toraId === tora.id);
                        const toneladasSerradas = torasSerradasDoLote.reduce((sum, ts) => sum + ts.toneladas, 0);
                        
                        const conversao = m3Total > 0 ? toneladasSerradas / m3Total : 0;
                        
                        return {
                          descricao: tora.descricao,
                          toneladas: toneladasSerradas,
                          m3Total,
                          conversao
                        };
                      }).filter(c => c.m3Total > 0);

                      if (conversoes.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhuma produção vinculada a toras ainda
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return conversoes.map((conv, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{conv.descricao}</TableCell>
                          <TableCell>{conv.toneladas.toFixed(2)} T</TableCell>
                          <TableCell>{conv.m3Total.toFixed(2)} m³</TableCell>
                          <TableCell className="font-bold text-primary text-lg">
                            {conv.conversao.toFixed(2)} T/m³
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Histórico de Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dimensões</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>m³</TableHead>
                      <TableHead>Tora</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {producao.map((prod) => (
                      <TableRow key={prod.id}>
                        <TableCell>{formatDateBR(prod.data)}</TableCell>
                        <TableCell className="font-medium">{prod.produtoNome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prod.largura}×{prod.espessura}×{prod.comprimento}
                        </TableCell>
                        <TableCell>{prod.quantidade}</TableCell>
                        <TableCell className="font-semibold text-primary">{prod.m3.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prod.toraDescricao || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEdit(prod)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleDelete(prod.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
