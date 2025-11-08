import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, FileText, Calendar, Users, Plus, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { loading: dashboardLoading, stats, pendingDemandsList, refreshData } = useDashboardData();

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

  if (loading || dashboardLoading) {
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
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Agência Manchester</h1>
            <p className="text-sm text-muted-foreground">
              Olá, {profile?.full_name} ({profile?.role === "agencia" ? "Gerente" : "CCA"})
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/profile")} variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Meu Perfil
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Statistics */}
        <DashboardStats
          pendingDemands={stats.pendingDemands}
          completedDemands={stats.completedDemands}
          cancelledDemands={stats.cancelledDemands}
          totalConformidades={stats.totalConformidades}
          upcomingAgendamentos={stats.upcomingAgendamentos}
        />

        {/* Quick Actions for Agencia */}
        <QuickActions
          demands={pendingDemandsList}
          onDemandUpdate={refreshData}
          userRole={profile?.role || ""}
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
                {profile?.role === "cca" 
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
                Conformidades
              </CardTitle>
              <CardDescription>
                {profile?.role === "cca"
                  ? "Enviar processos para conformidade"
                  : "Acompanhar processos em conformidade"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Acessar Conformidades
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
        </div>
      </main>
    </div>
  );
};

export default Dashboard;