import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShoppingCart, Edit, Trash2, CalendarIcon, Layers, FileText, TreeDeciduous, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import pdfIcon from '@/assets/pdf-icon.png';
import dwLogo from '@/assets/dw-logo-new.png';
import { Venda } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { formatDateBR, getTodayBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { calcularEstoqueSerradoSupabase } from "@/lib/supabaseStorage";
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { addPDFHeader, addPDFFooter } from '@/lib/pdfUtils';
import { FadeIn, HoverScale } from "@/components/MotionWrapper";

type TipoVenda = 'madeira' | 'cavaco' | 'serragem' | 'casqueiro';

export default function Vendas() {
  const { user } = useAuth();
  const { empresaId, loading: loadingEmpresaId, error: empresaError } = useEmpresaId();
  const { empresa } = useEmpresaData();
  const [tipoVenda, setTipoVenda] = useState<TipoVenda>('madeira');
  const [modoVendaMadeira, setModoVendaMadeira] = useState<'unidades' | 'm3'>('unidades');
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasCavaco, setVendasCavaco] = useState<any[]>([]);
  const [vendasSerragem, setVendasSerragem] = useState<any[]>([]);
  const [vendasCasqueiro, setVendasCasqueiro] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [toras, setToras] = useState<any[]>([]);
  const [cavacoDisponivel, setCavacoDisponivel] = useState<{id: string; descricao: string; cavacoDisponivel: number}[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCavacoId, setEditingCavacoId] = useState<string | null>(null);
  const [editingSerragemId, setEditingSerragemId] = useState<string | null>(null);
  const [editingCasqueiroId, setEditingCasqueiroId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos para cálculo de conversão m³ (primeiro passo)
  const [produtoM3, setProdutoM3] = useState("");
  const [quantidadePecas, setQuantidadePecas] = useState("");
  const [totalM3, setTotalM3] = useState("");
  const [valorM3, setValorM3] = useState("");
  
  // Campos para registro da venda (segundo passo)
  const [dataVenda, setDataVenda] = useState<Date>(new Date());
  const [tipo, setTipo] = useState<'serrada' | 'tora'>('serrada');
  const [quantidadeVenda, setQuantidadeVenda] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");

  // Campos para venda de cavaco
  const [toneladasVendidas, setToneladasVendidas] = useState("");
  const [valorTonelada, setValorTonelada] = useState("");
  const [cavacoTotalEstoque, setCavacoTotalEstoque] = useState(0);

  // Campos para venda de serragem
  const [toneladasSerragem, setToneladasSerragem] = useState("");
  const [valorToneladaSerragem, setValorToneladaSerragem] = useState("");

  // Campos para venda de casqueiro
  const [valorMetroEstereo, setValorMetroEstereo] = useState("");
  const [alturaCasqueiro, setAlturaCasqueiro] = useState("");
  const [larguraCasqueiro, setLarguraCasqueiro] = useState("");
  const [comprimentoCasqueiro, setComprimentoCasqueiro] = useState("");

  // Campos para venda direta por m³
  const [produtoM3Direto, setProdutoM3Direto] = useState("");
  const [quantidadePecasM3Direto, setQuantidadePecasM3Direto] = useState("");
  const [quantidadeM3Direto, setQuantidadeM3Direto] = useState("0.00");
  const [valorM3Direto, setValorM3Direto] = useState("");
  const [valorTotalM3Direto, setValorTotalM3Direto] = useState("");
  const [dataVendaM3, setDataVendaM3] = useState<Date>(new Date());

  // Campos para filtros de relatório
  const [dataInicial, setDataInicial] = useState<Date | undefined>(undefined);
  const [dataFinal, setDataFinal] = useState<Date | undefined>(undefined);
  
  // Estados para paginação
  const [paginaVendas, setPaginaVendas] = useState(1);
  const itensPorPagina = 10;

  // Calcular total metro estéreo automaticamente
  const totalMetroEstereo = (() => {
    const altura = parseFloat(alturaCasqueiro);
    const largura = parseFloat(larguraCasqueiro);
    const comprimento = parseFloat(comprimentoCasqueiro);
    if (!isNaN(altura) && !isNaN(largura) && !isNaN(comprimento) && altura > 0 && largura > 0 && comprimento > 0) {
      return altura * largura * comprimento;
    }
    return 0;
  })();

  // Calcular valor total da carga casqueiro
  const valorTotalCasqueiro = (() => {
    const valorME = parseFloat(valorMetroEstereo);
    if (!isNaN(valorME) && valorME > 0 && totalMetroEstereo > 0) {
      return valorME * totalMetroEstereo;
    }
    return 0;
  })();

  // Calcular valor total serragem
  const valorTotalSerragem = (() => {
    const toneladas = parseFloat(toneladasSerragem);
    const valor = parseFloat(valorToneladaSerragem);
    if (!isNaN(toneladas) && !isNaN(valor) && toneladas > 0 && valor > 0) {
      return toneladas * valor;
    }
    return 0;
  })();

  // Calcular m³ automaticamente quando produto e quantidade de peças são informados (venda por m³)
  useEffect(() => {
    if (produtoM3Direto && quantidadePecasM3Direto && produtos.length > 0) {
      const produto = produtos.find(p => p.id === produtoM3Direto);
      
      if (produto) {
        const qtdPecas = parseFloat(quantidadePecasM3Direto);
        
        if (!isNaN(qtdPecas) && qtdPecas > 0) {
          const m3 = produto.largura * produto.espessura * produto.comprimento * qtdPecas;
          setQuantidadeM3Direto(m3.toFixed(2));
          return;
        }
      }
    }
    setQuantidadeM3Direto("0.00");
  }, [produtoM3Direto, quantidadePecasM3Direto, produtos]);

  // Calcular valor total automaticamente (m³ × valor do m³)
  useEffect(() => {
    const m3 = parseFloat(quantidadeM3Direto);
    const valorM3 = parseFloat(valorM3Direto);
    
    if (!isNaN(m3) && !isNaN(valorM3) && m3 > 0 && valorM3 > 0) {
      const total = m3 * valorM3;
      setValorTotalM3Direto(total.toFixed(2));
    } else {
      setValorTotalM3Direto("");
    }
  }, [quantidadeM3Direto, valorM3Direto]);

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
          .order('created_at', { ascending: false });
        
        if (produtosData) {
          setProdutos(produtosData.map(p => ({
            id: p.id,
            nome: p.nome,
            tipo: p.tipo,
            largura: Number(p.largura || 0),
            espessura: Number(p.espessura || 0),
            comprimento: Number(p.comprimento || 0),
          })));
        }

        // Carregar vendas
        const { data: vendasData } = await supabase
          .from('vendas')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (vendasData) {
          setVendas(vendasData.map(v => ({
            id: v.id,
            data: v.data,
            produtoId: v.produto_id,
            tipo: v.tipo as 'serrada' | 'tora',
            quantidade: Number(v.quantidade),
            unidadeMedida: v.unidade_medida as 'unidade' | 'm3' | 'tonelada',
            valorUnitario: Number(v.valor_unitario),
            valorTotal: Number(v.valor_total),
          })));
        }

        // Carregar toras
        const { data: torasData } = await supabase
          .from('toras')
          .select('*')
          .order('created_at', { ascending: false });

        if (torasData) {
          setToras(torasData);
        }

        // Carregar vendas de cavaco
        const { data: vendasCavacoData } = await supabase
          .from('vendas_cavaco')
          .select('*, toras(descricao)')
          .order('created_at', { ascending: false });

        if (vendasCavacoData) {
          setVendasCavaco(vendasCavacoData);
        }

        // Carregar vendas de serragem
        const { data: vendasSerragemData } = await supabase
          .from('vendas_serragem')
          .select('*')
          .order('created_at', { ascending: false });

        if (vendasSerragemData) {
          setVendasSerragem(vendasSerragemData);
        }

        // Carregar vendas de casqueiro
        const { data: vendasCasqueiroData } = await supabase
          .from('vendas_casqueiro')
          .select('*')
          .order('created_at', { ascending: false });

        if (vendasCasqueiroData) {
          setVendasCasqueiro(vendasCasqueiroData);
        }

        // Calcular cavaco disponível (por tora para manter compatibilidade)
        const { data: producaoData } = await supabase
          .from('producao')
          .select('*, toras(id)')
          .order('created_at', { ascending: false });

        if (torasData && producaoData && vendasCavacoData) {
          let totalCavacoDisponivel = 0;
          const calculoCavaco: {id: string; descricao: string; cavacoDisponivel: number}[] = [];
          
          torasData.forEach(tora => {
            const producoesDaTora = producaoData.filter(p => p.tora_id === tora.id);
            const m3Total = producoesDaTora.reduce((sum, p) => sum + Number(p.m3), 0);
            
            const pesoPorM3 = Number(tora.peso_por_m3) || 0.6;
            const toneladasMadeirasSerradas = pesoPorM3 * m3Total;
            const cavacoTotal = Number(tora.toneladas) - toneladasMadeirasSerradas;
            
            const vendasDaTora = vendasCavacoData.filter(v => v.tora_id === tora.id);
            const toneladasVendidasTora = vendasDaTora.reduce((sum, v) => sum + Number(v.toneladas), 0);
            const cavacoDisponivelTora = Math.max(0, cavacoTotal - toneladasVendidasTora);
            
            totalCavacoDisponivel += cavacoDisponivelTora;
            
            if (cavacoDisponivelTora > 0) {
              calculoCavaco.push({
                id: tora.id,
                descricao: tora.descricao,
                cavacoDisponivel: cavacoDisponivelTora,
              });
            }
          });

          setCavacoTotalEstoque(totalCavacoDisponivel);
          setCavacoDisponivel(calculoCavaco);
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

  // Calcular automaticamente o Total m³ quando produto ou quantidade mudar
  useEffect(() => {
    if (produtoM3 && quantidadePecas && produtos.length > 0) {
      const prod = produtos.find(p => p.id === produtoM3);
      const qtd = parseFloat(quantidadePecas);
      
      if (prod && !isNaN(qtd) && qtd > 0) {
        const m3Total = prod.largura * prod.espessura * prod.comprimento * qtd;
        setTotalM3(m3Total.toFixed(2));
      } else {
        setTotalM3("");
      }
    } else {
      setTotalM3("");
    }
  }, [produtoM3, quantidadePecas, produtos]);

  // Calcular automaticamente o Valor Unitário quando valorM3 ou quantidadePecas mudar
  useEffect(() => {
    if (valorM3 && quantidadePecas) {
      const vm3 = parseFloat(valorM3);
      const qtd = parseFloat(quantidadePecas);
      
      if (!isNaN(vm3) && !isNaN(qtd) && qtd > 0) {
        setValorUnitario((vm3 / qtd).toFixed(2));
      } else {
        setValorUnitario("");
      }
    } else {
      setValorUnitario("");
    }
  }, [valorM3, quantidadePecas]);

  // Resetar paginação quando muda tipo de venda ou filtros
  useEffect(() => {
    setPaginaVendas(1);
  }, [tipoVenda, dataInicial, dataFinal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const qtd = parseFloat(quantidadeVenda);
    const valor = parseFloat(valorUnitario);
    
    if (!produtoM3 || isNaN(qtd) || isNaN(valor)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    // Validar estoque disponível
    const estoqueSerrado = await calcularEstoqueSerradoSupabase();
    const produtoSelecionado = produtos.find(p => p.id === produtoM3);
    
    if (produtoSelecionado && !editingId) {
      const estoqueItem = estoqueSerrado.find(e => 
        e.tipo === produtoSelecionado.tipo &&
        e.largura === produtoSelecionado.largura &&
        e.espessura === produtoSelecionado.espessura &&
        e.comprimento === produtoSelecionado.comprimento
      );

      const estoqueDisponivel = estoqueItem?.quantidadeUnidades || 0;
      
      if (qtd > estoqueDisponivel) {
        toast.error(`Estoque insuficiente! Disponível: ${estoqueDisponivel.toFixed(0)} unidades`);
        return;
      }
    }

    const valorTotal = qtd * valor;

    try {
      if (editingId) {
        const year = dataVenda.getFullYear();
        const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
        const day = String(dataVenda.getDate()).padStart(2, '0');
        const dataFormatada = `${year}-${month}-${day}`;
        
        const { error } = await supabase
          .from('vendas')
          .update({
            data: dataFormatada,
            produto_id: produtoM3,
            tipo,
            quantidade: qtd,
            unidade_medida: 'unidade',
            valor_unitario: valor,
            valor_total: valorTotal,
          })
          .eq('id', editingId);

        if (error) throw error;

        setVendas(vendas.map(v => v.id === editingId ? {
          ...v,
          data: dataFormatada,
          produtoId: produtoM3,
          tipo,
          quantidade: qtd,
          unidadeMedida: 'unidade',
          valorUnitario: valor,
          valorTotal,
        } : v));
        
        toast.success("Venda atualizada com sucesso!");
      } else {
        if (loadingEmpresaId) {
          toast.error("Aguardando carregamento dos dados da empresa...");
          return;
        }
        
        if (!empresaId) {
          toast.error("Erro ao identificar empresa. Entre em contato com o suporte.");
          console.error('empresaId não disponível:', { user: user?.id, empresaId });
          return;
        }

        const year = dataVenda.getFullYear();
        const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
        const day = String(dataVenda.getDate()).padStart(2, '0');
        const dataFormatada = `${year}-${month}-${day}`;

        const { data, error } = await supabase
          .from('vendas')
          .insert({
            data: dataFormatada,
            produto_id: produtoM3,
            tipo,
            quantidade: qtd,
            unidade_medida: 'unidade',
            valor_unitario: valor,
            valor_total: valorTotal,
            user_id: user.id,
            empresa_id: empresaId,
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao inserir venda:', error);
          throw error;
        }

        if (data) {
          const novaVenda: Venda = {
            id: data.id,
            data: data.data,
            produtoId: data.produto_id,
            tipo: data.tipo as 'serrada' | 'tora',
            quantidade: Number(data.quantidade),
            unidadeMedida: 'unidade',
            valorUnitario: Number(data.valor_unitario),
            valorTotal: Number(data.valor_total),
          };

          setVendas([novaVenda, ...vendas]);
          toast.success(`Venda registrada: R$ ${valorTotal.toFixed(2)}`);
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      toast.error('Erro ao salvar venda');
    }
  };

  const handleSubmitM3 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const qtdPecas = parseFloat(quantidadePecasM3Direto);
    const qtdM3 = parseFloat(quantidadeM3Direto);
    const valorM3 = parseFloat(valorM3Direto);
    
    if (!produtoM3Direto || isNaN(qtdPecas) || isNaN(qtdM3) || isNaN(valorM3) || qtdPecas <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const estoqueSerrado = await calcularEstoqueSerradoSupabase();
    const produtoSelecionado = produtos.find(p => p.id === produtoM3Direto);
    
    if (produtoSelecionado) {
      const estoqueItem = estoqueSerrado.find(e => 
        e.tipo === produtoSelecionado.tipo &&
        e.largura === produtoSelecionado.largura &&
        e.espessura === produtoSelecionado.espessura &&
        e.comprimento === produtoSelecionado.comprimento
      );

      const estoqueDisponivel = estoqueItem?.m3Total || 0;
      
      if (qtdM3 > estoqueDisponivel) {
        toast.error(`Estoque insuficiente! Disponível: ${estoqueDisponivel.toFixed(2)} m³`);
        return;
      }
    }

    const valorTotal = qtdM3 * valorM3;

    try {
      if (loadingEmpresaId) {
        toast.error("Aguardando carregamento dos dados da empresa...");
        return;
      }
      
      if (!empresaId) {
        toast.error("Erro ao identificar empresa. Entre em contato com o suporte.");
        console.error('empresaId não disponível:', { user: user?.id, empresaId });
        return;
      }

      const year = dataVendaM3.getFullYear();
      const month = String(dataVendaM3.getMonth() + 1).padStart(2, '0');
      const day = String(dataVendaM3.getDate()).padStart(2, '0');
      const dataFormatada = `${year}-${month}-${day}`;

      const { data, error } = await supabase
        .from('vendas')
        .insert({
          data: dataFormatada,
          produto_id: produtoM3Direto,
          tipo: 'serrada',
          quantidade: qtdM3,
          unidade_medida: 'm3',
          valor_unitario: valorM3,
          valor_total: valorTotal,
          user_id: user.id,
          empresa_id: empresaId,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao inserir venda:', error);
        throw error;
      }

      if (data) {
        const novaVenda: Venda = {
          id: data.id,
          data: data.data,
          produtoId: data.produto_id,
          tipo: data.tipo as 'serrada' | 'tora',
          quantidade: Number(data.quantidade),
          unidadeMedida: 'm3',
          valorUnitario: Number(data.valor_unitario),
          valorTotal: Number(data.valor_total),
        };

        setVendas([novaVenda, ...vendas]);
        toast.success(`Venda registrada: R$ ${valorTotal.toFixed(2)}`);
      }
      
      setProdutoM3Direto("");
      setQuantidadePecasM3Direto("");
      setQuantidadeM3Direto("0.00");
      setValorM3Direto("");
      setValorTotalM3Direto("");
      setDataVendaM3(new Date());
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      toast.error('Erro ao salvar venda');
    }
  };

  const handleSubmitCavaco = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const toneladas = parseFloat(toneladasVendidas);
    const valor = parseFloat(valorTonelada);
    
    if (isNaN(toneladas) || isNaN(valor) || toneladas <= 0 || valor <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    if (!editingCavacoId && toneladas > cavacoTotalEstoque) {
      toast.error(`Apenas ${cavacoTotalEstoque.toFixed(2)} T disponível em estoque`);
      return;
    }

    const valorTotal = toneladas * valor;

    try {
      if (editingCavacoId) {
        const vendaAtual = vendasCavaco.find(v => v.id === editingCavacoId);
        if (!vendaAtual) {
          toast.error("Venda não encontrada");
          return;
        }
        
        const year = dataVenda.getFullYear();
        const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
        const day = String(dataVenda.getDate()).padStart(2, '0');
        const dataFormatada = `${year}-${month}-${day}`;
        
        const { error } = await supabase
          .from('vendas_cavaco')
          .update({
            data: dataFormatada,
            toneladas: toneladas,
            valor_tonelada: valor,
            valor_total: valorTotal,
          })
          .eq('id', editingCavacoId);

        if (error) throw error;

        setVendasCavaco(vendasCavaco.map(v => v.id === editingCavacoId ? {
          ...v,
          data: dataFormatada,
          toneladas: toneladas,
          valor_tonelada: valor,
          valor_total: valorTotal,
        } : v));
        
        const diferencaToneladas = toneladas - Number(vendaAtual.toneladas);
        setCavacoTotalEstoque(prev => prev - diferencaToneladas);
        
        toast.success("Venda de cavaco atualizada com sucesso!");
        resetFormCavaco();
        return;
      }
      
      if (loadingEmpresaId) {
        toast.error("Aguardando carregamento dos dados da empresa...");
        return;
      }
      
      if (!empresaId) {
        toast.error("Erro ao identificar empresa. Entre em contato com o suporte.");
        return;
      }

      let toneladasRestantes = toneladas;
      const vendasParaInserir: any[] = [];
      
      for (const cavaco of cavacoDisponivel) {
        if (toneladasRestantes <= 0) break;
        
        const toneladasDessaTora = Math.min(toneladasRestantes, cavaco.cavacoDisponivel);
        if (toneladasDessaTora > 0) {
          vendasParaInserir.push({
            tora_id: cavaco.id,
            toneladas: toneladasDessaTora,
            valor_tonelada: valor,
            valor_total: toneladasDessaTora * valor,
          });
          toneladasRestantes -= toneladasDessaTora;
        }
      }

      if (toneladasRestantes > 0) {
        toast.error("Estoque insuficiente para completar a venda");
        return;
      }

      const year = dataVenda.getFullYear();
      const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
      const day = String(dataVenda.getDate()).padStart(2, '0');
      const dataFormatada = `${year}-${month}-${day}`;

      const vendasInseridas: any[] = [];
      for (const venda of vendasParaInserir) {
        const { data, error } = await supabase
          .from('vendas_cavaco')
          .insert({
            data: dataFormatada,
            tora_id: venda.tora_id,
            toneladas: venda.toneladas,
            valor_tonelada: venda.valor_tonelada,
            valor_total: venda.valor_total,
            user_id: user.id,
            empresa_id: empresaId,
          })
          .select('*, toras(descricao)')
          .single();

        if (error) throw error;
        if (data) vendasInseridas.push(data);
      }

      if (vendasInseridas.length > 0) {
        setVendasCavaco([...vendasInseridas, ...vendasCavaco]);
        
        setCavacoTotalEstoque(prev => prev - toneladas);
        setCavacoDisponivel(prev => {
          const updated = [...prev];
          for (const venda of vendasParaInserir) {
            const idx = updated.findIndex(c => c.id === venda.tora_id);
            if (idx >= 0) {
              updated[idx] = { 
                ...updated[idx], 
                cavacoDisponivel: updated[idx].cavacoDisponivel - venda.toneladas 
              };
            }
          }
          return updated.filter(c => c.cavacoDisponivel > 0);
        });
        
        toast.success(`Venda de cavaco registrada: R$ ${valorTotal.toFixed(2)}`);
      }
      
      resetFormCavaco();
    } catch (error) {
      console.error('Erro ao salvar venda de cavaco:', error);
      toast.error('Erro ao salvar venda de cavaco');
    }
  };

  const handleSubmitSerragem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const toneladas = parseFloat(toneladasSerragem);
    const valor = parseFloat(valorToneladaSerragem);
    
    if (isNaN(toneladas) || isNaN(valor) || toneladas <= 0 || valor <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const valorTotal = toneladas * valor;

    try {
      if (loadingEmpresaId) {
        toast.error("Aguardando carregamento dos dados da empresa...");
        return;
      }
      
      if (!empresaId) {
        toast.error("Erro ao identificar empresa. Entre em contato com o suporte.");
        return;
      }

      const year = dataVenda.getFullYear();
      const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
      const day = String(dataVenda.getDate()).padStart(2, '0');
      const dataFormatada = `${year}-${month}-${day}`;

      if (editingSerragemId) {
        const { error } = await supabase
          .from('vendas_serragem')
          .update({
            toneladas: toneladas,
            valor_tonelada: valor,
            valor_total: valorTotal,
            data: dataFormatada,
          })
          .eq('id', editingSerragemId);

        if (error) throw error;

        setVendasSerragem(vendasSerragem.map(v => v.id === editingSerragemId ? {
          ...v,
          toneladas,
          valor_tonelada: valor,
          valor_total: valorTotal,
          data: dataFormatada,
        } : v));
        
        toast.success("Venda de serragem atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from('vendas_serragem')
          .insert({
            data: dataFormatada,
            toneladas: toneladas,
            valor_tonelada: valor,
            valor_total: valorTotal,
            user_id: user.id,
            empresa_id: empresaId,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setVendasSerragem([data, ...vendasSerragem]);
          toast.success(`Venda de serragem registrada: R$ ${valorTotal.toFixed(2)}`);
        }
      }
      
      resetFormSerragem();
    } catch (error) {
      console.error('Erro ao salvar venda de serragem:', error);
      toast.error('Erro ao salvar venda de serragem');
    }
  };

  const handleSubmitCasqueiro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    
    const valorME = parseFloat(valorMetroEstereo);
    const altura = parseFloat(alturaCasqueiro);
    const largura = parseFloat(larguraCasqueiro);
    const comprimento = parseFloat(comprimentoCasqueiro);
    
    if (isNaN(valorME) || isNaN(altura) || isNaN(largura) || isNaN(comprimento) ||
        valorME <= 0 || altura <= 0 || largura <= 0 || comprimento <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    try {
      if (loadingEmpresaId) {
        toast.error("Aguardando carregamento dos dados da empresa...");
        return;
      }
      
      if (!empresaId) {
        toast.error("Erro ao identificar empresa. Entre em contato com o suporte.");
        return;
      }

      const year = dataVenda.getFullYear();
      const month = String(dataVenda.getMonth() + 1).padStart(2, '0');
      const day = String(dataVenda.getDate()).padStart(2, '0');
      const dataFormatada = `${year}-${month}-${day}`;

      if (editingCasqueiroId) {
        const { error } = await supabase
          .from('vendas_casqueiro')
          .update({
            valor_metro_estereo: valorME,
            altura: altura,
            largura: largura,
            comprimento: comprimento,
            total_metro_estereo: totalMetroEstereo,
            valor_total: valorTotalCasqueiro,
            data: dataFormatada,
          })
          .eq('id', editingCasqueiroId);

        if (error) throw error;

        setVendasCasqueiro(vendasCasqueiro.map(v => v.id === editingCasqueiroId ? {
          ...v,
          valor_metro_estereo: valorME,
          altura,
          largura,
          comprimento,
          total_metro_estereo: totalMetroEstereo,
          valor_total: valorTotalCasqueiro,
          data: dataFormatada,
        } : v));
        
        toast.success("Venda de casqueiro atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from('vendas_casqueiro')
          .insert({
            data: dataFormatada,
            valor_metro_estereo: valorME,
            altura: altura,
            largura: largura,
            comprimento: comprimento,
            total_metro_estereo: totalMetroEstereo,
            valor_total: valorTotalCasqueiro,
            user_id: user.id,
            empresa_id: empresaId,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setVendasCasqueiro([data, ...vendasCasqueiro]);
          toast.success(`Venda de casqueiro registrada: R$ ${valorTotalCasqueiro.toFixed(2)}`);
        }
      }
      
      resetFormCasqueiro();
    } catch (error) {
      console.error('Erro ao salvar venda de casqueiro:', error);
      toast.error('Erro ao salvar venda de casqueiro');
    }
  };

  const resetForm = () => {
    setProdutoM3("");
    setQuantidadePecas("");
    setQuantidadeVenda("");
    setTotalM3("");
    setValorM3("");
    setValorUnitario("");
    setTipo('serrada');
    setDataVenda(new Date());
    setEditingId(null);
  };

  const resetFormCavaco = () => {
    setToneladasVendidas("");
    setValorTonelada("");
    setDataVenda(new Date());
    setEditingCavacoId(null);
  };

  const resetFormSerragem = () => {
    setToneladasSerragem("");
    setValorToneladaSerragem("");
    setDataVenda(new Date());
    setEditingSerragemId(null);
  };

  const resetFormCasqueiro = () => {
    setValorMetroEstereo("");
    setAlturaCasqueiro("");
    setLarguraCasqueiro("");
    setComprimentoCasqueiro("");
    setDataVenda(new Date());
    setEditingCasqueiroId(null);
  };

  const handleEdit = (venda: Venda) => {
    setProdutoM3(venda.produtoId);
    setQuantidadePecas(venda.quantidade.toString());
    setQuantidadeVenda(venda.quantidade.toString());
    setTipo(venda.tipo);
    setValorUnitario(venda.valorUnitario.toString());
    setDataVenda(new Date(venda.data + 'T00:00:00'));
    setEditingId(venda.id);
    
    const prod = produtos.find(p => p.id === venda.produtoId);
    if (prod) {
      const m3PorPeca = (prod.largura / 100) * (prod.espessura / 100) * prod.comprimento;
      const m3Total = m3PorPeca * venda.quantidade;
      setTotalM3(m3Total.toFixed(2));
      setValorM3((venda.valorUnitario * venda.quantidade).toFixed(2));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVendas(vendas.filter(v => v.id !== id));
      toast.success("Venda excluída");
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast.error('Erro ao excluir venda');
    }
  };

  const handleEditCavaco = (venda: any) => {
    setToneladasVendidas(venda.toneladas.toString());
    setValorTonelada(venda.valor_tonelada.toString());
    setDataVenda(new Date(venda.data + 'T00:00:00'));
    setEditingCavacoId(venda.id);
  };

  const handleDeleteCavaco = async (id: string) => {
    try {
      const vendaCavaco = vendasCavaco.find(v => v.id === id);
      
      const { error } = await supabase
        .from('vendas_cavaco')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVendasCavaco(vendasCavaco.filter(v => v.id !== id));
      
      if (vendaCavaco) {
        setCavacoDisponivel(prev => 
          prev.map(c => 
            c.id === vendaCavaco.tora_id 
              ? { ...c, cavacoDisponivel: c.cavacoDisponivel + Number(vendaCavaco.toneladas) }
              : c
          )
        );
      }
      
      toast.success("Venda de cavaco excluída");
    } catch (error) {
      console.error('Erro ao excluir venda de cavaco:', error);
      toast.error('Erro ao excluir venda de cavaco');
    }
  };

  const handleEditSerragem = (venda: any) => {
    setToneladasSerragem(venda.toneladas.toString());
    setValorToneladaSerragem(venda.valor_tonelada.toString());
    setDataVenda(new Date(venda.data + 'T00:00:00'));
    setEditingSerragemId(venda.id);
  };

  const handleDeleteSerragem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendas_serragem')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVendasSerragem(vendasSerragem.filter(v => v.id !== id));
      toast.success("Venda de serragem excluída");
    } catch (error) {
      console.error('Erro ao excluir venda de serragem:', error);
      toast.error('Erro ao excluir venda de serragem');
    }
  };

  const handleEditCasqueiro = (venda: any) => {
    setValorMetroEstereo(venda.valor_metro_estereo.toString());
    setAlturaCasqueiro(venda.altura.toString());
    setLarguraCasqueiro(venda.largura.toString());
    setComprimentoCasqueiro(venda.comprimento.toString());
    setDataVenda(new Date(venda.data + 'T00:00:00'));
    setEditingCasqueiroId(venda.id);
  };

  const handleDeleteCasqueiro = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendas_casqueiro')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVendasCasqueiro(vendasCasqueiro.filter(v => v.id !== id));
      toast.success("Venda de casqueiro excluída");
    } catch (error) {
      console.error('Erro ao excluir venda de casqueiro:', error);
      toast.error('Erro ao excluir venda de casqueiro');
    }
  };

  // Filtrar vendas por período
  const getVendasFiltradas = () => {
    if (tipoVenda === 'madeira') {
      return vendas.filter(v => {
        const dataVenda = new Date(v.data);
        if (dataInicial && dataVenda < dataInicial) return false;
        if (dataFinal) {
          const dataFinalAjustada = new Date(dataFinal);
          dataFinalAjustada.setHours(23, 59, 59, 999);
          if (dataVenda > dataFinalAjustada) return false;
        }
        return true;
      });
    } else if (tipoVenda === 'cavaco') {
      return vendasCavaco.filter(v => {
        const dataVenda = new Date(v.data);
        if (dataInicial && dataVenda < dataInicial) return false;
        if (dataFinal) {
          const dataFinalAjustada = new Date(dataFinal);
          dataFinalAjustada.setHours(23, 59, 59, 999);
          if (dataVenda > dataFinalAjustada) return false;
        }
        return true;
      });
    } else if (tipoVenda === 'serragem') {
      return vendasSerragem.filter(v => {
        const dataVenda = new Date(v.data);
        if (dataInicial && dataVenda < dataInicial) return false;
        if (dataFinal) {
          const dataFinalAjustada = new Date(dataFinal);
          dataFinalAjustada.setHours(23, 59, 59, 999);
          if (dataVenda > dataFinalAjustada) return false;
        }
        return true;
      });
    } else {
      return vendasCasqueiro.filter(v => {
        const dataVenda = new Date(v.data);
        if (dataInicial && dataVenda < dataInicial) return false;
        if (dataFinal) {
          const dataFinalAjustada = new Date(dataFinal);
          dataFinalAjustada.setHours(23, 59, 59, 999);
          if (dataVenda > dataFinalAjustada) return false;
        }
        return true;
      });
    }
  };

  const exportarPDF = async () => {
    const vendasFiltradas = getVendasFiltradas();
    
    if (vendasFiltradas.length === 0) {
      toast.error('Nenhuma venda encontrada no período selecionado');
      return;
    }

    const doc = new jsPDF();
    
    const startY = await addPDFHeader({ empresa, doc });
    
    const tipoLabel = tipoVenda === 'madeira' ? 'Madeiras Serradas' : 
                      tipoVenda === 'cavaco' ? 'Cavaco' :
                      tipoVenda === 'serragem' ? 'Serragem' : 'Casqueiro';
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Relatório de Vendas - ${tipoLabel}`, 14, startY + 5);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const periodo = `Período: ${dataInicial ? formatDateBR(dataInicial) : 'Início'} até ${dataFinal ? formatDateBR(dataFinal) : 'Hoje'}`;
    doc.text(periodo, 14, startY + 12);

    if (tipoVenda === 'madeira') {
      const dados = vendasFiltradas.map((v: Venda) => {
        const prod = produtos.find(p => p.id === v.produtoId);
        return [
          formatDateBR(v.data),
          prod ? `${prod.tipo} ${prod.largura}×${prod.espessura}×${prod.comprimento}` : 'N/A',
          `${v.quantidade} un`,
          `R$ ${v.valorUnitario.toFixed(2)}`,
          `R$ ${v.valorTotal.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: startY + 18,
        head: [['Data', 'Produto', 'Quantidade', 'Valor Unit.', 'Total']],
        body: dados,
        foot: [[
          '', '', '', 'Total Geral:',
          `R$ ${vendasFiltradas.reduce((sum: number, v: any) => sum + v.valorTotal, 0).toFixed(2)}`
        ]],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { bottom: 30 }
      });
    } else if (tipoVenda === 'cavaco') {
      const dados = vendasFiltradas.map((v: any) => [
        formatDateBR(v.data),
        v.toras?.descricao || 'N/A',
        `${Number(v.toneladas).toFixed(2)} T`,
        `R$ ${Number(v.valor_tonelada).toFixed(2)}`,
        `R$ ${Number(v.valor_total).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: startY + 18,
        head: [['Data', 'Lote (Tora)', 'Toneladas', 'Valor/Ton', 'Total']],
        body: dados,
        foot: [[
          '', '', '', 'Total Geral:',
          `R$ ${vendasFiltradas.reduce((sum: number, v: any) => sum + Number(v.valor_total), 0).toFixed(2)}`
        ]],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { bottom: 30 }
      });
    } else if (tipoVenda === 'serragem') {
      const dados = vendasFiltradas.map((v: any) => [
        formatDateBR(v.data),
        `${Number(v.toneladas).toFixed(2)} T`,
        `R$ ${Number(v.valor_tonelada).toFixed(2)}`,
        `R$ ${Number(v.valor_total).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: startY + 18,
        head: [['Data', 'Toneladas', 'Valor/Ton', 'Total']],
        body: dados,
        foot: [[
          '', '', 'Total Geral:',
          `R$ ${vendasFiltradas.reduce((sum: number, v: any) => sum + Number(v.valor_total), 0).toFixed(2)}`
        ]],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { bottom: 30 }
      });
    } else {
      const dados = vendasFiltradas.map((v: any) => [
        formatDateBR(v.data),
        `R$ ${Number(v.valor_metro_estereo).toFixed(2)}`,
        `${Number(v.altura).toFixed(2)}`,
        `${Number(v.largura).toFixed(2)}`,
        `${Number(v.comprimento).toFixed(2)}`,
        `${Number(v.total_metro_estereo).toFixed(2)} m³`,
        `R$ ${Number(v.valor_total).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: startY + 18,
        head: [['Data', 'Valor ME', 'Altura', 'Largura', 'Compr.', 'Total ME', 'Total']],
        body: dados,
        foot: [[
          '', '', '', '', '', 'Total Geral:',
          `R$ ${vendasFiltradas.reduce((sum: number, v: any) => sum + Number(v.valor_total), 0).toFixed(2)}`
        ]],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { bottom: 30 }
      });
    }

    await addPDFFooter({ empresa, doc });

    doc.save(`vendas-${tipoVenda}-${getTodayBR()}.pdf`);
    toast.success('Relatório PDF gerado com sucesso!');
  };

  const exportarExcel = () => {
    const vendasFiltradas = getVendasFiltradas();
    
    if (vendasFiltradas.length === 0) {
      toast.error('Nenhuma venda encontrada no período selecionado');
      return;
    }

    let dados: any[] = [];
    let sheetName = '';
    
    if (tipoVenda === 'madeira') {
      sheetName = 'Madeiras';
      dados = vendasFiltradas.map((v: Venda) => {
        const prod = produtos.find(p => p.id === v.produtoId);
        return {
          'Data': formatDateBR(v.data),
          'Produto': prod ? `${prod.tipo} ${prod.largura}×${prod.espessura}×${prod.comprimento}` : 'N/A',
          'Quantidade': v.quantidade,
          'Unidade': 'un',
          'Valor Unitário': v.valorUnitario,
          'Valor Total': v.valorTotal
        };
      });

      dados.push({
        'Data': '',
        'Produto': '',
        'Quantidade': '',
        'Unidade': '',
        'Valor Unitário': 'TOTAL GERAL:',
        'Valor Total': vendasFiltradas.reduce((sum: number, v: any) => sum + v.valorTotal, 0)
      });
    } else if (tipoVenda === 'cavaco') {
      sheetName = 'Cavaco';
      dados = vendasFiltradas.map((v: any) => ({
        'Data': formatDateBR(v.data),
        'Lote (Tora)': v.toras?.descricao || 'N/A',
        'Toneladas': Number(v.toneladas),
        'Valor por Tonelada': Number(v.valor_tonelada),
        'Valor Total': Number(v.valor_total)
      }));

      dados.push({
        'Data': '',
        'Lote (Tora)': '',
        'Toneladas': '',
        'Valor por Tonelada': 'TOTAL GERAL:',
        'Valor Total': vendasFiltradas.reduce((sum: number, v: any) => sum + Number(v.valor_total), 0)
      });
    } else if (tipoVenda === 'serragem') {
      sheetName = 'Serragem';
      dados = vendasFiltradas.map((v: any) => ({
        'Data': formatDateBR(v.data),
        'Toneladas': Number(v.toneladas),
        'Valor por Tonelada': Number(v.valor_tonelada),
        'Valor Total': Number(v.valor_total)
      }));

      dados.push({
        'Data': '',
        'Toneladas': '',
        'Valor por Tonelada': 'TOTAL GERAL:',
        'Valor Total': vendasFiltradas.reduce((sum: number, v: any) => sum + Number(v.valor_total), 0)
      });
    } else {
      sheetName = 'Casqueiro';
      dados = vendasFiltradas.map((v: any) => ({
        'Data': formatDateBR(v.data),
        'Valor Metro Estéreo': Number(v.valor_metro_estereo),
        'Altura': Number(v.altura),
        'Largura': Number(v.largura),
        'Comprimento': Number(v.comprimento),
        'Total Metro Estéreo': Number(v.total_metro_estereo),
        'Valor Total': Number(v.valor_total)
      }));

      dados.push({
        'Data': '',
        'Valor Metro Estéreo': '',
        'Altura': '',
        'Largura': '',
        'Comprimento': '',
        'Total Metro Estéreo': 'TOTAL GERAL:',
        'Valor Total': vendasFiltradas.reduce((sum: number, v: any) => sum + Number(v.valor_total), 0)
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    XLSX.writeFile(workbook, `vendas-${tipoVenda}-${getTodayBR()}.xlsx`);
    toast.success('Relatório Excel gerado com sucesso!');
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
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          {empresaError || "Você não possui uma empresa cadastrada. Contate o administrador."}
        </p>
      </div>
    );
  }

  const renderFormMadeira = () => (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground">Nova Venda de Madeira</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-6">
          <Button
            type="button"
            variant={modoVendaMadeira === 'unidades' ? 'default' : 'outline'}
            onClick={() => setModoVendaMadeira('unidades')}
            className="flex-1"
          >
            Vender por Unidades
          </Button>
          <Button
            type="button"
            variant={modoVendaMadeira === 'm3' ? 'default' : 'outline'}
            onClick={() => setModoVendaMadeira('m3')}
            className="flex-1"
          >
            Vender por m³
          </Button>
        </div>

        {modoVendaMadeira === 'unidades' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4 border-2 border-primary/20">
              <h3 className="font-semibold text-lg text-primary">Passo 1: Cálculo de Conversão m³ para Valor Unitário</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="produtoM3">Produto *</Label>
                  <Select 
                    value={produtoM3} 
                    onValueChange={(value) => setProdutoM3(value)}
                  >
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          {prod.tipo} - {prod.largura}×{prod.espessura}×{prod.comprimento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidadePecas">Quantidade de Peças *</Label>
                  <Input
                    id="quantidadePecas"
                    type="number"
                    step="1"
                    value={quantidadePecas}
                    onChange={(e) => setQuantidadePecas(e.target.value)}
                    placeholder="10"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalM3">Total m³</Label>
                  <div className="relative">
                    <Input
                      id="totalM3"
                      type="text"
                      value={totalM3 || "0.000"}
                      readOnly
                      className="border-input bg-muted/30 font-bold text-lg text-primary"
                    />
                    {!totalM3 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecione um produto e informe a quantidade para calcular
                      </p>
                    )}
                    {totalM3 && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Cálculo realizado: {totalM3} m³
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorM3">Valor do m³ (R$) *</Label>
                  <Input
                    id="valorM3"
                    type="number"
                    step="0.01"
                    value={valorM3}
                    onChange={(e) => setValorM3(e.target.value)}
                    placeholder="1000.00"
                    className="border-input"
                  />
                </div>
              </div>
              
              {valorM3 && quantidadePecas && parseFloat(quantidadePecas) > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Valor unitário calculado: <span className="text-lg font-bold text-primary">
                      R$ {(parseFloat(valorM3) / parseFloat(quantidadePecas)).toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fórmula: Valor do m³ ÷ Quantidade de peças = {valorM3} ÷ {quantidadePecas} = R$ {(parseFloat(valorM3) / parseFloat(quantidadePecas)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-border">
              <h3 className="font-semibold text-lg">Passo 2: Registro da Nova Venda</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataVenda">Data da Venda</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal border-input",
                          !dataVenda && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataVenda ? formatDateBR(dataVenda) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataVenda}
                        onSelect={(date) => date && setDataVenda(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Produto</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as 'serrada' | 'tora')}>
                    <SelectTrigger className="border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serrada">Madeira Serrada</SelectItem>
                      <SelectItem value="tora">Tora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="produtoDisplay">Produto</Label>
                  <Input
                    id="produtoDisplay"
                    type="text"
                    value={produtoM3 ? produtos.find(p => p.id === produtoM3)?.tipo + ' - ' + 
                           produtos.find(p => p.id === produtoM3)?.largura + '×' + 
                           produtos.find(p => p.id === produtoM3)?.espessura + '×' + 
                           produtos.find(p => p.id === produtoM3)?.comprimento : ''}
                    readOnly
                    placeholder="Produto selecionado acima"
                    className="border-input bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidadeVenda">Quantidade</Label>
                  <Input
                    id="quantidadeVenda"
                    type="number"
                    value={quantidadeVenda}
                    onChange={(e) => setQuantidadeVenda(e.target.value)}
                    placeholder="Digite a quantidade de peças vendidas"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorUnitario">Valor Unitário (R$)</Label>
                  <Input
                    id="valorUnitario"
                    type="text"
                    value={valorUnitario}
                    readOnly
                    placeholder="Calculado automaticamente"
                    className="border-input bg-muted font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorTotal">Valor Total (R$)</Label>
                  <Input
                    id="valorTotal"
                    type="text"
                    value={valorUnitario && quantidadeVenda ? (parseFloat(valorUnitario) * parseFloat(quantidadeVenda)).toFixed(2) : ''}
                    readOnly
                    placeholder="0.00"
                    className="border-input bg-muted font-bold text-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {editingId ? "Atualizar" : "Registrar"} Venda
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitM3} className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4 border-2 border-primary/20">
              <h3 className="font-semibold text-lg text-primary">Venda por m³</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataVendaM3">Data da Venda</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal border-input",
                          !dataVendaM3 && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataVendaM3 ? formatDateBR(dataVendaM3) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataVendaM3}
                        onSelect={(date) => date && setDataVendaM3(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="produtoM3Direto">Produto *</Label>
                  <Select 
                    value={produtoM3Direto} 
                    onValueChange={(value) => setProdutoM3Direto(value)}
                  >
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          {prod.tipo} - {prod.largura}×{prod.espessura}×{prod.comprimento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidadePecasM3Direto">Total de peças vendidas *</Label>
                  <Input
                    id="quantidadePecasM3Direto"
                    type="number"
                    step="1"
                    value={quantidadePecasM3Direto}
                    onChange={(e) => setQuantidadePecasM3Direto(e.target.value)}
                    placeholder="10"
                    className="border-input"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidadeM3Direto">Total de m³ vendidos</Label>
                  <div className="relative">
                    <Input
                      id="quantidadeM3Direto"
                      type="text"
                      value={quantidadeM3Direto || "0.00"}
                      readOnly
                      className="border-input bg-muted/30 font-bold text-lg text-primary"
                    />
                    {quantidadeM3Direto === "0.00" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecione um produto e informe a quantidade para calcular
                      </p>
                    )}
                    {quantidadeM3Direto && parseFloat(quantidadeM3Direto) > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Cálculo realizado: {quantidadeM3Direto} m³
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorM3Direto">Valor do m³ (R$) *</Label>
                  <Input
                    id="valorM3Direto"
                    type="number"
                    step="0.01"
                    value={valorM3Direto}
                    onChange={(e) => setValorM3Direto(e.target.value)}
                    placeholder="1000.00"
                    className="border-input"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="valorTotalM3">Valor total vendido</Label>
                  <div className="relative">
                    <Input
                      id="valorTotalM3"
                      type="text"
                      value={valorTotalM3Direto || '0.00'}
                      readOnly
                      className="border-input bg-muted/30 font-bold text-primary text-xl"
                    />
                    {valorTotalM3Direto && parseFloat(valorTotalM3Direto) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {quantidadeM3Direto} m³ × R$ {parseFloat(valorM3Direto).toFixed(2)} = R$ {valorTotalM3Direto}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Registrar Venda
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );

  const renderFormCavaco = () => (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground">Nova Venda de Cavaco</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitCavaco} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataVendaCavaco">Data da Venda</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-input",
                      !dataVenda && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataVenda ? formatDateBR(dataVenda) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataVenda}
                    onSelect={(date) => date && setDataVenda(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Cavaco em Estoque</Label>
              <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md border border-border">
                <span className="font-semibold text-primary">
                  {cavacoTotalEstoque.toFixed(2)} T
                </span>
                <span className="text-sm text-muted-foreground ml-2">disponível</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toneladasVendidas">Toneladas Vendidas *</Label>
              <Input
                id="toneladasVendidas"
                type="number"
                step="0.01"
                min="0"
                value={toneladasVendidas}
                onChange={(e) => setToneladasVendidas(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorTonelada">Valor por Tonelada (R$) *</Label>
              <Input
                id="valorTonelada"
                type="number"
                step="0.01"
                min="0"
                value={valorTonelada}
                onChange={(e) => setValorTonelada(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="valorTotalCavaco">Valor Total (R$)</Label>
              <Input
                id="valorTotalCavaco"
                type="text"
                value={toneladasVendidas && valorTonelada ? (parseFloat(toneladasVendidas) * parseFloat(valorTonelada)).toFixed(2) : ''}
                readOnly
                placeholder="0.00"
                className="border-input bg-muted font-bold text-primary text-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Layers className="h-4 w-4 mr-2" />
              {editingCavacoId ? "Atualizar" : "Registrar"} Venda de Cavaco
            </Button>
            {editingCavacoId && (
              <Button type="button" variant="outline" onClick={resetFormCavaco}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderFormSerragem = () => (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground">Nova Venda de Serragem</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitSerragem} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataVendaSerragem">Data da Venda</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-input",
                      !dataVenda && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataVenda ? formatDateBR(dataVenda) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataVenda}
                    onSelect={(date) => date && setDataVenda(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toneladasSerragem">Toneladas de Serragem *</Label>
              <Input
                id="toneladasSerragem"
                type="number"
                step="0.01"
                min="0"
                value={toneladasSerragem}
                onChange={(e) => setToneladasSerragem(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorToneladaSerragem">R$ Toneladas de Serragem *</Label>
              <Input
                id="valorToneladaSerragem"
                type="number"
                step="0.01"
                min="0"
                value={valorToneladaSerragem}
                onChange={(e) => setValorToneladaSerragem(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorTotalSerragem">Valor Total (R$)</Label>
              <Input
                id="valorTotalSerragem"
                type="text"
                value={valorTotalSerragem > 0 ? valorTotalSerragem.toFixed(2) : ''}
                readOnly
                placeholder="0.00"
                className="border-input bg-muted font-bold text-primary text-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <TreeDeciduous className="h-4 w-4 mr-2" />
              {editingSerragemId ? "Atualizar" : "Registrar"} Venda de Serragem
            </Button>
            {editingSerragemId && (
              <Button type="button" variant="outline" onClick={resetFormSerragem}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderFormCasqueiro = () => (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground">Nova Venda de Casqueiro</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitCasqueiro} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dataVendaCasqueiro">Data da Venda</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-input",
                      !dataVenda && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataVenda ? formatDateBR(dataVenda) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataVenda}
                    onSelect={(date) => date && setDataVenda(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorMetroEstereo">Valor do Metro Estéreo (R$) *</Label>
              <Input
                id="valorMetroEstereo"
                type="number"
                step="0.01"
                min="0"
                value={valorMetroEstereo}
                onChange={(e) => setValorMetroEstereo(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alturaCasqueiro">Altura (m) *</Label>
              <Input
                id="alturaCasqueiro"
                type="number"
                step="0.01"
                min="0"
                value={alturaCasqueiro}
                onChange={(e) => setAlturaCasqueiro(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="larguraCasqueiro">Largura (m) *</Label>
              <Input
                id="larguraCasqueiro"
                type="number"
                step="0.01"
                min="0"
                value={larguraCasqueiro}
                onChange={(e) => setLarguraCasqueiro(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprimentoCasqueiro">Comprimento (m) *</Label>
              <Input
                id="comprimentoCasqueiro"
                type="number"
                step="0.01"
                min="0"
                value={comprimentoCasqueiro}
                onChange={(e) => setComprimentoCasqueiro(e.target.value)}
                placeholder="0.00"
                className="border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalMetroEstereo">Total Metro Estéreo</Label>
              <Input
                id="totalMetroEstereo"
                type="text"
                value={totalMetroEstereo > 0 ? totalMetroEstereo.toFixed(2) : ''}
                readOnly
                placeholder="0.00"
                className="border-input bg-muted font-semibold text-primary"
              />
              {totalMetroEstereo > 0 && (
                <p className="text-xs text-muted-foreground">
                  {alturaCasqueiro} × {larguraCasqueiro} × {comprimentoCasqueiro} = {totalMetroEstereo.toFixed(2)} m³
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="valorTotalCasqueiro">Valor Total da Carga (R$)</Label>
              <Input
                id="valorTotalCasqueiro"
                type="text"
                value={valorTotalCasqueiro > 0 ? valorTotalCasqueiro.toFixed(2) : ''}
                readOnly
                placeholder="0.00"
                className="border-input bg-muted font-bold text-primary text-lg"
              />
              {valorTotalCasqueiro > 0 && (
                <p className="text-xs text-muted-foreground">
                  R$ {valorMetroEstereo} × {totalMetroEstereo.toFixed(2)} m³ = R$ {valorTotalCasqueiro.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Leaf className="h-4 w-4 mr-2" />
              {editingCasqueiroId ? "Atualizar" : "Registrar"} Venda de Casqueiro
            </Button>
            {editingCasqueiroId && (
              <Button type="button" variant="outline" onClick={resetFormCasqueiro}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderHistorico = () => {
    const vendasFiltradas = getVendasFiltradas();
    
    // Paginação
    const totalPaginas = Math.ceil(vendasFiltradas.length / itensPorPagina);
    const indiceInicio = (paginaVendas - 1) * itensPorPagina;
    const indiceFim = indiceInicio + itensPorPagina;
    const vendasPaginadas = vendasFiltradas.slice(indiceInicio, indiceFim);
    
    const PaginacaoControles = () => (
      vendasFiltradas.length > itensPorPagina ? (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <span className="text-sm text-muted-foreground">
            Mostrando {indiceInicio + 1} a {Math.min(indiceFim, vendasFiltradas.length)} de {vendasFiltradas.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaVendas(prev => Math.max(1, prev - 1))}
              disabled={paginaVendas === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {paginaVendas} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaVendas(prev => Math.min(totalPaginas, prev + 1))}
              disabled={paginaVendas === totalPaginas}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null
    );
    
    if (tipoVenda === 'madeira') {
      return (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>m³</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {vendas.length === 0 ? 'Nenhuma venda registrada' : 'Nenhuma venda encontrada no período selecionado'}
                  </TableCell>
                </TableRow>
              ) : (
                vendasPaginadas.map((venda: Venda) => {
                  const prod = produtos.find(p => p.id === venda.produtoId);
                  
                  let quantidadePecas = 0;
                  let m3Vendido = 0;
                  
                  if (venda.unidadeMedida === 'unidade') {
                    quantidadePecas = venda.quantidade;
                    m3Vendido = prod ? (prod.largura * prod.espessura * prod.comprimento * venda.quantidade) : 0;
                  } else if (venda.unidadeMedida === 'm3') {
                    m3Vendido = venda.quantidade;
                    quantidadePecas = prod ? venda.quantidade / (prod.largura * prod.espessura * prod.comprimento) : 0;
                  }
                  
                  return (
                    <TableRow key={venda.id}>
                      <TableCell>{formatDateBR(venda.data)}</TableCell>
                      <TableCell className="font-medium">
                        {prod ? `${prod.tipo} ${prod.largura}×${prod.espessura}×${prod.comprimento}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {venda.unidadeMedida === 'unidade' ? `${quantidadePecas} un` : `${quantidadePecas.toFixed(0)} un`}
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {m3Vendido.toFixed(2)} m³
                      </TableCell>
                      <TableCell>R$ {venda.valorUnitario.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-primary">R$ {venda.valorTotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(venda)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDelete(venda.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <PaginacaoControles />
        </>
      );
    } else if (tipoVenda === 'cavaco') {
      return (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Lote (Tora)</TableHead>
                <TableHead>Toneladas</TableHead>
                <TableHead>Valor/Ton</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {vendasCavaco.length === 0 ? 'Nenhuma venda de cavaco registrada' : 'Nenhuma venda encontrada no período selecionado'}
                  </TableCell>
                </TableRow>
              ) : (
                vendasPaginadas.map((venda: any) => (
                  <TableRow key={venda.id}>
                    <TableCell>{formatDateBR(venda.data)}</TableCell>
                    <TableCell className="font-medium">
                      {venda.toras?.descricao || 'N/A'}
                    </TableCell>
                    <TableCell>{Number(venda.toneladas).toFixed(2)} T</TableCell>
                    <TableCell>R$ {Number(venda.valor_tonelada).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-primary">R$ {Number(venda.valor_total).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditCavaco(venda)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteCavaco(venda.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginacaoControles />
        </>
      );
    } else if (tipoVenda === 'serragem') {
      return (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Toneladas</TableHead>
                <TableHead>Valor/Ton</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {vendasSerragem.length === 0 ? 'Nenhuma venda de serragem registrada' : 'Nenhuma venda encontrada no período selecionado'}
                  </TableCell>
                </TableRow>
              ) : (
                vendasPaginadas.map((venda: any) => (
                  <TableRow key={venda.id}>
                    <TableCell>{formatDateBR(venda.data)}</TableCell>
                    <TableCell>{Number(venda.toneladas).toFixed(2)} T</TableCell>
                    <TableCell>R$ {Number(venda.valor_tonelada).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-primary">R$ {Number(venda.valor_total).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditSerragem(venda)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteSerragem(venda.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginacaoControles />
        </>
      );
    } else {
      return (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Valor ME</TableHead>
                <TableHead>A×L×C</TableHead>
                <TableHead>Total ME</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {vendasCasqueiro.length === 0 ? 'Nenhuma venda de casqueiro registrada' : 'Nenhuma venda encontrada no período selecionado'}
                  </TableCell>
                </TableRow>
              ) : (
                vendasPaginadas.map((venda: any) => (
                  <TableRow key={venda.id}>
                    <TableCell>{formatDateBR(venda.data)}</TableCell>
                    <TableCell>R$ {Number(venda.valor_metro_estereo).toFixed(2)}</TableCell>
                    <TableCell className="font-medium">
                      {Number(venda.altura).toFixed(2)}×{Number(venda.largura).toFixed(2)}×{Number(venda.comprimento).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-primary">{Number(venda.total_metro_estereo).toFixed(2)} m³</TableCell>
                    <TableCell className="font-semibold text-primary">R$ {Number(venda.valor_total).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditCasqueiro(venda)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteCasqueiro(venda.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginacaoControles />
        </>
      );
    }
  };

  const getHistoricoTitle = () => {
    switch (tipoVenda) {
      case 'madeira':
        return 'Histórico de Vendas de Madeiras Serradas';
      case 'cavaco':
        return 'Histórico de Vendas de Cavaco';
      case 'serragem':
        return 'Histórico de Vendas de Serragem';
      case 'casqueiro':
        return 'Histórico de Vendas de Casqueiro';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Registro e controle de vendas</p>
        </div>
      </div>

      {/* Combobox para seleção de tipo de venda */}
      <div className="w-full max-w-sm">
        <Label htmlFor="tipoVenda">Tipo de Venda</Label>
        <Select value={tipoVenda} onValueChange={(value) => setTipoVenda(value as TipoVenda)}>
          <SelectTrigger className="border-input mt-1">
            <SelectValue placeholder="Selecione o tipo de venda" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="madeira">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span>Vendas de Madeiras Serradas</span>
              </div>
            </SelectItem>
            <SelectItem value="cavaco">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>Vendas de Cavaco</span>
              </div>
            </SelectItem>
            <SelectItem value="serragem">
              <div className="flex items-center gap-2">
                <TreeDeciduous className="h-4 w-4" />
                <span>Vendas de Serragem</span>
              </div>
            </SelectItem>
            <SelectItem value="casqueiro">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                <span>Vendas de Casqueiro</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Formulário baseado no tipo selecionado */}
      {tipoVenda === 'madeira' && renderFormMadeira()}
      {tipoVenda === 'cavaco' && renderFormCavaco()}
      {tipoVenda === 'serragem' && renderFormSerragem()}
      {tipoVenda === 'casqueiro' && renderFormCasqueiro()}

      {/* Histórico de vendas */}
      <Card className="shadow-card border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4 mb-4">
            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {getHistoricoTitle()}
            </h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-input",
                        !dataInicial && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicial ? formatDateBR(dataInicial) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicial}
                      onSelect={setDataInicial}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-input",
                        !dataFinal && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFinal ? formatDateBR(dataFinal) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFinal}
                      onSelect={setDataFinal}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                onClick={exportarPDF}
                className="flex-1"
                variant="outline"
              >
                <img src={pdfIcon} alt="PDF" className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button
                onClick={exportarExcel}
                className="flex-1"
                variant="default"
              >
                <img src={dwLogo} alt="DW Logo" className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            {renderHistorico()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
