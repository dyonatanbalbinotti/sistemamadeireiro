import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Weight, PieChart as PieChartIcon } from "lucide-react";
import { calcularEstoqueSerradoSupabase, calcularEstoqueTorasSupabase } from "@/lib/supabaseStorage";
import { EstoqueSerrado, EstoqueToras } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Estoque() {
  const [estoqueSerrado, setEstoqueSerrado] = useState<EstoqueSerrado[]>([]);
  const [estoqueToras, setEstoqueToras] = useState<EstoqueToras | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [serrado, toras] = await Promise.all([
          calcularEstoqueSerradoSupabase(),
          calcularEstoqueTorasSupabase()
        ]);
        setEstoqueSerrado(serrado);
        setEstoqueToras(toras);
      } catch (error) {
        console.error('Erro ao carregar estoque:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estoque</h1>
          <p className="text-muted-foreground">Visualização completa do estoque</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-border/50 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Madeira Serrada
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalM3.toFixed(2)} m³</div>
            <p className="text-sm text-muted-foreground mt-1">{totalUnidades} unidades</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-border/50 shadow-card">
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
              {((estoqueToras?.toneladas || 0) * 1000).toFixed(0)} kg
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card border-border/50">
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
                      <TableCell>{item.quantidadeUnidades} un</TableCell>
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

        <Card className="glass-effect neon-border shadow-elegant overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-tech text-foreground flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
              Estoque por Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
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
                  label={(entry) => `${entry.valor} m³`}
                >
                  {estoqueSerrado.slice(0, 5).map((_, index) => {
                    const neonColors = [
                      'hsl(var(--neon-cyan))',
                      'hsl(var(--neon-lime))',
                      'hsl(var(--neon-magenta))',
                      'hsl(var(--neon-purple))',
                      '#FF6B6B',
                    ];
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={neonColors[index % neonColors.length]}
                      />
                    );
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} m³`, 'Estoque']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead>Toneladas</TableHead>
                  <TableHead>Quilogramas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{estoqueToras?.descricao || 'Toras'}</TableCell>
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
    </div>
  );
}
