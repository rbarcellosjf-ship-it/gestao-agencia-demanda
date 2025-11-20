import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";
import { ObservacoesField } from "@/components/ObservacoesField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AssinaturaCardProps {
  assinatura: any;
}

export const AssinaturaCard = ({ assinatura }: AssinaturaCardProps) => {
  const { toast } = useToast();
  const [observacoes, setObservacoes] = useState(assinatura.observacoes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isObservacoesOpen, setIsObservacoesOpen] = useState(false);

  const handleSaveObservacoes = async (newObservacoes: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ observacoes: newObservacoes })
        .eq("id", assinatura.id);

      if (error) throw error;

      toast({
        title: "Observações salvas",
        description: "As observações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Error updating observacoes:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", assinatura.id);

      if (error) throw error;

      toast({
        title: "Assinatura excluída",
        description: "A assinatura foi removida com sucesso.",
      });
    } catch (error: any) {
      console.error("Error deleting assinatura:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Aguardando entrevista": "outline",
      "Entrevista confirmada": "default",
      "Cancelado": "destructive",
      "Concluído": "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  const statusBorderMap: Record<string, string> = {
    "Aguardando entrevista": statusBorders.pendente,
    "Entrevista confirmada": statusBorders.aguardando_assinatura,
    "Cancelado": statusBorders.cancelada,
    "Concluído": statusBorders.concluida,
  };

  return (
    <Card
      className={cn(
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        statusBorderMap[assinatura.status || "Aguardando entrevista"] || statusBorders.pendente
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">
              {format(new Date(assinatura.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </CardTitle>
            <CardDescription className="text-xs">
              {assinatura.tipo === "assinatura" ? "Assinatura de Documento" : assinatura.tipo}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(assinatura.status || "Aguardando entrevista")}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {assinatura.conformidades && (
            <>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
                <p className="font-medium text-sm">{assinatura.conformidades.cpf}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Modalidade</p>
                <p className="font-medium text-sm">{assinatura.conformidades.modalidade}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor do Financiamento</p>
                <p className="font-semibold text-sm">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(parseFloat(assinatura.conformidades.valor_financiamento))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Código CCA</p>
                <p className="font-medium text-sm">{assinatura.conformidades.codigo_cca}</p>
              </div>
            </>
          )}
        </div>
        
        <Collapsible 
          open={isObservacoesOpen} 
          onOpenChange={setIsObservacoesOpen}
          className="pt-2 border-t"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Observações
            </p>
            {isObservacoesOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 animate-accordion-down">
            <ObservacoesField
              value={observacoes}
              onChange={setObservacoes}
              onSave={handleSaveObservacoes}
              placeholder="Adicionar observações sobre a assinatura..."
              disabled={isSaving}
              autoSave={false}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
