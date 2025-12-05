import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";
import { ObservacoesField } from "@/components/ObservacoesField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCPF } from "@/lib/cpfValidator";

interface AssinaturaConfirmadaCardProps {
  assinatura: any;
  onStatusChange: (id: string, novoStatus: string) => void;
}

export const AssinaturaConfirmadaCard = ({ 
  assinatura, 
  onStatusChange 
}: AssinaturaConfirmadaCardProps) => {
  const { toast } = useToast();
  const [observacoes, setObservacoes] = useState(assinatura.observacoes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isObservacoesOpen, setIsObservacoesOpen] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

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

  const handleStatusChange = async (novoStatus: string) => {
    setIsChangingStatus(true);
    try {
      await onStatusChange(assinatura.id, novoStatus);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      "Aguardando assinatura": { variant: "outline", className: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950" },
      "Assinado": { variant: "default", className: "bg-blue-500 hover:bg-blue-600" },
      "Assinatura confirmada": { variant: "default", className: "bg-green-600 hover:bg-green-700" },
    };

    const { variant, className } = config[status] || config["Aguardando assinatura"];

    return (
      <Badge variant={variant} className={className}>
        {status}
      </Badge>
    );
  };

  const statusBorderMap: Record<string, string> = {
    "Aguardando assinatura": statusBorders.aguardando_assinatura,
    "Assinado": statusBorders.assinado,
    "Assinatura confirmada": statusBorders.assinatura_confirmada,
  };

  const currentStatus = assinatura.status || "Aguardando assinatura";
  const canMarkAsAssinado = currentStatus === "Aguardando assinatura";
  const canConfirmAssinatura = currentStatus === "Assinado";

  return (
    <Card
      className={cn(
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        statusBorderMap[currentStatus] || statusBorders.aguardando_assinatura
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">
              {format(new Date(assinatura.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Assinatura de Contrato
            </p>
          </div>
          <div className="flex-shrink-0">
            {getStatusBadge(currentStatus)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3 space-y-4">
        {/* Informações do contrato */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
            <p className="font-medium text-sm">{formatCPF(assinatura.cpf) || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
            <p className="font-medium text-sm capitalize">{assinatura.tipo_contrato || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Modalidade</p>
            <p className="font-medium text-sm uppercase">{assinatura.modalidade_financiamento || "N/A"}</p>
          </div>
          {assinatura.telefone_cliente && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
              <p className="font-medium text-sm">{assinatura.telefone_cliente}</p>
            </div>
          )}
        </div>

        {/* Botões de ação de status */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {canMarkAsAssinado && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("Assinado")}
              disabled={isChangingStatus}
              className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Marcar como Assinado
            </Button>
          )}
          {canConfirmAssinatura && (
            <Button
              size="sm"
              onClick={() => handleStatusChange("Assinatura confirmada")}
              disabled={isChangingStatus}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Confirmar Assinatura
            </Button>
          )}
          {currentStatus === "Assinatura confirmada" && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CheckCheck className="h-4 w-4" />
              Processo concluído
            </span>
          )}
        </div>

        {/* Observações collapsible */}
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
