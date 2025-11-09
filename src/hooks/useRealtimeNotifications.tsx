import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { useToast } from "./use-toast";

interface UseRealtimeNotificationsProps {
  userId: string | null;
  userRole: string | null;
}

export function useRealtimeNotifications({ userId, userRole }: UseRealtimeNotificationsProps) {
  const { permission, showNotification } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up realtime notifications for user:", userId, "role:", userRole);

    // Canal para demandas
    const demandsChannel = supabase
      .channel("demands-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "demands",
        },
        async (payload) => {
          console.log("New demand detected:", payload);
          
          // Se for agência, notificar sobre nova demanda
          if (userRole === "agencia") {
            const demand = payload.new as any;
            
            toast({
              title: "Nova Demanda Criada",
              description: `Demanda de ${demand.codigo_cca || "CCA"}`,
            });

            if (permission === "granted") {
              await showNotification("Nova Demanda Criada", {
                body: `Demanda de ${demand.codigo_cca || "CCA"}`,
                tag: `demand-${demand.id}`,
                data: { url: "/demands" },
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "demands",
          filter: `cca_user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("Demand updated:", payload);
          
          const demand = payload.new as any;
          const oldDemand = payload.old as any;

          // Se status mudou, notificar
          if (demand.status !== oldDemand.status) {
            const statusLabels: Record<string, string> = {
              pendente: "Pendente",
              em_andamento: "Em Andamento",
              concluida: "Concluída",
              cancelada: "Cancelada",
            };

            toast({
              title: "Status da Demanda Atualizado",
              description: `Sua demanda agora está: ${statusLabels[demand.status] || demand.status}`,
            });

            if (permission === "granted") {
              await showNotification("Status da Demanda Atualizado", {
                body: `Sua demanda agora está: ${statusLabels[demand.status] || demand.status}`,
                tag: `demand-${demand.id}`,
                data: { url: "/demands" },
              });
            }
          }
        }
      )
      .subscribe();

    // Canal para agendamentos
    const agendamentosChannel = supabase
      .channel("agendamentos-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agendamentos",
          filter: `cca_user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("New agendamento:", payload);
          
          const agendamento = payload.new as any;
          
          toast({
            title: "Novo Agendamento",
            description: `Agendamento de ${agendamento.tipo} criado`,
          });

          if (permission === "granted") {
            await showNotification("Novo Agendamento", {
              body: `Agendamento de ${agendamento.tipo} criado`,
              tag: `agendamento-${agendamento.id}`,
              data: { url: "/agendamentos" },
            });
          }
        }
      )
      .subscribe();

    // Verificar agendamentos próximos (próximas 24h)
    const checkUpcomingAgendamentos = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: upcomingAgendamentos } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("cca_user_id", userId)
        .gte("data_hora", new Date().toISOString())
        .lte("data_hora", tomorrow.toISOString());

      if (upcomingAgendamentos && upcomingAgendamentos.length > 0) {
        upcomingAgendamentos.forEach(async (agendamento) => {
          const dataHora = new Date(agendamento.data_hora);
          const diff = dataHora.getTime() - new Date().getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));

          if (hours <= 24 && hours > 0) {
            if (permission === "granted") {
              await showNotification("Agendamento Próximo", {
                body: `${agendamento.tipo} em ${hours}h`,
                tag: `upcoming-${agendamento.id}`,
                requireInteraction: true,
                data: { url: "/agendamentos" },
              });
            }
          }
        });
      }
    };

    // Verificar agendamentos próximos a cada hora
    checkUpcomingAgendamentos();
    const interval = setInterval(checkUpcomingAgendamentos, 60 * 60 * 1000);

    return () => {
      supabase.removeChannel(demandsChannel);
      supabase.removeChannel(agendamentosChannel);
      clearInterval(interval);
    };
  }, [userId, userRole, permission, showNotification, toast]);
}
