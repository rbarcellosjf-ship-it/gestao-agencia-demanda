import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useUserRole } from "@/hooks/useUserRole";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Gerenciar Empregados</h1>
              <p className="text-muted-foreground">Configure emails para distribuição de tarefas</p>
            </div>
          </div>
        </div>

        {empregados.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Nenhum empregado da agência encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {empregados.map((empregado) => (
              <Card key={empregado.user_id}>
                <CardHeader>
                  <CardTitle>{empregado.full_name}</CardTitle>
                  <CardDescription>
                    {empregado.phone && `Tel: ${empregado.phone}`}
                    {empregado.codigo_cca && ` • CCA: ${empregado.codigo_cca}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`email-${empregado.user_id}`}>
                        Email de Preferência para Tarefas
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`email-${empregado.user_id}`}
                          type="email"
                          placeholder="email@exemplo.com"
                          defaultValue={empregado.email_preferencia || ""}
                          onBlur={(e) => {
                            const newEmail = e.target.value;
                            if (newEmail !== empregado.email_preferencia) {
                              handleUpdateEmailPreferencia(empregado.user_id, newEmail);
                            }
                          }}
                          disabled={saving === empregado.user_id}
                        />
                        <Button
                          size="icon"
                          onClick={(e) => {
                            const input = document.getElementById(`email-${empregado.user_id}`) as HTMLInputElement;
                            if (input) {
                              handleUpdateEmailPreferencia(empregado.user_id, input.value);
                            }
                          }}
                          disabled={saving === empregado.user_id}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Este email será usado para enviar notificações sobre tarefas distribuídas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default Empregados;
