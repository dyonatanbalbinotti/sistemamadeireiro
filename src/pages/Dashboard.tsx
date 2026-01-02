import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Factory, TrendingUp, Weight, AlertTriangle, BarChart3, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { calcularEstoqueSerradoSupabase, calcularEstoqueTorasSupabase, getVendasSupabase } from "@/lib/supabaseStorage";
import { useEffect, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Bar, BarChart } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { EstoqueSerrado, EstoqueToras } from "@/types";
import { subDays, subMonths, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmptyState from "@/components/EmptyState";
import { FadeIn, StaggerContainer, StaggerItem, HoverScale } from "@/components/MotionWrapper";

export default function Dashboard() {
  const [estoqueSerrado, setEstoqueSerrado] = useState(0);
  const [estoqueToras, setEstoqueToras] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [vendasData, setVendasData] = useState<any[]>([]);
  const [estoqueData, setEstoqueData] = useState<any[]>([]);
  const [producaoDiariaData, setProducaoDiariaData] = useState<any[]>([]);
  const [producaoMensalData, setProducaoMensalData] = useState<any[]>([]);
  const [financeiroData, setFinanceiroData] = useState<any[]>([]);
  const [periodoFinanceiro, setPeriodoFinanceiro] = useState<string>("6");
  const [periodoVendas, setPeriodoVendas] = useState<string>("7");
  const [periodoProducao, setPeriodoProducao] = useState<string>("7");
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

        await verificarAlertas(serrado, toras, totalQuantidade, totalM3);

        const nowBR = toZonedTime(new Date(), 'America/Sao_Paulo');
        const diasVendas = parseInt(periodoVendas);
        const lastDaysVendas = Array.from({ length: diasVendas }, (_, i) => {
          const date = subDays(nowBR, diasVendas - 1 - i);
          return format(date, 'yyyy-MM-dd');
        });

        // Buscar vendas adicionais (cavaco, serragem, casqueiro)
        const { data: vendasCavaco } = await supabase
          .from('vendas_cavaco')
          .select('data, valor_total')
          .order('data', { ascending: true });

        const { data: vendasSerragem } = await supabase
          .from('vendas_serragem')
          .select('data, valor_total')
          .order('data', { ascending: true });

        const { data: vendasCasqueiro } = await supabase
          .from('vendas_casqueiro')
          .select('data, valor_total')
          .order('data', { ascending: true });

        const vendasPorDia = lastDaysVendas.map(date => {
          // Vendas de madeira serrada
          const dayVendas = vendas.filter(v => {
            const vendaDate = v.data.includes('T') ? v.data.split('T')[0] : v.data;
            return vendaDate === date;
          });
          const totalMadeira = dayVendas.reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0);
          
          // Vendas de cavaco
          const dayCavaco = vendasCavaco?.filter(v => {
            const vendaDate = v.data.includes('T') ? v.data.split('T')[0] : v.data;
            return vendaDate === date;
          }) || [];
          const totalCavaco = dayCavaco.reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0);
          
          // Vendas de serragem
          const daySerragem = vendasSerragem?.filter(v => {
            const vendaDate = v.data.includes('T') ? v.data.split('T')[0] : v.data;
            return vendaDate === date;
          }) || [];
          const totalSerragem = daySerragem.reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0);
          
          // Vendas de casqueiro
          const dayCasqueiro = vendasCasqueiro?.filter(v => {
            const vendaDate = v.data.includes('T') ? v.data.split('T')[0] : v.data;
            return vendaDate === date;
          }) || [];
          const totalCasqueiro = dayCasqueiro.reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0);
          
          const total = totalMadeira + totalCavaco + totalSerragem + totalCasqueiro;
          
          return {
            data: format(new Date(date + 'T12:00:00'), 'dd/MM'),
            madeira: parseFloat(totalMadeira.toFixed(2)),
            cavaco: parseFloat(totalCavaco.toFixed(2)),
            serragem: parseFloat(totalSerragem.toFixed(2)),
            casqueiro: parseFloat(totalCasqueiro.toFixed(2)),
            valor: parseFloat(total.toFixed(2))
          };
        });
        setVendasData(vendasPorDia);

        const estoquesPorProduto = serrado
          .sort((a, b) => b.m3Total - a.m3Total)
          .slice(0, 5)
          .map(item => ({
            nome: `${item.tipo.substring(0, 10)}... ${item.largura}x${item.espessura}`,
            valor: parseFloat(item.m3Total.toFixed(2))
          }));
        setEstoqueData(estoquesPorProduto);

        const { data: producaoData } = await supabase
          .from('producao')
          .select('data, m3')
          .order('data', { ascending: true });

        if (producaoData) {
          const diasProducao = parseInt(periodoProducao);
          const lastDaysProd = Array.from({ length: diasProducao }, (_, i) => {
            const date = subDays(nowBR, diasProducao - 1 - i);
            return format(date, 'yyyy-MM-dd');
          });

          const producaoPorDia = lastDaysProd.map(date => {
            const dayProduction = producaoData.filter(p => {
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
              mes: format(new Date(year, month - 1), 'MMM', { locale: ptBR }),
              total: parseFloat(total.toFixed(2))
            };
          });
          setProducaoMensalData(producaoPorMes);
        }

        await carregarDadosFinanceiros(nowBR, parseInt(periodoFinanceiro));
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [periodoFinanceiro, periodoVendas, periodoProducao]);

  const carregarDadosFinanceiros = async (nowBR: Date, meses: number) => {
    try {
      const lastMonthsFinanceiro = Array.from({ length: meses }, (_, i) => {
        const date = subMonths(nowBR, meses - 1 - i);
        return {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          label: format(date, 'MMM/yy', { locale: ptBR })
        };
      });

      const { data: torasComValor } = await supabase
        .from('toras')
        .select('data, valor_total_carga')
        .not('valor_total_carga', 'is', null)
        .order('data', { ascending: true });

      const { data: vendasComValor } = await supabase
        .from('vendas')
        .select('data, valor_total')
        .order('data', { ascending: true });

      // Buscar vendas de cavaco
      const { data: vendasCavaco } = await supabase
        .from('vendas_cavaco')
        .select('data, valor_total')
        .order('data', { ascending: true });

      // Buscar vendas de serragem
      const { data: vendasSerragem } = await supabase
        .from('vendas_serragem')
        .select('data, valor_total')
        .order('data', { ascending: true });

      // Buscar vendas de casqueiro
      const { data: vendasCasqueiro } = await supabase
        .from('vendas_casqueiro')
        .select('data, valor_total')
        .order('data', { ascending: true });

      const financeiroPorMes = lastMonthsFinanceiro.map(({ year, month, label }) => {
        const despesas = torasComValor?.filter(t => {
          const tDate = toZonedTime(new Date(t.data), 'America/Sao_Paulo');
          return tDate.getFullYear() === year && tDate.getMonth() + 1 === month;
        }).reduce((sum, t) => sum + parseFloat(t.valor_total_carga.toString()), 0) || 0;

        // Receitas de madeira serrada
        const receitasMadeira = vendasComValor?.filter(v => {
          const vDate = toZonedTime(new Date(v.data), 'America/Sao_Paulo');
          return vDate.getFullYear() === year && vDate.getMonth() + 1 === month;
        }).reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0) || 0;

        // Receitas de cavaco
        const receitasCavaco = vendasCavaco?.filter(v => {
          const vDate = toZonedTime(new Date(v.data), 'America/Sao_Paulo');
          return vDate.getFullYear() === year && vDate.getMonth() + 1 === month;
        }).reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0) || 0;

        // Receitas de serragem
        const receitasSerragem = vendasSerragem?.filter(v => {
          const vDate = toZonedTime(new Date(v.data), 'America/Sao_Paulo');
          return vDate.getFullYear() === year && vDate.getMonth() + 1 === month;
        }).reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0) || 0;

        // Receitas de casqueiro
        const receitasCasqueiro = vendasCasqueiro?.filter(v => {
          const vDate = toZonedTime(new Date(v.data), 'America/Sao_Paulo');
          return vDate.getFullYear() === year && vDate.getMonth() + 1 === month;
        }).reduce((sum, v) => sum + parseFloat(v.valor_total.toString()), 0) || 0;

        const receitas = receitasMadeira + receitasCavaco + receitasSerragem + receitasCasqueiro;

        return {
          mes: label,
          despesas: parseFloat(despesas.toFixed(2)),
          receitas: parseFloat(receitas.toFixed(2)),
          receitasMadeira: parseFloat(receitasMadeira.toFixed(2)),
          receitasCavaco: parseFloat(receitasCavaco.toFixed(2)),
          receitasSerragem: parseFloat(receitasSerragem.toFixed(2)),
          receitasCasqueiro: parseFloat(receitasCasqueiro.toFixed(2))
        };
      });

      setFinanceiroData(financeiroPorMes);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    }
  };

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
          if (alerta.quantidade_minima && totalQuantidade < alerta.quantidade_minima) {
            alertasAtivados.push({
              tipo: 'serrado',
              mensagem: `Estoque de madeira serrada abaixo do mínimo: ${totalQuantidade} peças (mínimo: ${alerta.quantidade_minima})`,
              severity: 'error'
            });
          }
          
          if (alerta.m3_minimo && totalM3 < alerta.m3_minimo) {
            alertasAtivados.push({
              tipo: 'serrado',
              mensagem: `Volume de madeira serrada abaixo do mínimo: ${totalM3.toFixed(2)} m³ (mínimo: ${alerta.m3_minimo})`,
              severity: 'error'
            });
          }
        }

        if (alerta.tipo === 'tora') {
          if (alerta.toneladas_minima && toras.toneladas < alerta.toneladas_minima) {
            alertasAtivados.push({
              tipo: 'tora',
              mensagem: `Estoque de toras abaixo do mínimo: ${toras.toneladas.toFixed(2)} T (mínimo: ${alerta.toneladas_minima})`,
              severity: 'error'
            });
          }

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

      alertasAtivados.forEach((alerta) => {
        toast({
          title: "Alerta de Estoque",
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
    },
    {
      title: "Estoque Toras",
      value: `${estoqueToras.toFixed(2)} T`,
      icon: Weight,
    },
    {
      title: "Tipos de Produtos",
      value: totalItens.toString(),
      icon: Factory,
    },
    {
      title: "Status",
      value: "Operacional",
      icon: TrendingUp,
      isStatus: true,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--chart-blue))',
    'hsl(var(--warning))',
    'hsl(var(--chart-purple))'
  ];

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <FadeIn>
        <div className="section-header">
          <h1 className="section-title">Dashboard</h1>
          <p className="section-description">Visão geral do controle de estoque em tempo real</p>
        </div>
      </FadeIn>

      {/* Alerts - Minimal */}
      {alertasAtivos.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="space-y-2">
            {alertasAtivos.map((alerta, index) => (
              <div key={index} className="alert-minimal alert-minimal-error">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{alerta.mensagem}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* KPI Cards */}
      <StaggerContainer className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <StaggerItem key={card.title}>
              <HoverScale>
                <div className="kpi-card h-full">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="kpi-label">{card.title}</p>
                      {card.isStatus ? (
                        <div className="flex items-center gap-2">
                          <span className="status-badge status-badge-success">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            Operacional
                          </span>
                        </div>
                      ) : (
                        <p className="kpi-value">{card.value}</p>
                      )}
                    </div>
                    <Icon className="kpi-icon" />
                  </div>
                </div>
              </HoverScale>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Charts Row 1 */}
      <FadeIn delay={0.3}>
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Vendas Chart */}
          <HoverScale scale={1.01}>
            <Card className="enterprise-card border-0 h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="chart-title flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Vendas
                  </CardTitle>
                  <Select value={periodoVendas} onValueChange={setPeriodoVendas}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {vendasData.every(d => d.valor === 0) ? (
                  <EmptyState message="Sem vendas no período selecionado" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={vendasData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="data" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => `R$${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px',
                            boxShadow: 'var(--shadow-md)'
                          }}
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = {
                              madeira: 'Madeira Serrada',
                              cavaco: 'Cavaco',
                              serragem: 'Serragem',
                              casqueiro: 'Casqueiro'
                            };
                            return [`R$ ${value.toFixed(2)}`, labels[name] || name];
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '11px' }}
                          iconType="circle"
                          iconSize={8}
                        />
                        <Bar dataKey="madeira" stackId="a" fill="hsl(var(--primary))" name="Madeira" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="cavaco" stackId="a" fill="hsl(var(--success))" name="Cavaco" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="serragem" stackId="a" fill="hsl(var(--warning))" name="Serragem" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="casqueiro" stackId="a" fill="hsl(var(--chart-purple))" name="Casqueiro" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-semibold text-foreground">
                          R$ {vendasData.reduce((sum, d) => sum + d.valor, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Madeira</p>
                        <p className="text-sm font-semibold text-primary">
                          R$ {vendasData.reduce((sum, d) => sum + (d.madeira || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Cavaco</p>
                        <p className="text-sm font-semibold text-success">
                          R$ {vendasData.reduce((sum, d) => sum + (d.cavaco || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Serragem</p>
                        <p className="text-sm font-semibold text-warning">
                          R$ {vendasData.reduce((sum, d) => sum + (d.serragem || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Casqueiro</p>
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--chart-purple))' }}>
                          R$ {vendasData.reduce((sum, d) => sum + (d.casqueiro || 0), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </HoverScale>

          {/* Estoque por Produto */}
          <HoverScale scale={1.01}>
            <Card className="enterprise-card border-0 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="chart-title flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                  Estoque por Produto (Top 5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {estoqueData.length === 0 ? (
                  <EmptyState message="Sem produtos em estoque" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={estoqueData}
                        dataKey="valor"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        label={(entry) => `${entry.valor.toFixed(2)} m³`}
                        labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                      >
                        {estoqueData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)} m³`, 'Estoque']}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </HoverScale>
        </div>
      </FadeIn>

      {/* Charts Row 2 */}
      <FadeIn delay={0.4}>
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Produção Diária */}
          <HoverScale scale={1.01}>
            <Card className="enterprise-card border-0 h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="chart-title flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Produção Diária
                  </CardTitle>
                  <Select value={periodoProducao} onValueChange={setPeriodoProducao}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {producaoDiariaData.every(d => d.total === 0) ? (
                  <EmptyState message="Sem produção no período selecionado" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={producaoDiariaData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="data" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)} m³`, 'Produção']}
                        />
                        <Bar dataKey="total" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Total: <span className="text-sm font-semibold text-foreground ml-1">
                          {producaoDiariaData.reduce((sum, d) => sum + d.total, 0).toFixed(2)} m³
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </HoverScale>

          {/* Produção Mensal */}
          <HoverScale scale={1.01}>
            <Card className="enterprise-card border-0 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="chart-title flex items-center gap-2">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  Produção Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {producaoMensalData.every(d => d.total === 0) ? (
                  <EmptyState message="Sem produção nos últimos meses" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={producaoMensalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="mes" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)} m³`, 'Produção']}
                        />
                        <Bar dataKey="total" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Crescimento: <span className="text-sm font-semibold text-foreground ml-1">
                          {producaoMensalData.length > 1 ? 
                            `${((producaoMensalData[producaoMensalData.length - 1]?.total || 0) / (producaoMensalData[producaoMensalData.length - 2]?.total || 1) * 100 - 100).toFixed(2)}%` : 
                            '0.00%'}
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </HoverScale>
        </div>
      </FadeIn>

      {/* Fluxo Financeiro */}
      <FadeIn delay={0.5}>
        <HoverScale scale={1.005}>
          <Card className="enterprise-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="chart-title flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Fluxo Financeiro
                </CardTitle>
                <Select value={periodoFinanceiro} onValueChange={setPeriodoFinanceiro}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Últimos 3 meses</SelectItem>
                    <SelectItem value="6">Últimos 6 meses</SelectItem>
                    <SelectItem value="12">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {financeiroData.every(d => d.despesas === 0 && d.receitas === 0) ? (
                <EmptyState message="Sem movimentação financeira no período" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financeiroData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="mes" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => [
                          `R$ ${value.toFixed(2)}`, 
                          name === 'despesas' ? 'Despesas' : 'Receitas'
                        ]}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Despesas" />
                      <Bar dataKey="receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Receitas" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Summary Cards */}
                  <StaggerContainer className="mt-6 grid grid-cols-3 gap-4" staggerDelay={0.1}>
                    <StaggerItem>
                      <div className="p-4 rounded-lg bg-destructive/5">
                        <p className="text-xs text-muted-foreground mb-1">Total Despesas</p>
                        <p className="text-lg font-semibold text-destructive">
                          R$ {financeiroData.reduce((sum, d) => sum + d.despesas, 0).toFixed(2)}
                        </p>
                      </div>
                    </StaggerItem>
                    <StaggerItem>
                      <div className="p-4 rounded-lg bg-success/5">
                        <p className="text-xs text-muted-foreground mb-1">Total Receitas</p>
                        <p className="text-lg font-semibold text-success">
                          R$ {financeiroData.reduce((sum, d) => sum + d.receitas, 0).toFixed(2)}
                        </p>
                      </div>
                    </StaggerItem>
                    <StaggerItem>
                      <div className="p-4 rounded-lg bg-primary/5">
                        <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                        <p className={`text-lg font-semibold ${
                          financeiroData.reduce((sum, d) => sum + (d.receitas - d.despesas), 0) >= 0 
                            ? 'text-success' 
                            : 'text-destructive'
                        }`}>
                          R$ {financeiroData.reduce((sum, d) => sum + (d.receitas - d.despesas), 0).toFixed(2)}
                        </p>
                      </div>
                    </StaggerItem>
                  </StaggerContainer>
                </>
              )}
            </CardContent>
          </Card>
        </HoverScale>
      </FadeIn>
    </div>
  );
}
