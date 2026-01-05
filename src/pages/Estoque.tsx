import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Weight, PieChart as PieChartIcon, AlertTriangle, Search, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { calcularEstoqueSerradoSupabase, calcularEstoqueTorasSupabase } from "@/lib/supabaseStorage";
import { EstoqueSerrado, EstoqueToras } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertasEstoqueDialog } from "@/components/AlertasEstoqueDialog";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { toast } from "@/hooks/use-toast";
import { FadeIn, StaggerContainer, StaggerItem, HoverScale } from "@/components/MotionWrapper";

interface AlertaEstoque {
  id: string;
  tipo: 'serrado' | 'tora';
  quantidade_minima?: number;
  m3_minimo?: number;
  toneladas_minima?: number;
  ativo: boolean;
}

export default function Estoque() {
  const { empresaId, loading: loadingEmpresaId, error: empresaError } = useEmpresaId();
  const [estoqueSerrado, setEstoqueSerrado] = useState<EstoqueSerrado[]>([]);
  const [estoqueToras, setEstoqueToras] = useState<EstoqueToras | null>(null);
  const [estoqueCavaco, setEstoqueCavaco] = useState<{ total: number; percentual: number }>({ total: 0, percentual: 0 });
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [alertasAtivos, setAlertasAtivos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaSerrado, setBuscaSerrado] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [serrado, toras, alertasData] = await Promise.all([
          calcularEstoqueSerradoSupabase(),
          calcularEstoqueTorasSupabase(),
          empresaId ? supabase
            .from('alertas_estoque')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('ativo', true) : Promise.resolve({ data: [] })
        ]);
        
        setEstoqueSerrado(serrado);
        setEstoqueToras(toras);
        setAlertas((alertasData.data as AlertaEstoque[]) || []);

        // Calcular estoque de cavaco
        await calcularEstoqueCavaco();

        // Verificar alertas
        verificarAlertas(serrado, toras, (alertasData.data as AlertaEstoque[]) || []);
      } catch (error) {
        console.error('Erro ao carregar estoque:', error);
      } finally {
        setLoading(false);
      }
    };

    if (empresaId) {
      fetchData();
    }
  }, [empresaId]);

  const calcularEstoqueCavaco = async () => {
    try {
      const [torasRes, producaoRes, torasSerradasRes, vendasCavacoRes] = await Promise.all([
        supabase.from('toras').select('*'),
        supabase.from('producao').select('*'),
        supabase.from('toras_serradas').select('*'),
        supabase.from('vendas_cavaco').select('*')
      ]);

      const torasData = torasRes.data || [];
      const producaoData = producaoRes.data || [];
      const torasSerradasData = torasSerradasRes.data || [];
      const vendasCavacoData = vendasCavacoRes.data || [];

      let totalCavaco = 0;
      let totalProcessado = 0;

      torasData.forEach(tora => {
        const producoesDaTora = producaoData.filter(p => p.tora_id === tora.id);
        const m3Total = producoesDaTora.reduce((sum, p) => sum + Number(p.m3), 0);
        
        const torasSerradasDoLote = torasSerradasData.filter(ts => ts.tora_id === tora.id);
        const toneladasSerradas = torasSerradasDoLote.reduce((sum, ts) => sum + Number(ts.toneladas), 0);
        
        const pesoPorM3 = Number(tora.peso_por_m3) || 0.6;
        const toneladasMadeirasSerradas = pesoPorM3 * m3Total;
        
        const vendasCavacoDoLote = vendasCavacoData.filter(vc => vc.tora_id === tora.id);
        const toneladasVendidasCavaco = vendasCavacoDoLote.reduce((sum, vc) => sum + Number(vc.toneladas), 0);
        
        const cavacoEstoque = Math.max(0, toneladasSerradas - toneladasMadeirasSerradas - toneladasVendidasCavaco);
        
        totalCavaco += cavacoEstoque;
        totalProcessado += toneladasSerradas;
      });

      const percentual = totalProcessado > 0 ? (totalCavaco / totalProcessado) * 100 : 0;
      setEstoqueCavaco({ total: totalCavaco, percentual });
    } catch (error) {
      console.error('Erro ao calcular estoque de cavaco:', error);
    }
  };

  const verificarAlertas = (
    serrado: EstoqueSerrado[], 
    toras: EstoqueToras | null, 
    alertasConfig: AlertaEstoque[]
  ) => {
    const alertasDispararados: string[] = [];

    alertasConfig.forEach(alerta => {
      if (!alerta.ativo) return;

      if (alerta.tipo === 'serrado') {
        const totalM3 = serrado.reduce((acc, item) => acc + item.m3Total, 0);
        const totalUnidades = serrado.reduce((acc, item) => acc + item.quantidadeUnidades, 0);

        if (
          (alerta.quantidade_minima && totalUnidades < alerta.quantidade_minima) ||
          (alerta.m3_minimo && totalM3 < alerta.m3_minimo)
        ) {
          alertasDispararados.push(
            `⚠️ Estoque de madeira serrada abaixo do mínimo: ${totalUnidades.toFixed(0)} un / ${totalM3.toFixed(2)} m³`
          );
        }
      } else if (alerta.tipo === 'tora') {
        if (toras && alerta.toneladas_minima && toras.toneladas < alerta.toneladas_minima) {
          alertasDispararados.push(
            `⚠️ Estoque de toras abaixo do mínimo: ${toras.toneladas.toFixed(2)} T`
          );
        }
      }
    });

    setAlertasAtivos(alertasDispararados);

    // Mostrar toast apenas se houver alertas
    if (alertasDispararados.length > 0) {
      toast({
        title: "⚠️ Alertas de Estoque",
        description: `${alertasDispararados.length} alerta(s) de estoque mínimo ativo(s)`,
        variant: "destructive",
      });
    }
  };

  const totalM3 = estoqueSerrado.reduce((acc, item) => acc + item.m3Total, 0);
  const totalUnidades = estoqueSerrado.reduce((acc, item) => acc + item.quantidadeUnidades, 0);

  const estoqueSerradoFiltrado = useMemo(() => {
    if (!buscaSerrado.trim()) return estoqueSerrado;
    const termo = buscaSerrado.toLowerCase().trim();
    return estoqueSerrado.filter(item => 
      item.nome.toLowerCase().includes(termo)
    );
  }, [estoqueSerrado, buscaSerrado]);

  if (loading || loadingEmpresaId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (empresaError || !empresaId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          {empresaError || "Você não possui uma empresa cadastrada. Contate o administrador."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Estoque</h1>
              <p className="text-muted-foreground">Visualização completa do estoque</p>
            </div>
          </div>
          <AlertasEstoqueDialog />
        </div>
      </FadeIn>

      {/* Alertas ativos */}
      {alertasAtivos.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="space-y-3">
            {alertasAtivos.map((alerta, index) => (
              <Alert key={index} variant="destructive" className="border-destructive/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Alerta de Estoque Mínimo</AlertTitle>
                <AlertDescription>{alerta}</AlertDescription>
              </Alert>
            ))}
          </div>
        </FadeIn>
      )}

      <StaggerContainer className="grid gap-6 md:grid-cols-3">
        <StaggerItem>
          <HoverScale>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-border/50 shadow-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Madeira Serrada
                </CardTitle>
                <Package className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalM3.toFixed(2)} m³</div>
                <p className="text-sm text-muted-foreground mt-1">{totalUnidades.toFixed(0)} unidades</p>
              </CardContent>
            </Card>
          </HoverScale>
        </StaggerItem>

        <StaggerItem>
          <HoverScale>
            <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-border/50 shadow-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Toras
                </CardTitle>
                <Weight className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {estoqueToras?.toneladas.toFixed(2) || '0.00'} T
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {estoqueToras?.quantidadeToras.toFixed(0) || 0} toras • {((estoqueToras?.toneladas || 0) * 1000).toFixed(2)} kg
                </p>
              </CardContent>
            </Card>
          </HoverScale>
        </StaggerItem>

        <StaggerItem>
          <HoverScale>
            <Card className="bg-gradient-to-br from-chart-orange/10 to-chart-orange/5 border-border/50 shadow-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cavaco em Estoque
                </CardTitle>
                <Layers className="h-5 w-5 text-chart-orange" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {estoqueCavaco.total.toFixed(2)} T
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {estoqueCavaco.percentual.toFixed(2)}% do total
                </p>
              </CardContent>
            </Card>
          </HoverScale>
        </StaggerItem>
      </StaggerContainer>

      <FadeIn delay={0.3}>
        <div className="grid gap-6 lg:grid-cols-2">
          <HoverScale scale={1.01}>
            <Card className="shadow-card border-border/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-foreground">Estoque de Madeira Serrada</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={buscaSerrado}
                    onChange={(e) => setBuscaSerrado(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Volume (m³)</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableBody>
                        {estoqueSerradoFiltrado.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.nome}</TableCell>
                            <TableCell>{item.quantidadeUnidades.toFixed(0)} un</TableCell>
                            <TableCell className="font-semibold text-primary">{item.m3Total.toFixed(2)} m³</TableCell>
                          </TableRow>
                        ))}
                        {estoqueSerradoFiltrado.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              {buscaSerrado ? "Nenhum produto encontrado" : "Nenhum item em estoque"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </HoverScale>

          <HoverScale scale={1.01}>
            <Card className="shadow-card border-border/50 h-full">
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Estoque por Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={estoqueSerrado.slice(0, 5).map(item => ({
                        nome: `${item.tipo.substring(0, 10)}... ${item.largura}x${item.espessura}`,
                        valor: parseFloat(item.m3Total.toFixed(2))
                      }))}
                      dataKey="valor"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.valor.toFixed(2)} m³`}
                    >
                      {estoqueSerrado.slice(0, 5).map((_, index) => {
                        const colors = [
                          'hsl(var(--chart-brown))',
                          'hsl(var(--chart-green))',
                          'hsl(var(--chart-blue))',
                          'hsl(var(--chart-orange))',
                          'hsl(var(--chart-purple))'
                        ];
                        return (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} m³`, 'Estoque']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </HoverScale>
        </div>
      </FadeIn>

    </div>
  );
}
