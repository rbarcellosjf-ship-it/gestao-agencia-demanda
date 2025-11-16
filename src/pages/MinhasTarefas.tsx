import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, CheckCircle2, Clock, ListTodo, Filter, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [statusTab, setStatusTab] = useState<string>("pendente");

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
      const { error } = await supabase
        .from("distribuicao_tarefas")
        .update({ status: "concluida", updated_at: new Date().toISOString() })
        .eq("id", tarefaId);

      if (error) throw error;

      toast({
        title: "Tarefa concluída!",
        description: "A tarefa foi marcada como concluída.",
      });

      if (user) loadTarefas(user.id);
    } catch (error: any) {
      toast({
        title: "Erro ao concluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleIniciarTarefa = async (tarefaId: string) => {
    try {
      const { error } = await supabase
        .from("distribuicao_tarefas")
        .update({ status: "em_andamento", updated_at: new Date().toISOString() })
        .eq("id", tarefaId);

      if (error) throw error;

      toast({
        title: "Tarefa iniciada!",
        description: "A tarefa foi marcada como em andamento.",
      });

      if (user) loadTarefas(user.id);
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar tarefa",
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
      pendente: "outline",
      em_andamento: "secondary",
      concluida: "default",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status === "pendente" ? "Pendente" : status === "em_andamento" ? "Em Andamento" : "Concluída"}
      </Badge>
    );
  };

  const tarefasFiltradas = tarefas.filter((tarefa) => {
    const matchStatus = tarefa.status === statusTab;
    const matchTipo = filtroTipo === "todos" || tarefa.tipo_tarefa === filtroTipo;
    return matchStatus && matchTipo;
  });

  const contadorStatus = {
    pendente: tarefas.filter((t) => t.status === "pendente").length,
    em_andamento: tarefas.filter((t) => t.status === "em_andamento").length,
    concluida: tarefas.filter((t) => t.status === "concluida").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contadorStatus.pendente}</div>
            </CardContent>
          </Card>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendente">
              Pendentes ({contadorStatus.pendente})
            </TabsTrigger>
            <TabsTrigger value="em_andamento">
              Em Andamento ({contadorStatus.em_andamento})
            </TabsTrigger>
            <TabsTrigger value="concluida">
              Concluídas ({contadorStatus.concluida})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusTab} className="mt-6">
            {tarefasFiltradas.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma tarefa {statusTab === "pendente" ? "pendente" : statusTab === "em_andamento" ? "em andamento" : "concluída"} encontrada.
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
                      <div className="flex gap-2 pt-2">
                        {tarefa.status === "pendente" && (
                          <Button
                            size="sm"
                            onClick={() => handleIniciarTarefa(tarefa.id)}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Iniciar
                          </Button>
                        )}
                        {tarefa.status === "em_andamento" && (
                          <Button
                            size="sm"
                            onClick={() => handleConcluirTarefa(tarefa.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Concluir
                          </Button>
                        )}
                      </div>
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
