import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, FileText, Calendar, Users, Plus, User, Mail, Settings as SettingsIcon, ScanText, ListTodo } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useUserRole } from "@/hooks/useUserRole";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { NotificationSettings } from "@/components/NotificationSettings";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { role, loading: roleLoading } = useUserRole();
  const { loading: dashboardLoading, stats, pendingDemandsList, refreshData } = useDashboardData();
  
  // Ativar notificações em tempo real
  useRealtimeNotifications({ userId: user?.id || null, userRole: role });

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
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  if (loading || dashboardLoading || roleLoading) {
    return <LoadingState message="Carregando dashboard..." />;
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          description={`Bem-vindo, ${profile?.full_name} • ${role === "agencia" ? "Gerente" : "CCA"}`}
          action={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <User className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Perfil</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </div>
          }
        />

        <div className="space-y-6">
          {/* Configurações de Notificação */}
          <NotificationSettings />

          {/* Dashboard Statistics */}
          <DashboardStats
            pendingDemands={stats.pendingDemands}
            completedDemands={stats.completedDemands}
            totalConformidades={stats.totalConformidades}
            upcomingAgendamentos={stats.upcomingAgendamentos}
          />

          {/* Quick Actions for Agencia */}
          {role === "agencia" && pendingDemandsList.length > 0 && (
            <QuickActions
              demands={pendingDemandsList}
              onDemandUpdate={refreshData}
              userRole={role || ""}
            />
          )}

          {/* Main Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
>
            <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/demands")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  Demandas
                </CardTitle>
                <CardDescription className="text-sm">
                  {role === "cca" 
                    ? "Criar e acompanhar suas demandas"
                    : "Gerenciar todas as demandas recebidas"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Acessar Demandas
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/conformidades")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                  Gerenciar Contratos
                </CardTitle>
                <CardDescription className="text-sm">
                  Contratos e conformidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="secondary" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Contrato
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/agendamentos")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Agendamentos
                </CardTitle>
                <CardDescription className="text-sm">
                  Calendário de assinaturas e entrevistas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Calendário
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/leitor-documentos")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ScanText className="w-5 h-5 text-green-600" />
                  Leitor de Documentos
                </CardTitle>
                <CardDescription className="text-sm">
                  Extrair dados de certidões e matrículas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" size="sm">
                  <ScanText className="w-4 h-4 mr-2" />
                  Extrair Documentos
                </Button>
              </CardContent>
            </Card>

            {role === "agencia" && (
              <>
                <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/minhas-tarefas")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ListTodo className="w-5 h-5 text-indigo-600" />
                      Minhas Tarefas
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Gerenciar tarefas distribuídas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" size="sm">
                      <ListTodo className="w-4 h-4 mr-2" />
                      Ver Minhas Tarefas
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/empregados")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-cyan-600" />
                      Empregados
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Gerenciar equipe da agência
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-2" />
                      Gerenciar Empregados
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/email-templates")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="w-5 h-5 text-orange-600" />
                      Templates de Email
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Gerenciar e-mails automáticos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Gerenciar Templates
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            <Card className="hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate("/settings")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SettingsIcon className="w-5 h-5 text-gray-600" />
                  Configurações
                </CardTitle>
                <CardDescription className="text-sm">
                  Ajustar preferências do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" size="sm">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Acessar Configurações
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
      <MobileBottomNav />
    </>
  );
};

export default Dashboard;