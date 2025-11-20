import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { ObservacoesField } from "@/components/ObservacoesField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";

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
}

export function EntrevistaCard({ entrevista, onAprovar, onReprovar, onEditar }: EntrevistaCardProps) {
  const { role } = useUserRole();
  const isAgencia = role === "agencia";
  const { toast } = useToast();
  const [observacoes, setObservacoes] = useState(entrevista.observacoes || "");
  const [isSaving, setIsSaving] = useState(false);

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
        <div className="flex justify-between items-start">
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
          {getStatusBadge(entrevista.status)}
        </div>
      </CardHeader>
      <CardContent className="py-3 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Coluna da esquerda - Informações */}
          <div className="lg:col-span-2 space-y-3">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditar(entrevista.id)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            )}
          </div>

          {/* Coluna da direita - Observações editáveis */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
            <ObservacoesField
              value={observacoes}
              onChange={setObservacoes}
              onSave={handleSaveObservacoes}
              placeholder="Adicionar observações sobre a entrevista..."
              disabled={isSaving}
              autoSave={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
