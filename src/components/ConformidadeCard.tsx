import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, Mail, Trash2, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { StatusSelect } from "@/components/StatusSelect";
import { ObservacoesField } from "@/components/ObservacoesField";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AgendarAssinaturaWhatsAppDialog } from "@/components/AgendarAssinaturaWhatsAppDialog";

interface ConformidadeCardProps {
  conformidade: any;
  agendamento: any | null;
  role: string;
  onDelete: (id: string) => void;
  onPedirPrioridade: (conformidade: any) => void;
  onDistribute: (id: string) => void;
  onUpdateObservacoes: (id: string, value: string) => Promise<void>;
  onAgendarEntrevista: (conformidade: any) => void;
  onUpdateEntrevistaAprovada: (id: string, aprovada: boolean) => void;
  onEdit?: (conformidade: any) => void;
  onRefresh?: () => void;
  formatCurrency: (value: number) => string;
}

const statusBorderColors: Record<string, string> = {
  pendente: "border-l-yellow-500",
  em_andamento: "border-l-blue-500",
  aguardando_assinatura: "border-l-orange-500",
  assinado: "border-l-purple-500",
  concluida: "border-l-green-500",
  cancelada: "border-l-red-500",
};

export const ConformidadeCard = ({
  conformidade,
  agendamento,
  role,
  onDelete,
  onPedirPrioridade,
  onDistribute,
  onUpdateObservacoes,
  onAgendarEntrevista,
  onUpdateEntrevistaAprovada,
  onEdit,
  onRefresh,
  formatCurrency,
}: ConformidadeCardProps) => {
  const [isObservacoesOpen, setIsObservacoesOpen] = useState(false);

  return (
    <Card 
      className={cn(
        "border-l-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        statusBorderColors[conformidade.status || "pendente"] || "border-l-gray-300"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">
              CPF: {conformidade.cpf}
              {conformidade.nome_cliente && (
                <span className="font-normal text-muted-foreground"> • {conformidade.nome_cliente}</span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              CCA: {conformidade.codigo_cca} • {format(new Date(conformidade.created_at), "dd/MM/yyyy")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(conformidade.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3 space-y-3">
        {/* Grid 2 colunas para dados principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor do Financiamento</p>
            <p className="font-semibold text-base">
              {formatCurrency(parseFloat(conformidade.valor_financiamento))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Modalidade</p>
            <p className="font-medium">
              {conformidade.modalidade === "OUTRO"
                ? conformidade.modalidade_outro
                : conformidade.modalidade}
            </p>
          </div>
        </div>

        {/* Badges e informações adicionais */}
        {conformidade.comite_credito && (
          <div>
            <Badge variant="secondary" className="text-xs">
              Requer Comitê de Crédito
            </Badge>
          </div>
        )}

        {/* Status da Entrevista */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status da Entrevista</Label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`entrevista-${conformidade.id}`}
                checked={conformidade.entrevista_aprovada || false}
                onChange={(e) => {
                  if (role === 'agencia' || role === 'admin') {
                    onUpdateEntrevistaAprovada(conformidade.id, e.target.checked);
                  }
                }}
                disabled={role !== 'agencia' && role !== 'admin'}
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor={`entrevista-${conformidade.id}`} className="text-sm font-medium cursor-pointer">
                Entrevista Aprovada
              </Label>
            </div>
            {conformidade.entrevista_aprovada ? (
              <Badge variant="default" className="bg-green-500">✓ Aprovada</Badge>
            ) : agendamento ? (
              <Badge variant="default" className="bg-yellow-500">📅 Agendada</Badge>
            ) : conformidade.entrevista_id ? (
              <Badge variant="secondary">Pendente</Badge>
            ) : (
              <Badge variant="outline">Não Agendada</Badge>
            )}
          </div>
        </div>

        {/* Observações - Colapsável */}
        <Collapsible 
          open={isObservacoesOpen} 
          onOpenChange={setIsObservacoesOpen}
          className="pt-2 border-t"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
            <Label className="text-xs text-muted-foreground uppercase tracking-tighter font-medium cursor-pointer">
              Observações
            </Label>
            {isObservacoesOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-2 animate-accordion-down">
            <ObservacoesField
              value={conformidade.observacoes || ""}
              onChange={() => {}}
              onSave={(newValue) => onUpdateObservacoes(conformidade.id, newValue)}
              autoSave={false}
              placeholder="Adicione observações sobre o contrato..."
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Status do Contrato */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status do Contrato</Label>
          <StatusSelect
            conformidadeId={conformidade.id}
            currentStatus={conformidade.status || "Conforme"}
            dataAgendamento={conformidade.data_agendamento}
          />
        </div>

        {/* Informações de agendamento se existir */}
        {agendamento && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Entrevista Agendada
            </Label>
            <div className="bg-muted/50 p-2 rounded-md text-sm space-y-1">
              <p><span className="font-medium">Data/Hora:</span> {format(new Date(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm")}</p>
              <p><span className="font-medium">Tipo:</span> {agendamento.tipo}</p>
              {agendamento.observacoes && (
                <p><span className="font-medium">Observações:</span> {agendamento.observacoes}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex-wrap gap-2">
        {/* Botões de ação - visíveis para todos os roles */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onAgendarEntrevista(conformidade)}
            disabled={!!conformidade.entrevista_id}
            className={cn(!!conformidade.entrevista_id && "opacity-50 cursor-not-allowed")}
            title={conformidade.entrevista_id ? "Entrevista já agendada" : "Agendar entrevista"}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Agendar Entrevista
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onPedirPrioridade(conformidade)}
          >
            <Mail className="w-4 h-4 mr-2" />
            Pedir Prioridade
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!conformidade.comite_credito}
            className={cn(
              !conformidade.comite_credito && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => onDistribute(conformidade.id)}
            title={
              !conformidade.comite_credito 
                ? "Este contrato não requer Comitê de Crédito" 
                : "Distribuir tarefa de Comitê de Crédito"
            }
          >
            <Mail className="w-4 h-4 mr-2" />
            Solicitar Comitê de Crédito
          </Button>

          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(conformidade)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}

          <AgendarAssinaturaWhatsAppDialog
            conformidadeId={conformidade.id}
            cpfCliente={conformidade.cpf}
            modalidade={conformidade.modalidade === "OUTRO" ? conformidade.modalidade_outro : conformidade.modalidade}
            tipoContrato={conformidade.tipo_contrato}
            valorFinanciamento={parseFloat(conformidade.valor_financiamento)}
            codigoCca={conformidade.codigo_cca}
            onSuccess={onRefresh}
            trigger={
              <Button
                size="sm"
                variant="outline"
                disabled={!conformidade.entrevista_aprovada}
                className={cn(!conformidade.entrevista_aprovada && "opacity-50 cursor-not-allowed")}
                title={
                  conformidade.entrevista_aprovada
                    ? "Agendar assinatura de contrato"
                    : "Aprovação da entrevista necessária"
                }
              >
                <Calendar className="w-4 h-4 mr-1" />
                Agendar Assinatura
              </Button>
            }
          />
        </div>
      </CardFooter>
    </Card>
  );
};
