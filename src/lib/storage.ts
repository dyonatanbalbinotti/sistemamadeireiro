import { 
  MadeiraProduzida, 
  Tora, 
  ToraSerrada, 
  Venda,
  EstoqueSerrado,
  EstoqueToras,
  Produto
} from "@/types";

const STORAGE_KEYS = {
  PRODUCAO: 'madeira_producao',
  TORAS: 'madeira_toras',
  TORAS_SERRADAS: 'toras_serradas',
  VENDAS: 'madeira_vendas',
  PRODUTOS: 'madeira_produtos',
};

// Produtos
export const getProdutos = (): Produto[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PRODUTOS);
  return data ? JSON.parse(data) : [];
};

export const saveProdutos = (produtos: Produto[]) => {
  localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(produtos));
};

// Produção
export const getProducao = (): MadeiraProduzida[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCAO);
  return data ? JSON.parse(data) : [];
};

export const saveProducao = (producao: MadeiraProduzida[]) => {
  localStorage.setItem(STORAGE_KEYS.PRODUCAO, JSON.stringify(producao));
};

// Toras
export const getToras = (): Tora[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TORAS);
  return data ? JSON.parse(data) : [];
};

export const saveToras = (toras: Tora[]) => {
  localStorage.setItem(STORAGE_KEYS.TORAS, JSON.stringify(toras));
};

// Toras Serradas
export const getTorasSerradas = (): ToraSerrada[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TORAS_SERRADAS);
  return data ? JSON.parse(data) : [];
};

export const saveTorasSerradas = (torasSerradas: ToraSerrada[]) => {
  localStorage.setItem(STORAGE_KEYS.TORAS_SERRADAS, JSON.stringify(torasSerradas));
};

// Vendas
export const getVendas = (): Venda[] => {
  const data = localStorage.getItem(STORAGE_KEYS.VENDAS);
  return data ? JSON.parse(data) : [];
};

export const saveVendas = (vendas: Venda[]) => {
  localStorage.setItem(STORAGE_KEYS.VENDAS, JSON.stringify(vendas));
};

// Cálculos de estoque
export const calcularEstoqueSerrado = (): EstoqueSerrado[] => {
  const producao = getProducao();
  const vendas = getVendas();
  
  const estoqueMap = new Map<string, EstoqueSerrado>();
  
  // Adicionar produção
  producao.forEach(p => {
    const key = `${p.tipo}-${p.largura}-${p.espessura}-${p.comprimento}`;
    if (!estoqueMap.has(key)) {
      estoqueMap.set(key, {
        id: key,
        tipo: p.tipo,
        largura: p.largura,
        espessura: p.espessura,
        comprimento: p.comprimento,
        quantidadeUnidades: 0,
        m3Total: 0,
      });
    }
    const item = estoqueMap.get(key)!;
    item.quantidadeUnidades += p.quantidade;
    item.m3Total += p.m3;
  });
  
  // Subtrair vendas
  vendas.filter(v => v.tipo === 'serrada').forEach(v => {
    const prod = producao.find(p => p.id === v.produtoId);
    if (prod) {
      const key = `${prod.tipo}-${prod.largura}-${prod.espessura}-${prod.comprimento}`;
      const item = estoqueMap.get(key);
      if (item) {
        if (v.unidadeMedida === 'unidade') {
          item.quantidadeUnidades -= v.quantidade;
          // As dimensões já estão em metros, multiplicar diretamente
          item.m3Total -= (prod.largura * prod.espessura * prod.comprimento * v.quantidade);
        } else if (v.unidadeMedida === 'm3') {
          item.m3Total -= v.quantidade;
          // Calcular quantas peças equivalem ao m³ vendido
          const m3PorPeca = prod.largura * prod.espessura * prod.comprimento;
          const qtdPecas = v.quantidade / m3PorPeca;
          item.quantidadeUnidades -= qtdPecas;
        }
      }
    }
  });
  
  return Array.from(estoqueMap.values()).filter(item => item.quantidadeUnidades > 0 || item.m3Total > 0);
};

export const calcularEstoqueToras = (): EstoqueToras => {
  const toras = getToras();
  const torasSerradas = getTorasSerradas();
  const vendas = getVendas();
  
  let totalToneladas = 0;
  let totalQuantidadeToras = 0;
  
  // Adicionar toras
  toras.forEach(t => {
    totalToneladas += t.toneladas;
    totalQuantidadeToras += t.quantidadeToras || 0;
  });
  
  // Subtrair toras serradas
  torasSerradas.forEach(ts => {
    totalToneladas -= ts.toneladas;
    totalQuantidadeToras -= ts.quantidadeTorasSerradas || 0;
  });
  
  // Subtrair vendas de toras
  vendas.filter(v => v.tipo === 'tora').forEach(v => {
    totalToneladas -= v.quantidade;
  });
  
  return {
    descricao: 'Toras',
    toneladas: Math.max(0, totalToneladas),
    quantidadeToras: Math.max(0, totalQuantidadeToras),
  };
};

export const calcularCubagem = (
  largura: number, 
  espessura: number, 
  comprimento: number, 
  quantidade: number
): number => {
  return largura * espessura * comprimento * quantidade;
};
