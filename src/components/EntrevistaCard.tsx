import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
      "Aguardando entrevista": { variant: "outline", color: "text-yellow-600" },
      "Aprovado": { variant: "default", color: "text-green-600" },
      "Reprovado": { variant: "destructive", color: "text-red-600" },
    };
    const config = variants[status] || { variant: "outline", color: "" };
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              Entrevista - CPF: {entrevista.cpf}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(entrevista.data_hora), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
          {getStatusBadge(entrevista.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna da esquerda - Informações */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Tipo de Contrato</p>
                <p className="font-medium capitalize">{entrevista.tipo_contrato}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Modalidade</p>
                <p className="font-medium uppercase">{entrevista.modalidade_financiamento}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Comitê de Crédito</p>
                <p className="font-medium">{entrevista.comite_credito ? "Sim" : "Não"}</p>
              </div>
              {entrevista.dossie_cliente_url && (
                <div>
                  <p className="text-muted-foreground">Dossiê</p>
                  <a
                    href={entrevista.dossie_cliente_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Ver Dossiê (PDF)
                  </a>
                </div>
              )}
            </div>

            {isAgencia && entrevista.status === "Aguardando entrevista" && (
              <div className="flex flex-wrap gap-2 pt-2">
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
            <p className="text-sm font-medium text-muted-foreground">Observações</p>
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
