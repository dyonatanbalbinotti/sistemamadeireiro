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
import { 
  getProducao, 
  saveProducao, 
  getToras,
  saveToras,
  getTorasSerradas,
  saveTorasSerradas,
  calcularCubagem,
  getProdutos,
  saveProdutos
} from "@/lib/storage";
import { MadeiraProduzida, Tora, ToraSerrada, Produto } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Producao() {
  const [producao, setProducao] = useState<MadeiraProduzida[]>([]);
  const [toras, setToras] = useState<Tora[]>([]);
  const [torasSerradas, setTorasSerradas] = useState<ToraSerrada[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states - Produção
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [toraSelecionada, setToraSelecionada] = useState("");

  // Form states - Produtos
  const [nomeProduto, setNomeProduto] = useState("");
  const [tipoProduto, setTipoProduto] = useState("");
  const [larguraProduto, setLarguraProduto] = useState("");
  const [espessuraProduto, setEspessuraProduto] = useState("");
  const [comprimentoProduto, setComprimentoProduto] = useState("");

  // Form states - Toras
  const [descricaoTora, setDescricaoTora] = useState("");
  const [pesoTora, setPesoTora] = useState("");

  // Form states - Toras Serradas
  const [toraIdSerrada, setToraIdSerrada] = useState("");
  const [pesoSerrada, setPesoSerrada] = useState("");

  useEffect(() => {
    setProducao(getProducao());
    setToras(getToras());
    setTorasSerradas(getTorasSerradas());
    setProdutos(getProdutos());
  }, []);

  const handleSubmitProduto = (e: React.FormEvent) => {
    e.preventDefault();
    
    const l = parseFloat(larguraProduto);
    const es = parseFloat(espessuraProduto);
    const c = parseFloat(comprimentoProduto);
    
    if (!nomeProduto || !tipoProduto || isNaN(l) || isNaN(es) || isNaN(c)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const novoProduto: Produto = {
      id: Date.now().toString(),
      nome: nomeProduto,
      tipo: tipoProduto,
      largura: l,
      espessura: es,
      comprimento: c,
    };

    const novosProdutos = [...produtos, novoProduto];
    saveProdutos(novosProdutos);
    setProdutos(novosProdutos);
    
    toast.success("Produto cadastrado com sucesso!");
    setNomeProduto("");
    setTipoProduto("");
    setLarguraProduto("");
    setEspessuraProduto("");
    setComprimentoProduto("");
  };

  const handleSubmitProducao = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    const novaProd: MadeiraProduzida = {
      id: editingId || Date.now().toString(),
      data: new Date().toISOString(),
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
    };

    let novaProducao;
    if (editingId) {
      novaProducao = producao.map(p => p.id === editingId ? novaProd : p);
      toast.success("Produção atualizada com sucesso!");
    } else {
      novaProducao = [...producao, novaProd];
      toast.success(`Produção lançada: ${m3.toFixed(2)} m³`);
    }
    
    saveProducao(novaProducao);
    setProducao(novaProducao);
    resetFormProducao();
  };

  const handleSubmitTora = (e: React.FormEvent) => {
    e.preventDefault();
    
    const peso = parseFloat(pesoTora);
    
    if (!descricaoTora || isNaN(peso)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const novaTora: Tora = {
      id: Date.now().toString(),
      data: new Date().toISOString(),
      descricao: descricaoTora,
      peso,
      toneladas: peso / 1000,
    };

    const novasToras = [...toras, novaTora];
    saveToras(novasToras);
    setToras(novasToras);
    
    toast.success(`Tora adicionada: ${(peso / 1000).toFixed(2)} T`);
    setDescricaoTora("");
    setPesoTora("");
  };

  const handleSubmitToraSerrada = (e: React.FormEvent) => {
    e.preventDefault();
    
    const peso = parseFloat(pesoSerrada);
    
    if (!toraIdSerrada || isNaN(peso)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const novaToraSerrada: ToraSerrada = {
      id: Date.now().toString(),
      data: new Date().toISOString(),
      toraId: toraIdSerrada,
      peso,
      toneladas: peso / 1000,
    };

    const novasTorasSerradas = [...torasSerradas, novaToraSerrada];
    saveTorasSerradas(novasTorasSerradas);
    setTorasSerradas(novasTorasSerradas);
    
    toast.success(`Tora serrada registrada: ${(peso / 1000).toFixed(2)} T`);
    setToraIdSerrada("");
    setPesoSerrada("");
  };

  const resetFormProducao = () => {
    setProdutoSelecionado("");
    setQuantidade("");
    setToraSelecionada("");
    setEditingId(null);
  };

  const handleEdit = (prod: MadeiraProduzida) => {
    setProdutoSelecionado(prod.produtoId);
    setQuantidade(prod.quantidade.toString());
    setToraSelecionada(prod.toraId || "");
    setEditingId(prod.id);
  };

  const handleDeleteProduto = (id: string) => {
    const novosProdutos = produtos.filter(p => p.id !== id);
    saveProdutos(novosProdutos);
    setProdutos(novosProdutos);
    toast.success("Produto excluído");
  };

  const handleDelete = (id: string) => {
    const novaProducao = producao.filter(p => p.id !== id);
    saveProducao(novaProducao);
    setProducao(novaProducao);
    toast.success("Produção excluída");
  };

  const handleDeleteToraSerrada = (id: string) => {
    const novasTorasSerradas = torasSerradas.filter(ts => ts.id !== id);
    saveTorasSerradas(novasTorasSerradas);
    setTorasSerradas(novasTorasSerradas);
    toast.success("Registro excluído");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Factory className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produção</h1>
          <p className="text-muted-foreground">Lançamento de produção e toras serradas</p>
        </div>
      </div>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-4">
          <TabsTrigger value="produtos">Cadastrar Produtos</TabsTrigger>
          <TabsTrigger value="producao">Lançar Produção</TabsTrigger>
          <TabsTrigger value="entrada-toras">Entrada de Toras</TabsTrigger>
          <TabsTrigger value="toras">Toras Serradas</TabsTrigger>
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
                  const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toISOString().split('T')[0];
                  });
                  
                  return last7Days.map(date => {
                    const dayProduction = producao.filter(p => 
                      p.data.split('T')[0] === date
                    );
                    const total = dayProduction.reduce((sum, p) => sum + p.m3, 0);
                    return {
                      data: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
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
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
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
                <div className="grid gap-4 md:grid-cols-3">
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
                        <TableCell>{new Date(prod.data).toLocaleDateString()}</TableCell>
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
                      <TableHead>Peso Total (kg)</TableHead>
                      <TableHead>m³ Serrados</TableHead>
                      <TableHead className="text-primary font-semibold">Conversão (kg/m³)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const conversoes = toras.map(tora => {
                        const producoesDoLote = producao.filter(p => p.toraId === tora.id);
                        const m3Total = producoesDoLote.reduce((sum, p) => sum + p.m3, 0);
                        const conversao = m3Total > 0 ? tora.peso / m3Total : 0;
                        
                        return {
                          descricao: tora.descricao,
                          peso: tora.peso,
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
                          <TableCell>{conv.peso.toFixed(2)} kg</TableCell>
                          <TableCell>{conv.m3Total.toFixed(2)} m³</TableCell>
                          <TableCell className="font-bold text-primary text-lg">
                            {conv.conversao.toFixed(2)} kg/m³
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entrada-toras" className="space-y-6">
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Adicionar Toras ao Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTora} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="descricaoTora">Descrição</Label>
                    <Input
                      id="descricaoTora"
                      value={descricaoTora}
                      onChange={(e) => setDescricaoTora(e.target.value)}
                      placeholder="Ex: Pinus, Eucalipto, Lote 001"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pesoTora">Peso (kg)</Label>
                    <Input
                      id="pesoTora"
                      type="number"
                      step="0.01"
                      value={pesoTora}
                      onChange={(e) => setPesoTora(e.target.value)}
                      placeholder="1000"
                      className="border-input"
                    />
                  </div>
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tora
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Histórico de Entrada de Toras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Toneladas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toras.map((tora) => (
                      <TableRow key={tora.id}>
                        <TableCell>{new Date(tora.data).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{tora.descricao}</TableCell>
                        <TableCell>{tora.peso.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-primary">{tora.toneladas.toFixed(2)} T</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="toras" className="space-y-6">
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Registrar Tora Serrada</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitToraSerrada} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="toraId">ID da Tora</Label>
                    <Input
                      id="toraId"
                      value={toraIdSerrada}
                      onChange={(e) => setToraIdSerrada(e.target.value)}
                      placeholder="ID ou descrição"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pesoSerrada">Peso Serrado (kg)</Label>
                    <Input
                      id="pesoSerrada"
                      type="number"
                      step="0.01"
                      value={pesoSerrada}
                      onChange={(e) => setPesoSerrada(e.target.value)}
                      placeholder="1000"
                      className="border-input"
                    />
                  </div>
                </div>
                <Button type="submit" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Tora Serrada
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Histórico de Toras Serradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Tora ID</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Toneladas</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {torasSerradas.map((ts) => (
                      <TableRow key={ts.id}>
                        <TableCell>{new Date(ts.data).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{ts.toraId}</TableCell>
                        <TableCell>{ts.peso.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-secondary">{ts.toneladas.toFixed(2)} T</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDeleteToraSerrada(ts.id)}
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
      </Tabs>
    </div>
  );
}
