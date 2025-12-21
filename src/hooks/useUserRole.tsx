import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "agencia" | "cca" | "admin" | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Error loading user role:", error);
        setRole(null);
      } else {
        setRole(data.role as UserRole);
      }
    } catch (error) {
      console.error("Error loading user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper para verificar se é admin ou agencia
  const isAdminOrAgencia = role === "admin" || role === "agencia";

  return { role, loading, refresh: loadRole, isAdminOrAgencia };
}
