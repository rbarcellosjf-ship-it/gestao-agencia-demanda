import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { replaceVariables, extractVariables } from "@/lib/emailUtils";
import { useToast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id: string;
  name: string;
  template_key: string;
  subject: string;
  body: string;
  description?: string;
  available_variables: Record<string, string>;
  module: string;
  created_at: string;
  updated_at: string;
}

export const useEmailTemplates = (module?: string) => {
  return useQuery({
    queryKey: ['email_templates', module],
    queryFn: async () => {
      let query = supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (module) {
        query = query.eq('module', module);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as EmailTemplate[];
    }
  });
};

export const useEmailTemplate = (templateKey: string) => {
  return useQuery({
    queryKey: ['email_template', templateKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', templateKey)
        .single();
      
      if (error) throw error;
      return data as EmailTemplate;
    },
    enabled: !!templateKey
  });
};

export const useCreateEmailTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast({
        title: "Template criado",
        description: "O template de e-mail foi criado com sucesso"
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

export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast({
        title: "Template atualizado",
        description: "O template de e-mail foi atualizado com sucesso"
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

export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast({
        title: "Template excluído",
        description: "O template de e-mail foi excluído com sucesso"
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

export const generateEmail = (
  template: EmailTemplate,
  data: Record<string, string>
): { subject: string; body: string } => {
  return {
    subject: replaceVariables(template.subject, data),
    body: replaceVariables(template.body, data)
  };
};

export const getAvailableVariables = (template: EmailTemplate): string[] => {
  return Object.keys(template.available_variables);
};
