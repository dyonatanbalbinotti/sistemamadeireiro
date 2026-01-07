import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, TreeDeciduous } from "lucide-react";
import { toast } from "sonner";
import { Tora, ToraSerrada } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { getTodayBR, formatDateBR } from "@/lib/dateUtils";
import { FadeIn, HoverScale } from "@/components/MotionWrapper";

export default function Toras() {
  const { user } = useAuth();
  const { empresaId, loading: loadingEmpresaId, error: empresaError } = useEmpresaId();
  const [toras, setToras] = useState<Tora[]>([]);
  const [torasSerradas, setTorasSerradas] = useState<ToraSerrada[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states - Toras
  const [numeroLote, setNumeroLote] = useState("");
  const [descricaoTora, setDescricaoTora] = useState("");
  const [pesoCargaTora, setPesoCargaTora] = useState("");
  const [quantidadeTorasCarga, setQuantidadeTorasCarga] = useState("");
  const [valorPorTonelada, setValorPorTonelada] = useState("");
  const [dataTora, setDataTora] = useState("");
  const [editingToraId, setEditingToraId] = useState<string | null>(null);

  // Form states - Toras Serradas
  const [toraIdSerrada, setToraIdSerrada] = useState("");
  const [quantidadeTorasSerradas, setQuantidadeTorasSerradas] = useState("");
  const [editingToraSerradaId, setEditingToraSerradaId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Carregar toras
        const { data: torasData } = await supabase
          .from('toras')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (torasData) {
          setToras(torasData.map(t => ({
            id: t.id,
            data: t.data,
            numeroLote: (t as any).numero_lote || undefined,
            descricao: t.descricao,
            peso: Number(t.peso),
            toneladas: Number(t.toneladas),
            grossura: t.grossura ? Number(t.grossura) : undefined,
            pesoCarga: t.peso_carga ? Number(t.peso_carga) : undefined,
            quantidadeToras: t.quantidade_toras ? Number(t.quantidade_toras) : undefined,
            pesoPorTora: t.peso_por_tora ? Number(t.peso_por_tora) : undefined,
            valorPorTonelada: t.valor_por_tonelada ? Number(t.valor_por_tonelada) : undefined,
            valorTotalCarga: t.valor_total_carga ? Number(t.valor_total_carga) : undefined,
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

  const handleSubmitTora = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const pesoCarga = parseFloat(pesoCargaTora);
    const qtdToras = parseInt(quantidadeTorasCarga);
    const valorTon = parseFloat(valorPorTonelada) || 0;
    
    if (!numeroLote || !descricaoTora || isNaN(pesoCarga) || isNaN(qtdToras) || qtdToras <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    if (!empresaId) {
      toast.error("Erro ao identificar empresa");
      return;
    }

    const pesoPorTora = pesoCarga / qtdToras;
    const toneladas = pesoCarga / 1000;
    const valorTotalCarga = valorTon > 0 ? valorTon * toneladas : 0;

    try {
      if (editingToraId) {
        const { error } = await supabase
          .from('toras')
          .update({
            data: dataTora || getTodayBR(),
            numero_lote: numeroLote,
            descricao: descricaoTora,
            peso: pesoCarga,
            toneladas: toneladas,
            peso_carga: pesoCarga,
            quantidade_toras: qtdToras,
            peso_por_tora: pesoPorTora,
            valor_por_tonelada: valorTon > 0 ? valorTon : null,
            valor_total_carga: valorTotalCarga > 0 ? valorTotalCarga : null,
          } as any)
          .eq('id', editingToraId);

        if (error) throw error;

        setToras(toras.map(t => t.id === editingToraId ? {
          ...t,
          data: dataTora || getTodayBR(),
          numeroLote: numeroLote,
          descricao: descricaoTora,
          peso: pesoCarga,
          toneladas: toneladas,
          pesoCarga: pesoCarga,
          quantidadeToras: qtdToras,
          pesoPorTora: pesoPorTora,
          valorPorTonelada: valorTon > 0 ? valorTon : undefined,
          valorTotalCarga: valorTotalCarga > 0 ? valorTotalCarga : undefined,
        } : t));
        
        toast.success("Tora atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from('toras')
          .insert({
            data: getTodayBR(),
            numero_lote: numeroLote,
            descricao: descricaoTora,
            peso: pesoCarga,
            toneladas: toneladas,
            peso_carga: pesoCarga,
            quantidade_toras: qtdToras,
            peso_por_tora: pesoPorTora,
            valor_por_tonelada: valorTon > 0 ? valorTon : null,
            valor_total_carga: valorTotalCarga > 0 ? valorTotalCarga : null,
            user_id: user.id,
            empresa_id: empresaId,
          } as any)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const novaTora: Tora = {
            id: data.id,
            data: data.data,
            numeroLote: (data as any).numero_lote || undefined,
            descricao: data.descricao,
            peso: Number(data.peso),
            toneladas: Number(data.toneladas),
            grossura: data.grossura ? Number(data.grossura) : undefined,
            pesoCarga: Number(data.peso_carga),
            quantidadeToras: Number(data.quantidade_toras),
            pesoPorTora: Number(data.peso_por_tora),
            valorPorTonelada: data.valor_por_tonelada ? Number(data.valor_por_tonelada) : undefined,
            valorTotalCarga: data.valor_total_carga ? Number(data.valor_total_carga) : undefined,
          };

          setToras([novaTora, ...toras]);
          toast.success(`Lote ${numeroLote} adicionado: ${qtdToras} toras`);
        }
      }
      
      setNumeroLote("");
      setDescricaoTora("");
      setPesoCargaTora("");
      setQuantidadeTorasCarga("");
      setValorPorTonelada("");
      setDataTora("");
      setEditingToraId(null);
    } catch (error) {
      console.error('Erro ao salvar tora:', error);
      toast.error('Erro ao salvar tora');
    }
  };

  const handleSubmitToraSerrada = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const qtdTorasSerradas = parseInt(quantidadeTorasSerradas);
    
    if (!toraIdSerrada || isNaN(qtdTorasSerradas) || qtdTorasSerradas <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    if (!empresaId) {
      toast.error("Erro ao identificar empresa");
      return;
    }

    const toraSelecionadaObj = toras.find(t => t.id === toraIdSerrada);
    if (!toraSelecionadaObj || !toraSelecionadaObj.pesoPorTora) {
      toast.error("Tora selecionada não possui peso por tora calculado");
      return;
    }

    // Validar se a quantidade não excede o disponível no lote
    const quantidadeTotalLote = toraSelecionadaObj.quantidadeToras || 0;
    
    // Calcular quantas toras já foram serradas desse lote (excluindo a que está sendo editada)
    const torasJaSerradas = torasSerradas
      .filter(ts => ts.toraId === toraIdSerrada && ts.id !== editingToraSerradaId)
      .reduce((sum, ts) => sum + (ts.quantidadeTorasSerradas || 0), 0);
    
    const torasDisponiveis = quantidadeTotalLote - torasJaSerradas;
    
    if (qtdTorasSerradas > torasDisponiveis) {
      toast.error(`Quantidade inválida! Disponível no lote: ${torasDisponiveis} toras (Total: ${quantidadeTotalLote}, Já serradas: ${torasJaSerradas})`);
      return;
    }

    const pesoTotal = qtdTorasSerradas * toraSelecionadaObj.pesoPorTora;

    try {
      if (editingToraSerradaId) {
        const { error } = await supabase
          .from('toras_serradas')
          .update({
            tora_id: toraIdSerrada,
            peso: pesoTotal,
            toneladas: pesoTotal / 1000,
            quantidade_toras_serradas: qtdTorasSerradas,
          })
          .eq('id', editingToraSerradaId);

        if (error) throw error;

        setTorasSerradas(torasSerradas.map(ts => ts.id === editingToraSerradaId ? {
          ...ts,
          toraId: toraIdSerrada,
          peso: pesoTotal,
          toneladas: pesoTotal / 1000,
          quantidadeTorasSerradas: qtdTorasSerradas,
        } : ts));
        
        toast.success("Tora serrada atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from('toras_serradas')
          .insert({
            data: getTodayBR(),
            tora_id: toraIdSerrada,
            peso: pesoTotal,
            toneladas: pesoTotal / 1000,
            quantidade_toras_serradas: qtdTorasSerradas,
            user_id: user.id,
            empresa_id: empresaId,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const novaToraSerrada: ToraSerrada = {
            id: data.id,
            data: data.data,
            toraId: data.tora_id,
            peso: Number(data.peso),
            toneladas: Number(data.toneladas),
            quantidadeTorasSerradas: Number(data.quantidade_toras_serradas),
          };

          setTorasSerradas([novaToraSerrada, ...torasSerradas]);
          toast.success(`${qtdTorasSerradas} toras serradas: ${(pesoTotal / 1000).toFixed(2)} T`);
        }
      }
      
      setToraIdSerrada("");
      setQuantidadeTorasSerradas("");
      setEditingToraSerradaId(null);
    } catch (error) {
      console.error('Erro ao salvar tora serrada:', error);
      toast.error('Erro ao salvar tora serrada');
    }
  };

  const handleEditTora = (tora: Tora) => {
    setNumeroLote(tora.numeroLote || "");
    setDescricaoTora(tora.descricao);
    setPesoCargaTora(tora.pesoCarga?.toString() || "");
    setQuantidadeTorasCarga(tora.quantidadeToras?.toString() || "");
    setValorPorTonelada(tora.valorPorTonelada?.toString() || "");
    setDataTora(tora.data);
    setEditingToraId(tora.id);
  };

  const handleDeleteTora = async (id: string) => {
    try {
      // Verificar se há produções vinculadas a essa tora
      const { data: producoes, error: checkError } = await supabase
        .from('producao')
        .select('id')
        .eq('tora_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (producoes && producoes.length > 0) {
        toast.error('Não é possível excluir esta tora pois existem produções vinculadas a ela');
        return;
      }

      const { error } = await supabase
        .from('toras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setToras(toras.filter(t => t.id !== id));
      toast.success("Tora excluída");
    } catch (error) {
      console.error('Erro ao excluir tora:', error);
      toast.error('Erro ao excluir tora');
    }
  };

  const handleEditToraSerrada = (toraSerrada: ToraSerrada) => {
    setToraIdSerrada(toraSerrada.toraId);
    setQuantidadeTorasSerradas(toraSerrada.quantidadeTorasSerradas?.toString() || "");
    setEditingToraSerradaId(toraSerrada.id);
  };

  const handleDeleteToraSerrada = async (id: string) => {
    try {
      const { error } = await supabase
        .from('toras_serradas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTorasSerradas(torasSerradas.filter(ts => ts.id !== id));
      toast.success("Registro excluído");
    } catch (error) {
      console.error('Erro ao excluir tora serrada:', error);
      toast.error('Erro ao excluir tora serrada');
    }
  };

  if (loading || loadingEmpresaId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  if (empresaError || !empresaId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <TreeDeciduous className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          {empresaError || "Você não possui uma empresa cadastrada. Contate o administrador."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center gap-3">
          <TreeDeciduous className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cadastro de Toras</h1>
            <p className="text-muted-foreground">Entrada de toras e registro de toras serradas</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Tabs defaultValue="entrada-toras" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="entrada-toras">Entrada de Toras</TabsTrigger>
            <TabsTrigger value="toras-serradas">Toras Serradas</TabsTrigger>
          </TabsList>

          <TabsContent value="entrada-toras" className="space-y-6">
            <HoverScale scale={1.005}>
              <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">
                {editingToraId ? "Editar Entrada de Tora" : "Nova Entrada de Tora"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTora} className="space-y-4">
                {editingToraId && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dataTora">Data</Label>
                      <Input
                        id="dataTora"
                        type="date"
                        value={dataTora}
                        onChange={(e) => setDataTora(e.target.value)}
                        className="border-input"
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="numeroLote">Número do Lote</Label>
                    <Input
                      id="numeroLote"
                      value={numeroLote}
                      onChange={(e) => setNumeroLote(e.target.value)}
                      placeholder="Ex: 001"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricaoTora">Descrição</Label>
                    <Input
                      id="descricaoTora"
                      value={descricaoTora}
                      onChange={(e) => setDescricaoTora(e.target.value)}
                      placeholder="Ex: Eucalipto"
                      className="border-input"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="pesoCargaTora">Peso Total da Carga (kg)</Label>
                    <Input
                      id="pesoCargaTora"
                      type="number"
                      step="0.01"
                      value={pesoCargaTora}
                      onChange={(e) => setPesoCargaTora(e.target.value)}
                      placeholder="10000"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidadeTorasCarga">Quantidade de Toras</Label>
                    <Input
                      id="quantidadeTorasCarga"
                      type="number"
                      value={quantidadeTorasCarga}
                      onChange={(e) => setQuantidadeTorasCarga(e.target.value)}
                      placeholder="100"
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorPorTonelada">Valor por Tonelada (R$)</Label>
                    <Input
                      id="valorPorTonelada"
                      type="number"
                      step="0.01"
                      value={valorPorTonelada}
                      onChange={(e) => setValorPorTonelada(e.target.value)}
                      placeholder="0.00"
                      className="border-input"
                    />
                  </div>
                </div>
                {valorPorTonelada && pesoCargaTora && (
                  <div className="space-y-2">
                    <Label>Valor Total da Carga</Label>
                    <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 flex items-center">
                      <span className="font-semibold text-primary">
                        R$ {((parseFloat(valorPorTonelada) || 0) * ((parseFloat(pesoCargaTora) || 0) / 1000)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingToraId ? "Atualizar Tora" : "Adicionar Tora"}
                </Button>
                {editingToraId && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingToraId(null);
                      setNumeroLote("");
                      setDescricaoTora("");
                      setPesoCargaTora("");
                      setQuantidadeTorasCarga("");
                      setValorPorTonelada("");
                    }}
                    className="ml-2"
                  >
                    Cancelar
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </HoverScale>

          <HoverScale scale={1.005}>
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
                      <TableHead>Nº Lote</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Peso Carga (kg)</TableHead>
                      <TableHead>Qtd Toras</TableHead>
                      <TableHead>Toneladas</TableHead>
                      <TableHead>Valor/Ton (R$)</TableHead>
                      <TableHead>Valor Total (R$)</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toras.map((tora) => (
                      <TableRow key={tora.id}>
                        <TableCell>{formatDateBR(tora.data)}</TableCell>
                        <TableCell className="font-semibold">{tora.numeroLote || '-'}</TableCell>
                        <TableCell className="font-medium">{tora.descricao}</TableCell>
                        <TableCell>{tora.pesoCarga?.toFixed(2)} kg</TableCell>
                        <TableCell>{tora.quantidadeToras}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {tora.toneladas.toFixed(2)} T
                        </TableCell>
                        <TableCell>
                          {tora.valorPorTonelada ? `R$ ${tora.valorPorTonelada.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {tora.valorTotalCarga ? `R$ ${tora.valorTotalCarga.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEditTora(tora)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleDeleteTora(tora.id)}
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
        </HoverScale>
        </TabsContent>

        <TabsContent value="toras-serradas" className="space-y-6">
          <HoverScale scale={1.005}>
            <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">
                {editingToraSerradaId ? "Editar Toras Serradas" : "Registrar Toras Serradas"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitToraSerrada} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="toraSerrada">Selecione o Lote</Label>
                    <Select value={toraIdSerrada} onValueChange={setToraIdSerrada}>
                      <SelectTrigger className="border-input">
                        <SelectValue placeholder="Selecione um lote de toras" />
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
                  <div className="space-y-2">
                    <Label htmlFor="quantidadeTorasSerradas">Quantidade de Toras Serradas</Label>
                    <Input
                      id="quantidadeTorasSerradas"
                      type="number"
                      value={quantidadeTorasSerradas}
                      onChange={(e) => setQuantidadeTorasSerradas(e.target.value)}
                      placeholder="10"
                      className="border-input"
                    />
                  </div>
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingToraSerradaId ? "Atualizar Toras Serradas" : "Registrar Toras Serradas"}
                </Button>
                {editingToraSerradaId && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingToraSerradaId(null);
                      setToraIdSerrada("");
                      setQuantidadeTorasSerradas("");
                    }}
                    className="ml-2"
                  >
                    Cancelar
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </HoverScale>

        <HoverScale scale={1.005}>
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
                      <TableHead>Lote</TableHead>
                      <TableHead>Qtd Toras Serradas</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Toneladas</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {torasSerradas.map((ts) => {
                      const tora = toras.find(t => t.id === ts.toraId);
                      return (
                        <TableRow key={ts.id}>
                          <TableCell>{formatDateBR(ts.data)}</TableCell>
                          <TableCell className="font-medium">{tora?.descricao || 'N/A'}</TableCell>
                          <TableCell>{ts.quantidadeTorasSerradas}</TableCell>
                          <TableCell>{ts.peso.toFixed(2)} kg</TableCell>
                          <TableCell className="font-semibold text-secondary">
                            {ts.toneladas.toFixed(2)} T
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleEditToraSerrada(ts)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDeleteToraSerrada(ts.id)}
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
        </HoverScale>
        </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
}
