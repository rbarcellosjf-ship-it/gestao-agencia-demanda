import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, FileText, Calendar, Users, Plus, User, Mail, Settings, ScanText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useUserRole } from "@/hooks/useUserRole";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { NotificationSettings } from "@/components/NotificationSettings";

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
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary">Agência Manchester</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Olá, {profile?.full_name} ({role === "agencia" ? "Gerente" : "CCA"})
            </p>
          </div>
          <div className="flex gap-1 md:gap-2">
            <Button onClick={() => navigate("/profile")} variant="outline" size="sm" className="hidden md:flex">
              <User className="w-4 h-4 mr-2" />
              Meu Perfil
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

      <main className="container mx-auto px-4 py-4 md:py-8">
        {/* Configurações de Notificação */}
        <div className="mb-6">
          <NotificationSettings />
        </div>

        {/* Dashboard Statistics */}
        <DashboardStats
          pendingDemands={stats.pendingDemands}
          completedDemands={stats.completedDemands}
          totalConformidades={stats.totalConformidades}
          upcomingAgendamentos={stats.upcomingAgendamentos}
        />

        {/* Quick Actions for Agencia */}
        <QuickActions
          demands={pendingDemandsList}
          onDemandUpdate={refreshData}
          userRole={role || ""}
        />

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/demands")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Demandas
              </CardTitle>
              <CardDescription>
                {role === "cca" 
                  ? "Criar e acompanhar suas demandas"
                  : "Gerenciar todas as demandas recebidas"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Acessar Demandas
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/conformidades")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                Gerenciar Contratos
              </CardTitle>
              <CardDescription>
                Contratos e conformidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Novo Contrato
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/agendamentos")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Agendamentos
              </CardTitle>
              <CardDescription>
                Calendário de assinaturas e entrevistas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Ver Calendário
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/leitor-documentos")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanText className="w-5 h-5 text-primary" />
                Leitor de Documentos
              </CardTitle>
              <CardDescription>
                Extrair dados de certidões e matrículas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <ScanText className="w-4 h-4 mr-2" />
                Extrair Documentos
              </Button>
            </CardContent>
          </Card>

          {role === "agencia" && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/email-templates")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Templates de E-mail
                </CardTitle>
                <CardDescription>
                  Gerenciar e-mails automáticos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Gerenciar Templates
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/settings")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configurações
              </CardTitle>
              <CardDescription>
                Perfil e notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Configurações
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;