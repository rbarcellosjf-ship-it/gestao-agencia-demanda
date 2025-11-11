import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [codigoCca, setCodigoCca] = useState("");
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil.",
        variant: "destructive",
      });
      return;
    }

    setProfile(profileData);
    setFullName(profileData.full_name || "");
    setPhone(profileData.phone || "");
    setCodigoCca(profileData.codigo_cca || "");
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const updates: any = {
        full_name: fullName,
        phone: phone,
        updated_at: new Date().toISOString(),
      };

      // Only update codigo_cca if user is CCA
      if (role === "cca") {
        updates.codigo_cca = codigoCca;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Voltar</span>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Visualize e edite suas informações
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Mantenha seus dados atualizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.user_id || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Input
                  id="role"
                  value={role === "agencia" ? "Gerente" : "CCA"}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Este número será usado para receber notificações pelo WhatsApp
                </p>
              </div>

              {role === "cca" && (
                <div className="space-y-2">
                  <Label htmlFor="codigoCca">Código CCA *</Label>
                  <Input
                    id="codigoCca"
                    value={codigoCca}
                    onChange={(e) => setCodigoCca(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Profile;
