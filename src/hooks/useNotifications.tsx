import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isRegistered: boolean;
}

export function useNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<NotificationPermissionState>({
    permission: "default",
    isSupported: false,
    isRegistered: false,
  });

  useEffect(() => {
    // Verificar suporte
    const isSupported = "Notification" in window && "serviceWorker" in navigator;
    
    if (isSupported) {
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }));

      // Verificar se já está registrado
      checkRegistration();
    }
  }, []);

  const checkRegistration = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      setState(prev => ({
        ...prev,
        isRegistered: !!registration,
      }));
    } catch (error) {
      console.error("Error checking SW registration:", error);
    }
  };

  const requestPermission = async () => {
    if (!state.isSupported) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Registrar Service Worker se ainda não estiver
      if (!state.isRegistered) {
        await registerServiceWorker();
      }

      // Solicitar permissão
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
      }));

      if (permission === "granted") {
        toast({
          title: "Notificações ativadas!",
          description: "Você receberá notificações sobre demandas e agendamentos.",
        });
        return true;
      } else if (permission === "denied") {
        toast({
          title: "Permissão negada",
          description: "Você pode ativar notificações nas configurações do navegador.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast({
        title: "Erro",
        description: "Não foi possível solicitar permissão para notificações.",
        variant: "destructive",
      });
      return false;
    }

    return false;
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("Service Worker registered:", registration);
      
      setState(prev => ({
        ...prev,
        isRegistered: true,
      }));

      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      throw error;
    }
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (state.permission !== "granted") {
      console.log("Notification permission not granted");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  return {
    ...state,
    requestPermission,
    showNotification,
  };
}
