import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AgendarEntrevistaDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [dataOpcao1, setDataOpcao1] = useState("");
  const [dataOpcao2, setDataOpcao2] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFim, setHorarioFim] = useState("17:00");
  const [nomeEmpresa, setNomeEmpresa] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!nomeCliente || !telefoneCliente || !dataOpcao1 || !dataOpcao2) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      // Chamar edge function para agendar entrevista
      const { data, error } = await supabase.functions.invoke('agendar-entrevista', {
        body: {
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_opcao_1: dataOpcao1,
          data_opcao_2: dataOpcao2,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          nome_empresa: nomeEmpresa || "Manchester",
        }
      });

      if (error) throw error;

      toast({
        title: "Entrevista agendada!",
        description: "Mensagem de WhatsApp enviada ao cliente com as opções de data.",
      });

      setOpen(false);
      resetForm();

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

  const resetForm = () => {
    setNomeCliente("");
    setTelefoneCliente("");
    setDataOpcao1("");
    setDataOpcao2("");
    setHorarioInicio("09:00");
    setHorarioFim("17:00");
    setNomeEmpresa("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Agendar Entrevista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Entrevista via WhatsApp</DialogTitle>
          <DialogDescription>
            O cliente receberá uma mensagem no WhatsApp com as opções de data para entrevista.
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresa">Nome da Empresa</Label>
            <Input
              id="empresa"
              placeholder="Manchester"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data1">Data Opção 1 *</Label>
              <Input
                id="data1"
                type="date"
                value={dataOpcao1}
                onChange={(e) => setDataOpcao1(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data2">Data Opção 2 *</Label>
              <Input
                id="data2"
                type="date"
                value={dataOpcao2}
                onChange={(e) => setDataOpcao2(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inicio">Horário Início</Label>
              <Input
                id="inicio"
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fim">Horário Fim</Label>
              <Input
                id="fim"
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
              />
            </div>
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
              {loading ? "Agendando..." : "Enviar Agendamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
