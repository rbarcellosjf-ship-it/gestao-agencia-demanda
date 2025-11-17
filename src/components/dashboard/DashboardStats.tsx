import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users, Calendar, LucideIcon } from "lucide-react";

interface DashboardStatsProps {
  pendingDemands: number;
  completedDemands: number;
  totalConformidades: number;
  upcomingAgendamentos: number;
}

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  description: string;
  color: string;
}

export const DashboardStats = ({
  pendingDemands,
  completedDemands,
  totalConformidades,
  upcomingAgendamentos,
}: DashboardStatsProps) => {
  const stats: StatItem[] = [
    {
      label: "Pendentes",
      value: pendingDemands,
      icon: Clock,
      description: "Demandas aguardando",
      color: "border-l-yellow-500",
    },
    {
      label: "Concluídas",
      value: completedDemands,
      icon: CheckCircle2,
      description: "Demandas finalizadas",
      color: "border-l-green-500",
    },
    {
      label: "Conformidades",
      value: totalConformidades,
      icon: Users,
      description: "Cadastradas no sistema",
      color: "border-l-blue-500",
    },
    {
      label: "Agendamentos",
      value: upcomingAgendamentos,
      icon: Calendar,
      description: "Próximos 7 dias",
      color: "border-l-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className={`border-l-4 ${stat.color} hover:shadow-md transition-shadow`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">{stat.label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};