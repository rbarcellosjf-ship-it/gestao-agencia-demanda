import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";
import { ObservacoesCollapsible } from "@/components/ObservacoesCollapsible";

interface AgendamentoAssinaturaCardProps {
  assinatura: any;
}

export const AgendamentoAssinaturaCard = ({ assinatura }: AgendamentoAssinaturaCardProps) => {
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
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold mb-0.5">
              {format(new Date(assinatura.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </CardTitle>
            <CardDescription className="text-xs">
              {assinatura.tipo === "assinatura" ? "Assinatura de Documento" : assinatura.tipo}
            </CardDescription>
          </div>
          <div className="flex-shrink-0">
            {getStatusBadge(assinatura.status || "Aguardando entrevista")}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-2 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {assinatura.conformidades && (
            <>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tighter">CPF</p>
                <p className="font-medium text-xs">{assinatura.conformidades.cpf}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tighter">Modalidade</p>
                <p className="font-medium text-xs">{assinatura.conformidades.modalidade}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tighter">Valor do Financiamento</p>
                <p className="font-semibold text-sm">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(parseFloat(assinatura.conformidades.valor_financiamento))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tighter">Código CCA</p>
                <p className="font-medium text-xs">{assinatura.conformidades.codigo_cca}</p>
              </div>
            </>
          )}
          
          <ObservacoesCollapsible observacoes={assinatura.observacoes} />
        </div>
      </CardContent>
    </Card>
  );
};
