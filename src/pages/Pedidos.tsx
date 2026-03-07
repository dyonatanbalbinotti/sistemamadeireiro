import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ClipboardList, CheckCircle2, Circle, Pencil, FileText, Search, Filter, CalendarIcon } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { addPDFHeader, addPDFFooter } from '@/lib/pdfUtils';
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import pdfIcon from '@/assets/pdf-icon.png';
import { calcularCubagem } from "@/lib/storage";

interface ItemPedido {
  id: string;
  descricao: string;
  quantidade_m3: number;
  quantidade_pecas: number;
  quantidade_pecas_produzidas: number;
  concluido: boolean;
  produto_id: string;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  data_pedido: string;
  concluido: boolean;
  observacao?: string;
  itens: ItemPedido[];
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const { empresa } = useEmpresaData();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editandoPedidoId, setEditandoPedidoId] = useState<string | null>(null);
  
  // Filtros
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "concluido" | "pendente">("todos");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pedidos");

  // Romaneio states
  const [romaneioItens, setRomaneioItens] = useState<Array<{
    id: string;
    produtoId: string;
    produtoNome: string;
    largura: number;
    espessura: number;
    comprimento: number;
    quantidade: number;
    m3: number;
    valorM3: number;
    valorTotal: number;
  }>>([]);
  const [romaneioProdutoSelecionado, setRomaneioProdutoSelecionado] = useState("");
  const [romaneioQuantidade, setRomaneioQuantidade] = useState("");
  const [romaneioValorM3, setRomaneioValorM3] = useState("");

  // Form states
  const [numeroPedido, setNumeroPedido] = useState("");
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<Array<{ quantidade_m3: string; quantidade_pecas: string; produto_id: string }>>([
    { quantidade_m3: "", quantidade_pecas: "", produto_id: "" }
  ]);

  // Form states para edição
  const [editNumeroPedido, setEditNumeroPedido] = useState("");
  const [editDataPedido, setEditDataPedido] = useState("");
  const [editObservacao, setEditObservacao] = useState("");
  const [editItens, setEditItens] = useState<Array<{ id?: string; quantidade_m3: string; quantidade_pecas: string; produto_id: string }>>([]);

  useEffect(() => {
    fetchPedidos();
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Primeiro buscar a empresa do usuário
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle();

      const empresaId = empresaData?.id || user.user.id;

      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Buscar empresa_id correto
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle();

      const empresaId = empresaData?.id || user.user.id;

      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_pedido', { ascending: false });

      if (pedidosError) throw pedidosError;

      if (pedidosData) {
        const pedidosComItens = await Promise.all(
          pedidosData.map(async (pedido) => {
            const { data: itensData, error: itensError } = await supabase
              .from('itens_pedido')
              .select('*')
              .eq('pedido_id', pedido.id)
              .order('created_at');

            if (itensError) throw itensError;

            return {
              ...pedido,
              itens: itensData || []
            };
          })
        );

        setPedidos(pedidosComItens);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: "Erro ao carregar pedidos",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItens([...itens, { quantidade_m3: "", quantidade_pecas: "", produto_id: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    
    // Auto-calcular m³ quando produto ou quantidade de peças mudar
    if ((field === 'produto_id' || field === 'quantidade_pecas') && newItens[index].produto_id && newItens[index].quantidade_pecas) {
      const produto = produtos.find(p => p.id === newItens[index].produto_id);
      if (produto) {
        const quantidadePecas = parseFloat(newItens[index].quantidade_pecas) || 0;
        newItens[index].quantidade_m3 = (quantidadePecas * produto.largura * produto.espessura * produto.comprimento).toFixed(3);
      }
    }
    
    setItens(newItens);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroPedido || itens.length === 0 || itens.some(item => !item.produto_id || !item.quantidade_m3 || !item.quantidade_pecas)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o número do pedido e selecione um produto com quantidade de peças para todos os itens.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Buscar empresa_id correto
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle();

      const empresaId = empresaData?.id || user.user.id;

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          empresa_id: empresaId,
          numero_pedido: numeroPedido,
          data_pedido: dataPedido,
          observacao: observacao || null,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      const itensParaInserir = itens.map(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        return {
          pedido_id: pedido.id,
          descricao: produto ? produto.nome : "Produto",
          quantidade_m3: parseFloat(item.quantidade_m3),
          quantidade_pecas: parseInt(item.quantidade_pecas),
          produto_id: item.produto_id,
        };
      });

      const { error: itensError } = await supabase
        .from('itens_pedido')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast({
        title: "Pedido criado",
        description: "O pedido foi criado com sucesso.",
      });

      setDialogOpen(false);
      setNumeroPedido("");
      setDataPedido(new Date().toISOString().split('T')[0]);
      setObservacao("");
      setItens([{ quantidade_m3: "", quantidade_pecas: "", produto_id: "" }]);
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: "Erro ao criar pedido",
        description: "Não foi possível criar o pedido.",
        variant: "destructive",
      });
    }
  };

  const updateQuantidadePecasProduzidas = async (pedidoId: string, itemId: string, quantidadePecas: number) => {
    try {
      const item = pedidos.find(p => p.id === pedidoId)?.itens.find(i => i.id === itemId);
      if (!item) return;

      if (quantidadePecas < 0 || quantidadePecas > item.quantidade_pecas) {
        toast({
          title: "Quantidade inválida",
          description: `A quantidade produzida deve estar entre 0 e ${item.quantidade_pecas} peças.`,
          variant: "destructive",
        });
        return;
      }

      const concluido = quantidadePecas >= item.quantidade_pecas;

      const { error } = await supabase
        .from('itens_pedido')
        .update({ 
          quantidade_pecas_produzidas: quantidadePecas,
          concluido: concluido
        })
        .eq('id', itemId);

      if (error) throw error;

      fetchPedidos();

      toast({
        title: "Quantidade atualizada",
        description: "A quantidade de peças produzidas foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade produzida:', error);
      toast({
        title: "Erro ao atualizar quantidade",
        description: "Não foi possível atualizar a quantidade produzida.",
        variant: "destructive",
      });
    }
  };

  const toggleItemConcluido = async (pedidoId: string, itemId: string, concluido: boolean) => {
    try {
      const item = pedidos.find(p => p.id === pedidoId)?.itens.find(i => i.id === itemId);
      if (!item) return;

      const novosConcluido = !concluido;
      const novaQuantidadePecas = novosConcluido ? item.quantidade_pecas : 0;

      const { error } = await supabase
        .from('itens_pedido')
        .update({ 
          concluido: novosConcluido,
          quantidade_pecas_produzidas: novaQuantidadePecas
        })
        .eq('id', itemId);

      if (error) throw error;

      // Atualizar estado local
      setPedidos(pedidos.map(pedido => {
        if (pedido.id === pedidoId) {
          return {
            ...pedido,
            itens: pedido.itens.map(i =>
              i.id === itemId ? { ...i, concluido: novosConcluido, quantidade_pecas_produzidas: novaQuantidadePecas } : i
            )
          };
        }
        return pedido;
      }));

      // Verificar se todos os itens estão concluídos
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (pedido) {
        const todosItensCompletos = pedido.itens
          .map(i => i.id === itemId ? novosConcluido : i.concluido)
          .every(c => c);

        if (todosItensCompletos) {
          await supabase
            .from('pedidos')
            .update({ concluido: true })
            .eq('id', pedidoId);
          
          fetchPedidos();
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro ao atualizar item",
        description: "Não foi possível atualizar o item.",
        variant: "destructive",
      });
    }
  };

  const togglePedidoConcluido = async (pedidoId: string, concluido: boolean) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ concluido: !concluido })
        .eq('id', pedidoId);

      if (error) throw error;

      // Atualizar todos os itens do pedido
      await supabase
        .from('itens_pedido')
        .update({ concluido: !concluido })
        .eq('pedido_id', pedidoId);

      fetchPedidos();
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast({
        title: "Erro ao atualizar pedido",
        description: "Não foi possível atualizar o pedido.",
        variant: "destructive",
      });
    }
  };

  const deletePedido = async (pedidoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', pedidoId);

      if (error) throw error;

      toast({
        title: "Pedido excluído",
        description: "O pedido foi excluído com sucesso.",
      });

      fetchPedidos();
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast({
        title: "Erro ao excluir pedido",
        description: "Não foi possível excluir o pedido.",
        variant: "destructive",
      });
    }
  };

  const handleEditPedido = (pedido: Pedido) => {
    setEditandoPedidoId(pedido.id);
    setEditNumeroPedido(pedido.numero_pedido);
    setEditDataPedido(pedido.data_pedido);
    setEditObservacao(pedido.observacao || "");
    setEditItens(pedido.itens.map(item => ({
      id: item.id,
      quantidade_m3: item.quantidade_m3.toString(),
      quantidade_pecas: item.quantidade_pecas.toString(),
      produto_id: item.produto_id || "",
    })));
    setEditDialogOpen(true);
  };

  const handleEditItemChange = (index: number, field: string, value: string) => {
    const newItens = [...editItens];
    newItens[index] = { ...newItens[index], [field]: value };
    
    // Auto-calcular m³ quando produto ou quantidade de peças mudar
    if ((field === 'produto_id' || field === 'quantidade_pecas') && newItens[index].produto_id && newItens[index].quantidade_pecas) {
      const produto = produtos.find(p => p.id === newItens[index].produto_id);
      if (produto) {
        const quantidadePecas = parseFloat(newItens[index].quantidade_pecas) || 0;
        newItens[index].quantidade_m3 = (quantidadePecas * produto.largura * produto.espessura * produto.comprimento).toFixed(3);
      }
    }
    
    setEditItens(newItens);
  };

  const handleAddEditItem = () => {
    setEditItens([...editItens, { quantidade_m3: "", quantidade_pecas: "", produto_id: "" }]);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItens(editItens.filter((_, i) => i !== index));
  };

  const handleUpdatePedido = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editandoPedidoId || !editNumeroPedido || editItens.length === 0 || editItens.some(item => !item.produto_id || !item.quantidade_m3 || !item.quantidade_pecas)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o número do pedido e selecione um produto com quantidade de peças para todos os itens.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Atualizar pedido
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({
          numero_pedido: editNumeroPedido,
          data_pedido: editDataPedido,
          observacao: editObservacao || null,
        })
        .eq('id', editandoPedidoId);

      if (pedidoError) throw pedidoError;

      // Deletar itens antigos
      const { error: deleteError } = await supabase
        .from('itens_pedido')
        .delete()
        .eq('pedido_id', editandoPedidoId);

      if (deleteError) throw deleteError;

      // Inserir novos itens
      const itensParaInserir = editItens.map(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        return {
          pedido_id: editandoPedidoId,
          descricao: produto ? produto.nome : "Produto",
          quantidade_m3: parseFloat(item.quantidade_m3),
          quantidade_pecas: parseInt(item.quantidade_pecas),
          produto_id: item.produto_id,
        };
      });

      const { error: itensError } = await supabase
        .from('itens_pedido')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast({
        title: "Pedido atualizado",
        description: "O pedido foi atualizado com sucesso.",
      });

      setEditDialogOpen(false);
      setEditandoPedidoId(null);
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast({
        title: "Erro ao atualizar pedido",
        description: "Não foi possível atualizar o pedido.",
        variant: "destructive",
      });
    }
  };

  const gerarPDFPedido = async (pedido: Pedido) => {
    try {
      const doc = new jsPDF();
      
      // Adicionar cabeçalho
      const startY = await addPDFHeader({ empresa, doc });

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Pedido de Produção", 14, startY + 5);

      // Informações do pedido
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      let yPos = startY + 15;
      
      doc.text(`Número do Pedido: ${pedido.numero_pedido}`, 14, yPos);
      yPos += 7;
      doc.text(`Data: ${new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}`, 14, yPos);
      yPos += 7;
      doc.text(`Status: ${pedido.concluido ? 'Concluído' : 'Em Andamento'}`, 14, yPos);
      yPos += 7;
      
      if (pedido.observacao) {
        doc.text(`Observações: ${pedido.observacao}`, 14, yPos);
        yPos += 7;
      }

      // Tabela de itens
      const tableData = pedido.itens.map((item) => {
        const percentual = ((item.quantidade_pecas_produzidas / item.quantidade_pecas) * 100).toFixed(0);
        return [
          item.descricao,
          item.quantidade_pecas.toString(),
          item.quantidade_pecas_produzidas.toString(),
          `${item.quantidade_m3.toFixed(2)} m³`,
          `${percentual}%`,
          item.concluido ? 'Sim' : 'Não'
        ];
      });

      autoTable(doc, {
        startY: yPos + 5,
        head: [['Produto', 'Qtd. Peças', 'Produzidas', 'Volume (m³)', 'Progresso', 'Concluído']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [139, 69, 19],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 30 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 25 }
        },
        margin: { bottom: 30 }
      });

      // Totais
      const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ${pedido.itens.reduce((sum, item) => sum + Number(item.quantidade_m3), 0).toFixed(2)} m³`, 14, finalY + 10);
      doc.text(`Itens concluídos: ${pedido.itens.filter(i => i.concluido).length} de ${pedido.itens.length}`, 14, finalY + 17);

      // Adicionar rodapé
      await addPDFFooter({ empresa, doc });

      // Salvar PDF
      doc.save(`pedido-${pedido.numero_pedido}.pdf`);

      toast({
        title: "PDF gerado",
        description: "O PDF do pedido foi gerado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF do pedido.",
        variant: "destructive",
      });
    }
  };

  // Filtrar pedidos - primeiro por data, depois por status
  const pedidosFiltrados = pedidos.filter(pedido => {
    // Filtro por número do pedido
    const matchNumero = filtroNumero === "" || 
      pedido.numero_pedido.toLowerCase().includes(filtroNumero.toLowerCase());
    
    // Filtro por data do pedido - comparar strings YYYY-MM-DD diretamente
    const dataPedidoStr = pedido.data_pedido; // formato: YYYY-MM-DD
    
    let matchData = true;
    if (dataInicio) {
      // Converter data selecionada para string YYYY-MM-DD
      const inicioStr = format(dataInicio, 'yyyy-MM-dd');
      matchData = dataPedidoStr >= inicioStr;
    }
    if (matchData && dataFim) {
      const fimStr = format(dataFim, 'yyyy-MM-dd');
      matchData = dataPedidoStr <= fimStr;
    }
    
    // Filtro por status (aplicado após o filtro de data)
    const matchStatus = filtroStatus === "todos" || 
      (filtroStatus === "concluido" && pedido.concluido) || 
      (filtroStatus === "pendente" && !pedido.concluido);
    
    // Retorna true apenas se TODOS os filtros forem verdadeiros
    return matchNumero && matchData && matchStatus;
  });

  // Exportar PDF com todos os pedidos filtrados
  const exportarPDFPedidos = async () => {
    if (pedidosFiltrados.length === 0) {
      toast({
        title: "Nenhum pedido para exportar",
        description: "Aplique filtros ou cadastre pedidos primeiro.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    // Adicionar cabeçalho
    const startY = await addPDFHeader({ empresa, doc });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Pedidos", 14, startY + 5);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let filtroTexto = "Filtros: ";
    if (filtroStatus !== "todos") filtroTexto += `Status: ${filtroStatus === "concluido" ? "Concluídos" : "Pendentes"} | `;
    if (dataInicio) filtroTexto += `De: ${format(dataInicio, "dd/MM/yyyy")} | `;
    if (dataFim) filtroTexto += `Até: ${format(dataFim, "dd/MM/yyyy")} | `;
    if (filtroNumero) filtroTexto += `Número: ${filtroNumero}`;
    if (filtroTexto === "Filtros: ") filtroTexto = "Sem filtros aplicados";
    doc.text(filtroTexto, 14, startY + 12);

    const tableData = pedidosFiltrados.map(pedido => {
      const totalPecas = pedido.itens.reduce((acc, item) => acc + item.quantidade_pecas, 0);
      const totalProduzidas = pedido.itens.reduce((acc, item) => acc + item.quantidade_pecas_produzidas, 0);
      const totalM3 = pedido.itens.reduce((acc, item) => acc + item.quantidade_m3, 0);
      return [
        pedido.numero_pedido,
        format(new Date(pedido.data_pedido + 'T00:00:00'), "dd/MM/yyyy"),
        pedido.itens.length.toString(),
        totalPecas.toString(),
        totalProduzidas.toString(),
        totalM3.toFixed(3),
        pedido.concluido ? "Concluído" : "Pendente"
      ];
    });

    autoTable(doc, {
      startY: startY + 18,
      head: [["Nº Pedido", "Data", "Itens", "Peças", "Produzidas", "M³", "Status"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { bottom: 30 }
    });

    // Adicionar rodapé
    await addPDFFooter({ empresa, doc });

    doc.save(`pedidos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    
    toast({
      title: "PDF gerado",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-tech font-bold text-foreground">
            Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie os pedidos de produção</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Pedido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número do Pedido</Label>
                  <Input
                    id="numero"
                    value={numeroPedido}
                    onChange={(e) => setNumeroPedido(e.target.value)}
                    placeholder="Ex: 001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataPedido}
                    onChange={(e) => setDataPedido(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações sobre o pedido (opcional)"
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Itens do Pedido</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                </div>

                {itens.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      {itens.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Produto (Descrição)</Label>
                      <Select
                        value={item.produto_id}
                        onValueChange={(value) => handleItemChange(index, 'produto_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {produtos.map((produto) => (
                            <SelectItem key={produto.id} value={produto.id}>
                              {produto.nome} ({produto.largura}x{produto.espessura}x{produto.comprimento})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Quantidade (peças)</Label>
                        <Input
                          type="number"
                          value={item.quantidade_pecas}
                          onChange={(e) => handleItemChange(index, 'quantidade_pecas', e.target.value)}
                          placeholder="Ex: 500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>M³ do Pedido</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.quantidade_m3}
                          placeholder="Calculado automaticamente"
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Pedido</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número..."
            value={filtroNumero}
            onChange={(e) => setFiltroNumero(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v: "todos" | "concluido" | "pendente") => setFiltroStatus(v)}>
          <SelectTrigger className="w-[140px] h-9">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="concluido">Concluídos</SelectItem>
          </SelectContent>
        </Select>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dataInicio ? format(dataInicio, "dd/MM/yy") : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dataInicio}
              onSelect={setDataInicio}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dataFim ? format(dataFim, "dd/MM/yy") : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dataFim}
              onSelect={setDataFim}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {(dataInicio || dataFim) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setDataInicio(undefined); setDataFim(undefined); }}>
            Limpar datas
          </Button>
        )}

        <Button onClick={exportarPDFPedidos} variant="outline" size="sm" className="h-9 ml-auto">
          <img src={pdfIcon} alt="PDF" className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {pedidos.length === 0 ? "Nenhum pedido cadastrado ainda." : "Nenhum pedido encontrado com os filtros aplicados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pedidosFiltrados.map((pedido) => (
            <Card
              key={pedido.id}
              className={`glass-effect neon-border ${
                pedido.concluido ? 'bg-primary/5 border-primary' : ''
              }`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePedidoConcluido(pedido.id, pedido.concluido)}
                        className="p-0 h-6 w-6"
                      >
                        {pedido.concluido ? (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </Button>
                      Pedido {pedido.numero_pedido}
                      {pedido.concluido && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Concluído
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Data: {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                    </p>
                    {pedido.observacao && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Obs: {pedido.observacao}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => gerarPDFPedido(pedido)}
                      className="hover:bg-primary/10"
                      title="Gerar PDF"
                    >
                      <img src={pdfIcon} alt="PDF" className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPedido(pedido)}
                      className="hover:bg-primary/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePedido(pedido.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pedido.itens.map((item) => {
                    const pecasRestantes = item.quantidade_pecas - item.quantidade_pecas_produzidas;
                    const m3PorPeca = item.quantidade_m3 / item.quantidade_pecas;
                    const m3Restantes = pecasRestantes * m3PorPeca;
                    const percentual = (item.quantidade_pecas_produzidas / item.quantidade_pecas) * 100;
                    
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${
                          item.concluido ? 'bg-primary/5 border-primary/20' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <Checkbox
                            checked={item.concluido}
                            onCheckedChange={() =>
                              toggleItemConcluido(pedido.id, item.id, item.concluido)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                              {item.quantidade_m3.toFixed(2)} m³ de {item.descricao} ({item.quantidade_pecas} peças)
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Label className="text-xs text-muted-foreground">Produzido:</Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.quantidade_pecas}
                                defaultValue={item.quantidade_pecas_produzidas}
                                key={`${item.id}-${item.quantidade_pecas_produzidas}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const value = parseInt((e.target as HTMLInputElement).value) || 0;
                                    updateQuantidadePecasProduzidas(pedido.id, item.id, value);
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  if (value !== item.quantidade_pecas_produzidas) {
                                    updateQuantidadePecasProduzidas(pedido.id, item.id, value);
                                  }
                                }}
                                className="w-24 h-7 text-sm"
                                disabled={pedido.concluido}
                                placeholder="0"
                              />
                              <span className="text-xs text-muted-foreground">peças</span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Restante: {m3Restantes.toFixed(2)} m³ ({pecasRestantes} peças)</span>
                                <span className={`font-medium ${item.concluido ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {percentual.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${item.concluido ? 'bg-primary' : 'bg-primary/60'}`}
                                  style={{ width: `${Math.min(percentual, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium">
                    Total: {pedido.itens.reduce((sum, item) => sum + Number(item.quantidade_m3), 0).toFixed(2)} m³
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Concluídos: {pedido.itens.filter(i => i.concluido).length} de {pedido.itens.length} itens
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Edição de Pedido */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePedido} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-numero">Número do Pedido</Label>
                <Input
                  id="edit-numero"
                  value={editNumeroPedido}
                  onChange={(e) => setEditNumeroPedido(e.target.value)}
                  placeholder="Ex: 001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-data">Data</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editDataPedido}
                  onChange={(e) => setEditDataPedido(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-observacao">Observações</Label>
              <Textarea
                id="edit-observacao"
                value={editObservacao}
                onChange={(e) => setEditObservacao(e.target.value)}
                placeholder="Observações sobre o pedido (opcional)"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Itens do Pedido</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddEditItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Item
                </Button>
              </div>

              {editItens.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {editItens.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEditItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Produto (Descrição)</Label>
                    <Select
                      value={item.produto_id}
                      onValueChange={(value) => handleEditItemChange(index, 'produto_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.nome} ({produto.largura}x{produto.espessura}x{produto.comprimento})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Quantidade (peças)</Label>
                      <Input
                        type="number"
                        value={item.quantidade_pecas}
                        onChange={(e) => handleEditItemChange(index, 'quantidade_pecas', e.target.value)}
                        placeholder="Ex: 500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>M³ do Pedido</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.quantidade_m3}
                        placeholder="Calculado automaticamente"
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditandoPedidoId(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
