import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Factory, TrendingUp, Weight, TreeDeciduous, DollarSign, PieChart as PieChartIcon, BarChart3, AlertTriangle } from "lucide-react";
import { calcularEstoqueSerradoSupabase, calcularEstoqueTorasSupabase, getVendasSupabase } from "@/lib/supabaseStorage";
import { useEffect, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Bar, BarChart } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { EstoqueSerrado, EstoqueToras } from "@/types";
import { getTodayBR, formatInBrazilTimezone } from "@/lib/dateUtils";
import { subDays, subMonths, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export default function Dashboard() {
  const [estoqueSerrado, setEstoqueSerrado] = useState(0);
  const [estoqueToras, setEstoqueToras] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [vendasData, setVendasData] = useState<any[]>([]);
  const [estoqueData, setEstoqueData] = useState<any[]>([]);
  const [producaoDiariaData, setProducaoDiariaData] = useState<any[]>([]);
  const [producaoMensalData, setProducaoMensalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertasAtivos, setAlertasAtivos] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [serrado, toras, vendas] = await Promise.all([
          calcularEstoqueSerradoSupabase(),
          calcularEstoqueTorasSupabase(),
          getVendasSupabase()
        ]);
        
        const totalM3 = serrado.reduce((acc, item) => acc + item.m3Total, 0);
        const totalQuantidade = serrado.reduce((acc, item) => acc + item.quantidadeUnidades, 0);
        setEstoqueSerrado(totalM3);
        setEstoqueToras(toras.toneladas);
        setTotalItens(serrado.length);

        // Verificar alertas de estoque
        await verificarAlertas(serrado, toras, totalQuantidade, totalM3);

        // Dados de vendas dos últimos 7 dias (GMT-3)
        const nowBR = toZonedTime(new Date(), 'America/Sao_Paulo');
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(nowBR, 6 - i);
          return format(date, 'yyyy-MM-dd');
        });

        const vendasPorDia = last7Days.map(date => {
          const dayVendas = vendas.filter(v => {
            // Extrair apenas a parte da data (YYYY-MM-DD) sem considerar timezone
            const vendaDate = v.data.includes('T') ? v.data.split('T')[0] : v.data;
            return vendaDate === date;
          });
          const total = dayVendas.reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0);
          return {
            data: format(new Date(date + 'T12:00:00'), 'dd/MM'),
            valor: parseFloat(total.toFixed(2))
          };
        });
        setVendasData(vendasPorDia);

        // Dados de estoque por produto (top 5)
        const estoquesPorProduto = serrado
          .sort((a, b) => b.m3Total - a.m3Total)
          .slice(0, 5)
          .map(item => ({
            nome: `${item.tipo.substring(0, 10)}... ${item.largura}x${item.espessura}`,
            valor: parseFloat(item.m3Total.toFixed(2))
          }));
        setEstoqueData(estoquesPorProduto);

        // Buscar dados de produção
        const { data: producaoData } = await supabase
          .from('producao')
          .select('data, m3')
          .order('data', { ascending: true });

        if (producaoData) {
          // Produção diária - últimos 7 dias (GMT-3)
          const last7DaysProd = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(nowBR, 6 - i);
            return format(date, 'yyyy-MM-dd');
          });

          const producaoPorDia = last7DaysProd.map(date => {
            const dayProduction = producaoData.filter(p => {
              // Extrair apenas a parte da data (YYYY-MM-DD) sem considerar timezone
              const prodDate = p.data.includes('T') ? p.data.split('T')[0] : p.data;
              return prodDate === date;
            });
            const total = dayProduction.reduce((sum, p) => sum + parseFloat(p.m3.toString()), 0);
            return {
              data: format(new Date(date + 'T12:00:00'), 'dd/MM'),
              total: parseFloat(total.toFixed(2))
            };
          });
          setProducaoDiariaData(producaoPorDia);

          // Produção mensal - últimos 6 meses (GMT-3)
          const last6Months = Array.from({ length: 6 }, (_, i) => {
            const date = subMonths(nowBR, 5 - i);
            return {
              year: date.getFullYear(),
              month: date.getMonth() + 1
            };
          });

          const producaoPorMes = last6Months.map(({ year, month }) => {
            const monthProduction = producaoData.filter(p => {
              const pDate = toZonedTime(new Date(p.data), 'America/Sao_Paulo');
              return pDate.getFullYear() === year && pDate.getMonth() + 1 === month;
            });
            const total = monthProduction.reduce((sum, p) => sum + parseFloat(p.m3.toString()), 0);
            return {
              mes: format(new Date(year, month - 1), 'MMM', { locale: require('date-fns/locale/pt-BR').ptBR }),
              total: parseFloat(total.toFixed(2))
            };
          });
          setProducaoMensalData(producaoPorMes);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const verificarAlertas = async (
    serrado: EstoqueSerrado[], 
    toras: EstoqueToras,
    totalQuantidade: number,
    totalM3: number
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: alertas } = await supabase
        .from('alertas_estoque')
        .select('*')
        .eq('empresa_id', user.user.id)
        .eq('ativo', true);

      if (!alertas || alertas.length === 0) return;

      const alertasAtivados: any[] = [];

      alertas.forEach((alerta) => {
        if (alerta.tipo === 'serrado') {
          // Verificar quantidade mínima
          if (alerta.quantidade_minima && totalQuantidade < alerta.quantidade_minima) {
            alertasAtivados.push({
              tipo: 'serrado',
              mensagem: `Estoque de madeira serrada abaixo do mínimo: ${totalQuantidade} peças (mínimo: ${alerta.quantidade_minima})`,
              severity: 'error'
            });
          }
          
          // Verificar m³ mínimo
          if (alerta.m3_minimo && totalM3 < alerta.m3_minimo) {
            alertasAtivados.push({
              tipo: 'serrado',
              mensagem: `Volume de madeira serrada abaixo do mínimo: ${totalM3.toFixed(2)} m³ (mínimo: ${alerta.m3_minimo})`,
              severity: 'error'
            });
          }
        }

        if (alerta.tipo === 'tora') {
          // Verificar toneladas mínima
          if (alerta.toneladas_minima && toras.toneladas < alerta.toneladas_minima) {
            alertasAtivados.push({
              tipo: 'tora',
              mensagem: `Estoque de toras abaixo do mínimo: ${toras.toneladas.toFixed(2)} T (mínimo: ${alerta.toneladas_minima})`,
              severity: 'error'
            });
          }

          // Verificar quantidade de toras
          if (alerta.quantidade_minima && toras.quantidadeToras < alerta.quantidade_minima) {
            alertasAtivados.push({
              tipo: 'tora',
              mensagem: `Quantidade de toras abaixo do mínimo: ${toras.quantidadeToras} toras (mínimo: ${alerta.quantidade_minima})`,
              severity: 'error'
            });
          }
        }
      });

      setAlertasAtivos(alertasAtivados);

      // Mostrar toast para cada alerta
      alertasAtivados.forEach((alerta) => {
        toast({
          title: "⚠️ Alerta de Estoque Baixo",
          description: alerta.mensagem,
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
    }
  };

  const cards = [
    {
      title: "Estoque Serrado",
      value: `${estoqueSerrado.toFixed(2)} m³`,
      icon: Package,
      gradient: "from-primary/10 to-primary/5",
    },
    {
      title: "Estoque Toras",
      value: `${estoqueToras.toFixed(2)} T`,
      icon: Weight,
      gradient: "from-secondary/10 to-secondary/5",
    },
    {
      title: "Tipos de Produtos",
      value: totalItens.toString(),
      icon: Factory,
      gradient: "from-accent/20 to-accent/10",
    },
    {
      title: "Status",
      value: "Operacional",
      icon: TrendingUp,
      gradient: "from-primary/10 to-accent/10",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent dark:from-primary/10 blur-3xl -z-10 animate-pulse-glow" />
        <h1 className="text-5xl font-tech font-bold text-foreground mb-3 tracking-tight dark:text-shadow-glow">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">Visão geral do controle de estoque em tempo real</p>
      </div>

      {alertasAtivos.length > 0 && (
        <div className="space-y-3">
          {alertasAtivos.map((alerta, index) => (
            <Alert key={index} variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-bold">Alerta de Estoque Baixo</AlertTitle>
              <AlertDescription className="text-sm">
                {alerta.mensagem}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const neonColors = ['neon-glow', 'neon-glow-lime', 'neon-glow-magenta', 'neon-glow-purple'];
          const borderColors = ['neon-border', 'dark:neon-border-lime', 'dark:neon-border-magenta', 'dark:neon-border-purple'];
          const iconColors = [
            'text-[hsl(var(--neon-cyan))] dark:drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]',
            'text-[hsl(var(--neon-lime))] dark:drop-shadow-[0_0_10px_rgba(173,255,47,0.8)]',
            'text-[hsl(var(--neon-magenta))] dark:drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]',
            'text-[hsl(var(--neon-purple))] dark:drop-shadow-[0_0_10px_rgba(138,43,226,0.8)]'
          ];
          
          return (
            <Card 
              key={card.title} 
              className={`glass-effect ${borderColors[index]} shadow-elegant ${neonColors[index]} transition-all duration-500 hover:scale-105 hover:-translate-y-1 group overflow-hidden relative`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-all">
                  <Icon className={`h-5 w-5 ${iconColors[index]} group-hover:scale-110 transition-transform`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-tech font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                  {card.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-effect neon-border shadow-elegant overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-tech text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
              Vendas - Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vendasData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Total vendido: <span className="text-lg font-bold text-primary">
                  R$ {vendasData.reduce((sum, d) => sum + d.valor, 0).toFixed(2)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect neon-border shadow-elegant overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-tech text-foreground flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
              Estoque por Produto (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={estoqueData}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.valor} m³`}
                >
                  {estoqueData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`hsl(var(--primary) / ${1 - index * 0.15})`}
                    />
                  ))}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-effect dark:neon-border-lime shadow-elegant neon-glow-lime overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--neon-lime))]/10 via-transparent to-[hsl(var(--neon-lime))]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-tech text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[hsl(var(--neon-lime))] dark:drop-shadow-[0_0_8px_rgba(173,255,47,0.5)]" />
              Produção - Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={producaoDiariaData}>
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
                <Bar dataKey="total" fill="hsl(var(--neon-lime))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Total produzido: <span className="text-lg font-bold text-[hsl(var(--neon-lime))]">
                  {producaoDiariaData.reduce((sum, d) => sum + d.total, 0).toFixed(2)} m³
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect dark:neon-border-magenta shadow-elegant neon-glow-magenta overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--neon-magenta))]/10 via-transparent to-[hsl(var(--neon-magenta))]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-tech text-foreground flex items-center gap-2">
              <Factory className="h-5 w-5 text-[hsl(var(--neon-magenta))] dark:drop-shadow-[0_0_8px_rgba(255,0,255,0.5)]" />
              Produção Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={producaoMensalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} m³`, 'Produção']}
                />
                <Bar dataKey="total" fill="hsl(var(--neon-magenta))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Crescimento: <span className="text-lg font-bold text-[hsl(var(--neon-magenta))]">
                  {producaoMensalData.length > 1 ? 
                    `${((producaoMensalData[producaoMensalData.length - 1]?.total || 0) / (producaoMensalData[producaoMensalData.length - 2]?.total || 1) * 100 - 100).toFixed(1)}%` : 
                    '0%'}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-effect dark:neon-border-purple shadow-elegant neon-glow-purple overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--neon-purple))]/10 via-transparent to-[hsl(var(--neon-magenta))]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-tech text-foreground flex items-center gap-2">
            <TreeDeciduous className="h-7 w-7 text-[hsl(var(--neon-purple))] dark:drop-shadow-[0_0_12px_rgba(138,43,226,0.8)]" />
            Bem-vindo ao MadeiraStock
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 relative z-10">
          <p className="text-base leading-relaxed">
            Sistema completo de controle de estoque para o setor madeireiro, combinando tradição com tecnologia de ponta.
          </p>
          <ul className="space-y-3 ml-2">
            {[
              "Controle de produção com cubagem automática",
              "Gestão de estoque de madeira serrada (unidades e m³)",
              "Controle de toras em toneladas",
              "Sistema de vendas integrado",
              "Baixa automática de toras serradas"
            ].map((item, i) => {
              const bulletColors = [
                'bg-[hsl(var(--neon-cyan))] dark:shadow-[0_0_6px_rgba(0,255,255,0.9)]',
                'bg-[hsl(var(--neon-lime))] dark:shadow-[0_0_6px_rgba(173,255,47,0.9)]',
                'bg-[hsl(var(--neon-magenta))] dark:shadow-[0_0_6px_rgba(255,0,255,0.9)]',
                'bg-[hsl(var(--neon-purple))] dark:shadow-[0_0_6px_rgba(138,43,226,0.9)]',
                'bg-[hsl(var(--neon-cyan))] dark:shadow-[0_0_6px_rgba(0,255,255,0.9)]'
              ];
              return (
                <li key={i} className="flex items-start gap-3 group/item">
                  <div className={`mt-1 h-2 w-2 rounded-full ${bulletColors[i]} group-hover/item:scale-150 transition-transform`} />
                  <span className="group-hover/item:text-foreground transition-colors">{item}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
