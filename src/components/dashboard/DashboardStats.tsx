import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckCircle2, Clock } from "lucide-react";

interface DashboardStatsProps {
  pendingDemands: number;
  completedDemands: number;
  totalConformidades: number;
  upcomingAgendamentos: number;
}

export const DashboardStats = ({
  pendingDemands,
  completedDemands,
  totalConformidades,
  upcomingAgendamentos,
}: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-l-4 border-l-warning">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-warning" />
            Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-warning">{pendingDemands}</div>
          <CardDescription className="text-xs mt-1">Demandas aguardando</CardDescription>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-success">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Concluídas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">{completedDemands}</div>
          <CardDescription className="text-xs mt-1">Demandas finalizadas</CardDescription>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-secondary">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-secondary" />
            Conformidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-secondary">{totalConformidades}</div>
          <CardDescription className="text-xs mt-1">Processos ativos</CardDescription>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 text-accent" />
            Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-accent">{upcomingAgendamentos}</div>
          <CardDescription className="text-xs mt-1">Próximos 7 dias</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};
