import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AgendarAssinaturaContratoDialogProps {
  conformidade: any;
  entrevistaAprovada: boolean;
}

export const AgendarAssinaturaContratoDialog = ({ 
  conformidade,
  entrevistaAprovada 
}: AgendarAssinaturaContratoDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [dataHora, setDataHora] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!dataHora) {
        throw new Error("Preencha a data e hora do agendamento");
      }

      if (!entrevistaAprovada) {
        throw new Error("A entrevista precisa estar aprovada para agendar a assinatura");
      }

      // Criar agendamento de assinatura
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const { error } = await (supabase as any).from("agendamentos").insert({
        tipo: "assinatura",
        conformidade_id: conformidade.id,
        data_hora: dataHora,
        cca_user_id: session.user.id,
        cpf: conformidade.cpf,
        modalidade_financiamento: conformidade.modalidade,
        observacoes: observacoes || null,
        status: "Aguardando assinatura",
      });

      if (error) throw error;

      toast({
        title: "Assinatura agendada!",
        description: "Agendamento de assinatura criado com sucesso.",
      });

      setOpen(false);
      setDataHora("");
      setObservacoes("");

    } catch (error: any) {
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={!entrevistaAprovada}
          title={!entrevistaAprovada ? "Entrevista precisa estar aprovada" : "Agendar assinatura do contrato"}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Agendar Assinatura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Assinatura do Contrato</DialogTitle>
          <DialogDescription>
            Defina a data e hora para a assinatura do contrato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataHora">Data e Hora *</Label>
            <Input
              id="dataHora"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Input
              id="obs"
              placeholder="Observações adicionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
