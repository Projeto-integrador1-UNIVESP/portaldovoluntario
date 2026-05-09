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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      doacoes: {
        Row: {
          created_at: string
          data_doacao: string
          id: string
          id_ong: string
          id_usuario: string | null
          tipo_doacao: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          data_doacao?: string
          id?: string
          id_ong: string
          id_usuario?: string | null
          tipo_doacao?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          data_doacao?: string
          id?: string
          id_ong?: string
          id_usuario?: string | null
          tipo_doacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "doacoes_id_ong_fkey"
            columns: ["id_ong"]
            isOneToOne: false
            referencedRelation: "ongs"
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
      ongs: {
        Row: {
          agencia: number | null
          area_atuacao: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          conta: number | null
          created_at: string
          data_cadastro: string
          descricao: string | null
          estado: string | null
          id: string
          img_capa: string | null
          img_url: string | null
          instagram: string | null
          logradouro: string | null
          missao: string | null
          nome: string
          pix: string | null
          site: string | null
          status: boolean | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          agencia?: number | null
          area_atuacao?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: number | null
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          estado?: string | null
          id?: string
          img_capa?: string | null
          img_url?: string | null
          instagram?: string | null
          logradouro?: string | null
          missao?: string | null
          nome: string
          pix?: string | null
          site?: string | null
          status?: boolean | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: number | null
          area_atuacao?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: number | null
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          estado?: string | null
          id?: string
          img_capa?: string | null
          img_url?: string | null
          instagram?: string | null
          logradouro?: string | null
          missao?: string | null
          nome?: string
          pix?: string | null
          site?: string | null
          status?: boolean | null
          telefone?: string | null
          updated_at?: string
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
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          id_ong: string
          img_url: string | null
          nome_projeto: string
          status: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          id_ong: string
          img_url?: string | null
          nome_projeto: string
          status?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          id_ong?: string
          img_url?: string | null
          nome_projeto?: string
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
