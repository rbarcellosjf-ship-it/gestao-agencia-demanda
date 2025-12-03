import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Calendar, Clock, Filter, ChevronDown, ChevronUp, FileSignature } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { EntrevistaCard } from "@/components/EntrevistaCard";
import { EntrevistaPendenteCard } from "@/components/EntrevistaPendenteCard";
import { AssinaturaPendenteCard } from "@/components/AssinaturaPendenteCard";
import { DossieUpload } from "@/components/DossieUpload";
import { ObservacoesField } from "@/components/ObservacoesField";
import { CriarContratoVinculadoDialog } from "@/components/CriarContratoVinculadoDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCanCreateAgendamento } from "@/hooks/useCanCreateAgendamento";
import { safeInsertAgendamento, formatAgendamentoError, type AgendamentoInput } from "@/lib/agendamentoUtils";
import { normalizeCPF, validateCPF, formatCPF } from "@/lib/cpfValidator";

const AgendamentosNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate, role } = useCanCreateAgendamento();
  const [entrevistas, setEntrevistas] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [entrevistasPendentes, setEntrevistasPendentes] = useState<any[]>([]);
  const [assinaturasPendentes, setAssinaturasPendentes] = useState<any[]>([]);
  const [ccas, setCcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [criarContratoOpen, setCriarContratoOpen] = useState(false);
  const [entrevistaSelecionada, setEntrevistaSelecionada] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Filtros state
  const [filtros, setFiltros] = useState({
    ocultarPassadas: true,
    ccaCodigo: "Todos",
    tipoContrato: "Todos",
    modalidade: "Todos",
    comiteCredito: "Todos"
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    cpf: "",
    tipo_contrato: "",
    modalidade_financiamento: "",
    comite_credito: false,
    data_hora: "",
    observacoes: "",
    dossie_cliente_url: "",
    cca_user_id: "", // Será preenchido automaticamente
  });

  useEffect(() => {
    loadData();
    loadEntrevistasPendentes();
    loadAssinaturasPendentes();
    loadCCAs();
    loadUserProfile();

    const entrevistasChannel = supabase
      .channel("agendamentos-entrevistas")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamentos",
          filter: "tipo=eq.entrevista",
        },
        () => loadData()
      )
      .subscribe();

    const assinaturasChannel = supabase
      .channel("agendamentos-assinaturas")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamentos",
          filter: "tipo=eq.assinatura",
        },
        () => loadData()
      )
      .subscribe();

    const entrevistasPendentesChannel = supabase
      .channel("entrevistas-pendentes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entrevistas_agendamento",
          filter: "status=eq.pendente"
        },
        () => loadEntrevistasPendentes()
      )
      .subscribe();

    const assinaturasPendentesChannel = supabase
      .channel("assinaturas-pendentes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assinaturas_agendamento",
          filter: "status=eq.pendente"
        },
        () => loadAssinaturasPendentes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(entrevistasChannel);
      supabase.removeChannel(assinaturasChannel);
      supabase.removeChannel(entrevistasPendentesChannel);
      supabase.removeChannel(assinaturasPendentesChannel);
    };
  }, []);

  const loadEntrevistasPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('entrevistas_agendamento')
        .select(`
          *,
          conformidades:conformidade_id (
            cpf,
            tipo_contrato,
            modalidade,
            valor_financiamento,
            comite_credito
          )
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const formatted = data.map((item: any) => ({
          ...item,
          cpf: item.conformidades?.cpf,
          tipo_contrato: item.conformidades?.tipo_contrato,
          modalidade: item.conformidades?.modalidade,
          valor_financiamento: item.conformidades?.valor_financiamento,
          comite_credito: item.conformidades?.comite_credito
        }));
        setEntrevistasPendentes(formatted);
      }
    } catch (error) {
      console.error("Erro ao carregar entrevistas pendentes:", error);
    }
  };

  const loadAssinaturasPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('assinaturas_agendamento')
        .select(`
          *,
          conformidades:conformidade_id (
            cpf,
            tipo_contrato,
            modalidade,
            valor_financiamento
          )
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const formatted = data.map((item: any) => ({
          ...item,
          cpf: item.conformidades?.cpf,
          tipo_contrato: item.conformidades?.tipo_contrato || item.tipo_contrato,
          modalidade: item.conformidades?.modalidade || item.modalidade_financiamento,
          valor_financiamento: item.conformidades?.valor_financiamento
        }));
        setAssinaturasPendentes(formatted);
      }
    } catch (error) {
      console.error("Erro ao carregar assinaturas pendentes:", error);
    }
  };

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Buscar entrevistas com conformidade_id - ordenar por data mais próxima primeiro
    const { data: entrevistasData, error: entrevistasError } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("tipo", "entrevista")
      .order("data_hora", { ascending: true });

      if (entrevistasError) throw entrevistasError;

      // Buscar assinaturas - ordenar por data mais próxima primeiro
      const { data: assinaturasData, error: assinaturasError } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("tipo", "assinatura")
        .order("data_hora", { ascending: true });

      if (assinaturasError) throw assinaturasError;

      setEntrevistas(entrevistasData || []);
      setAssinaturas(assinaturasData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCCAs = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, codigo_cca")
        .order("full_name");

      if (error) throw error;
      setCcas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar CCAs:", error);
    }
  };

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

  const handleSubmitEntrevista = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Validar CPF
      if (!validateCPF(formData.cpf)) {
        toast({
          title: "CPF inválido",
          description: "Por favor, verifique o CPF digitado.",
          variant: "destructive",
        });
        return;
      }

      // Normalizar CPF (remover formatação)
      const normalizedCPF = normalizeCPF(formData.cpf);
      
      if (!normalizedCPF.match(/^\d{11}$/)) {
        toast({
          title: "CPF inválido",
          description: "CPF deve conter exatamente 11 dígitos.",
          variant: "destructive",
        });
        return;
      }

      // Determinar o cca_user_id
      let ccaUserId = formData.cca_user_id;
      if (role === 'cca' || !ccaUserId) {
        ccaUserId = user.id;
      }

      const insertData: Partial<AgendamentoInput> = {
        cpf: normalizedCPF,
        tipo_contrato: formData.tipo_contrato as 'individual' | 'empreendimento',
        modalidade_financiamento: formData.modalidade_financiamento as 'mcmv' | 'sbpe',
        comite_credito: formData.comite_credito,
        data_hora: formData.data_hora,
        observacoes: formData.observacoes || undefined,
        dossie_cliente_url: formData.dossie_cliente_url || undefined,
        tipo: "entrevista" as const,
        cca_user_id: ccaUserId,
      };

      const { data, error } = await safeInsertAgendamento(insertData);

      if (error) {
        throw new Error(formatAgendamentoError(error));
      }

      toast({
        title: "Entrevista agendada!",
        description: "A entrevista foi registrada com sucesso.",
      });

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error creating entrevista:", error);
      toast({
        title: "Erro ao agendar entrevista",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      cpf: "",
      tipo_contrato: "",
      modalidade_financiamento: "",
      comite_credito: false,
      data_hora: "",
      observacoes: "",
      dossie_cliente_url: "",
      cca_user_id: "",
    });
  };

  const handleAprovar = async (id: string) => {
    try {
      // Atualizar status diretamente
      const { error: updateError } = await supabase
        .from("agendamentos")
        .update({ 
          status: "Aprovado" as any,
          observacoes: "Entrevista aprovada"
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Tentar enviar email (não bloquear se falhar)
      try {
        await supabase.functions.invoke("send-interview-result-email", {
          body: {
            entrevistaId: id,
            aprovado: true,
          },
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }

      toast({
        title: "Entrevista aprovada!",
        description: "Status atualizado com sucesso.",
      });

      loadData();
    } catch (error: any) {
      console.error("Error approving interview:", error);
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReprovar = async (id: string) => {
    const motivo = prompt("Motivo da reprovação:");
    if (!motivo) return;

    try {
      // Atualizar status e observações diretamente
      const { error: updateError } = await supabase
        .from("agendamentos")
        .update({ 
          status: "Reprovado" as any,
          observacoes: motivo
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Tentar enviar email (não bloquear se falhar)
      try {
        await supabase.functions.invoke("send-interview-result-email", {
          body: {
            entrevistaId: id,
            aprovado: false,
            motivo,
          },
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }

      toast({
        title: "Entrevista reprovada",
        description: "Status atualizado com sucesso.",
      });

      loadData();
    } catch (error: any) {
      console.error("Error rejecting interview:", error);
      toast({
        title: "Erro ao reprovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConfirmarEntrevista = async (
    entrevistaId: string, 
    dataConfirmada: string, 
    opcaoEscolhida: number | null,
    horarioEscolhido: string
  ) => {
    try {
      // 1. Buscar dados completos da entrevista pendente
      const { data: entrevista, error: fetchError } = await supabase
        .from('entrevistas_agendamento')
        .select(`
          *,
          conformidades:conformidade_id (*)
        `)
        .eq('id', entrevistaId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Atualizar entrevistas_agendamento
      const { error: updateError } = await supabase
        .from('entrevistas_agendamento')
        .update({
          data_confirmada: dataConfirmada,
          opcao_escolhida: opcaoEscolhida,
          status: 'confirmado'
        })
        .eq('id', entrevistaId);

      if (updateError) throw updateError;

      // 3. Buscar CPF do contrato vinculado ou usar o do próprio agendamento
      const cpf = entrevista.conformidades?.cpf;

    // 4. Criar entrada em agendamentos (migração)
    // Formatar data sem conversão de timezone
    const [ano, mes, dia] = dataConfirmada.split('-');
    const formattedData = `${dia}/${mes}/${ano}`;
    const { error: insertError } = await supabase
      .from('agendamentos')
      .insert({
        tipo: 'entrevista',
        cpf: cpf,
        tipo_contrato: entrevista.tipo_contrato,
        modalidade_financiamento: entrevista.modalidade_financiamento?.toLowerCase() || 'sbpe',
        data_hora: `${dataConfirmada}T${horarioEscolhido}:00-03:00`,
        status: 'Aguardando entrevista',
        comite_credito: entrevista.comite_credito,
        observacoes: `Entrevista confirmada - ${formattedData} às ${horarioEscolhido}`,
        cca_user_id: entrevista.cca_user_id,
        conformidade_id: entrevista.conformidade_id,
        telefone_cliente: entrevista.telefone
      });

      if (insertError) throw insertError;

      toast({
        title: "Data e horário confirmados!",
        description: `Entrevista agendada para ${format(new Date(dataConfirmada), "dd/MM/yyyy")} às ${horarioEscolhido}`
      });

      // 5. Recarregar dados
      loadEntrevistasPendentes();
      loadData();
    } catch (error: any) {
      console.error("Erro ao confirmar entrevista:", error);
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleConfirmarAssinatura = async (
    assinaturaId: string, 
    dataConfirmada: string, 
    opcaoEscolhida: number | null,
    horarioEscolhido: string
  ) => {
    try {
      // 1. Buscar dados completos da assinatura pendente
      const { data: assinatura, error: fetchError } = await supabase
        .from('assinaturas_agendamento')
        .select(`
          *,
          conformidades:conformidade_id (*)
        `)
        .eq('id', assinaturaId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Atualizar assinaturas_agendamento
      const { error: updateError } = await supabase
        .from('assinaturas_agendamento')
        .update({
          data_confirmada: dataConfirmada,
          opcao_escolhida: opcaoEscolhida,
          status: 'confirmado'
        })
        .eq('id', assinaturaId);

      if (updateError) throw updateError;

      // 3. Buscar CPF do contrato vinculado
      const cpf = assinatura.conformidades?.cpf;

      // 4. Criar entrada em agendamentos (migração)
      const [ano, mes, dia] = dataConfirmada.split('-');
      const formattedData = `${dia}/${mes}/${ano}`;
      const { error: insertError } = await supabase
        .from('agendamentos')
        .insert({
          tipo: 'assinatura',
          cpf: cpf,
          tipo_contrato: assinatura.tipo_contrato,
          modalidade_financiamento: assinatura.modalidade_financiamento?.toLowerCase() || 'sbpe',
          data_hora: `${dataConfirmada}T${horarioEscolhido}:00-03:00`,
          status: 'Aguardando assinatura',
          comite_credito: false,
          observacoes: `Assinatura confirmada - ${formattedData} às ${horarioEscolhido}`,
          cca_user_id: assinatura.cca_user_id,
          conformidade_id: assinatura.conformidade_id,
          telefone_cliente: assinatura.telefone
        });

      if (insertError) throw insertError;

      toast({
        title: "Data e horário confirmados!",
        description: `Assinatura agendada para ${format(new Date(dataConfirmada), "dd/MM/yyyy")} às ${horarioEscolhido}`
      });

      // 5. Recarregar dados
      loadAssinaturasPendentes();
      loadData();
    } catch (error: any) {
      console.error("Erro ao confirmar assinatura:", error);
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditar = (id: string) => {
    toast({
      title: "Em desenvolvimento",
      description: "Função de edição será implementada em breve.",
    });
  };

  const aplicarFiltros = (items: any[]) => {
    return items.filter(item => {
      const dataAgendamento = new Date(item.data_hora);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Filtrar datas passadas
      if (filtros.ocultarPassadas && dataAgendamento < hoje) return false;
      
      // Filtrar por CCA
      if (filtros.ccaCodigo !== "Todos") {
        const ccaProfile = ccas.find(c => c.user_id === item.cca_user_id);
        if (ccaProfile?.codigo_cca !== filtros.ccaCodigo) return false;
      }
      
      // Filtrar por tipo contrato
      if (filtros.tipoContrato !== "Todos" && item.tipo_contrato !== filtros.tipoContrato) return false;
      
      // Filtrar por modalidade
      if (filtros.modalidade !== "Todos" && item.modalidade_financiamento !== filtros.modalidade) return false;
      
      // Filtrar por comitê
      if (filtros.comiteCredito !== "Todos") {
        const requerComite = filtros.comiteCredito === "Sim";
        if (item.comite_credito !== requerComite) return false;
      }
      
      return true;
    });
  };

  const entrevistasFiltradas = aplicarFiltros(entrevistas);
  const assinaturasFiltradas = aplicarFiltros(assinaturas);

  const ccasUnicos = Array.from(new Set(ccas.map(c => c.codigo_cca)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Voltar</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Agendamentos
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Entrevistas e Assinaturas
              </p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Entrevista
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agendar Entrevista</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitEntrevista} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cca">CCA Responsável</Label>
                  <Input
                    id="cca"
                    value={userProfile?.codigo_cca || '0126'}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                    <Select
                      value={formData.tipo_contrato}
                      onValueChange={(value) =>
                        setFormData({ ...formData, tipo_contrato: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="empreendimento">Empreendimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modalidade">Modalidade de Financiamento</Label>
                    <Select
                      value={formData.modalidade_financiamento}
                      onValueChange={(value) =>
                        setFormData({ ...formData, modalidade_financiamento: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcmv">MCMV</SelectItem>
                        <SelectItem value="sbpe">SBPE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="data_hora">Data e Hora</Label>
                    <Input
                      id="data_hora"
                      type="datetime-local"
                      value={formData.data_hora}
                      onChange={(e) =>
                        setFormData({ ...formData, data_hora: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="comite"
                    checked={formData.comite_credito}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, comite_credito: checked as boolean })
                    }
                  />
                  <label htmlFor="comite" className="text-sm font-medium">
                    Requer Comitê de Crédito
                  </label>
                </div>

                <DossieUpload
                  onUploadComplete={(url) =>
                    setFormData({ ...formData, dossie_cliente_url: url })
                  }
                />

                <ObservacoesField
                  value={formData.observacoes}
                  onChange={(value) =>
                    setFormData({ ...formData, observacoes: value })
                  }
                  placeholder="Observações sobre a entrevista..."
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Calendar className="w-4 h-4 mr-2" />
                    Agendar Entrevista
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* FILTROS */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-semibold">Filtros</span>
              </div>
              {mostrarFiltros ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardHeader>
          {mostrarFiltros && (
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>CCA</Label>
                  <Select
                    value={filtros.ccaCodigo}
                    onValueChange={(value) => setFiltros({ ...filtros, ccaCodigo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      {ccasUnicos.map((codigo) => (
                        <SelectItem key={codigo} value={codigo}>
                          {codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Contrato</Label>
                  <Select
                    value={filtros.tipoContrato}
                    onValueChange={(value) => setFiltros({ ...filtros, tipoContrato: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="empreendimento">Empreendimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Select
                    value={filtros.modalidade}
                    onValueChange={(value) => setFiltros({ ...filtros, modalidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="mcmv">MCMV</SelectItem>
                      <SelectItem value="sbpe">SBPE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Comitê de Crédito</Label>
                  <Select
                    value={filtros.comiteCredito}
                    onValueChange={(value) => setFiltros({ ...filtros, comiteCredito: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFiltros({
                      ocultarPassadas: true,
                      ccaCodigo: "Todos",
                      tipoContrato: "Todos",
                      modalidade: "Todos",
                      comiteCredito: "Todos"
                    })}
                    className="w-full"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox
                  id="ocultar-passadas"
                  checked={filtros.ocultarPassadas}
                  onCheckedChange={(checked) => 
                    setFiltros({ ...filtros, ocultarPassadas: checked as boolean })
                  }
                />
                <Label
                  htmlFor="ocultar-passadas"
                  className="text-sm font-normal cursor-pointer"
                >
                  Ocultar agendamentos de datas passadas
                </Label>
              </div>
            </CardContent>
          )}
        </Card>

        {/* SEÇÃO 1: ENTREVISTAS PENDENTES DE CONFIRMAÇÃO */}
        {entrevistasPendentes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold">Entrevistas Pendentes de Confirmação</h2>
            </div>
            <div className="grid gap-4">
              {entrevistasPendentes.map((entrevista) => (
                <EntrevistaPendenteCard
                  key={entrevista.id}
                  entrevista={entrevista}
                  onConfirmar={handleConfirmarEntrevista}
                />
              ))}
            </div>
          </div>
        )}

        {/* SEÇÃO 2: ASSINATURAS PENDENTES DE CONFIRMAÇÃO */}
        {assinaturasPendentes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold">Assinaturas Pendentes de Confirmação</h2>
            </div>
            <div className="grid gap-4">
              {assinaturasPendentes.map((assinatura) => (
                <AssinaturaPendenteCard
                  key={assinatura.id}
                  assinatura={assinatura}
                  onConfirmar={handleConfirmarAssinatura}
                />
              ))}
            </div>
          </div>
        )}

        {/* SEÇÃO 2: ENTREVISTAS E ASSINATURAS CONFIRMADAS */}
        <Tabs defaultValue="entrevistas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="entrevistas">
              Entrevistas ({entrevistasFiltradas.length})
            </TabsTrigger>
            <TabsTrigger value="assinaturas">
              Assinaturas ({assinaturasFiltradas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entrevistas" className="space-y-4">
            {entrevistasFiltradas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma entrevista agendada
                </CardContent>
              </Card>
            ) : (
              entrevistasFiltradas.map((entrevista) => (
                <EntrevistaCard
                  key={entrevista.id}
                  entrevista={entrevista}
                  onAprovar={handleAprovar}
                  onReprovar={handleReprovar}
                  onEditar={handleEditar}
                  onDelete={loadData}
                  onCriarContrato={(entrevista) => {
                    setEntrevistaSelecionada(entrevista);
                    setCriarContratoOpen(true);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="assinaturas" className="space-y-4">
            {assinaturasFiltradas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma assinatura agendada
                </CardContent>
              </Card>
            ) : (
              assinaturasFiltradas.map((assinatura) => (
                <Card key={assinatura.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        CPF: {assinatura.cpf}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(assinatura.data_hora), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        {assinatura.status}
                      </p>
                      {assinatura.observacoes && (
                        <p>
                          <span className="text-muted-foreground">Observações:</span>{" "}
                          {assinatura.observacoes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {criarContratoOpen && entrevistaSelecionada && (
        <CriarContratoVinculadoDialog
          open={criarContratoOpen}
          onOpenChange={setCriarContratoOpen}
          entrevistaId={entrevistaSelecionada.id}
          cpfCliente={entrevistaSelecionada.cpf}
          nomeCliente={entrevistaSelecionada.tipo_contrato || "Cliente"}
          onSuccess={() => {
            setCriarContratoOpen(false);
            setEntrevistaSelecionada(null);
            loadData();
            toast({
              title: "Contrato criado!",
              description: "O contrato foi vinculado à entrevista com sucesso.",
            });
          }}
        />
      )}

      <MobileBottomNav />
    </div>
  );
};

export default AgendamentosNew;
