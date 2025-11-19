import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, CheckCircle2, Clock, ListTodo, Filter, FileText, Calendar, ClipboardList, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";

interface TarefaDistribuida {
  id: string;
  tipo_tarefa: string;
  referencia_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  demand?: any;
  conformidade?: any;
  agendamento?: any;
}

const MinhasTarefas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tarefas, setTarefas] = useState<TarefaDistribuida[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [statusTab, setStatusTab] = useState<string>("em_andamento");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
      loadTarefas(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadTarefas = async (userId: string) => {
    try {
      // Buscar tarefas do usuário
      const { data: tarefasData, error } = await supabase
        .from("distribuicao_tarefas")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Para cada tarefa, buscar os dados relacionados
      const tarefasComDados = await Promise.all(
        (tarefasData || []).map(async (tarefa) => {
          let dadosRelacionados = {};

          if (tarefa.tipo_tarefa === "demanda") {
            const { data: demandData } = await supabase
              .from("demands")
              .select("*")
              .eq("id", tarefa.referencia_id)
              .single();
            dadosRelacionados = { demand: demandData };
          } else if (tarefa.tipo_tarefa === "comite") {
            const { data: conformidadeData } = await supabase
              .from("conformidades")
              .select("*")
              .eq("id", tarefa.referencia_id)
              .single();
            dadosRelacionados = { conformidade: conformidadeData };
          } else if (tarefa.tipo_tarefa === "assinatura") {
            const { data: agendamentoData } = await supabase
              .from("agendamentos")
              .select("*")
              .eq("id", tarefa.referencia_id)
              .single();
            dadosRelacionados = { agendamento: agendamentoData };
          }

          return { ...tarefa, ...dadosRelacionados };
        })
      );

      setTarefas(tarefasComDados);
    } catch (error: any) {
      console.error("Erro ao carregar tarefas:", error);
      toast({
        title: "Erro ao carregar tarefas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConcluirTarefa = async (tarefaId: string) => {
    try {
      // 1. Buscar a tarefa para pegar os dados relacionados
      const tarefa = tarefas.find(t => t.id === tarefaId);
      if (!tarefa) throw new Error("Tarefa não encontrada");

      // 2. Atualizar status da tarefa para concluída
      const { error: tarefaError } = await supabase
        .from("distribuicao_tarefas")
        .update({ 
          status: "concluida", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", tarefaId);

      if (tarefaError) throw tarefaError;

      // 3. Se for tarefa de demanda, encerrar a demanda
      if (tarefa.tipo_tarefa === "demanda" && tarefa.demand) {
        const { error: demandError } = await supabase
          .from("demands")
          .update({ 
            status: "concluida",
            concluded_at: new Date().toISOString(),
            response_text: "Demanda concluída pela equipe da agência"
          })
          .eq("id", tarefa.referencia_id);

        if (demandError) {
          console.error("Erro ao encerrar demanda:", demandError);
        }

        // 4. Buscar template de WhatsApp para notificação
        const { data: whatsappTemplate } = await supabase
          .from("whatsapp_templates")
          .select("*")
          .eq("template_key", "demanda_respondida")
          .maybeSingle();

        // 5. Buscar dados do CCA
        const { data: ccaData } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("user_id", tarefa.demand.cca_user_id)
          .maybeSingle();

        // 6. Enviar WhatsApp para o CCA
        if (ccaData?.phone) {
          const typeLabels: Record<string, string> = {
            autoriza_reavaliacao: "Autoriza Reavaliação",
            desconsidera_avaliacoes: "Desconsidera Avaliações",
            vincula_imovel: "Vincula Imóvel",
            cancela_avaliacao_sicaq: "Cancela Avaliação SICAQ",
            cancela_proposta_siopi: "Cancela Proposta SIOPI",
            solicitar_avaliacao_sigdu: "Solicitar Avaliação SIGDU",
            incluir_pis_siopi: "Incluir PIS no SIOPI",
            autoriza_vendedor_restricao: "Autorização de Vendedor com Restrição",
            outras: "Outras",
          };

          const typeLabel = typeLabels[tarefa.demand.type] || tarefa.demand.type;
          let message = "";

          if (whatsappTemplate) {
            message = whatsappTemplate.message
              .replace(/\{\{status\}\}/g, "✅ Concluída")
              .replace(/\{\{tipo_demanda\}\}/g, typeLabel)
              .replace(/\{\{cpf\}\}/g, tarefa.demand.cpf || "")
              .replace(/\{\{resposta\}\}/g, "Demanda concluída pela equipe da agência");
          } else {
            message = `🔔 *Demanda Concluída*\n\n` +
              `*Status:* ✅ Concluída\n` +
              `*Tipo:* ${typeLabel}\n` +
              `*CPF:* ${tarefa.demand.cpf || ""}\n\n` +
              `Sua demanda foi processada e concluída pela equipe da agência.`;
          }

          // Enviar WhatsApp (não aguardar)
          supabase.functions.invoke("send-whatsapp", {
            body: { phone: ccaData.phone, message }
          }).catch(err => {
            console.error("Erro ao enviar WhatsApp:", err);
          });
        }
      }

      toast({
        title: "Tarefa concluída!",
        description: "A tarefa e a demanda relacionada foram encerradas.",
      });

      if (user) loadTarefas(user.id);
    } catch (error: any) {
      console.error("Erro ao concluir tarefa:", error);
      toast({
        title: "Erro ao concluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      demanda: "Demanda",
      comite: "Comitê de Crédito",
      assinatura: "Assinatura de Contrato",
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" } = {
      em_andamento: "secondary",
      concluida: "default",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status === "em_andamento" ? "Em Andamento" : "Concluída"}
      </Badge>
    );
  };

  const tarefasFiltradas = tarefas.filter((tarefa) => {
    const matchStatus = tarefa.status === statusTab;
    const matchTipo = filtroTipo === "todos" || tarefa.tipo_tarefa === filtroTipo;
    return matchStatus && matchTipo;
  });

  const contadorStatus = {
    em_andamento: tarefas.filter((t) => t.status === "em_andamento").length,
    concluida: tarefas.filter((t) => t.status === "concluida").length,
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Carregando suas tarefas..." />
      </PageContainer>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-primary">Minhas Tarefas</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {profile?.full_name}
              </p>
            </div>
          </div>
          <div className="flex gap-1 md:gap-2">
            <Button onClick={() => navigate("/profile")} variant="outline" size="sm" className="hidden md:flex">
              <User className="w-4 h-4 mr-2" />
              Perfil
            </Button>
            <Button onClick={() => navigate("/profile")} variant="outline" size="icon" className="md:hidden">
              <User className="w-4 h-4" />
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <Button onClick={handleLogout} variant="outline" size="icon" className="md:hidden">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contadorStatus.em_andamento}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contadorStatus.concluida}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Tipo de Tarefa</label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="demanda">Demandas</SelectItem>
                    <SelectItem value="comite">Comitê de Crédito</SelectItem>
                    <SelectItem value="assinatura">Assinatura de Contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs por Status */}
        <Tabs value={statusTab} onValueChange={setStatusTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="em_andamento">
              <Clock className="mr-2 h-4 w-4" />
              Em Andamento ({contadorStatus.em_andamento})
            </TabsTrigger>
            <TabsTrigger value="concluida">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Concluídas ({contadorStatus.concluida})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusTab} className="mt-6">
            {tarefasFiltradas.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma tarefa {statusTab === "em_andamento" ? "em andamento" : "concluída"} encontrada.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tarefasFiltradas.map((tarefa) => (
                  <Card key={tarefa.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {getTipoLabel(tarefa.tipo_tarefa)}
                          </CardTitle>
                          <CardDescription>
                            Criada em {new Date(tarefa.created_at).toLocaleDateString("pt-BR")}
                          </CardDescription>
                        </div>
                        {getStatusBadge(tarefa.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Detalhes da Tarefa */}
                      {tarefa.demand && (
                        <div className="space-y-2 text-sm">
                          <p><strong>Tipo:</strong> {tarefa.demand.type}</p>
                          {tarefa.demand.cpf && <p><strong>CPF:</strong> {tarefa.demand.cpf}</p>}
                          {tarefa.demand.description && (
                            <p><strong>Descrição:</strong> {tarefa.demand.description}</p>
                          )}
                        </div>
                      )}
                      {tarefa.conformidade && (
                        <div className="space-y-2 text-sm">
                          <p><strong>CPF:</strong> {tarefa.conformidade.cpf}</p>
                          <p><strong>Valor:</strong> R$ {tarefa.conformidade.valor_financiamento?.toLocaleString("pt-BR")}</p>
                          <p><strong>Modalidade:</strong> {tarefa.conformidade.modalidade}</p>
                        </div>
                      )}
                      {tarefa.agendamento && (
                        <div className="space-y-2 text-sm">
                          <p><strong>Tipo:</strong> {tarefa.agendamento.tipo}</p>
                          {tarefa.agendamento.cpf && <p><strong>CPF:</strong> {tarefa.agendamento.cpf}</p>}
                          <p><strong>Data:</strong> {new Date(tarefa.agendamento.data_hora).toLocaleString("pt-BR")}</p>
                        </div>
                      )}

                      {/* Ações */}
                      {tarefa.status === "em_andamento" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleConcluirTarefa(tarefa.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Concluir
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default MinhasTarefas;
