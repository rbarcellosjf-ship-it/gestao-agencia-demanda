import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Users, Mail, Phone } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useUserRole } from "@/hooks/useUserRole";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";

interface AgenciaUser {
  user_id: string;
  full_name: string;
  email_preferencia: string | null;
  phone: string;
  codigo_cca: string | null;
}

const Empregados = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  const [empregados, setEmpregados] = useState<AgenciaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && role !== "agencia") {
      navigate("/dashboard");
      return;
    }
    if (!roleLoading) {
      loadEmpregados();
    }
  }, [role, roleLoading, navigate]);

  const loadEmpregados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner(full_name, email_preferencia, phone, codigo_cca)
        `)
        .eq("role", "agencia");

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Nenhum empregado encontrado",
          description: "Não foram encontrados usuários com perfil de agência.",
        });
        setEmpregados([]);
        return;
      }

      const formattedUsers: AgenciaUser[] = data.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.profiles.full_name,
        email_preferencia: item.profiles.email_preferencia,
        phone: item.profiles.phone,
        codigo_cca: item.profiles.codigo_cca,
      }));

      setEmpregados(formattedUsers);
    } catch (error: any) {
      console.error("Error loading empregados:", error);
      toast({
        title: "Erro ao carregar empregados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmailPreferencia = async (userId: string, emailPreferencia: string) => {
    setSaving(userId);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ email_preferencia: emailPreferencia })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: "Email de preferência atualizado com sucesso.",
      });

      // Atualizar estado local
      setEmpregados(prev =>
        prev.map(emp =>
          emp.user_id === userId
            ? { ...emp, email_preferencia: emailPreferencia }
            : emp
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar email:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o email de preferência.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading || roleLoading) {
    return (
      <PageContainer>
        <LoadingState message="Carregando empregados..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Empregados da Agência"
        description="Gerencie os emails de preferência dos empregados para distribuição de tarefas"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Empregados" }
        ]}
        backTo="/dashboard"
      />

      {empregados.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum empregado encontrado"
          description="Não há empregados cadastrados no sistema."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empregados.map((empregado) => (
              <Card key={empregado.user_id} className="relative border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {empregado.full_name}
                  </CardTitle>
                  <CardDescription>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {empregado.phone}
                      </p>
                      {empregado.codigo_cca && (
                        <p>CCA: {empregado.codigo_cca}</p>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`email-${empregado.user_id}`} className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email de Preferência para Tarefas
                      </Label>
                      <Input
                        id={`email-${empregado.user_id}`}
                        type="email"
                        placeholder="email@exemplo.com"
                        defaultValue={empregado.email_preferencia || ""}
                        onBlur={(e) => {
                          if (e.target.value !== empregado.email_preferencia) {
                            handleUpdateEmailPreferencia(empregado.user_id, e.target.value);
                          }
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById(
                          `email-${empregado.user_id}`
                        ) as HTMLInputElement;
                        if (input) {
                          handleUpdateEmailPreferencia(empregado.user_id, input.value);
                        }
                      }}
                      disabled={saving === empregado.user_id}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving === empregado.user_id ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <MobileBottomNav />
    </PageContainer>
  );
};

export default Empregados;
