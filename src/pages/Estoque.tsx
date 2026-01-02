import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Weight, PieChart as PieChartIcon, AlertTriangle } from "lucide-react";
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
  const { empresaId } = useEmpresaId();
  const [estoqueSerrado, setEstoqueSerrado] = useState<EstoqueSerrado[]>([]);
  const [estoqueToras, setEstoqueToras] = useState<EstoqueToras | null>(null);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [alertasAtivos, setAlertasAtivos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
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

      <StaggerContainer className="grid gap-6 md:grid-cols-2">
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
      </StaggerContainer>

      <FadeIn delay={0.3}>
        <div className="grid gap-6 lg:grid-cols-2">
          <HoverScale scale={1.01}>
            <Card className="shadow-card border-border/50 h-full">
              <CardHeader>
                <CardTitle className="text-foreground">Estoque de Madeira Serrada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Tipo</TableHead>
                        <TableHead>Dimensões (cm)</TableHead>
                        <TableHead>Comprimento (m)</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Volume (m³)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estoqueSerrado.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.tipo}</TableCell>
                          <TableCell>{item.largura} × {item.espessura}</TableCell>
                          <TableCell>{item.comprimento}</TableCell>
                          <TableCell>{item.quantidadeUnidades.toFixed(0)} un</TableCell>
                          <TableCell className="font-semibold text-primary">{item.m3Total.toFixed(2)} m³</TableCell>
                        </TableRow>
                      ))}
                      {estoqueSerrado.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhum item em estoque
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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

      <FadeIn delay={0.4}>
        <HoverScale scale={1.005}>
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Estoque de Toras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Descrição</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Toneladas</TableHead>
                      <TableHead>Quilogramas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{estoqueToras?.descricao || 'Toras'}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {estoqueToras?.quantidadeToras.toFixed(0) || 0} toras
                      </TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {estoqueToras?.toneladas.toFixed(2) || '0.00'} T
                      </TableCell>
                      <TableCell>
                        {((estoqueToras?.toneladas || 0) * 1000).toFixed(2)} kg
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </HoverScale>
      </FadeIn>
    </div>
  );
}
