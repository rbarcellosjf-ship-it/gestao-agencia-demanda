import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AgendarAssinaturaDialogProps {
  conformidade: any;
  profile: any;
}

export const AgendarAssinaturaDialog = ({ conformidade, profile }: AgendarAssinaturaDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [dataOpcao1, setDataOpcao1] = useState("");
  const [dataOpcao2, setDataOpcao2] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFim, setHorarioFim] = useState("17:00");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações básicas
      if (!nomeCliente || !telefoneCliente || !dataOpcao1 || !dataOpcao2) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      // Chamar edge function para agendar entrevista
      const { data, error } = await supabase.functions.invoke('agendar-entrevista', {
        body: {
          conformidade_id: conformidade.id,
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_opcao_1: dataOpcao1,
          data_opcao_2: dataOpcao2,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          contrato_id: conformidade.cpf,
        }
      });

      if (error) throw error;

      toast({
        title: "Agendamento enviado!",
        description: "Mensagem de WhatsApp enviada ao cliente com as opções de data.",
      });

      setOpen(false);
      // Resetar form
      setNomeCliente("");
      setTelefoneCliente("");
      setDataOpcao1("");
      setDataOpcao2("");
      setHorarioInicio("09:00");
      setHorarioFim("17:00");

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
        <Button variant="outline" size="sm">
          <CalendarIcon className="w-4 h-4 mr-2" />
          Agendar Assinatura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Assinatura via WhatsApp</DialogTitle>
          <DialogDescription>
            O cliente receberá uma mensagem no WhatsApp com as opções de data para agendamento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Cliente *</Label>
            <Input
              id="nome"
              placeholder="Nome completo"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone do Cliente (WhatsApp) *</Label>
            <Input
              id="telefone"
              placeholder="(11) 99999-9999"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Informe o número com DDD
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data1">Opção de Data 1 *</Label>
            <Input
              id="data1"
              type="date"
              value={dataOpcao1}
              onChange={(e) => setDataOpcao1(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data2">Opção de Data 2 *</Label>
            <Input
              id="data2"
              type="date"
              value={dataOpcao2}
              onChange={(e) => setDataOpcao2(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horario-inicio">Horário Início</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="horario-inicio"
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario-fim">Horário Fim</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="horario-fim"
                  type="time"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-1">📍 Local do atendimento:</p>
            <p className="text-muted-foreground">
              Agência Manchester<br/>
              Avenida Barao Do Rio Branco, 2340
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Agendamento via WhatsApp"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
