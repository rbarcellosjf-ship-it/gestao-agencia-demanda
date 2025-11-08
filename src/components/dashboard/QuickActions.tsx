import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Demand {
  id: string;
  type: string;
  codigo_cca: string;
  created_at: string;
  cpf?: string;
  description?: string;
}

interface QuickActionsProps {
  demands: Demand[];
  onDemandUpdate: () => void;
  userRole: string;
}

export const QuickActions = ({ demands, onDemandUpdate, userRole }: QuickActionsProps) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      autoriza_reavaliacao: "Autoriza Reavaliação",
      desconsidera_avaliacoes: "Desconsidera Avaliações",
      vincula_imovel: "Vincula Imóvel",
      cancela_avaliacao_sicaq: "Cancela Avaliação SICAQ",
      cancela_proposta_siopi: "Cancela Proposta SIOPI",
      solicitar_avaliacao_sigdu: "Solicitar Avaliação SIGDU",
      outras: "Outras",
    };
    return labels[type] || type;
  };

  const getDaysOld = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleQuickComplete = async (demandId: string, demandData: Demand) => {
    if (processing.has(demandId)) return;

    setProcessing(prev => new Set(prev).add(demandId));

    try {
      const { error } = await supabase
        .from("demands")
        .update({
          status: "concluida",
          concluded_at: new Date().toISOString(),
          response_text: "Concluída via ação rápida",
        })
        .eq("id", demandId);

      if (error) throw error;

      // Send WhatsApp notification to CCA
      try {
        const { data: ccaData } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("codigo_cca", demandData.codigo_cca)
          .limit(1)
          .maybeSingle();

        if (ccaData?.phone) {
          const message = `🔔 *Demanda Concluída*\n\n` +
            `*Status:* ✅ Concluída\n` +
            `*Tipo:* ${getTypeLabel(demandData.type)}\n` +
            `*Observação:* Concluída via ação rápida\n\n` +
            `A gerência analisou sua demanda.`;

          await supabase.functions.invoke("send-whatsapp", {
            body: { phone: ccaData.phone, message },
          });
        }
      } catch (whatsappError) {
        console.error("Failed to send WhatsApp notification:", whatsappError);
      }

      toast({
        title: "✓ Demanda concluída",
        description: "Status atualizado com sucesso",
      });

      onDemandUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(demandId);
        return newSet;
      });
    }
  };

  // Sort demands by oldest first
  const sortedDemands = [...demands].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Show only for agencia role
  if (userRole !== "agencia" || demands.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-warning" />
          Ações Rápidas
        </CardTitle>
        <CardDescription>
          Marque demandas como concluídas com um clique
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {sortedDemands.map((demand) => {
            const daysOld = getDaysOld(demand.created_at);
            const isOld = daysOld >= 3;

            return (
              <div
                key={demand.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isOld ? "bg-warning/5 border-warning/30" : "bg-muted/30 border-border"
                }`}
              >
                <Checkbox
                  id={`quick-${demand.id}`}
                  disabled={processing.has(demand.id)}
                  onCheckedChange={() => handleQuickComplete(demand.id, demand)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`quick-${demand.id}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="font-medium text-sm truncate">
                      {getTypeLabel(demand.type)}
                    </span>
                    {isOld && (
                      <Badge variant="outline" className="border-warning text-warning">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {daysOld}d
                      </Badge>
                    )}
                  </label>
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <p>CCA: {demand.codigo_cca}</p>
                    {demand.cpf && <p>CPF: {demand.cpf}</p>}
                    <p className="text-xs">
                      Criado{" "}
                      {formatDistanceToNow(new Date(demand.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {demand.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {demand.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
