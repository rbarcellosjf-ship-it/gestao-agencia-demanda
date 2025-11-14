import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useTextImprovement() {
  const [isImproving, setIsImproving] = useState(false);
  const { toast } = useToast();

  const improveText = async (text: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) {
      toast({
        title: "Texto vazio",
        description: "Digite algum texto antes de melhorar.",
        variant: "destructive",
      });
      return null;
    }

    setIsImproving(true);

    try {
      const { data, error } = await supabase.functions.invoke("enhance-text", {
        body: { text },
      });

      if (error) {
        console.error("Erro ao melhorar texto:", error);
        throw error;
      }

      if (!data?.enhancedText) {
        throw new Error("Resposta inválida do servidor");
      }

      toast({
        title: "Texto melhorado!",
        description: "O texto foi reformulado com sucesso.",
      });

      return data.enhancedText;
    } catch (error: any) {
      console.error("Erro ao melhorar texto:", error);
      
      let errorMessage = "Não foi possível melhorar o texto. Tente novamente.";
      
      if (error.message?.includes("429")) {
        errorMessage = "Limite de requisições atingido. Aguarde alguns instantes.";
      } else if (error.message?.includes("402")) {
        errorMessage = "Créditos insuficientes. Adicione créditos ao workspace.";
      }

      toast({
        title: "Erro ao melhorar texto",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsImproving(false);
    }
  };

  return { improveText, isImproving };
}
