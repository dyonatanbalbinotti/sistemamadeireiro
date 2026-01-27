import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Factory, BarChart3, Pencil, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import pdfIcon from '@/assets/pdf-icon.png';
import excelIcon from '@/assets/excel-icon.png';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { calcularCubagem } from "@/lib/storage";
import { MadeiraProduzida, Tora, ToraSerrada, Produto } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { getTodayBR, formatDateBR } from "@/lib/dateUtils";
import { subDays, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toZonedTime } from "date-fns-tz";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { addPDFHeader, addPDFFooter } from '@/lib/pdfUtils';
import { FadeIn, HoverScale } from "@/components/MotionWrapper";

export default function Producao() {
  const { user } = useAuth();
  const { empresaId, loading: loadingEmpresaId, error: empresaError } = useEmpresaId();
  const { empresa } = useEmpresaData();
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
  const [editandoProdutoId, setEditandoProdutoId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");

  // Form states - Filtros histórico
  const [dataInicio, setDataInicio] = useState(() => {
    const hoje = new Date();
    const dias30Atras = subDays(hoje, 30);
    return format(dias30Atras, 'yyyy-MM-dd');
  });
  const [dataFim, setDataFim] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [buscaHistorico, setBuscaHistorico] = useState("");
  
  // Estado para controlar visualização do gráfico (diária, 30 dias ou mensal)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<"diaria" | "30dias" | "mensal">("diaria");
  
  // Estado para paginação da tabela de conversão por mês
  const [paginaConversao, setPaginaConversao] = useState(0);

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
          .order('nome', { ascending: true });
        
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
            numeroLote: t.numero_lote || undefined,
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
            toras (descricao, numero_lote)
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
            toraLote: (p.toras as any)?.numero_lote,
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

        setProdutos([...produtos, novoProduto].sort((a, b) => a.nome.localeCompare(b.nome)));
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

  const handleEditProduto = (produto: Produto) => {
    setEditandoProdutoId(produto.id);
    setNomeProduto(produto.nome);
    setTipoProduto(produto.tipo);
    setLarguraProduto(produto.largura.toString());
    setEspessuraProduto(produto.espessura.toString());
    setComprimentoProduto(produto.comprimento.toString());
    setEditDialogOpen(true);
  };

  const handleUpdateProduto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editandoProdutoId || !nomeProduto || !tipoProduto || !larguraProduto || !espessuraProduto || !comprimentoProduto) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { error } = await supabase
        .from('produtos')
        .update({
          nome: nomeProduto,
          tipo: tipoProduto,
          largura: parseFloat(larguraProduto),
          espessura: parseFloat(espessuraProduto),
          comprimento: parseFloat(comprimentoProduto),
        })
        .eq('id', editandoProdutoId);

      if (error) throw error;

      setProdutos(produtos.map(p => 
        p.id === editandoProdutoId 
          ? {
              ...p,
              nome: nomeProduto,
              tipo: tipoProduto,
              largura: parseFloat(larguraProduto),
              espessura: parseFloat(espessuraProduto),
              comprimento: parseFloat(comprimentoProduto),
            }
          : p
      ).sort((a, b) => a.nome.localeCompare(b.nome)));

      toast.success("Produto atualizado com sucesso!");
      setEditDialogOpen(false);
      setEditandoProdutoId(null);
      setNomeProduto("");
      setTipoProduto("");
      setLarguraProduto("");
      setEspessuraProduto("");
      setComprimentoProduto("");
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
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

  const getProducaoFiltrada = () => {
    return producao.filter(prod => {
      // Filtro por data
      const prodDate = prod.data.includes('T') ? prod.data.split('T')[0] : prod.data;
      const dentroDoIntervalo = prodDate >= dataInicio && prodDate <= dataFim;
      
      // Filtro por busca
      const termosBusca = buscaHistorico.toLowerCase();
      const matchBusca = !termosBusca || 
        prod.produtoNome.toLowerCase().includes(termosBusca) ||
        prod.tipo.toLowerCase().includes(termosBusca) ||
        prod.toraDescricao?.toLowerCase().includes(termosBusca);
      
      return dentroDoIntervalo && matchBusca;
    });
  };

  const exportarPDF = async () => {
    const doc = new jsPDF();
    const producaoFiltrada = getProducaoFiltrada();
    
    // Adicionar cabeçalho
    const startY = await addPDFHeader({ empresa, doc });
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text('Histórico de Produção', 14, startY + 5);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${formatDateBR(dataInicio)} até ${formatDateBR(dataFim)}`, 14, startY + 12);
    
    const tableData = producaoFiltrada.map(prod => [
      formatDateBR(prod.data),
      prod.produtoNome,
      `${prod.largura}×${prod.espessura}×${prod.comprimento}`,
      prod.quantidade.toString(),
      prod.m3.toFixed(2),
      prod.toraDescricao || '-'
    ]);
    
    autoTable(doc, {
      head: [['Data', 'Produto', 'Dimensões', 'Qtd', 'm³', 'Tora']],
      body: tableData,
      startY: startY + 17,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
      margin: { bottom: 30 }
    });
    
    const totalM3 = producaoFiltrada.reduce((sum, p) => sum + p.m3, 0);
    const finalY = (doc as any).lastAutoTable.finalY || startY + 17;
    doc.setFontSize(12);
    doc.text(`Total: ${totalM3.toFixed(2)} m³`, 14, finalY + 10);
    
    // Adicionar rodapé
    await addPDFFooter({ empresa, doc });
    
    doc.save(`producao-${dataInicio}-${dataFim}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const exportarConversaoPDF = async () => {
    const doc = new jsPDF();
    
    // Calcular totais por mês (mesma lógica usada na renderização)
    const totaisPorMes: Record<string, { toneladas: number; m3: number; conversoes: Array<{descricao: string; numeroLote?: string; toneladas: number; m3Total: number; conversao: number}> }> = {};
    
    toras.forEach(tora => {
      const mesAno = new Date(tora.data).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
      const torasSerradasDoLote = torasSerradas.filter(ts => ts.toraId === tora.id);
      const toneladasSerradas = torasSerradasDoLote.reduce((sum, ts) => sum + ts.toneladas, 0);
      const producoesDoLote = producao.filter(p => p.toraId === tora.id);
      const m3Total = producoesDoLote.reduce((sum, p) => sum + p.m3, 0);
      
      if (!totaisPorMes[mesAno]) {
        totaisPorMes[mesAno] = { toneladas: 0, m3: 0, conversoes: [] };
      }
      
      if (m3Total > 0) {
        totaisPorMes[mesAno].toneladas += toneladasSerradas;
        totaisPorMes[mesAno].m3 += m3Total;
        totaisPorMes[mesAno].conversoes.push({
          descricao: tora.descricao,
          numeroLote: tora.numeroLote,
          toneladas: toneladasSerradas,
          m3Total,
          conversao: m3Total > 0 ? toneladasSerradas / m3Total : 0
        });
      }
    });

    const mesesOrdenados = Object.keys(totaisPorMes)
      .filter(mes => totaisPorMes[mes].m3 > 0)
      .sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        return new Date(Number(anoB), Number(mesB) - 1).getTime() - new Date(Number(anoA), Number(mesA) - 1).getTime();
      });

    if (mesesOrdenados.length === 0) {
      toast.error('Nenhuma conversão para exportar');
      return;
    }

    // Adicionar cabeçalho
    let startY = await addPDFHeader({ empresa, doc });
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text('Relatório de Conversão por Lote de Toras', 14, startY + 5);
    
    let currentY = startY + 15;

    // Calcular totais gerais
    let totalGeralToneladas = 0;
    let totalGeralM3 = 0;

    mesesOrdenados.forEach((mesAno, index) => {
      const dadosMes = totaisPorMes[mesAno];
      const conversaoMensal = dadosMes.m3 > 0 ? dadosMes.toneladas / dadosMes.m3 : 0;

      totalGeralToneladas += dadosMes.toneladas;
      totalGeralM3 += dadosMes.m3;

      // Verificar se precisa de nova página
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      // Título do mês
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Mês: ${mesAno}`, 14, currentY);
      currentY += 5;

      // Tabela de conversões do mês
      const tableData = dadosMes.conversoes.map(conv => [
        `Lote ${conv.numeroLote || '-'} • ${conv.descricao}`,
        `${conv.toneladas.toFixed(2)} T`,
        `${conv.m3Total.toFixed(2)} m³`,
        `${conv.conversao.toFixed(2)} T/m³`
      ]);

      // Adicionar linha de total do mês
      tableData.push([
        `Total ${mesAno}`,
        `${dadosMes.toneladas.toFixed(2)} T`,
        `${dadosMes.m3.toFixed(2)} m³`,
        `${conversaoMensal.toFixed(2)} T/m³`
      ]);

      autoTable(doc, {
        head: [['Lote (Tora)', 'Toneladas', 'm³ Serrados', 'Conversão (T/m³)']],
        body: tableData,
        startY: currentY,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
        bodyStyles: { valign: 'middle' },
        didParseCell: (data) => {
          // Destacar linha de total
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 255];
          }
        },
        margin: { bottom: 30 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    // Resumo geral
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    const conversaoGeral = totalGeralM3 > 0 ? totalGeralToneladas / totalGeralM3 : 0;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Resumo Geral', 14, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de Toneladas Serradas: ${totalGeralToneladas.toFixed(2)} T`, 14, currentY);
    currentY += 6;
    doc.text(`Total de m³ Produzidos: ${totalGeralM3.toFixed(2)} m³`, 14, currentY);
    currentY += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Conversão Média Geral: ${conversaoGeral.toFixed(2)} T/m³`, 14, currentY);

    // Adicionar rodapé
    await addPDFFooter({ empresa, doc });
    
    const dataAtual = format(new Date(), 'yyyy-MM-dd');
    doc.save(`conversao-lotes-${dataAtual}.pdf`);
    toast.success('PDF de conversão exportado com sucesso!');
  };

  const exportarExcel = () => {
    const producaoFiltrada = getProducaoFiltrada();
    
    const dados = producaoFiltrada.map(prod => ({
      'Data': formatDateBR(prod.data),
      'Produto': prod.produtoNome,
      'Tipo': prod.tipo,
      'Largura (cm)': prod.largura,
      'Espessura (cm)': prod.espessura,
      'Comprimento (m)': prod.comprimento,
      'Quantidade': prod.quantidade,
      'm³': prod.m3.toFixed(2),
      'Tora/Lote': prod.toraDescricao || '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produção');
    
    XLSX.writeFile(wb, `producao-${dataInicio}-${dataFim}.xlsx`);
    toast.success('Excel exportado com sucesso!');
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
        <Factory className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          {empresaError || "Você não possui uma empresa cadastrada. Contate o administrador."}
        </p>
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
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou tipo..."
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[30%]">Nome</TableHead>
                      <TableHead className="w-[20%]">Tipo</TableHead>
                      <TableHead className="w-[30%]">Dimensões</TableHead>
                      <TableHead className="w-[20%] text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableBody>
                      {produtos
                        .filter(produto => 
                          produto.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
                          produto.tipo.toLowerCase().includes(buscaProduto.toLowerCase())
                        )
                        .map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell className="w-[30%] font-medium">{produto.nome}</TableCell>
                          <TableCell className="w-[20%]">{produto.tipo}</TableCell>
                          <TableCell className="w-[30%] text-sm text-muted-foreground font-mono">
                            {produto.largura.toFixed(3)}×{produto.espessura.toFixed(3)}×{produto.comprimento}
                          </TableCell>
                          <TableCell className="w-[20%]">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleEditProduto(produto)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDeleteProduto(produto.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {produtos.filter(produto => 
                        produto.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
                        produto.tipo.toLowerCase().includes(buscaProduto.toLowerCase())
                      ).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {buscaProduto ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Dialog de Edição de Produto */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Produto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateProduto} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome do Produto</Label>
                  <Input
                    id="edit-nome"
                    value={nomeProduto}
                    onChange={(e) => setNomeProduto(e.target.value)}
                    placeholder="Ex: Tábua"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tipo">Tipo</Label>
                  <Input
                    id="edit-tipo"
                    value={tipoProduto}
                    onChange={(e) => setTipoProduto(e.target.value)}
                    placeholder="Ex: Madeira Serrada"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-largura">Largura (cm)</Label>
                    <Input
                      id="edit-largura"
                      type="number"
                      step="0.01"
                      value={larguraProduto}
                      onChange={(e) => setLarguraProduto(e.target.value)}
                      placeholder="Ex: 10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-espessura">Espessura (cm)</Label>
                    <Input
                      id="edit-espessura"
                      type="number"
                      step="0.01"
                      value={espessuraProduto}
                      onChange={(e) => setEspessuraProduto(e.target.value)}
                      placeholder="Ex: 2.5"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-comprimento">Comprimento (m)</Label>
                    <Input
                      id="edit-comprimento"
                      type="number"
                      step="0.01"
                      value={comprimentoProduto}
                      onChange={(e) => setComprimentoProduto(e.target.value)}
                      placeholder="Ex: 3"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditDialogOpen(false);
                      setEditandoProdutoId(null);
                      setNomeProduto("");
                      setTipoProduto("");
                      setLarguraProduto("");
                      setEspessuraProduto("");
                      setComprimentoProduto("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar Alterações</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="producao" className="space-y-6">
          <Card className="glass-effect neon-border shadow-elegant">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {tipoVisualizacao === "diaria" 
                    ? "Produção Diária (Últimos 7 dias)" 
                    : tipoVisualizacao === "30dias"
                    ? "Produção Diária (Últimos 30 dias)"
                    : "Produção Mensal (Últimos 6 meses)"}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={tipoVisualizacao === "diaria" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoVisualizacao("diaria")}
                  >
                    7 Dias
                  </Button>
                  <Button
                    variant={tipoVisualizacao === "30dias" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoVisualizacao("30dias")}
                  >
                    30 Dias
                  </Button>
                  <Button
                    variant={tipoVisualizacao === "mensal" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoVisualizacao("mensal")}
                  >
                    Mensal
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  if (tipoVisualizacao === "diaria") {
                    // Visualização diária (últimos 7 dias)
                    const nowBR = toZonedTime(new Date(), 'America/Sao_Paulo');
                    const last7Days = Array.from({ length: 7 }, (_, i) => {
                      const date = subDays(nowBR, 6 - i);
                      return format(date, 'yyyy-MM-dd');
                    });
                    
                    return last7Days.map(date => {
                      const dayProduction = producao.filter(p => {
                        const prodDate = p.data.includes('T') ? p.data.split('T')[0] : p.data;
                        return prodDate === date;
                      });
                      const total = dayProduction.reduce((sum, p) => sum + p.m3, 0);
                      return {
                        data: format(new Date(date + 'T12:00:00'), 'dd/MM'),
                        total: parseFloat(total.toFixed(2))
                      };
                    });
                  } else if (tipoVisualizacao === "30dias") {
                    // Visualização diária (últimos 30 dias)
                    const nowBR = toZonedTime(new Date(), 'America/Sao_Paulo');
                    const last30Days = Array.from({ length: 30 }, (_, i) => {
                      const date = subDays(nowBR, 29 - i);
                      return format(date, 'yyyy-MM-dd');
                    });
                    
                    return last30Days.map(date => {
                      const dayProduction = producao.filter(p => {
                        const prodDate = p.data.includes('T') ? p.data.split('T')[0] : p.data;
                        return prodDate === date;
                      });
                      const total = dayProduction.reduce((sum, p) => sum + p.m3, 0);
                      return {
                        data: format(new Date(date + 'T12:00:00'), 'dd/MM'),
                        total: parseFloat(total.toFixed(2))
                      };
                    });
                  } else {
                    // Visualização mensal (últimos 6 meses)
                    const nowBR = toZonedTime(new Date(), 'America/Sao_Paulo');
                    const last6Months = Array.from({ length: 6 }, (_, i) => {
                      const date = new Date(nowBR.getFullYear(), nowBR.getMonth() - (5 - i), 1);
                      return {
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        label: format(date, 'MMM/yy')
                      };
                    });
                    
                    return last6Months.map(({ year, month, label }) => {
                      const monthProduction = producao.filter(p => {
                        const prodDate = p.data.includes('T') ? p.data.split('T')[0] : p.data;
                        const prodDateObj = new Date(prodDate + 'T12:00:00');
                        return prodDateObj.getFullYear() === year && (prodDateObj.getMonth() + 1) === month;
                      });
                      const total = monthProduction.reduce((sum, p) => sum + p.m3, 0);
                      return {
                        data: label,
                        total: parseFloat(total.toFixed(2))
                      };
                    });
                  }
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
                    formatter={(value: number) => [`${value.toFixed(2)} m³`, 'Produção']}
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
                            <span className="font-semibold text-primary">Lote {tora.numeroLote || '-'}</span>
                            <span className="mx-2">•</span>
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Conversão por Lote de Toras
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarConversaoPDF}
                  className="gap-2"
                >
                  <img src={pdfIcon} alt="PDF" className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Calcular totais por mês e agrupar conversões
                const totaisPorMes: Record<string, { toneladas: number; m3: number; conversoes: Array<{descricao: string; numeroLote?: string; toneladas: number; m3Total: number; conversao: number}> }> = {};
                
                toras.forEach(tora => {
                  const mesAno = new Date(tora.data).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
                  const torasSerradasDoLote = torasSerradas.filter(ts => ts.toraId === tora.id);
                  const toneladasSerradas = torasSerradasDoLote.reduce((sum, ts) => sum + ts.toneladas, 0);
                  const producoesDoLote = producao.filter(p => p.toraId === tora.id);
                  const m3Total = producoesDoLote.reduce((sum, p) => sum + p.m3, 0);
                  
                  if (!totaisPorMes[mesAno]) {
                    totaisPorMes[mesAno] = { toneladas: 0, m3: 0, conversoes: [] };
                  }
                  
                  if (m3Total > 0) {
                    totaisPorMes[mesAno].toneladas += toneladasSerradas;
                    totaisPorMes[mesAno].m3 += m3Total;
                    totaisPorMes[mesAno].conversoes.push({
                      descricao: tora.descricao,
                      numeroLote: tora.numeroLote,
                      toneladas: toneladasSerradas,
                      m3Total,
                      conversao: m3Total > 0 ? toneladasSerradas / m3Total : 0
                    });
                  }
                });

                const mesesOrdenados = Object.keys(totaisPorMes)
                  .filter(mes => totaisPorMes[mes].m3 > 0)
                  .sort((a, b) => {
                    const [mesA, anoA] = a.split('/');
                    const [mesB, anoB] = b.split('/');
                    return new Date(Number(anoB), Number(mesB) - 1).getTime() - new Date(Number(anoA), Number(mesA) - 1).getTime();
                  });

                if (mesesOrdenados.length === 0) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma produção vinculada a toras ainda
                    </div>
                  );
                }

                const mesAtual = mesesOrdenados[paginaConversao];
                const dadosMes = totaisPorMes[mesAtual];
                const conversaoMensal = dadosMes.m3 > 0 ? dadosMes.toneladas / dadosMes.m3 : 0;

                return (
                  <div className="space-y-4">
                    {/* Navegação por mês */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaConversao(prev => Math.max(0, prev - 1))}
                        disabled={paginaConversao === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <div className="text-center">
                        <span className="font-semibold text-lg text-primary">{mesAtual}</span>
                        <p className="text-xs text-muted-foreground">
                          Página {paginaConversao + 1} de {mesesOrdenados.length}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaConversao(prev => Math.min(mesesOrdenados.length - 1, prev + 1))}
                        disabled={paginaConversao === mesesOrdenados.length - 1}
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

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
                          {dadosMes.conversoes.map((conv, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                <span className="font-semibold text-primary">Lote {conv.numeroLote || '-'}</span>
                                <span className="mx-2">•</span>
                                {conv.descricao}
                              </TableCell>
                              <TableCell>{conv.toneladas.toFixed(2)} T</TableCell>
                              <TableCell>{conv.m3Total.toFixed(2)} m³</TableCell>
                              <TableCell className="font-bold text-primary text-lg">
                                {conv.conversao.toFixed(2)} T/m³
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Total do mês */}
                          <TableRow className="bg-primary/10 border-t-2 border-primary/30">
                            <TableCell className="font-bold text-foreground">
                              Total {mesAtual}
                            </TableCell>
                            <TableCell className="font-bold">{dadosMes.toneladas.toFixed(2)} T</TableCell>
                            <TableCell className="font-bold">{dadosMes.m3.toFixed(2)} m³</TableCell>
                            <TableCell className="font-bold text-primary text-xl">
                              {conversaoMensal.toFixed(2)} T/m³
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">Histórico de Produção</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportarPDF}
                      className="gap-2"
                    >
                      <img src={pdfIcon} alt="PDF" className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportarExcel}
                      className="gap-2"
                    >
                      <img src={excelIcon} alt="Excel" className="h-4 w-4" />
                      Excel
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="dataInicio">Data Início</Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataFim">Data Fim</Label>
                    <Input
                      id="dataFim"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buscaHistorico">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="buscaHistorico"
                        value={buscaHistorico}
                        onChange={(e) => setBuscaHistorico(e.target.value)}
                        placeholder="Produto, tipo ou lote..."
                        className="pl-9 border-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead className="w-[180px]">Tipo</TableHead>
                      <TableHead className="w-[160px]">Dimensões</TableHead>
                      <TableHead className="w-[80px] text-center">Qtd</TableHead>
                      <TableHead className="w-[80px] text-right">m³</TableHead>
                      <TableHead className="w-[180px]">Tora</TableHead>
                      <TableHead className="w-[100px] text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableBody>
                      {(() => {
                        const producaoFiltrada = getProducaoFiltrada();
                        
                        if (producaoFiltrada.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                Nenhuma produção encontrada no período selecionado
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return producaoFiltrada.map((prod) => (
                          <TableRow key={prod.id}>
                            <TableCell className="w-[100px]">{formatDateBR(prod.data)}</TableCell>
                            <TableCell className="w-[180px] font-medium">{prod.produtoNome}</TableCell>
                            <TableCell className="w-[160px] text-sm text-muted-foreground font-mono">
                              {prod.largura.toFixed(3)}×{prod.espessura.toFixed(3)}×{prod.comprimento}
                            </TableCell>
                            <TableCell className="w-[80px] text-center">{prod.quantidade}</TableCell>
                            <TableCell className="w-[80px] text-right font-semibold text-primary">{prod.m3.toFixed(2)}</TableCell>
                            <TableCell className="w-[180px] text-sm text-muted-foreground">
                              {prod.toraId ? (
                                <>
                                  <span className="font-semibold text-primary">Lote {(prod as any).toraLote || '-'}</span>
                                  <span className="mx-1">•</span>
                                  {prod.toraDescricao}
                                </>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="w-[100px]">
                              <div className="flex gap-2 justify-center">
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
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              {(() => {
                const producaoFiltrada = getProducaoFiltrada();
                const totalM3 = producaoFiltrada.reduce((sum, p) => sum + p.m3, 0);
                const totalPecas = producaoFiltrada.reduce((sum, p) => sum + p.quantidade, 0);
                
                return (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total do Período</p>
                      <p className="text-lg font-bold text-primary">{totalM3.toFixed(2)} m³</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Peças</p>
                      <p className="text-lg font-bold text-foreground">{totalPecas}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Registros</p>
                      <p className="text-lg font-bold text-foreground">{producaoFiltrada.length}</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
