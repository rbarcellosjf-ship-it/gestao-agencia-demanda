import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";
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
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold mb-0.5">
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

      <CardContent className="py-2 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-tighter">Opção 1</p>
            <p className="font-medium text-xs">
              {format(new Date(entrevista.data_opcao_1), "dd/MM/yyyy", { locale: ptBR })} - {entrevista.horario_inicio} às {entrevista.horario_fim}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-tighter">Opção 2</p>
            <p className="font-medium text-xs">
              {format(new Date(entrevista.data_opcao_2), "dd/MM/yyyy", { locale: ptBR })} - {entrevista.horario_inicio} às {entrevista.horario_fim}
            </p>
          </div>
          
          {entrevista.data_confirmada && (
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground uppercase tracking-tighter">Data Confirmada</p>
              <p className="font-semibold text-sm text-primary">
                {format(new Date(entrevista.data_confirmada), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}

          <div className={entrevista.data_confirmada ? "" : "md:col-span-2"}>
            <p className="text-xs text-muted-foreground uppercase tracking-tighter">Local</p>
            <p className="font-medium text-xs">
              {entrevista.agencia} - {entrevista.endereco_agencia}
            </p>
          </div>

          {entrevista.conformidades && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-tighter">CPF</p>
              <p className="font-medium text-xs">{entrevista.conformidades.cpf}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
