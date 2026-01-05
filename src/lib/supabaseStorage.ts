import { supabase } from "@/integrations/supabase/client";
import { EstoqueSerrado, EstoqueToras } from "@/types";

export const calcularEstoqueSerradoSupabase = async (): Promise<EstoqueSerrado[]> => {
  try {
    // Buscar toda produção
    const { data: producao, error: producaoError } = await supabase
      .from('producao')
      .select(`
        *,
        produtos (
          nome,
          tipo,
          largura,
          espessura,
          comprimento
        )
      `);

    if (producaoError) throw producaoError;

    // Buscar todas as vendas de madeira serrada
    const { data: vendas, error: vendasError } = await supabase
      .from('vendas')
      .select('*')
      .eq('tipo', 'serrada');

    if (vendasError) throw vendasError;

    const estoqueMap = new Map<string, EstoqueSerrado>();

    // Adicionar produção ao estoque
    producao?.forEach(p => {
      const produto = p.produtos as any;
      if (!produto) return;

      const key = `${produto.nome}-${produto.tipo}-${produto.largura}-${produto.espessura}-${produto.comprimento}`;
      if (!estoqueMap.has(key)) {
        estoqueMap.set(key, {
          id: key,
          nome: produto.nome,
          tipo: produto.tipo,
          largura: produto.largura,
          espessura: produto.espessura,
          comprimento: produto.comprimento,
          quantidadeUnidades: 0,
          m3Total: 0,
        });
      }
      const item = estoqueMap.get(key)!;
      item.quantidadeUnidades += p.quantidade;
      item.m3Total += parseFloat(p.m3.toString());
    });

    // Subtrair vendas do estoque
    vendas?.forEach(v => {
      const prod = producao?.find(p => p.produto_id === v.produto_id);
      if (prod && prod.produtos) {
        const produto = prod.produtos as any;
        const key = `${produto.nome}-${produto.tipo}-${produto.largura}-${produto.espessura}-${produto.comprimento}`;
        const item = estoqueMap.get(key);
        if (item) {
          if (v.unidade_medida === 'unidade') {
            const qtd = parseFloat(v.quantidade.toString());
            item.quantidadeUnidades -= qtd;
            // Calcular m³ com base nas dimensões (já em metros)
            const m3PorPeca = produto.largura * produto.espessura * produto.comprimento;
            item.m3Total -= (m3PorPeca * qtd);
          } else if (v.unidade_medida === 'm3') {
            const qtdM3 = parseFloat(v.quantidade.toString());
            item.m3Total -= qtdM3;
            // Calcular quantas peças equivalem ao m³ vendido
            const m3PorPeca = produto.largura * produto.espessura * produto.comprimento;
            const qtdPecas = qtdM3 / m3PorPeca;
            item.quantidadeUnidades -= qtdPecas;
          }
        }
      }
    });

    return Array.from(estoqueMap.values()).filter(item => item.quantidadeUnidades > 0 || item.m3Total > 0);
  } catch (error) {
    console.error('Erro ao calcular estoque serrado:', error);
    return [];
  }
};

export const calcularEstoqueTorasSupabase = async (): Promise<EstoqueToras> => {
  try {
    // Buscar todas as toras
    const { data: toras, error: torasError } = await supabase
      .from('toras')
      .select('toneladas, quantidade_toras');

    if (torasError) throw torasError;

    // Buscar todas as toras serradas
    const { data: torasSerradas, error: torasSerradasError } = await supabase
      .from('toras_serradas')
      .select('toneladas, quantidade_toras_serradas');

    if (torasSerradasError) throw torasSerradasError;

    // Buscar vendas de toras
    const { data: vendas, error: vendasError } = await supabase
      .from('vendas')
      .select('quantidade')
      .eq('tipo', 'tora');

    if (vendasError) throw vendasError;

    let totalToneladas = 0;
    let totalQuantidadeToras = 0;

    // Adicionar toras
    toras?.forEach(t => {
      totalToneladas += parseFloat(t.toneladas.toString());
      totalQuantidadeToras += t.quantidade_toras || 0;
    });

    // Subtrair toras serradas
    torasSerradas?.forEach(ts => {
      totalToneladas -= parseFloat(ts.toneladas.toString());
      totalQuantidadeToras -= ts.quantidade_toras_serradas || 0;
    });

    // Subtrair vendas de toras
    vendas?.forEach(v => {
      totalToneladas -= parseFloat(v.quantidade.toString());
    });

    return {
      descricao: 'Toras',
      toneladas: Math.max(0, totalToneladas),
      quantidadeToras: Math.max(0, totalQuantidadeToras),
    };
  } catch (error) {
    console.error('Erro ao calcular estoque de toras:', error);
    return {
      descricao: 'Toras',
      toneladas: 0,
      quantidadeToras: 0,
    };
  }
};

export const getVendasSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .order('data', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    return [];
  }
};
