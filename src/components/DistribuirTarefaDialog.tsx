import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AgenciaUser {
  user_id: string;
  full_name: string;
  email_preferencia: string | null;
  phone: string;
}

interface DistribuirTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoTarefa: "demanda" | "assinatura" | "comite";
  referenciaId: string;
  onSuccess?: () => void;
}

export function DistribuirTarefaDialog({
  open,
  onOpenChange,
  tipoTarefa,
  referenciaId,
  onSuccess,
}: DistribuirTarefaDialogProps) {
  const [empregados, setEmpregados] = useState<AgenciaUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadEmpregados();
    }
  }, [open]);

  const loadEmpregados = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner(full_name, email_preferencia, phone)
        `)
        .eq("role", "agencia");

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.profiles.full_name,
        email_preferencia: item.profiles.email_preferencia,
        phone: item.profiles.phone,
      })) || [];

      setEmpregados(formattedData);
    } catch (error: any) {
      console.error("Error loading empregados:", error);
      toast({
        title: "Erro ao carregar empregados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDistribuir = async () => {
    if (!selectedUserId) {
      toast({
        title: "Selecione um empregado",
        description: "Por favor, selecione um empregado antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const selectedUsers = selectedUserId === "todos" 
        ? empregados 
        : empregados.filter(e => e.user_id === selectedUserId);

      // Create distribution records
      for (const user of selectedUsers) {
        const { error: insertError } = await (supabase as any)
          .from("distribuicao_tarefas")
          .insert({
            tipo_tarefa: tipoTarefa,
            referencia_id: referenciaId,
            user_id: user.user_id,
            status: "pendente",
          });

        if (insertError) throw insertError;

        // Get email template
        const { data: template } = await supabase
          .from("email_templates")
          .select("subject, body")
          .eq("template_key", `task_${tipoTarefa}`)
          .single();

        const emailTo = user.email_preferencia || `${user.user_id}@example.com`;
        const subject = template?.subject || `Nova tarefa: ${tipoTarefa}`;
        const body = template?.body || `Você tem uma nova tarefa do tipo ${tipoTarefa}.`;

        // Send email
        await supabase.functions.invoke("send-task-email", {
          body: {
            to: emailTo,
            subject,
            body,
            tipo_tarefa: tipoTarefa,
          },
        });
      }

      toast({
        title: "Tarefa distribuída!",
        description: `Tarefa enviada para ${selectedUsers.length} empregado(s).`,
      });

      onSuccess?.();
      onOpenChange(false);
      setSelectedUserId("");
    } catch (error: any) {
      console.error("Error distributing task:", error);
      toast({
        title: "Erro ao distribuir tarefa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Distribuir Tarefa - {tipoTarefa}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecionar Empregado</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um empregado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Empregados</SelectItem>
                {empregados.map((emp) => (
                  <SelectItem key={emp.user_id} value={emp.user_id}>
                    {emp.full_name}
                    {emp.email_preferencia && ` (${emp.email_preferencia})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDistribuir} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Distribuir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
