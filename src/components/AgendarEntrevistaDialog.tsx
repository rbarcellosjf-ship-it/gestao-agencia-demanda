import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF } from "@/lib/cpfValidator";
import { useClienteCache } from "@/hooks/useClienteCache";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgendarEntrevistaDialogProps {
  conformidadeId?: string;
  cpfCliente?: string;
  modalidade?: string;
  tipoContrato?: string;
  valorFinanciamento?: number;
  codigoCca?: string;
  nomeClienteProp?: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const AgendarEntrevistaDialog = ({ 
  conformidadeId, 
  cpfCliente,
  modalidade,
  tipoContrato,
  valorFinanciamento,
  codigoCca,
  nomeClienteProp,
  onSuccess,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger
}: AgendarEntrevistaDialogProps) => {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [clientePreenchido, setClientePreenchido] = useState(false);
  const [nomeEscritorio, setNomeEscritorio] = useState("");
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("09:00");

  // Cache de clientes
  const { clienteData, loading: cacheLoading, salvarCliente, buscarCliente, limparCache } = useClienteCache(cpfCliente);

  useEffect(() => {
    if (open) {
      loadUserProfile();
      // Pre-fill from props or cache
      if (nomeClienteProp) {
        setNomeCliente(nomeClienteProp);
      }
    }
  }, [open, nomeClienteProp]);

  // Auto-fill from cache
  useEffect(() => {
    if (clienteData && open) {
      if (clienteData.nome && !nomeCliente && !nomeClienteProp) {
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

      // Buscar nome do escritório pelo código CCA
      const codigoParaBuscar = codigoCca || data?.codigo_cca;
      if (codigoParaBuscar) {
        const { data: escritorio } = await supabase
          .from('escritorios_cca')
          .select('nome')
          .eq('codigo', codigoParaBuscar)
          .maybeSingle();
        
        setNomeEscritorio(escritorio?.nome || "Manchester");
      } else {
        setNomeEscritorio("Manchester");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!nomeCliente || !telefoneCliente || !data || !horario) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Inserir entrevista JÁ CONFIRMADA em entrevistas_agendamento
      const { data: novaEntrevista, error: insertError } = await supabase
        .from('entrevistas_agendamento')
        .insert({
          cliente_nome: nomeCliente,
          telefone: telefoneCliente,
          data_opcao_1: data,
          data_opcao_2: data,
          data_confirmada: data,
          horario_inicio: horario,
          horario_fim: horario,
          opcao_escolhida: 1,
          conformidade_id: conformidadeId || null,
          status: 'confirmado',
          nome_empresa: nomeEscritorio,
          agencia: 'Manchester',
          endereco_agencia: 'Avenida Barao Do Rio Branco, 2340',
          codigo_cca: userProfile?.codigo_cca || codigoCca || '0126',
          cca_user_id: user.id,
          tipo_contrato: tipoContrato || 'individual',
          modalidade_financiamento: modalidade || null,
          comite_credito: false
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Também inserir em agendamentos para aparecer na lista
      await supabase.from('agendamentos').insert({
        cpf: cpfCliente || null,
        tipo: 'entrevista',
        tipo_contrato: tipoContrato || 'individual',
        modalidade_financiamento: modalidade || null,
        data_hora: `${data}T${horario}:00`,
        status: 'Aguardando entrevista',
        cca_user_id: user.id,
        conformidade_id: conformidadeId || null,
        telefone_cliente: telefoneCliente,
      });

      // 3. Buscar template WhatsApp para aviso de confirmação
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_key', 'aviso_entrevista_confirmada')
        .maybeSingle();

      // 4. Enviar WhatsApp ao cliente com aviso de data/hora
      const formatDate = (dateStr: string) => {
        try {
          const dateObj = new Date(dateStr + 'T00:00:00');
          return dateObj.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        } catch {
          return dateStr;
        }
      };

      // Mensagem padrão caso não exista template
      let message = template?.message || 
        `Olá ${nomeCliente}! 👋\n\nSua entrevista no escritório *${nomeEscritorio}* está agendada para:\n\n📅 *${formatDate(data)}*\n⏰ *${horario}*\n📍 Agência Manchester - Avenida Barao Do Rio Branco, 2340\n\nAguardamos você! Se precisar remarcar, entre em contato.`;

      if (template?.message) {
        message = template.message
          .replace(/\{\{nome_cliente\}\}/g, nomeCliente)
          .replace(/\{\{nome_escritorio\}\}/g, nomeEscritorio)
          .replace(/\{\{nome_empresa\}\}/g, nomeEscritorio)
          .replace(/\{\{data\}\}/g, formatDate(data))
          .replace(/\{\{horario\}\}/g, horario)
          .replace(/\{\{agencia\}\}/g, 'Manchester')
          .replace(/\{\{endereco_agencia\}\}/g, 'Avenida Barao Do Rio Branco, 2340');
      }

      try {
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: telefoneCliente,
            message: message
          }
        });
      } catch (whatsappError) {
        console.error('Erro ao enviar WhatsApp:', whatsappError);
        // Não bloquear se WhatsApp falhar
      }

      // 5. Se tiver conformidadeId, atualizar a conformidade com o entrevista_id e entrevista_aprovada
      if (conformidadeId && novaEntrevista?.id) {
        await supabase
          .from('conformidades')
          .update({ 
            entrevista_id: novaEntrevista.id,
            entrevista_aprovada: true 
          })
          .eq('id', conformidadeId);
      }

      // Save to client cache
      if (cpfCliente) {
        await salvarCliente(cpfCliente, nomeCliente, telefoneCliente);
      }

      toast({
        title: "Entrevista agendada!",
        description: "WhatsApp enviado ao cliente com a confirmação.",
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
    setData("");
    setHorario("09:00");
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
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Agendar Entrevista
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Entrevista</DialogTitle>
          <DialogDescription>
            O cliente receberá uma mensagem no WhatsApp com a confirmação da data e horário.
          </DialogDescription>
        </DialogHeader>

        {conformidadeId && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-900">📋 Vinculado ao Contrato:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
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
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo_cca">CCA Responsável</Label>
            <Input
              id="codigo_cca"
              value={codigoCca || userProfile?.codigo_cca || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Escritório</Label>
            <Input
              value={nomeEscritorio || "Carregando..."}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Preenchido automaticamente pelo código CCA
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
              <Label htmlFor="data">Data da Entrevista *</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario">Horário *</Label>
              <Input
                id="horario"
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                required
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
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};