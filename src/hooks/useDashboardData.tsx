import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingDemands: 0,
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

      setPendingDemandsList(pending);

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

    // Setup realtime subscriptions
    const demandsChannel = supabase
      .channel("dashboard-demands")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands" },
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
      supabase.removeChannel(agendamentosChannel);
    };
  }, []);

  return { loading, stats, pendingDemandsList, refreshData: loadDashboardData };
};
