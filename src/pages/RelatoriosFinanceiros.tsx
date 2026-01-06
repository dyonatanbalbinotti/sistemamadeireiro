import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Calendar, DollarSign, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import dwLogo from '@/assets/dw-logo-new.png';
import { format, subMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { formatDateBR } from "@/lib/dateUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { addPDFHeader, addPDFFooter } from '@/lib/pdfUtils';

interface DadosFinanceiros {
  mes: string;
  despesas: number;
  receitas: number;
  saldo: number;
}

interface TransacaoDetalhada {
  data: string;
  tipo: 'Despesa' | 'Receita';
  descricao: string;
  valor: number;
}

export default function RelatoriosFinanceiros() {
  const { empresa } = useEmpresaData();
  const [dataInicio, setDataInicio] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [dataFim, setDataFim] = useState<Date | undefined>(new Date());
  const [dadosFinanceiros, setDadosFinanceiros] = useState<DadosFinanceiros[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoDetalhada[]>([]);
  const [loading, setLoading] = useState(false);
  const [totais, setTotais] = useState({ despesas: 0, receitas: 0, saldo: 0 });
  const [paginaTransacoes, setPaginaTransacoes] = useState(0);

  // Agrupar transações por mês
  const transacoesPorMes = transacoes.reduce((acc, transacao) => {
    // Extrair mês/ano da data (formato dd/MM/yyyy)
    const [dia, mes, ano] = transacao.data.split('/');
    const mesAno = `${mes}/${ano}`;
    if (!acc[mesAno]) {
      acc[mesAno] = [];
    }
    acc[mesAno].push(transacao);
    return acc;
  }, {} as Record<string, TransacaoDetalhada[]>);

  const mesesDisponiveis = Object.keys(transacoesPorMes).sort((a, b) => {
    const [mesA, anoA] = a.split('/');
    const [mesB, anoB] = b.split('/');
    return new Date(parseInt(anoB), parseInt(mesB) - 1).getTime() - new Date(parseInt(anoA), parseInt(mesA) - 1).getTime();
  });

  const mesAtual = mesesDisponiveis[paginaTransacoes];
  const transacoesMesAtual = mesAtual ? transacoesPorMes[mesAtual] || [] : [];

  // Calcular totais do mês atual
  const totaisMesAtual = transacoesMesAtual.reduce(
    (acc, t) => {
      if (t.tipo === 'Receita') {
        acc.receitas += t.valor;
      } else {
        acc.despesas += t.valor;
      }
      return acc;
    },
    { despesas: 0, receitas: 0 }
  );

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  // Resetar página quando dados mudam
  useEffect(() => {
    setPaginaTransacoes(0);
  }, [transacoes]);

  const carregarDados = async () => {
    if (!dataInicio || !dataFim) return;

    setLoading(true);
    try {
      const dataInicioStr = format(dataInicio, 'yyyy-MM-dd');
      const dataFimStr = format(dataFim, 'yyyy-MM-dd');

      // Buscar toras com valor (despesas)
      const { data: torasData } = await supabase
        .from('toras')
        .select('data, descricao, valor_total_carga')
        .not('valor_total_carga', 'is', null)
        .gte('data', dataInicioStr)
        .lte('data', dataFimStr)
        .order('data', { ascending: true });

      // Buscar vendas (receitas)
      const { data: vendasData } = await supabase
        .from('vendas')
        .select('data, produto_id, valor_total, produtos(nome)')
        .gte('data', dataInicioStr)
        .lte('data', dataFimStr)
        .order('data', { ascending: true });

      // Buscar vendas de cavaco (receitas)
      const { data: vendasCavacoData } = await supabase
        .from('vendas_cavaco')
        .select('data, valor_total, toneladas, toras(descricao)')
        .gte('data', dataInicioStr)
        .lte('data', dataFimStr)
        .order('data', { ascending: true });

      // Buscar vendas de serragem (receitas)
      const { data: vendasSerragemData } = await supabase
        .from('vendas_serragem')
        .select('data, valor_total, toneladas')
        .gte('data', dataInicioStr)
        .lte('data', dataFimStr)
        .order('data', { ascending: true });

      // Buscar vendas de casqueiro (receitas)
      const { data: vendasCasqueiroData } = await supabase
        .from('vendas_casqueiro')
        .select('data, valor_total, total_metro_estereo')
        .gte('data', dataInicioStr)
        .lte('data', dataFimStr)
        .order('data', { ascending: true });

      // Processar transações detalhadas
      const transacoesProcessadas: TransacaoDetalhada[] = [];

      torasData?.forEach(tora => {
        transacoesProcessadas.push({
          data: formatDateBR(tora.data),
          tipo: 'Despesa',
          descricao: `Carga de Toras - ${tora.descricao}`,
          valor: parseFloat(tora.valor_total_carga.toString())
        });
      });

      vendasData?.forEach(venda => {
        const produtoNome = (venda.produtos as any)?.nome || 'Produto';
        transacoesProcessadas.push({
          data: formatDateBR(venda.data),
          tipo: 'Receita',
          descricao: `Venda - ${produtoNome}`,
          valor: parseFloat(venda.valor_total.toString())
        });
      });

      vendasCavacoData?.forEach(vendaCavaco => {
        const toraDescricao = (vendaCavaco.toras as any)?.descricao || 'Cavaco';
        transacoesProcessadas.push({
          data: formatDateBR(vendaCavaco.data),
          tipo: 'Receita',
          descricao: `Venda de Cavaco - ${toraDescricao} (${vendaCavaco.toneladas}t)`,
          valor: parseFloat(vendaCavaco.valor_total.toString())
        });
      });

      vendasSerragemData?.forEach(vendaSerragem => {
        transacoesProcessadas.push({
          data: formatDateBR(vendaSerragem.data),
          tipo: 'Receita',
          descricao: `Venda de Serragem (${vendaSerragem.toneladas}t)`,
          valor: parseFloat(vendaSerragem.valor_total.toString())
        });
      });

      vendasCasqueiroData?.forEach(vendaCasqueiro => {
        transacoesProcessadas.push({
          data: formatDateBR(vendaCasqueiro.data),
          tipo: 'Receita',
          descricao: `Venda de Casqueiro (${vendaCasqueiro.total_metro_estereo} m³)`,
          valor: parseFloat(vendaCasqueiro.valor_total.toString())
        });
      });

      transacoesProcessadas.sort((a, b) => {
        const dateA = new Date(a.data.split('/').reverse().join('-'));
        const dateB = new Date(b.data.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });

      setTransacoes(transacoesProcessadas);

      // Calcular dados mensais
      const mesesMap = new Map<string, { despesas: number; receitas: number }>();

      torasData?.forEach(tora => {
        const mesAno = format(new Date(tora.data), 'MMM/yy', { locale: ptBR });
        const atual = mesesMap.get(mesAno) || { despesas: 0, receitas: 0 };
        atual.despesas += parseFloat(tora.valor_total_carga.toString());
        mesesMap.set(mesAno, atual);
      });

      vendasData?.forEach(venda => {
        const mesAno = format(new Date(venda.data), 'MMM/yy', { locale: ptBR });
        const atual = mesesMap.get(mesAno) || { despesas: 0, receitas: 0 };
        atual.receitas += parseFloat(venda.valor_total.toString());
        mesesMap.set(mesAno, atual);
      });

      vendasCavacoData?.forEach(vendaCavaco => {
        const mesAno = format(new Date(vendaCavaco.data), 'MMM/yy', { locale: ptBR });
        const atual = mesesMap.get(mesAno) || { despesas: 0, receitas: 0 };
        atual.receitas += parseFloat(vendaCavaco.valor_total.toString());
        mesesMap.set(mesAno, atual);
      });

      vendasSerragemData?.forEach(vendaSerragem => {
        const mesAno = format(new Date(vendaSerragem.data), 'MMM/yy', { locale: ptBR });
        const atual = mesesMap.get(mesAno) || { despesas: 0, receitas: 0 };
        atual.receitas += parseFloat(vendaSerragem.valor_total.toString());
        mesesMap.set(mesAno, atual);
      });

      vendasCasqueiroData?.forEach(vendaCasqueiro => {
        const mesAno = format(new Date(vendaCasqueiro.data), 'MMM/yy', { locale: ptBR });
        const atual = mesesMap.get(mesAno) || { despesas: 0, receitas: 0 };
        atual.receitas += parseFloat(vendaCasqueiro.valor_total.toString());
        mesesMap.set(mesAno, atual);
      });

      const dadosMensais: DadosFinanceiros[] = Array.from(mesesMap.entries()).map(([mes, valores]) => ({
        mes,
        despesas: valores.despesas,
        receitas: valores.receitas,
        saldo: valores.receitas - valores.despesas
      }));

      setDadosFinanceiros(dadosMensais);

      // Calcular totais
      const totalDespesas = dadosMensais.reduce((sum, d) => sum + d.despesas, 0);
      const totalReceitas = dadosMensais.reduce((sum, d) => sum + d.receitas, 0);
      setTotais({
        despesas: totalDespesas,
        receitas: totalReceitas,
        saldo: totalReceitas - totalDespesas
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = async () => {
    const doc = new jsPDF();

    // Adicionar cabeçalho
    const startY = await addPDFHeader({ empresa, doc });

    // Título
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text('Relatório Financeiro', 14, startY + 5);

    // Período
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${dataInicio ? format(dataInicio, 'dd/MM/yyyy') : ''} a ${dataFim ? format(dataFim, 'dd/MM/yyyy') : ''}`,
      14,
      startY + 12
    );

    // Resumo
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Resumo', 14, startY + 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Despesas: R$ ${totais.despesas.toFixed(2)}`, 14, startY + 32);
    doc.text(`Total Receitas: R$ ${totais.receitas.toFixed(2)}`, 14, startY + 38);
    doc.text(`Saldo: R$ ${totais.saldo.toFixed(2)}`, 14, startY + 44);

    // Tabela de dados mensais
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Dados Mensais', 14, startY + 55);

    autoTable(doc, {
      startY: startY + 60,
      head: [['Mês', 'Despesas (R$)', 'Receitas (R$)', 'Saldo (R$)']],
      body: dadosFinanceiros.map(d => [
        d.mes,
        d.despesas.toFixed(2),
        d.receitas.toFixed(2),
        d.saldo.toFixed(2)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { bottom: 30 }
    });

    // Transações detalhadas (nova página)
    doc.addPage();
    
    // Cabeçalho na nova página
    await addPDFHeader({ empresa, doc });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Transações Detalhadas', 14, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Data', 'Tipo', 'Descrição', 'Valor (R$)']],
      body: transacoes.map(t => [
        t.data,
        t.tipo,
        t.descricao,
        t.valor.toFixed(2)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        3: { halign: 'right' }
      },
      margin: { bottom: 30 }
    });

    // Adicionar rodapé
    await addPDFFooter({ empresa, doc });

    doc.save(`relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const exportarExcel = () => {
    // Criar planilha com resumo
    const wsResumo = XLSX.utils.json_to_sheet([
      { 'Descrição': 'Total Despesas', 'Valor': totais.despesas },
      { 'Descrição': 'Total Receitas', 'Valor': totais.receitas },
      { 'Descrição': 'Saldo', 'Valor': totais.saldo }
    ]);

    // Criar planilha com dados mensais
    const wsMensal = XLSX.utils.json_to_sheet(
      dadosFinanceiros.map(d => ({
        'Mês': d.mes,
        'Despesas': d.despesas,
        'Receitas': d.receitas,
        'Saldo': d.saldo
      }))
    );

    // Criar planilha com transações
    const wsTransacoes = XLSX.utils.json_to_sheet(
      transacoes.map(t => ({
        'Data': t.data,
        'Tipo': t.tipo,
        'Descrição': t.descricao,
        'Valor': t.valor
      }))
    );

    // Criar workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    XLSX.utils.book_append_sheet(wb, wsMensal, 'Dados Mensais');
    XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Transações');

    // Salvar arquivo
    XLSX.writeFile(wb, `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">Análise detalhada de despesas e receitas</p>
        </div>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Filtros e Exportação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={exportarPDF} className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
              <img src={dwLogo} alt="DW Logo" className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button onClick={exportarExcel} variant="outline" className="mt-8">
              <img src={dwLogo} alt="DW Logo" className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              R$ {totais.despesas.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receitas</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              R$ {totais.receitas.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totais.saldo >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              R$ {totais.saldo.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Comparativo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosFinanceiros}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="text-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Linha - Evolução do Saldo */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosFinanceiros}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="text-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Saldo']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  name="Saldo" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Dados Mensais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Receitas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFinanceiros.map((dado, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{dado.mes}</TableCell>
                    <TableCell className="text-right text-destructive">
                      R$ {dado.despesas.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      R$ {dado.receitas.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${dado.saldo >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      R$ {dado.saldo.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Transações Detalhadas</CardTitle>
          {mesesDisponiveis.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPaginaTransacoes(prev => Math.max(0, prev - 1))}
                disabled={paginaTransacoes === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {mesAtual}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPaginaTransacoes(prev => Math.min(mesesDisponiveis.length - 1, prev + 1))}
                disabled={paginaTransacoes === mesesDisponiveis.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                {paginaTransacoes + 1} de {mesesDisponiveis.length}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <ScrollArea className="h-[300px]">
                <TableBody>
                  {transacoesMesAtual.map((transacao, index) => (
                    <TableRow key={index}>
                      <TableCell>{transacao.data}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          transacao.tipo === 'Receita' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {transacao.tipo}
                        </span>
                      </TableCell>
                      <TableCell>{transacao.descricao}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        transacao.tipo === 'Receita' ? 'text-green-600' : 'text-destructive'
                      }`}>
                        R$ {transacao.valor.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ScrollArea>
            </Table>
          </div>
          {transacoesMesAtual.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Despesas do mês: </span>
                <span className="font-semibold text-destructive">R$ {totaisMesAtual.despesas.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Receitas do mês: </span>
                <span className="font-semibold text-green-600">R$ {totaisMesAtual.receitas.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo do mês: </span>
                <span className={`font-semibold ${totaisMesAtual.receitas - totaisMesAtual.despesas >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  R$ {(totaisMesAtual.receitas - totaisMesAtual.despesas).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
