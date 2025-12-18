import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const agendamentoSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter no mínimo 11 caracteres"),
  tipo_contrato: z.enum(['individual', 'empreendimento'], {
    errorMap: () => ({ message: "Tipo de contrato inválido" })
  }),
  modalidade_financiamento: z.enum(['mcmv', 'sbpe'], {
    errorMap: () => ({ message: "Modalidade de financiamento inválida" })
  }),
  comite_credito: z.boolean(),
  data_hora: z.string().min(1, "Data e hora são obrigatórias"),
  observacoes: z.string().optional(),
  dossie_cliente_url: z.string().optional(),
  telefone_cliente: z.string().optional(),
  tipo: z.enum(['entrevista', 'assinatura']),
  cca_user_id: z.string().uuid("ID de usuário inválido"),
});

export type AgendamentoInput = z.infer<typeof agendamentoSchema>;

export async function safeInsertAgendamento(data: Partial<AgendamentoInput>) {
  try {
    // 1. Validar schema
    const validated = agendamentoSchema.parse(data);
    
    // 2. Verificar sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }
    
    // 3. Verificar role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    if (roleError || !roleData) {
      throw new Error("Não foi possível verificar permissões");
    }
    
    if (!['cca', 'agencia'].includes(roleData.role)) {
      throw new Error("Você não tem permissão para criar agendamentos");
    }
    
    // 4. Log da tentativa
    console.log('[INSERT_AGENDAMENTO]', {
      user_id: user.id,
      user_role: roleData.role,
      tipo: validated.tipo,
      timestamp: new Date().toISOString(),
    });
    
    // 5. Inserir
    const { data: insertedData, error: insertError } = await supabase
      .from("agendamentos")
      .insert([validated] as any)
      .select()
      .single();
    
    if (insertError) {
      console.error('[INSERT_AGENDAMENTO_ERROR]', insertError);
      throw insertError;
    }
    
    console.log('[INSERT_AGENDAMENTO_SUCCESS]', insertedData.id);
    return { data: insertedData, error: null };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { 
        data: null, 
        error: { 
          message: firstError.message,
          code: 'VALIDATION_ERROR'
        } 
      };
    }
    
    return { 
      data: null, 
      error: error as Error
    };
  }
}

export function formatAgendamentoError(error: any): string {
  if (!error) return "Erro desconhecido";
  
  const errorMessage = error.message || "";
  const errorCode = error.code || "";
  
  // RLS violation
  if (errorMessage.includes('row-level security') || errorMessage.includes('policy')) {
    return 'Você não tem permissão para criar este agendamento. Verifique se todos os campos estão preenchidos corretamente.';
  }
  
  // NOT NULL violation
  if (errorCode === '23502') {
    return 'Campos obrigatórios não foram preenchidos. Verifique o formulário.';
  }
  
  // Foreign key violation
  if (errorCode === '23503') {
    return 'Referência inválida. Verifique os dados selecionados.';
  }
  
  // Validation error
  if (errorCode === 'VALIDATION_ERROR') {
    return errorMessage;
  }
  
  // Duplicate key
  if (errorCode === '23505') {
    return 'Este agendamento já existe no sistema.';
  }
  
  return errorMessage || "Erro ao criar agendamento. Tente novamente.";
}
