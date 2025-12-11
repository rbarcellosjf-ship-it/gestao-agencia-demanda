import { useNavigate } from "react-router-dom";
import { Clock, Calendar } from "lucide-react";

interface DashboardStatsProps {
  pendingDemands: number;
  upcomingAgendamentos: number;
}

export const DashboardStats = ({
  pendingDemands,
  upcomingAgendamentos,
}: DashboardStatsProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
      <button
        onClick={() => navigate("/demands")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-background transition-colors"
      >
        <Clock className="w-4 h-4 text-yellow-600" />
        <span className="font-semibold text-lg">{pendingDemands}</span>
        <span className="text-sm text-muted-foreground">Demandas Pendentes</span>
      </button>

      <div className="w-px h-6 bg-border hidden sm:block" />

      <button
        onClick={() => navigate("/agendamentos")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-background transition-colors"
      >
        <Calendar className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-lg">{upcomingAgendamentos}</span>
        <span className="text-sm text-muted-foreground">Agendamentos (7 dias)</span>
      </button>
    </div>
  );
};
