import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StatusSelectProps {
  conformidadeId: string;
  currentStatus: string;
  dataAgendamento?: string | null;
}

const STATUS_OPTIONS = [
  "Conforme",
  "Em conformidade",
  "Inconforme",
  "Agendado",
  "Assinatura Confirmada",
];

export const StatusSelect = ({ conformidadeId, currentStatus, dataAgendamento }: StatusSelectProps) => {
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("conformidades")
        .update({ status: newStatus })
        .eq("id", conformidadeId);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: `Status alterado para: ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDisplayValue = () => {
    if (currentStatus === "Agendado" && dataAgendamento) {
      const date = new Date(dataAgendamento);
      return `Agendado - ${date.toLocaleDateString("pt-BR")}`;
    }
    return currentStatus;
  };

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-full md:w-[200px]">
        <SelectValue>{getDisplayValue()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
