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
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          data_vencimento_anuidade: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome_empresa: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          data_vencimento_anuidade?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_empresa: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          data_vencimento_anuidade?: string | null
          endereco?: string | null
          id?: string
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
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          descricao: string
          id?: string
          pedido_id: string
          produto_id?: string | null
          quantidade_m3: number
        }
        Update: {
          concluido?: boolean
          created_at?: string
          descricao?: string
          id?: string
          pedido_id?: string
          produto_id?: string | null
          quantidade_m3?: number
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
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nome: string
          status: string | null
        }
        Insert: {
          created_at?: string
          email: string
          empresa_id?: string | null
          id: string
          nome: string
          status?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
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
      toras: {
        Row: {
          created_at: string
          data: string
          descricao: string
          empresa_id: string
          grossura: number | null
          id: string
          peso: number
          peso_carga: number | null
          peso_por_m3: number | null
          peso_por_tora: number | null
          quantidade_toras: number | null
          toneladas: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          empresa_id: string
          grossura?: number | null
          id?: string
          peso: number
          peso_carga?: number | null
          peso_por_m3?: number | null
          peso_por_tora?: number | null
          quantidade_toras?: number | null
          toneladas: number
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string
          grossura?: number | null
          id?: string
          peso?: number
          peso_carga?: number | null
          peso_por_m3?: number | null
          peso_por_tora?: number | null
          quantidade_toras?: number | null
          toneladas?: number
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
