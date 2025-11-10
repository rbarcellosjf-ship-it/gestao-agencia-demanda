import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { replaceVariables } from "@/lib/emailUtils";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  template_key: string;
  message: string;
  description?: string;
  demand_type?: string;
  available_variables: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppTemplates = (demandType?: string) => {
  return useQuery({
    queryKey: ['whatsapp_templates', demandType],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (demandType) {
        query = query.or(`demand_type.eq.${demandType},demand_type.eq.all`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as WhatsAppTemplate[];
    }
  });
};

export const useWhatsAppTemplate = (templateKey: string) => {
  return useQuery({
    queryKey: ['whatsapp_template', templateKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_key', templateKey)
        .single();
      
      if (error) throw error;
      return data as WhatsAppTemplate;
    },
    enabled: !!templateKey
  });
};

export const useCreateWhatsAppTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (template: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] });
      toast({
        title: "Template criado",
        description: "O template de WhatsApp foi criado com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useUpdateWhatsAppTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<WhatsAppTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] });
      toast({
        title: "Template atualizado",
        description: "O template de WhatsApp foi atualizado com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useDeleteWhatsAppTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] });
      toast({
        title: "Template excluído",
        description: "O template de WhatsApp foi excluído com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const generateWhatsAppMessage = (
  template: WhatsAppTemplate,
  data: Record<string, string>
): string => {
  return replaceVariables(template.message, data);
};
