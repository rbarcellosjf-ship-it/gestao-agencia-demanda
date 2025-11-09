import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingDemands: 0,
    completedDemands: 0,
    totalConformidades: 0,
    upcomingAgendamentos: 0,
  });
  const [pendingDemandsList, setPendingDemandsList] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Get demands stats
      const { data: demandsData } = await supabase
        .from("demands")
        .select("status, id, type, codigo_cca, created_at, cpf, description");

      const pending = demandsData?.filter((d) => d.status === "pendente") || [];
      const completed = demandsData?.filter((d) => d.status === "concluida") || [];

      setPendingDemandsList(pending);

      // Get conformidades count
      const { count: conformidadesCount } = await supabase
        .from("conformidades")
        .select("*", { count: "exact", head: true });

      // Get upcoming agendamentos (next 7 days)
      const today = new Date();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(today.getDate() + 7);

      const { count: agendamentosCount } = await supabase
        .from("agendamentos")
        .select("*", { count: "exact", head: true })
        .gte("data_hora", today.toISOString())
        .lte("data_hora", sevenDaysLater.toISOString());

      setStats({
        pendingDemands: pending.length,
        completedDemands: completed.length,
        totalConformidades: conformidadesCount || 0,
        upcomingAgendamentos: agendamentosCount || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Setup realtime subscriptions for all relevant tables
    const demandsChannel = supabase
      .channel("dashboard-demands")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands" },
        () => loadDashboardData()
      )
      .subscribe();

    const conformidadesChannel = supabase
      .channel("dashboard-conformidades")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conformidades" },
        () => loadDashboardData()
      )
      .subscribe();

    const agendamentosChannel = supabase
      .channel("dashboard-agendamentos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos" },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(demandsChannel);
      supabase.removeChannel(conformidadesChannel);
      supabase.removeChannel(agendamentosChannel);
    };
  }, []);

  return { loading, stats, pendingDemandsList, refreshData: loadDashboardData };
};
