export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alertas_estoque: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          m3_minimo: number | null
          produto_id: string | null
          quantidade_minima: number | null
          tipo: string
          toneladas_minima: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          m3_minimo?: number | null
          produto_id?: string | null
          quantidade_minima?: number | null
          tipo: string
          toneladas_minima?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          m3_minimo?: number | null
          produto_id?: string | null
          quantidade_minima?: number | null
          tipo?: string
          toneladas_minima?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      almoxarifado_categorias: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      almoxarifado_fornecedores: {
        Row: {
          ativo: boolean
          cnpj_cpf: string | null
          contato: string | null
          created_at: string
          email: string | null
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj_cpf?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj_cpf?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      almoxarifado_itens: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string
          estoque_atual: number
          estoque_minimo: number | null
          id: string
          nome: string
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          estoque_atual?: number
          estoque_minimo?: number | null
          id?: string
          nome: string
          unidade_medida?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          estoque_atual?: number
          estoque_minimo?: number | null
          id?: string
          nome?: string
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_itens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      almoxarifado_movimentos: {
        Row: {
          created_at: string
          empresa_id: string
          estoque_anterior: number
          estoque_posterior: number
          id: string
          item_id: string
          nota_fiscal_id: string | null
          observacao: string | null
          ordem_compra_id: string | null
          quantidade: number
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          estoque_anterior: number
          estoque_posterior: number
          id?: string
          item_id: string
          nota_fiscal_id?: string | null
          observacao?: string | null
          ordem_compra_id?: string | null
          quantidade: number
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          estoque_anterior?: number
          estoque_posterior?: number
          id?: string
          item_id?: string
          nota_fiscal_id?: string | null
          observacao?: string | null
          ordem_compra_id?: string | null
          quantidade?: number
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_movimentos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almoxarifado_movimentos_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almoxarifado_movimentos_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      almoxarifado_nf_itens: {
        Row: {
          created_at: string
          id: string
          item_id: string
          nota_fiscal_id: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          nota_fiscal_id: string
          quantidade: number
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          nota_fiscal_id?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_nf_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almoxarifado_nf_itens_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      almoxarifado_notas_fiscais: {
        Row: {
          created_at: string
          data_emissao: string
          data_entrada_saida: string | null
          empresa_id: string
          fornecedor_id: string | null
          id: string
          numero_nf: string
          observacao: string | null
          ordem_compra_id: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          data_emissao: string
          data_entrada_saida?: string | null
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          numero_nf: string
          observacao?: string | null
          ordem_compra_id?: string | null
          tipo: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          data_emissao?: string
          data_entrada_saida?: string | null
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          numero_nf?: string
          observacao?: string | null
          ordem_compra_id?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almoxarifado_notas_fiscais_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      almoxarifado_ordens_compra: {
        Row: {
          aprovado_por: string | null
          created_at: string
          data_aprovacao: string | null
          data_envio: string | null
          data_ordem: string
          data_recebimento: string | null
          empresa_id: string
          fornecedor_id: string | null
          id: string
          numero_ordem: string
          observacao: string | null
          status: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_envio?: string | null
          data_ordem?: string
          data_recebimento?: string | null
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          numero_ordem: string
          observacao?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_envio?: string | null
          data_ordem?: string
          data_recebimento?: string | null
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          numero_ordem?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_ordens_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      almoxarifado_ordens_itens: {
        Row: {
          created_at: string
          id: string
          item_id: string
          ordem_id: string
          quantidade: number
          quantidade_recebida: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          ordem_id: string
          quantidade: number
          quantidade_recebida?: number
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          ordem_id?: string
          quantidade?: number
          quantidade_recebida?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_ordens_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almoxarifado_ordens_itens_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      almoxarifado_pedidos: {
        Row: {
          created_at: string
          data_pedido: string
          empresa_id: string
          id: string
          numero_pedido: string
          observacao: string | null
          setor: string | null
          solicitante: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_pedido?: string
          empresa_id: string
          id?: string
          numero_pedido: string
          observacao?: string | null
          setor?: string | null
          solicitante: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_pedido?: string
          empresa_id?: string
          id?: string
          numero_pedido?: string
          observacao?: string | null
          setor?: string | null
          solicitante?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      almoxarifado_pedidos_itens: {
        Row: {
          created_at: string
          id: string
          item_id: string
          pedido_id: string
          quantidade_atendida: number
          quantidade_solicitada: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          pedido_id: string
          quantidade_atendida?: number
          quantidade_solicitada: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          pedido_id?: string
          quantidade_atendida?: number
          quantidade_solicitada?: number
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_pedidos_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almoxarifado_pedidos_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "almoxarifado_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          empresa_id: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          empresa_id: string
          id: string
          observacao: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data?: string
          descricao: string
          empresa_id: string
          id?: string
          observacao?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cnpj: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          data_vencimento_anuidade: string | null
          endereco: string | null
          id: string
          logo_posicao_pdf: string | null
          logo_tamanho_pdf: string | null
          logo_url: string | null
          nome_empresa: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          data_vencimento_anuidade?: string | null
          endereco?: string | null
          id?: string
          logo_posicao_pdf?: string | null
          logo_tamanho_pdf?: string | null
          logo_url?: string | null
          nome_empresa: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          data_vencimento_anuidade?: string | null
          endereco?: string | null
          id?: string
          logo_posicao_pdf?: string | null
          logo_tamanho_pdf?: string | null
          logo_url?: string | null
          nome_empresa?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      historico_anuidades: {
        Row: {
          created_at: string
          data_novo_vencimento: string
          data_pagamento: string
          data_vencimento_anterior: string | null
          empresa_id: string
          id: string
          observacao: string | null
          valor_pago: number
        }
        Insert: {
          created_at?: string
          data_novo_vencimento: string
          data_pagamento?: string
          data_vencimento_anterior?: string | null
          empresa_id: string
          id?: string
          observacao?: string | null
          valor_pago: number
        }
        Update: {
          created_at?: string
          data_novo_vencimento?: string
          data_pagamento?: string
          data_vencimento_anterior?: string | null
          empresa_id?: string
          id?: string
          observacao?: string | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_anuidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido: {
        Row: {
          concluido: boolean
          created_at: string
          descricao: string
          id: string
          pedido_id: string
          produto_id: string | null
          quantidade_m3: number
          quantidade_pecas: number
          quantidade_pecas_produzidas: number
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          descricao: string
          id?: string
          pedido_id: string
          produto_id?: string | null
          quantidade_m3: number
          quantidade_pecas?: number
          quantidade_pecas_produzidas?: number
        }
        Update: {
          concluido?: boolean
          created_at?: string
          descricao?: string
          id?: string
          pedido_id?: string
          produto_id?: string | null
          quantidade_m3?: number
          quantidade_pecas?: number
          quantidade_pecas_produzidas?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: unknown
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: unknown
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          concluido: boolean
          created_at: string
          data_pedido: string
          empresa_id: string
          id: string
          numero_pedido: string
          observacao: string | null
          updated_at: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data_pedido?: string
          empresa_id: string
          id?: string
          numero_pedido: string
          observacao?: string | null
          updated_at?: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data_pedido?: string
          empresa_id?: string
          id?: string
          numero_pedido?: string
          observacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      producao: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          m3: number
          produto_id: string
          quantidade: number
          tora_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          empresa_id: string
          id?: string
          m3: number
          produto_id: string
          quantidade: number
          tora_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          m3?: number
          produto_id?: string
          quantidade?: number
          tora_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_tora_id_fkey"
            columns: ["tora_id"]
            isOneToOne: false
            referencedRelation: "toras"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          comprimento: number
          created_at: string
          empresa_id: string
          espessura: number
          id: string
          largura: number
          nome: string
          tipo: string
        }
        Insert: {
          comprimento: number
          created_at?: string
          empresa_id: string
          espessura: number
          id?: string
          largura: number
          nome: string
          tipo: string
        }
        Update: {
          comprimento?: number
          created_at?: string
          empresa_id?: string
          espessura?: number
          id?: string
          largura?: number
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          empresa_id: string | null
          id: string
          motivo_bloqueio: string | null
          nome: string
          status: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          empresa_id?: string | null
          id: string
          motivo_bloqueio?: string | null
          nome: string
          status?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          motivo_bloqueio?: string | null
          nome?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_access_attempts: {
        Row: {
          attempt_type: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          target_id: string | null
          target_table: string
          user_id: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_table: string
          user_id?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_table?: string
          user_id?: string | null
        }
        Relationships: []
      }
      toras: {
        Row: {
          created_at: string
          data: string
          descricao: string
          empresa_id: string
          grossura: number | null
          id: string
          numero_lote: string | null
          peso: number
          peso_carga: number | null
          peso_por_m3: number | null
          peso_por_tora: number | null
          quantidade_toras: number | null
          toneladas: number
          user_id: string
          valor_por_tonelada: number | null
          valor_total_carga: number | null
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          empresa_id: string
          grossura?: number | null
          id?: string
          numero_lote?: string | null
          peso: number
          peso_carga?: number | null
          peso_por_m3?: number | null
          peso_por_tora?: number | null
          quantidade_toras?: number | null
          toneladas: number
          user_id: string
          valor_por_tonelada?: number | null
          valor_total_carga?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string
          grossura?: number | null
          id?: string
          numero_lote?: string | null
          peso?: number
          peso_carga?: number | null
          peso_por_m3?: number | null
          peso_por_tora?: number | null
          quantidade_toras?: number | null
          toneladas?: number
          user_id?: string
          valor_por_tonelada?: number | null
          valor_total_carga?: number | null
        }
        Relationships: []
      }
      toras_serradas: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          peso: number
          quantidade_toras_serradas: number | null
          toneladas: number
          tora_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          empresa_id: string
          id?: string
          peso: number
          quantidade_toras_serradas?: number | null
          toneladas: number
          tora_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          peso?: number
          quantidade_toras_serradas?: number | null
          toneladas?: number
          tora_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toras_serradas_tora_id_fkey"
            columns: ["tora_id"]
            isOneToOne: false
            referencedRelation: "toras"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          produto_id: string
          quantidade: number
          tipo: string
          unidade_medida: string
          user_id: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          data: string
          empresa_id: string
          id?: string
          produto_id: string
          quantidade: number
          tipo: string
          unidade_medida: string
          user_id: string
          valor_total: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          produto_id?: string
          quantidade?: number
          tipo?: string
          unidade_medida?: string
          user_id?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_casqueiro: {
        Row: {
          altura: number
          comprimento: number
          created_at: string
          data: string
          empresa_id: string
          id: string
          largura: number
          total_metro_estereo: number
          user_id: string
          valor_metro_estereo: number
          valor_total: number
        }
        Insert: {
          altura: number
          comprimento: number
          created_at?: string
          data?: string
          empresa_id: string
          id?: string
          largura: number
          total_metro_estereo: number
          user_id: string
          valor_metro_estereo: number
          valor_total: number
        }
        Update: {
          altura?: number
          comprimento?: number
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          largura?: number
          total_metro_estereo?: number
          user_id?: string
          valor_metro_estereo?: number
          valor_total?: number
        }
        Relationships: []
      }
      vendas_cavaco: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          toneladas: number
          tora_id: string
          user_id: string
          valor_tonelada: number
          valor_total: number
        }
        Insert: {
          created_at?: string
          data: string
          empresa_id: string
          id?: string
          toneladas: number
          tora_id: string
          user_id: string
          valor_tonelada: number
          valor_total: number
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          toneladas?: number
          tora_id?: string
          user_id?: string
          valor_tonelada?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cavaco_tora_id_fkey"
            columns: ["tora_id"]
            isOneToOne: false
            referencedRelation: "toras"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_serragem: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          toneladas: number
          user_id: string
          valor_tonelada: number
          valor_total: number
        }
        Insert: {
          created_at?: string
          data?: string
          empresa_id: string
          id?: string
          toneladas: number
          user_id: string
          valor_tonelada: number
          valor_total: number
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          toneladas?: number
          user_id?: string
          valor_tonelada?: number
          valor_total?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_empresas_access_rate_limit: { Args: never; Returns: boolean }
      check_login_rate_limit: { Args: { _email: string }; Returns: boolean }
      detect_enumeration_attempt: {
        Args: { _table_name: string; _target_id: string }
        Returns: undefined
      }
      get_current_user_empresa_id: { Args: never; Returns: string }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_empresa: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _new_data?: Json
          _old_data?: Json
          _record_id?: string
          _table_name: string
        }
        Returns: string
      }
      record_login_attempt: {
        Args: { _email: string; _success: boolean }
        Returns: undefined
      }
      user_belongs_to_empresa: {
        Args: { _empresa_id: string }
        Returns: boolean
      }
      user_can_access_empresa: {
        Args: { _empresa_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "empresa" | "funcionario" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "empresa", "funcionario", "user"],
    },
  },
} as const
