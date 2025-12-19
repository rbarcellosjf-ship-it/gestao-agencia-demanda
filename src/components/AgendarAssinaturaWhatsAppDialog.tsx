import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, FileSignature, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF } from "@/lib/cpfValidator";
import { useClienteCache } from "@/hooks/useClienteCache";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
interface AgendarAssinaturaWhatsAppDialogProps {
  conformidadeId: string;
  cpfCliente?: string;
  modalidade?: string;
  tipoContrato?: string;
  valorFinanciamento?: number;
  codigoCca?: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const AgendarAssinaturaWhatsAppDialog = ({ 
  conformidadeId, 
  cpfCliente,
  modalidade,
  tipoContrato,
  valorFinanciamento,
  codigoCca,
  onSuccess,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger
}: AgendarAssinaturaWhatsAppDialogProps) => {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [dataOpcao1, setDataOpcao1] = useState("");
  const [dataOpcao2, setDataOpcao2] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFim, setHorarioFim] = useState("17:00");
  const [clientePreenchido, setClientePreenchido] = useState(false);
  
  // Integrar cache de clientes
  const { clienteData, salvarCliente, buscarCliente, limparCache } = useClienteCache();

  useEffect(() => {
    if (open) {
      loadUserProfile();
      // Buscar cliente no cache quando o diálogo abrir e tiver CPF
      if (cpfCliente) {
        buscarCliente(cpfCliente);
      }
    }
  }, [open, cpfCliente, buscarCliente]);

  // Preencher automaticamente quando encontrar dados no cache
  useEffect(() => {
    if (clienteData && open) {
      if (clienteData.nome && !nomeCliente) {
        setNomeCliente(clienteData.nome);
        setClientePreenchido(true);
      }
      if (clienteData.telefone && !telefoneCliente) {
        setTelefoneCliente(clienteData.telefone);
        setClientePreenchido(true);
      }
    }
  }, [clienteData, open]);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('codigo_cca, full_name')
        .eq('user_id', user.id)
        .single();
      setUserProfile(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!nomeCliente || !telefoneCliente || !dataOpcao1 || !dataOpcao2) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Inserir assinatura pendente em assinaturas_agendamento
      const { data: novaAssinatura, error: insertError } = await supabase
        .from('assinaturas_agendamento')
        .insert({
          cliente_nome: nomeCliente,
          telefone: telefoneCliente,
          data_opcao_1: dataOpcao1,
          data_opcao_2: dataOpcao2,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          conformidade_id: conformidadeId,
          status: 'pendente',
          agencia: 'Manchester',
          endereco_agencia: 'Avenida Barao Do Rio Branco, 2340',
          codigo_cca: userProfile?.codigo_cca || codigoCca || '0126',
          cca_user_id: user.id,
          tipo_contrato: tipoContrato || 'individual',
          modalidade_financiamento: modalidade || null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Buscar template WhatsApp
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_key', 'agendamento_assinatura')
        .maybeSingle();

      // 3. Enviar WhatsApp ao cliente
      if (template) {
        const formatDate = (dateStr: string) => {
          try {
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          } catch {
            return dateStr;
          }
        };

        const message = template.message
          .replace(/\{\{nome_cliente\}\}/g, nomeCliente)
          .replace(/\{\{agencia\}\}/g, 'Manchester')
          .replace(/\{\{data_opcao_1\}\}/g, formatDate(dataOpcao1))
          .replace(/\{\{data_opcao_2\}\}/g, formatDate(dataOpcao2))
          .replace(/\{\{horario_inicio\}\}/g, horarioInicio)
          .replace(/\{\{horario_fim\}\}/g, horarioFim)
          .replace(/\{\{endereco_agencia\}\}/g, 'Avenida Barao Do Rio Branco, 2340');

        try {
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              phone: telefoneCliente,
              message: message
            }
          });
        } catch (whatsappError) {
          console.error('Erro ao enviar WhatsApp:', whatsappError);
        }
      }

      // Salvar cliente no cache
      if (cpfCliente) {
        await salvarCliente(cpfCliente, nomeCliente, telefoneCliente);
      }

      toast({
        title: "Assinatura agendada!",
        description: "WhatsApp enviado ao cliente com as opções de data.",
      });

      setOpen(false);
      resetForm();
      onSuccess?.();

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
    setClientePreenchido(false);
    limparCache();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <FileSignature className="w-4 h-4 mr-2" />
            Agendar Assinatura
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Assinatura via WhatsApp</DialogTitle>
          <DialogDescription>
            O cliente receberá uma mensagem no WhatsApp com as opções de data para assinatura do contrato.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-1">
          <p className="text-xs font-semibold text-green-900">📋 Dados do Contrato:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
            <div>
              <span className="font-medium">CPF:</span> {formatCPF(cpfCliente || "")}
            </div>
            <div>
              <span className="font-medium">Tipo:</span> {tipoContrato === 'individual' ? 'Individual' : 'Empreendimento'}
            </div>
            <div>
              <span className="font-medium">Modalidade:</span> {modalidade}
            </div>
            <div>
              <span className="font-medium">Valor:</span> {valorFinanciamento ? formatCurrency(valorFinanciamento) : "-"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo_cca">CCA Responsável</Label>
            <Input
              id="codigo_cca"
              value={codigoCca || userProfile?.codigo_cca || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Este campo é preenchido automaticamente
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="nome">Nome do Cliente *</Label>
              {clientePreenchido && nomeCliente && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Preenchido automaticamente do cache</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Input
              id="nome"
              placeholder="Nome completo"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="telefone">Telefone do Cliente (WhatsApp) *</Label>
              {clientePreenchido && telefoneCliente && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Preenchido automaticamente do cache</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Input
              id="telefone"
              placeholder="(11) 99999-9999"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.target.value)}
              required
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