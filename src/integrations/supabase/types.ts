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
      agendamentos: {
        Row: {
          cca_user_id: string
          comite_credito: boolean | null
          cpf: string | null
          created_at: string
          data_hora: string
          dossie_cliente_url: string | null
          id: string
          modalidade_financiamento: string | null
          observacoes: string | null
          status: string | null
          tipo: string
          tipo_contrato: string | null
        }
        Insert: {
          cca_user_id: string
          comite_credito?: boolean | null
          cpf?: string | null
          created_at?: string
          data_hora: string
          dossie_cliente_url?: string | null
          id?: string
          modalidade_financiamento?: string | null
          observacoes?: string | null
          status?: string | null
          tipo: string
          tipo_contrato?: string | null
        }
        Update: {
          cca_user_id?: string
          comite_credito?: boolean | null
          cpf?: string | null
          created_at?: string
          data_hora?: string
          dossie_cliente_url?: string | null
          id?: string
          modalidade_financiamento?: string | null
          observacoes?: string | null
          status?: string | null
          tipo?: string
          tipo_contrato?: string | null
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      conformidades: {
        Row: {
          cca_user_id: string
          codigo_cca: string
          comite_credito: boolean | null
          cpf: string
          created_at: string
          data_agendamento: string | null
          entrevista_aprovada: boolean | null
          entrevista_id: string | null
          id: string
          modalidade: Database["public"]["Enums"]["modalidade_financiamento"]
          modalidade_outro: string | null
          observacoes: string | null
          status: string | null
          tipo_contrato: string
          valor_financiamento: number
        }
        Insert: {
          cca_user_id: string
          codigo_cca: string
          comite_credito?: boolean | null
          cpf: string
          created_at?: string
          data_agendamento?: string | null
          entrevista_aprovada?: boolean | null
          entrevista_id?: string | null
          id?: string
          modalidade: Database["public"]["Enums"]["modalidade_financiamento"]
          modalidade_outro?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_contrato?: string
          valor_financiamento: number
        }
        Update: {
          cca_user_id?: string
          codigo_cca?: string
          comite_credito?: boolean | null
          cpf?: string
          created_at?: string
          data_agendamento?: string | null
          entrevista_aprovada?: boolean | null
          entrevista_id?: string | null
          id?: string
          modalidade?: Database["public"]["Enums"]["modalidade_financiamento"]
          modalidade_outro?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_contrato?: string
          valor_financiamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "conformidades_entrevista_id_fkey"
            columns: ["entrevista_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          assinatura_data: string | null
          carta_solicitacao_pdf: string | null
          cartorio: string | null
          cca_user_id: string
          codigo_cca: string
          concluded_at: string | null
          cpf: string | null
          created_at: string
          description: string | null
          ficha_cadastro_pdf: string | null
          id: string
          matricula: string | null
          matricula_imovel_pdf: string | null
          mo_autorizacao_assinado_pdf: string | null
          mo_autorizacao_pdf: string | null
          numero_pis: string | null
          response_text: string | null
          status: Database["public"]["Enums"]["demand_status"]
          type: Database["public"]["Enums"]["demand_type"]
          updated_at: string
        }
        Insert: {
          assinatura_data?: string | null
          carta_solicitacao_pdf?: string | null
          cartorio?: string | null
          cca_user_id: string
          codigo_cca: string
          concluded_at?: string | null
          cpf?: string | null
          created_at?: string
          description?: string | null
          ficha_cadastro_pdf?: string | null
          id?: string
          matricula?: string | null
          matricula_imovel_pdf?: string | null
          mo_autorizacao_assinado_pdf?: string | null
          mo_autorizacao_pdf?: string | null
          numero_pis?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          type: Database["public"]["Enums"]["demand_type"]
          updated_at?: string
        }
        Update: {
          assinatura_data?: string | null
          carta_solicitacao_pdf?: string | null
          cartorio?: string | null
          cca_user_id?: string
          codigo_cca?: string
          concluded_at?: string | null
          cpf?: string | null
          created_at?: string
          description?: string | null
          ficha_cadastro_pdf?: string | null
          id?: string
          matricula?: string | null
          matricula_imovel_pdf?: string | null
          mo_autorizacao_assinado_pdf?: string | null
          mo_autorizacao_pdf?: string | null
          numero_pis?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          type?: Database["public"]["Enums"]["demand_type"]
          updated_at?: string
        }
        Relationships: []
      }
      distribuicao_tarefas: {
        Row: {
          created_at: string | null
          id: string
          referencia_id: string
          status: string | null
          tipo_tarefa: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referencia_id: string
          status?: string | null
          tipo_tarefa: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referencia_id?: string
          status?: string | null
          tipo_tarefa?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      documentos_extraidos: {
        Row: {
          arquivo_url: string | null
          created_at: string | null
          dados_extraidos: Json
          id: string
          texto_gerado: string
          tipo_documento: string
          user_id: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string | null
          dados_extraidos?: Json
          id?: string
          texto_gerado: string
          tipo_documento: string
          user_id?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string | null
          dados_extraidos?: Json
          id?: string
          texto_gerado?: string
          tipo_documento?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          available_variables: Json
          body: string
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          available_variables?: Json
          body: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          available_variables?: Json
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      empregados_agencia: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email_preferencia: string | null
          id: string
          nome: string
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email_preferencia?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email_preferencia?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      entrevistas_agendamento: {
        Row: {
          agencia: string | null
          cca_user_id: string | null
          chat_id: string | null
          cliente_nome: string
          codigo_cca: string | null
          comite_credito: boolean | null
          conformidade_id: string | null
          contrato_id: string | null
          created_at: string | null
          data_confirmada: string | null
          data_opcao_1: string
          data_opcao_2: string
          endereco_agencia: string | null
          horario_fim: string
          horario_inicio: string
          id: string
          lembrete_enviado_em: string | null
          mensagem_id: string | null
          modalidade_financiamento: string | null
          nome_empresa: string | null
          opcao_escolhida: number | null
          status: string | null
          telefone: string
          tipo_contrato: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          cca_user_id?: string | null
          chat_id?: string | null
          cliente_nome: string
          codigo_cca?: string | null
          comite_credito?: boolean | null
          conformidade_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_confirmada?: string | null
          data_opcao_1: string
          data_opcao_2: string
          endereco_agencia?: string | null
          horario_fim: string
          horario_inicio: string
          id?: string
          lembrete_enviado_em?: string | null
          mensagem_id?: string | null
          modalidade_financiamento?: string | null
          nome_empresa?: string | null
          opcao_escolhida?: number | null
          status?: string | null
          telefone: string
          tipo_contrato?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          cca_user_id?: string | null
          chat_id?: string | null
          cliente_nome?: string
          codigo_cca?: string | null
          comite_credito?: boolean | null
          conformidade_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_confirmada?: string | null
          data_opcao_1?: string
          data_opcao_2?: string
          endereco_agencia?: string | null
          horario_fim?: string
          horario_inicio?: string
          id?: string
          lembrete_enviado_em?: string | null
          mensagem_id?: string | null
          modalidade_financiamento?: string | null
          nome_empresa?: string | null
          opcao_escolhida?: number | null
          status?: string | null
          telefone?: string
          tipo_contrato?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_agendamento_conformidade_id_fkey"
            columns: ["conformidade_id"]
            isOneToOne: false
            referencedRelation: "conformidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          codigo_cca: string
          created_at: string
          email_preferencia: string | null
          full_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo_cca: string
          created_at?: string
          email_preferencia?: string | null
          full_name: string
          id?: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo_cca?: string
          created_at?: string
          email_preferencia?: string | null
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          available_variables: Json
          created_at: string
          demand_type: string | null
          description: string | null
          id: string
          message: string
          name: string
          template_key: string
          updated_at: string
        }
        Insert: {
          available_variables?: Json
          created_at?: string
          demand_type?: string | null
          description?: string | null
          id?: string
          message: string
          name: string
          template_key: string
          updated_at?: string
        }
        Update: {
          available_variables?: Json
          created_at?: string
          demand_type?: string | null
          description?: string | null
          id?: string
          message?: string
          name?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "agencia" | "cca"
      demand_status:
        | "pendente"
        | "concluida"
        | "cancelada"
        | "aguardando_assinatura"
        | "assinado"
      demand_type:
        | "autoriza_reavaliacao"
        | "desconsidera_avaliacoes"
        | "vincula_imovel"
        | "cancela_avaliacao_sicaq"
        | "cancela_proposta_siopi"
        | "solicitar_avaliacao_sigdu"
        | "outras"
        | "incluir_pis_siopi"
        | "autoriza_vendedor_restricao"
      modalidade_financiamento: "SBPE" | "MCMV" | "OUTRO"
      tipo_contrato: "individual" | "empreendimento"
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
      app_role: ["agencia", "cca"],
      demand_status: [
        "pendente",
        "concluida",
        "cancelada",
        "aguardando_assinatura",
        "assinado",
      ],
      demand_type: [
        "autoriza_reavaliacao",
        "desconsidera_avaliacoes",
        "vincula_imovel",
        "cancela_avaliacao_sicaq",
        "cancela_proposta_siopi",
        "solicitar_avaliacao_sigdu",
        "outras",
        "incluir_pis_siopi",
        "autoriza_vendedor_restricao",
      ],
      modalidade_financiamento: ["SBPE", "MCMV", "OUTRO"],
      tipo_contrato: ["individual", "empreendimento"],
    },
  },
} as const
