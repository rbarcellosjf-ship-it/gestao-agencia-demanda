import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { ObservacoesField } from "@/components/ObservacoesField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface EntrevistaCardProps {
  entrevista: {
    id: string;
    data_hora: string;
    cpf: string;
    tipo_contrato: string;
    modalidade_financiamento: string;
    comite_credito: boolean;
    status: string;
    observacoes?: string;
    dossie_cliente_url?: string;
  };
  onAprovar: (id: string) => void;
  onReprovar: (id: string) => void;
  onEditar: (id: string) => void;
  onCriarContrato?: (entrevista: any) => void;
  onDelete?: () => void;
}

export function EntrevistaCard({ entrevista, onAprovar, onReprovar, onEditar, onCriarContrato, onDelete }: EntrevistaCardProps) {
  const { role } = useUserRole();
  const isAgencia = role === "agencia";
  const { toast } = useToast();
  const [observacoes, setObservacoes] = useState(entrevista.observacoes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isObservacoesOpen, setIsObservacoesOpen] = useState(false);
  const [hasConformidade, setHasConformidade] = useState(false);

  // Verificar se já existe conformidade vinculada
  useEffect(() => {
    const checkConformidade = async () => {
      const { data } = await supabase
        .from('entrevistas_agendamento')
        .select('conformidade_id')
        .eq('id', entrevista.id)
        .single();
      
      setHasConformidade(!!data?.conformidade_id);
    };
    checkConformidade();
  }, [entrevista.id]);

  const handleSaveObservacoes = async (newObservacoes: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ observacoes: newObservacoes })
        .eq("id", entrevista.id);

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
        .eq("id", entrevista.id);

      if (error) throw error;

      toast({
        title: "Entrevista excluída",
        description: "A entrevista foi removida com sucesso.",
      });

      // Recarregar lista após exclusão
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      console.error("Error deleting entrevista:", error);
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
      "Aprovado": "default",
      "Reprovado": "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  const statusBorderMap: Record<string, string> = {
    "Aguardando entrevista": statusBorders.pendente,
    "Aprovado": statusBorders.concluida,
    "Reprovado": statusBorders.cancelada,
  };

  return (
    <Card
      className={cn(
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        statusBorderMap[entrevista.status] || statusBorders.pendente
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">
              Entrevista - CPF: {entrevista.cpf}
            </CardTitle>
            <CardDescription className="text-xs">
              {format(new Date(entrevista.data_hora), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(entrevista.status)}
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
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Contrato</p>
            <p className="font-medium text-sm capitalize">{entrevista.tipo_contrato}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Modalidade</p>
            <p className="font-medium text-sm uppercase">{entrevista.modalidade_financiamento}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Comitê de Crédito</p>
            <p className="font-medium text-sm">{entrevista.comite_credito ? "Sim" : "Não"}</p>
          </div>
          {entrevista.dossie_cliente_url && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Dossiê</p>
              <a
                href={entrevista.dossie_cliente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline font-medium"
              >
                Ver Dossiê (PDF)
              </a>
            </div>
          )}
        </div>

        {isAgencia && entrevista.status === "Aguardando entrevista" && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="default"
              onClick={() => onAprovar(entrevista.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReprovar(entrevista.id)}
            >
              <X className="w-4 h-4 mr-2" />
              Reprovar
            </Button>
          </div>
        )}

        {isAgencia && entrevista.status === "Aprovado" && !hasConformidade && onCriarContrato && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="default"
              onClick={() => onCriarContrato(entrevista)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Criar Contrato Vinculado
            </Button>
          </div>
        )}

        {hasConformidade && (
          <div className="pt-3 border-t">
            <Badge variant="secondary" className="text-xs">
              ✓ Contrato já vinculado
            </Badge>
          </div>
        )}

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
              placeholder="Adicionar observações sobre a entrevista..."
              disabled={isSaving}
              autoSave={false}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
