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
import { ArrowLeft, Plus, Calendar } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { EntrevistaCard } from "@/components/EntrevistaCard";
import { DossieUpload } from "@/components/DossieUpload";
import { EntrevistaPendenteCard } from "@/components/EntrevistaPendenteCard";
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
  const [agendamentosEntrevistas, setAgendamentosEntrevistas] = useState<any[]>([]);
  const [ccas, setCcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [criarContratoOpen, setCriarContratoOpen] = useState(false);
  const [entrevistaSelecionada, setEntrevistaSelecionada] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
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
    nomeCliente: "",
    telefone: "",
    dataOpcao1: "",
    dataOpcao2: "",
    horarioInicio: "",
    horarioFim: "",
    nomeEmpresa: "",
  });

  useEffect(() => {
    loadData();
    loadCCAs();
    loadUserProfile();

    const entrevistasChannel = supabase
      .channel("agendamentos-entrevistas")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entrevistas_agendamento",
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

    return () => {
      supabase.removeChannel(entrevistasChannel);
      supabase.removeChannel(assinaturasChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Buscar entrevistas da tabela entrevistas_agendamento
      const { data: entrevistasData, error: entrevistasError } = await supabase
        .from("entrevistas_agendamento")
        .select("*")
        .order("created_at", { ascending: false });

      if (entrevistasError) throw entrevistasError;

      // Buscar entrevistas confirmadas migradas para agendamentos
      const { data: agendamentosEntrevistasData, error: agendamentosError } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("tipo", "entrevista")
        .order("created_at", { ascending: false });

      if (agendamentosError) throw agendamentosError;

      // Buscar assinaturas da tabela agendamentos
      const { data: assinaturasData, error: assinaturasError } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("tipo", "assinatura")
        .order("data_hora", { ascending: false });

      if (assinaturasError) throw assinaturasError;

      setEntrevistas(entrevistasData || []);
      setAgendamentosEntrevistas(agendamentosEntrevistasData || []);
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

      // Validar campos obrigatórios
      if (!formData.nomeCliente || !formData.telefone || !formData.dataOpcao1 || !formData.dataOpcao2 || !formData.horarioInicio || !formData.horarioFim) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Criar registro em entrevistas_agendamento com status pendente
      const { data: entrevista, error: entrevistaError } = await supabase
        .from("entrevistas_agendamento")
        .insert([{
          cliente_nome: formData.nomeCliente,
          telefone: formData.telefone.replace(/\D/g, ''),
          data_opcao_1: formData.dataOpcao1,
          data_opcao_2: formData.dataOpcao2,
          horario_inicio: formData.horarioInicio,
          horario_fim: formData.horarioFim,
          nome_empresa: formData.nomeEmpresa || null,
          status: 'pendente',
          agencia: 'Manchester',
          endereco_agencia: 'Avenida Barao Do Rio Branco, 2340',
        }])
        .select()
        .single();

      if (entrevistaError) {
        throw entrevistaError;
      }

      // Enviar mensagem via WhatsApp
      const { data: profileData } = await supabase
        .from('profiles')
        .select('codigo_cca, full_name')
        .eq('user_id', user.id)
        .single();

      const whatsappPayload = {
        phoneNumber: formData.telefone.replace(/\D/g, ''),
        message: `Olá ${formData.nomeCliente}! 👋\n\n` +
          `Aqui é ${profileData?.full_name || 'a equipe'} da Manchester Crédito Habitacional.\n\n` +
          `Precisamos agendar uma entrevista${formData.nomeEmpresa ? ` para ${formData.nomeEmpresa}` : ''}.\n\n` +
          `📅 Temos duas opções de data:\n` +
          `1️⃣ ${format(new Date(formData.dataOpcao1), "dd/MM/yyyy", { locale: ptBR })}\n` +
          `2️⃣ ${format(new Date(formData.dataOpcao2), "dd/MM/yyyy", { locale: ptBR })}\n\n` +
          `⏰ Horário: ${formData.horarioInicio} às ${formData.horarioFim}\n\n` +
          `📍 Local: Manchester - Avenida Barao Do Rio Branco, 2340\n\n` +
          `Por favor, responda com o número da opção que melhor se adequa à sua agenda (1 ou 2), ou nos avise se nenhuma das datas funciona para você.`
      };

      await supabase.functions.invoke('send-whatsapp', {
        body: whatsappPayload
      });

      toast({
        title: "Entrevista criada!",
        description: "Agendamento criado com sucesso. Aguardando confirmação do cliente via WhatsApp.",
      });

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error creating entrevista:", error);
      toast({
        title: "Erro ao criar entrevista",
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
      nomeCliente: "",
      telefone: "",
      dataOpcao1: "",
      dataOpcao2: "",
      horarioInicio: "",
      horarioFim: "",
      nomeEmpresa: "",
    });
  };

  const handleAprovar = async (id: string) => {
    try {
      // Atualizar status na tabela entrevistas_agendamento
      const { error: updateError } = await supabase
        .from("entrevistas_agendamento")
        .update({ 
          status: "Aprovado"
        })
        .eq("id", id);

      if (updateError) throw updateError;

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
      // Atualizar status na tabela entrevistas_agendamento
      const { error: updateError } = await supabase
        .from("entrevistas_agendamento")
        .update({ 
          status: "Reprovado"
        })
        .eq("id", id);

      if (updateError) throw updateError;

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

  const handleEditar = (id: string) => {
    toast({
      title: "Em desenvolvimento",
      description: "Função de edição será implementada em breve.",
    });
  };

  const handleConfirmarData = async (entrevistaId: string, dataEscolhida: Date, opcao?: 1 | 2) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro",
          description: "Você precisa estar autenticado",
          variant: "destructive",
        });
        return;
      }

      // 1. Atualizar entrevistas_agendamento
      const { error: updateError } = await supabase
        .from('entrevistas_agendamento')
        .update({
          data_confirmada: dataEscolhida.toISOString().split('T')[0],
          opcao_escolhida: opcao || null,
          status: 'confirmado'
        })
        .eq('id', entrevistaId);

      if (updateError) {
        console.error("Error updating interview:", updateError);
        toast({
          title: "Erro ao confirmar data",
          description: updateError.message,
          variant: "destructive",
        });
        return;
      }

      // 2. Buscar dados da entrevista
      const { data: entrevista, error: fetchError } = await supabase
        .from('entrevistas_agendamento')
        .select('*, conformidades(*)')
        .eq('id', entrevistaId)
        .single();

      if (fetchError || !entrevista) {
        console.error("Error fetching interview:", fetchError);
        toast({
          title: "Erro",
          description: "Erro ao buscar dados da entrevista",
          variant: "destructive",
        });
        return;
      }

      // 3. Combinar data e horário para criar data_hora
      const dataHora = new Date(dataEscolhida);
      const [hora, minuto] = entrevista.horario_inicio.split(':');
      dataHora.setHours(parseInt(hora), parseInt(minuto), 0, 0);

      // 4. Criar em agendamentos
      const { error: insertError } = await supabase
        .from('agendamentos')
        .insert({
          tipo: 'entrevista',
          data_hora: dataHora.toISOString(),
          cpf: entrevista.conformidades?.cpf || null,
          status: 'Aguardando entrevista',
          cca_user_id: session.user.id,
          tipo_contrato: entrevista.conformidades?.tipo_contrato || 'individual',
          modalidade_financiamento: entrevista.conformidades?.modalidade || null,
          comite_credito: entrevista.conformidades?.comite_credito || false,
          observacoes: null,
        });

      if (insertError) {
        console.error("Error creating agendamento:", insertError);
        toast({
          title: "Erro ao migrar agendamento",
          description: insertError.message,
          variant: "destructive",
        });
        return;
      }

      // 5. Enviar WhatsApp de confirmação
      const message = `Olá ${entrevista.cliente_nome}! ✅\n\nSua entrevista foi confirmada para ${format(dataHora, "dd/MM/yyyy (EEEE) 'às' HH:mm", { locale: ptBR })}.\n\n📍 Local: ${entrevista.agencia} - ${entrevista.endereco_agencia}\n\nAguardamos você!`;

      await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: entrevista.telefone,
          message: message,
        },
      });

      toast({
        title: "Data confirmada com sucesso",
        description: "Agendamento criado e WhatsApp de confirmação enviado",
      });

      // 6. Recarregar dados
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao confirmar a data",
        variant: "destructive",
      });
    }
  };

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
                    <Label htmlFor="nomeCliente">Nome do Cliente *</Label>
                    <Input
                      id="nomeCliente"
                      value={formData.nomeCliente}
                      onChange={(e) => setFormData({ ...formData, nomeCliente: e.target.value })}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone/WhatsApp *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="nomeEmpresa">Nome da Empresa (opcional)</Label>
                  <Input
                    id="nomeEmpresa"
                    value={formData.nomeEmpresa}
                    onChange={(e) => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                    placeholder="Nome da empresa do cliente"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dataOpcao1">Data Opção 1 *</Label>
                    <Input
                      id="dataOpcao1"
                      type="date"
                      value={formData.dataOpcao1}
                      onChange={(e) => setFormData({ ...formData, dataOpcao1: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataOpcao2">Data Opção 2 *</Label>
                    <Input
                      id="dataOpcao2"
                      type="date"
                      value={formData.dataOpcao2}
                      onChange={(e) => setFormData({ ...formData, dataOpcao2: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="horarioInicio">Horário Início *</Label>
                    <Input
                      id="horarioInicio"
                      type="time"
                      value={formData.horarioInicio}
                      onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="horarioFim">Horário Fim *</Label>
                    <Input
                      id="horarioFim"
                      type="time"
                      value={formData.horarioFim}
                      onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                      required
                    />
                  </div>
                </div>

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
        <Tabs defaultValue="entrevistas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="entrevistas">
              Entrevistas ({entrevistas.length})
            </TabsTrigger>
            <TabsTrigger value="assinaturas">
              Assinaturas ({assinaturas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entrevistas" className="space-y-4">
            {entrevistas.length === 0 && agendamentosEntrevistas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma entrevista agendada
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Entrevistas pendentes de confirmação */}
                {entrevistas.filter(e => e.status === 'pendente').map((entrevista) => (
                  <EntrevistaPendenteCard
                    key={entrevista.id}
                    entrevista={entrevista}
                    onConfirmarData={handleConfirmarData}
                  />
                ))}

                {/* Entrevistas confirmadas com outros status */}
                {entrevistas.filter(e => e.status !== 'pendente').map((entrevista) => (
                  <EntrevistaCard
                    key={entrevista.id}
                    entrevista={entrevista}
                    onAprovar={handleAprovar}
                    onReprovar={handleReprovar}
                    onEditar={handleEditar}
                    onCriarContrato={(entrevista) => {
                      setEntrevistaSelecionada(entrevista);
                      setCriarContratoOpen(true);
                    }}
                  />
                ))}

                {/* Entrevistas confirmadas migradas para agendamentos */}
                {agendamentosEntrevistas.map((agendamento) => (
                  <Card key={agendamento.id} className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Entrevista Confirmada</h3>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {agendamento.cpf && (
                        <p className="text-sm text-muted-foreground">CPF: {agendamento.cpf}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="assinaturas" className="space-y-4">
            {assinaturas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma assinatura agendada
                </CardContent>
              </Card>
            ) : (
              assinaturas.map((assinatura) => (
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
