export interface Produto {
  id: string;
  nome: string;
  tipo: string;
  largura: number;
  espessura: number;
  comprimento: number;
}

export interface MadeiraProduzida {
  id: string;
  data: string;
  produtoId: string;
  produtoNome: string;
  largura: number;
  espessura: number;
  comprimento: number;
  quantidade: number;
  m3: number;
  tipo: string;
}

export interface Tora {
  id: string;
  data: string;
  descricao: string;
  peso: number; // em kg
  toneladas: number;
}

export interface ToraSerrada {
  id: string;
  data: string;
  toraId: string;
  peso: number; // em kg
  toneladas: number;
}

export interface Venda {
  id: string;
  data: string;
  produtoId: string;
  tipo: 'serrada' | 'tora';
  quantidade: number;
  unidadeMedida: 'unidade' | 'm3' | 'tonelada';
  valorUnitario: number;
  valorTotal: number;
}

export interface EstoqueSerrado {
  id: string;
  tipo: string;
  largura: number;
  espessura: number;
  comprimento: number;
  quantidadeUnidades: number;
  m3Total: number;
}

export interface EstoqueToras {
  descricao: string;
  toneladas: number;
}
