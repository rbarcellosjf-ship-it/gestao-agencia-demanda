import { useUserRole } from "./useUserRole";

export function useCanCreateAgendamento() {
  const { role, loading } = useUserRole();
  
  const canCreate = role === 'cca' || role === 'agencia';
  
  return { canCreate, loading, role };
}
