import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";
import { ObservacoesCollapsible } from "@/components/ObservacoesCollapsible";
import { Trash2 } from "lucide-react";

interface AgendamentoEntrevistaCardProps {
  entrevista: any;
  onDelete: (id: string) => void;
}

export const AgendamentoEntrevistaCard = ({ entrevista, onDelete }: AgendamentoEntrevistaCardProps) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendente: "outline",
      confirmado: "default",
      cancelado: "destructive",
      concluido: "secondary",
    };

    const labels: Record<string, string> = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      cancelado: "Cancelado",
      concluido: "Concluído",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const statusBorderMap: Record<string, string> = {
    pendente: statusBorders.pendente,
    confirmado: statusBorders.concluida,
    cancelado: statusBorders.cancelada,
    concluido: statusBorders.concluida,
  };

  return (
    <Card
      className={cn(
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        statusBorderMap[entrevista.status || "pendente"] || statusBorders.pendente
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">
              {entrevista.cliente_nome}
            </CardTitle>
            <CardDescription className="text-xs">
              Tel: {entrevista.telefone}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(entrevista.status || "pendente")}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(entrevista.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Opção 1</p>
            <p className="font-medium text-sm">
              {format(new Date(entrevista.data_opcao_1), "dd/MM/yyyy", { locale: ptBR })} - {entrevista.horario_inicio} às {entrevista.horario_fim}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Opção 2</p>
            <p className="font-medium text-sm">
              {format(new Date(entrevista.data_opcao_2), "dd/MM/yyyy", { locale: ptBR })} - {entrevista.horario_inicio} às {entrevista.horario_fim}
            </p>
          </div>
          
          {entrevista.data_confirmada && (
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Data Confirmada</p>
              <p className="font-semibold text-sm text-primary">
                {format(new Date(entrevista.data_confirmada), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}

          <div className={entrevista.data_confirmada ? "" : "md:col-span-2"}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Local</p>
            <p className="font-medium text-sm">
              {entrevista.agencia} - {entrevista.endereco_agencia}
            </p>
          </div>

          {entrevista.conformidades && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
              <p className="font-medium text-sm">{entrevista.conformidades.cpf}</p>
            </div>
          )}
        </div>

        {entrevista.observacoes && (
          <div className="pt-2 border-t">
            <ObservacoesCollapsible observacoes={entrevista.observacoes} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
