import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReagendarAssinaturaDialogProps {
  assinaturaId: string;
  dataAtual: string;
  cpfCliente?: string;
  telefoneCliente?: string;
  nomeCliente?: string;
  enderecoAgencia?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReagendarAssinaturaDialog({
  assinaturaId,
  dataAtual,
  cpfCliente,
  telefoneCliente,
  nomeCliente,
  enderecoAgencia,
  open,
  onOpenChange,
  onSuccess,
}: ReagendarAssinaturaDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [notificarCliente, setNotificarCliente] = useState(true);
  const [telefoneEditavel, setTelefoneEditavel] = useState("");

  useEffect(() => {
    if (open) {
      setTelefoneEditavel(telefoneCliente || "");
      setNovaData("");
      setNovoHorario("");
      setNotificarCliente(true);
    }
  }, [open, telefoneCliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!novaData || !novoHorario) {
        throw new Error("Preencha a nova data e horário");
      }

      // Buscar observações atuais
      const { data: assinaturaAtual } = await supabase
        .from("agendamentos")
        .select("observacoes")
        .eq("id", assinaturaId)
        .maybeSingle();

      // Atualizar agendamento com nova data/hora
      const novaDataHora = `${novaData}T${novoHorario}:00-03:00`;
      const novaObservacao = `Reagendado de ${format(new Date(dataAtual), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} para ${format(new Date(novaDataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
      
      // Combinar com observações existentes
      const observacoesAtualizadas = assinaturaAtual?.observacoes 
        ? `${assinaturaAtual.observacoes}\n${novaObservacao}` 
        : novaObservacao;

      const updateData: any = {
        data_hora: novaDataHora,
        observacoes: observacoesAtualizadas
      };

      // Sempre salvar o telefone editável
      if (telefoneEditavel) {
        updateData.telefone_cliente = telefoneEditavel;
      }

      const { error: updateError } = await supabase
        .from("agendamentos")
        .update(updateData)
        .eq("id", assinaturaId);

      if (updateError) throw updateError;

      // Enviar notificação WhatsApp se solicitado e houver telefone
      const telefoneParaNotificar = telefoneEditavel || telefoneCliente;
      if (notificarCliente && telefoneParaNotificar) {
        try {
          // Buscar template de reagendamento de assinatura
          const { data: template } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('template_key', 'reagendamento_assinatura')
            .maybeSingle();

          if (template) {
            const dataFormatada = format(new Date(novaDataHora), "dd/MM/yyyy", { locale: ptBR });
            const horarioFormatado = format(new Date(novaDataHora), "HH:mm", { locale: ptBR });
            
            const message = template.message
              .replace('{{nome_cliente}}', nomeCliente || 'Cliente')
              .replace('{{nova_data}}', dataFormatada)
              .replace('{{novo_horario}}', horarioFormatado)
              .replace('{{endereco_agencia}}', enderecoAgencia || 'Avenida Barão do Rio Branco, 2340')
              .replace('{{cpf}}', cpfCliente || '');

            await supabase.functions.invoke('send-whatsapp', {
              body: {
                phone: telefoneParaNotificar,
                message: message
              }
            });
          } else {
            // Mensagem padrão se não houver template
            const dataFormatada = format(new Date(novaDataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            const message = `Olá ${nomeCliente || 'Cliente'}! Sua assinatura de contrato foi reagendada para ${dataFormatada}. Por favor, confirme sua presença.`;
            
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                phone: telefoneParaNotificar,
                message: message
              }
            });
          }
        } catch (whatsappError) {
          console.error('Erro ao enviar WhatsApp:', whatsappError);
          // Não bloqueia se WhatsApp falhar
        }
      }

      toast({
        title: "Assinatura reagendada",
        description: notificarCliente && telefoneParaNotificar
          ? "A assinatura foi reagendada e o cliente foi notificado."
          : "A assinatura foi reagendada com sucesso.",
      });

      onOpenChange(false);
      resetForm();
      onSuccess?.();

    } catch (error: any) {
      toast({
        title: "Erro ao reagendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNovaData("");
    setNovoHorario("");
    setNotificarCliente(true);
    setTelefoneEditavel("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar Assinatura</DialogTitle>
          <DialogDescription>
            Escolha a nova data e horário para a assinatura do contrato
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 border rounded-md p-3 space-y-1 text-sm">
          <p className="font-medium">📅 Data Atual:</p>
          <p className="text-muted-foreground">
            {format(new Date(dataAtual), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          {cpfCliente && (
            <p className="text-xs text-muted-foreground mt-2">CPF: {cpfCliente}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova_data">
              <Calendar className="w-4 h-4 inline mr-2" />
              Nova Data *
            </Label>
            <Input
              id="nova_data"
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="novo_horario">
              <Clock className="w-4 h-4 inline mr-2" />
              Novo Horário *
            </Label>
            <Input
              id="novo_horario"
              type="time"
              value={novoHorario}
              onChange={(e) => setNovoHorario(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">📱 Notificação ao Cliente</Label>
            
            <div className="space-y-2 mb-3">
              <Label htmlFor="telefone-editavel">Telefone do Cliente (WhatsApp)</Label>
              <Input
                id="telefone-editavel"
                placeholder="(11) 99999-9999"
                value={telefoneEditavel}
                onChange={(e) => setTelefoneEditavel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {telefoneCliente 
                  ? "Edite o telefone se necessário" 
                  : "Digite o telefone para habilitar notificação via WhatsApp"
                }
              </p>
            </div>
            
            <div className="flex items-start space-x-3 p-4 border-2 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border-green-200 dark:border-green-800">
              <Checkbox
                id="notificar"
                checked={notificarCliente}
                onCheckedChange={(checked) => setNotificarCliente(checked as boolean)}
                disabled={!telefoneEditavel}
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="notificar"
                  className="text-sm font-semibold leading-none cursor-pointer block mb-1"
                >
                  Enviar notificação via WhatsApp
                </label>
                <p className="text-xs text-muted-foreground">
                  {telefoneEditavel
                    ? `O cliente será notificado no número ${telefoneEditavel} sobre o novo horário`
                    : "Digite o telefone do cliente acima para habilitar notificação"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Reagendando..." : "Confirmar Reagendamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
