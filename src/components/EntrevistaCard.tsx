import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";

interface EntrevistaCardProps {
  entrevista: {
    id: string;
    cliente_nome: string;
    telefone: string;
    data_opcao_1: string;
    data_opcao_2: string;
    data_confirmada?: string | null;
    opcao_escolhida?: number | null;
    horario_inicio: string;
    horario_fim: string;
    nome_empresa?: string | null;
    status: string;
    agencia?: string;
    endereco_agencia?: string;
    conformidade_id?: string | null;
  };
  onAprovar: (id: string) => void;
  onReprovar: (id: string) => void;
  onEditar: (id: string) => void;
  onCriarContrato?: (entrevista: any) => void;
}

export function EntrevistaCard({ entrevista, onAprovar, onReprovar, onEditar, onCriarContrato }: EntrevistaCardProps) {
  const { role } = useUserRole();
  const isAgencia = role === "agencia";
  const { toast } = useToast();
  const [hasConformidade, setHasConformidade] = useState(!!entrevista.conformidade_id);

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

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("entrevistas_agendamento")
        .delete()
        .eq("id", entrevista.id);

      if (error) throw error;

      toast({
        title: "Entrevista excluída",
        description: "A entrevista foi removida com sucesso.",
      });
      
      window.location.reload();
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
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "pendente": { label: "Pendente", variant: "outline" },
      "confirmado": { label: "Confirmado", variant: "secondary" },
      "Aprovado": { label: "Aprovado", variant: "default" },
      "Reprovado": { label: "Reprovado", variant: "destructive" },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: "outline" };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  const statusBorderMap: Record<string, string> = {
    "pendente": statusBorders.pendente,
    "confirmado": statusBorders.em_andamento,
    "Aprovado": statusBorders.concluida,
    "Reprovado": statusBorders.cancelada,
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
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
              {entrevista.cliente_nome}
            </CardTitle>
            <CardDescription className="text-xs space-y-1">
              <div className="flex items-center gap-1">
                <span>📞 {entrevista.telefone}</span>
              </div>
              {entrevista.nome_empresa && (
                <div className="flex items-center gap-1">
                  <span>🏢 {entrevista.nome_empresa}</span>
                </div>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(entrevista.status)}
            {isAgencia && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-3 space-y-3">
        <div className="space-y-2 text-sm bg-muted/30 p-3 rounded-md">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Opções de Data</p>
              <div className="space-y-1">
                <p className={cn(
                  "font-medium text-sm",
                  entrevista.opcao_escolhida === 1 && "text-primary font-bold"
                )}>
                  1️⃣ {formatDate(entrevista.data_opcao_1)}
                  {entrevista.opcao_escolhida === 1 && " ✓ Escolhida"}
                </p>
                <p className={cn(
                  "font-medium text-sm",
                  entrevista.opcao_escolhida === 2 && "text-primary font-bold"
                )}>
                  2️⃣ {formatDate(entrevista.data_opcao_2)}
                  {entrevista.opcao_escolhida === 2 && " ✓ Escolhida"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Horário</p>
              <p className="font-medium text-sm">{entrevista.horario_inicio} às {entrevista.horario_fim}</p>
            </div>
          </div>

          {entrevista.data_confirmada && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Data Confirmada</p>
              <p className="font-bold text-sm text-primary">
                {formatDate(entrevista.data_confirmada)}
              </p>
            </div>
          )}
        </div>

        {entrevista.agencia && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Local</p>
            <p className="font-medium text-sm">{entrevista.agencia}</p>
            {entrevista.endereco_agencia && (
              <p className="text-xs text-muted-foreground">{entrevista.endereco_agencia}</p>
            )}
          </div>
        )}

        {isAgencia && (
          <div className="flex flex-wrap gap-2 pt-2">
            {entrevista.status === "pendente" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditar(entrevista.id)}
                className="text-xs"
              >
                Editar
              </Button>
            )}
            
            {(entrevista.status === "confirmado" || entrevista.status === "pendente") && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onAprovar(entrevista.id)}
                  className="text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReprovar(entrevista.id)}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Reprovar
                </Button>
              </>
            )}

            {entrevista.status === "Aprovado" && !hasConformidade && onCriarContrato && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCriarContrato(entrevista)}
                className="text-xs"
              >
                Criar Contrato Vinculado
              </Button>
            )}

            {hasConformidade && (
              <Badge variant="secondary" className="text-xs">
                ✓ Contrato já vinculado
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
