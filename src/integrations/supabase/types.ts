export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      doacoes: {
        Row: {
          anonima: boolean
          comprovante_url: string | null
          confirmada_em: string | null
          confirmada_por: string | null
          created_at: string
          data_doacao: string
          doador_email: string | null
          doador_nome: string | null
          forma_entrega: string | null
          id: string
          id_necessidade: string | null
          id_ong: string
          id_projeto: string | null
          id_usuario: string | null
          quantidade: number | null
          status: string
          tipo_doacao: string | null
          valor: number
        }
        Insert: {
          anonima?: boolean
          comprovante_url?: string | null
          confirmada_em?: string | null
          confirmada_por?: string | null
          created_at?: string
          data_doacao?: string
          doador_email?: string | null
          doador_nome?: string | null
          forma_entrega?: string | null
          id?: string
          id_necessidade?: string | null
          id_ong: string
          id_projeto?: string | null
          id_usuario?: string | null
          quantidade?: number | null
          status?: string
          tipo_doacao?: string | null
          valor: number
        }
        Update: {
          anonima?: boolean
          comprovante_url?: string | null
          confirmada_em?: string | null
          confirmada_por?: string | null
          created_at?: string
          data_doacao?: string
          doador_email?: string | null
          doador_nome?: string | null
          forma_entrega?: string | null
          id?: string
          id_necessidade?: string | null
          id_ong?: string
          id_projeto?: string | null
          id_usuario?: string | null
          quantidade?: number | null
          status?: string
          tipo_doacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "doacoes_id_necessidade_fkey"
            columns: ["id_necessidade"]
            isOneToOne: false
            referencedRelation: "necessidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doacoes_id_ong_fkey"
            columns: ["id_ong"]
            isOneToOne: false
            referencedRelation: "ongs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doacoes_id_projeto_fkey"
            columns: ["id_projeto"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          data_evento: string
          descricao: string | null
          id: string
          id_ong: string | null
          img_url: string | null
          local: string | null
          nome: string
          status: boolean | null
          updated_at: string
          vagas: number | null
        }
        Insert: {
          created_at?: string
          data_evento: string
          descricao?: string | null
          id?: string
          id_ong?: string | null
          img_url?: string | null
          local?: string | null
          nome: string
          status?: boolean | null
          updated_at?: string
          vagas?: number | null
        }
        Update: {
          created_at?: string
          data_evento?: string
          descricao?: string | null
          id?: string
          id_ong?: string | null
          img_url?: string | null
          local?: string | null
          nome?: string
          status?: boolean | null
          updated_at?: string
          vagas?: number | null
        }
        Relationships: []
      }
      necessidades: {
        Row: {
          arrecadado: number
          categoria: string | null
          created_at: string
          id: string
          id_projeto: string
          meta: number
          nome: string
          prazo: string | null
          status: boolean
          tipo: string
          unidade: string | null
          updated_at: string
          urgencia: number
        }
        Insert: {
          arrecadado?: number
          categoria?: string | null
          created_at?: string
          id?: string
          id_projeto: string
          meta: number
          nome: string
          prazo?: string | null
          status?: boolean
          tipo: string
          unidade?: string | null
          updated_at?: string
          urgencia?: number
        }
        Update: {
          arrecadado?: number
          categoria?: string | null
          created_at?: string
          id?: string
          id_projeto?: string
          meta?: number
          nome?: string
          prazo?: string | null
          status?: boolean
          tipo?: string
          unidade?: string | null
          updated_at?: string
          urgencia?: number
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_id_projeto_fkey"
            columns: ["id_projeto"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      ong_access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          nome_ong_sugerido: string | null
          observacoes: string | null
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          nome_ong_sugerido?: string | null
          observacoes?: string | null
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          nome_ong_sugerido?: string | null
          observacoes?: string | null
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      ongs: {
        Row: {
          agencia: number | null
          area_atuacao: string | null
          banco: string | null
          capa_url: string | null
          causas: string[] | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          conta: number | null
          created_at: string
          data_cadastro: string
          descricao: string | null
          endereco_entrega: string | null
          estado: string | null
          fundada_em: string | null
          horarios_recebimento: string | null
          id: string
          img_capa: string | null
          img_url: string | null
          instagram: string | null
          logo_url: string | null
          logradouro: string | null
          missao: string | null
          nome: string
          pix: string | null
          pix_nome_recebedor: string | null
          site: string | null
          slug: string | null
          status: boolean | null
          telefone: string | null
          updated_at: string
          verificada_em: string | null
        }
        Insert: {
          agencia?: number | null
          area_atuacao?: string | null
          banco?: string | null
          capa_url?: string | null
          causas?: string[] | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: number | null
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          endereco_entrega?: string | null
          estado?: string | null
          fundada_em?: string | null
          horarios_recebimento?: string | null
          id?: string
          img_capa?: string | null
          img_url?: string | null
          instagram?: string | null
          logo_url?: string | null
          logradouro?: string | null
          missao?: string | null
          nome: string
          pix?: string | null
          pix_nome_recebedor?: string | null
          site?: string | null
          slug?: string | null
          status?: boolean | null
          telefone?: string | null
          updated_at?: string
          verificada_em?: string | null
        }
        Update: {
          agencia?: number | null
          area_atuacao?: string | null
          banco?: string | null
          capa_url?: string | null
          causas?: string[] | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: number | null
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          endereco_entrega?: string | null
          estado?: string | null
          fundada_em?: string | null
          horarios_recebimento?: string | null
          id?: string
          img_capa?: string | null
          img_url?: string | null
          instagram?: string | null
          logo_url?: string | null
          logradouro?: string | null
          missao?: string | null
          nome?: string
          pix?: string | null
          pix_nome_recebedor?: string | null
          site?: string | null
          slug?: string | null
          status?: boolean | null
          telefone?: string | null
          updated_at?: string
          verificada_em?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          contato_ong: boolean | null
          created_at: string
          data_cadastro: string
          data_nascimento: string | null
          email: string
          estado: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: number | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          contato_ong?: boolean | null
          created_at?: string
          data_cadastro?: string
          data_nascimento?: string | null
          email: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: number | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          contato_ong?: boolean | null
          created_at?: string
          data_cadastro?: string
          data_nascimento?: string | null
          email?: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: number | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          capa_url: string | null
          causa: string | null
          cidade: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          id_ong: string
          img_url: string | null
          nome_projeto: string
          slug: string | null
          status: boolean | null
          updated_at: string
        }
        Insert: {
          capa_url?: string | null
          causa?: string | null
          cidade?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          id_ong: string
          img_url?: string | null
          nome_projeto: string
          slug?: string | null
          status?: boolean | null
          updated_at?: string
        }
        Update: {
          capa_url?: string | null
          causa?: string | null
          cidade?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          id_ong?: string
          img_url?: string | null
          nome_projeto?: string
          slug?: string | null
          status?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_id_ong_fkey"
            columns: ["id_ong"]
            isOneToOne: false
            referencedRelation: "ongs"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_ong: {
        Row: {
          created_at: string
          data_inicio: string
          id: string
          id_ong: string
          id_usuario: string
          status: boolean | null
        }
        Insert: {
          created_at?: string
          data_inicio?: string
          id?: string
          id_ong: string
          id_usuario: string
          status?: boolean | null
        }
        Update: {
          created_at?: string
          data_inicio?: string
          id?: string
          id_ong?: string
          id_usuario?: string
          status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_ong_id_ong_fkey"
            columns: ["id_ong"]
            isOneToOne: false
            referencedRelation: "ongs"
            referencedColumns: ["id"]
          },
        ]
      }
      voluntariado: {
        Row: {
          created_at: string
          data_inscricao: string
          id: string
          id_projeto: string
          id_usuario: string
          status: string | null
        }
        Insert: {
          created_at?: string
          data_inscricao?: string
          id?: string
          id_projeto: string
          id_usuario: string
          status?: string | null
        }
        Update: {
          created_at?: string
          data_inscricao?: string
          id?: string
          id_projeto?: string
          id_usuario?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voluntariado_id_projeto_fkey"
            columns: ["id_projeto"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_projetos: {
        Args: {
          _causa?: string
          _cidade?: string
          _limit?: number
          _offset?: number
          _ordem?: string
          _q?: string
        }
        Returns: {
          capa_url: string
          causa: string
          cidade: string
          data_fim: string
          descricao: string
          id: string
          img_url: string
          necessidade_arrecadado: number
          necessidade_meta: number
          necessidade_nome: string
          necessidade_tipo: string
          necessidade_unidade: string
          nome_projeto: string
          ong_id: string
          ong_nome: string
          ong_slug: string
          ong_verificada: boolean
          progresso_medio: number
          slug: string
          total_encontrado: number
          total_necessidades: number
          urgencia_maxima: number
        }[]
      }
      count_project_voluntarios: {
        Args: { _project_id: string }
        Returns: number
      }
      get_comprovante_doacao: {
        Args: { _id: string }
        Returns: {
          anonima: boolean
          confirmada_em: string
          data_doacao: string
          doador_nome: string
          forma_entrega: string
          id: string
          necessidade_nome: string
          necessidade_unidade: string
          ong_nome: string
          ong_slug: string
          projeto_nome: string
          projeto_slug: string
          quantidade: number
          status: string
          valor: number
        }[]
      }
      get_impacto_ong: {
        Args: { _ong_id: string }
        Returns: {
          doacoes_confirmadas: number
          doacoes_pendentes: number
          doadores_distintos: number
          projetos_ativos: number
          total_confirmado: number
          total_pendente: number
          voluntarios_aprovados: number
        }[]
      }
      get_public_home_stats: {
        Args: never
        Returns: {
          itens_arrecadados: number
          ongs: number
          projetos: number
          valor_arrecadado: number
          voluntarios: number
        }[]
      }
      get_taxa_confirmacao_ong: {
        Args: { _ong_id: string }
        Returns: {
          confirmadas: number
          dias_medio_para_confirmar: number
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ong_member: {
        Args: { _ong_id: string; _user_id: string }
        Returns: boolean
      }
      is_ong_member_do_projeto: {
        Args: { _projeto_id: string; _user_id: string }
        Returns: boolean
      }
      ong_id_do_caminho: { Args: { _name: string }; Returns: string }
      opcoes_de_filtro_projetos: {
        Args: never
        Returns: {
          causas: string[]
          cidades: string[]
        }[]
      }
      recalcular_arrecadado: {
        Args: { _necessidade_id: string }
        Returns: undefined
      }
      slug_unico: {
        Args: { _base: string; _id_atual: string; _tabela: string }
        Returns: string
      }
      slugify: { Args: { _texto: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "ong" | "user"
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
      app_role: ["admin", "ong", "user"],
    },
  },
} as const

