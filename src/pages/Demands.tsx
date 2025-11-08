import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Check, X, Filter } from "lucide-react";
import { z } from "zod";

const demandSchema = z.object({
  type: z.enum([
    "autoriza_reavaliacao",
    "desconsidera_avaliacoes",
    "vincula_imovel",
    "cancela_avaliacao_sicaq",
    "cancela_proposta_siopi",
    "solicitar_avaliacao_sigdu",
    "outras"
  ]),
  cpf: z.string().optional(),
  matricula: z.string().optional(),
  cartorio: z.string().optional(),
  description: z.string().optional(),
});

const Demands = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCCA, setFilterCCA] = useState<string>("all");
  const [ccaList, setCcaList] = useState<string[]>([]);

  // Form state
  const [type, setType] = useState<string>("");
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cartorio, setCartorio] = useState("");
  const [description, setDescription] = useState("");
  const [responseText, setResponseText] = useState("");
  const [selectedDemand, setSelectedDemand] = useState<any>(null);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("demands-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demands",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setProfile(profileData);

    const { data: demandsData } = await supabase
      .from("demands")
      .select("*")
      .order("created_at", { ascending: false });

    setDemands(demandsData || []);

    // Extract unique CCA codes for filtering
    const uniqueCcas = [...new Set(demandsData?.map(d => d.codigo_cca) || [])];
    setCcaList(uniqueCcas as string[]);

    setLoading(false);
  };

  const handleCreateDemand = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      demandSchema.parse({ type, cpf, matricula, cartorio, description });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("demands").insert({
        cca_user_id: session.user.id,
        codigo_cca: profile?.codigo_cca || "",
        type: type as Database["public"]["Enums"]["demand_type"],
        cpf: cpf || null,
        matricula: matricula || null,
        cartorio: cartorio || null,
        description: description || null,
      });

      if (error) throw error;

      // Send WhatsApp notification to manager (agencia)
      try {
        const { data: managerData } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("role", "agencia")
          .limit(1)
          .maybeSingle();

        if (managerData?.phone) {
          const typeLabel = getTypeLabel(type as Database["public"]["Enums"]["demand_type"]);
          const message = `🔔 *Nova Demanda Criada*\n\n` +
            `*CCA:* ${profile?.full_name || "N/A"} (${profile?.codigo_cca})\n` +
            `*Tipo:* ${typeLabel}\n` +
            `*CPF:* ${cpf || "N/A"}\n` +
            `*Descrição:* ${description || "N/A"}`;

          console.log("Sending WhatsApp to manager:", managerData.phone);
          const result = await supabase.functions.invoke("send-whatsapp", {
            body: { phone: managerData.phone, message },
          });
          console.log("WhatsApp result:", result);
        }
      } catch (whatsappError) {
        console.error("Failed to send WhatsApp notification:", whatsappError);
      }

      toast({
        title: "Demanda criada!",
        description: "Sua demanda foi registrada com sucesso.",
      });

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateDemand = async (demandId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("demands")
        .update({
          status: status as Database["public"]["Enums"]["demand_status"],
          response_text: responseText || null,
          concluded_at: status === "concluida" ? new Date().toISOString() : null,
        })
        .eq("id", demandId);

      if (error) throw error;

      // Send WhatsApp notification to CCA about the response
      if (selectedDemand && responseText) {
        try {
          const { data: ccaData } = await supabase
            .from("profiles")
            .select("phone, full_name")
            .eq("user_id", selectedDemand.cca_user_id)
            .maybeSingle();

          if (ccaData?.phone) {
            const typeLabel = getTypeLabel(selectedDemand.type);
            const statusLabel = status === "concluida" ? "✅ Concluída" : "❌ Cancelada";
            const message = `🔔 *Demanda Respondida*\n\n` +
              `*Status:* ${statusLabel}\n` +
              `*Tipo:* ${typeLabel}\n` +
              `*Resposta:* ${responseText}\n\n` +
              `A gerência analisou sua demanda.`;

            console.log("Sending WhatsApp to CCA:", ccaData.phone);
            const result = await supabase.functions.invoke("send-whatsapp", {
              body: { phone: ccaData.phone, message },
            });
            console.log("WhatsApp result:", result);
          }
        } catch (whatsappError) {
          console.error("Failed to send WhatsApp notification:", whatsappError);
        }
      }

      toast({
        title: "Demanda atualizada!",
        description: "Status alterado com sucesso.",
      });

      setSelectedDemand(null);
      setResponseText("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setType("");
    setCpf("");
    setMatricula("");
    setCartorio("");
    setDescription("");
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      autoriza_reavaliacao: "Autoriza Reavaliação",
      desconsidera_avaliacoes: "Desconsidera Avaliações",
      vincula_imovel: "Vincula Imóvel",
      cancela_avaliacao_sicaq: "Cancela Avaliação SICAQ",
      cancela_proposta_siopi: "Cancela Proposta SIOPI",
      solicitar_avaliacao_sigdu: "Solicitar Avaliação SIGDU",
      outras: "Outras",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendente: "default",
      concluida: "secondary",
      cancelada: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredDemands = demands.filter((demand) => {
    const statusMatch = filterStatus === "all" || demand.status === filterStatus;
    const ccaMatch = filterCCA === "all" || demand.codigo_cca === filterCCA;
    return statusMatch && ccaMatch;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Demandas</h1>
              <p className="text-sm text-muted-foreground">
                {profile?.role === "agencia" ? "Gerenciar todas as demandas" : "Suas demandas"}
              </p>
            </div>
          </div>
          {profile?.role === "cca" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Demanda
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Nova Demanda</DialogTitle>
                  <DialogDescription>Preencha os dados da demanda</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDemand} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Demanda *</Label>
                    <Select value={type} onValueChange={setType} required>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="autoriza_reavaliacao">Autoriza Reavaliação</SelectItem>
                        <SelectItem value="desconsidera_avaliacoes">Desconsidera Avaliações</SelectItem>
                        <SelectItem value="vincula_imovel">Vincula Imóvel</SelectItem>
                        <SelectItem value="cancela_avaliacao_sicaq">Cancela Avaliação SICAQ</SelectItem>
                        <SelectItem value="cancela_proposta_siopi">Cancela Proposta SIOPI</SelectItem>
                        <SelectItem value="solicitar_avaliacao_sigdu">Solicitar Avaliação SIGDU</SelectItem>
                        <SelectItem value="outras">Outras</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(type === "autoriza_reavaliacao" ||
                    type === "desconsidera_avaliacoes" ||
                    type === "cancela_avaliacao_sicaq" ||
                    type === "cancela_proposta_siopi") && (
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                      />
                    </div>
                  )}

                  {type === "vincula_imovel" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="matricula">Número da Matrícula</Label>
                        <Input
                          id="matricula"
                          placeholder="Ex: 12345"
                          value={matricula}
                          onChange={(e) => setMatricula(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cartorio">Cartório</Label>
                        <Select value={cartorio} onValueChange={setCartorio}>
                          <SelectTrigger id="cartorio">
                            <SelectValue placeholder="Selecione o cartório" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1_oficio">1º Ofício de Registro de Imóveis</SelectItem>
                            <SelectItem value="2_oficio">2º Ofício de Registro de Imóveis</SelectItem>
                            <SelectItem value="3_oficio">3º Ofício de Registro de Imóveis</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description">Observações Adicionais</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva detalhes importantes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Criar Demanda
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {profile?.role === "agencia" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1">
                <Label>CCA</Label>
                <Select value={filterCCA} onValueChange={setFilterCCA}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ccaList.map((cca) => (
                      <SelectItem key={cca} value={cca}>
                        {cca}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {filteredDemands.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma demanda encontrada
              </CardContent>
            </Card>
          ) : (
            filteredDemands.map((demand) => (
              <Card key={demand.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{getTypeLabel(demand.type)}</CardTitle>
                      <CardDescription className="mt-1">
                        CCA: {demand.codigo_cca} | Criado em:{" "}
                        {new Date(demand.created_at).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(demand.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {demand.cpf && (
                      <p>
                        <strong>CPF:</strong> {demand.cpf}
                      </p>
                    )}
                    {demand.matricula && (
                      <p>
                        <strong>Matrícula:</strong> {demand.matricula}
                      </p>
                    )}
                    {demand.cartorio && (
                      <p>
                        <strong>Cartório:</strong> {demand.cartorio}
                      </p>
                    )}
                    {demand.description && (
                      <p>
                        <strong>Observações:</strong> {demand.description}
                      </p>
                    )}
                    {demand.response_text && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="font-semibold text-success">Resposta:</p>
                        <p className="mt-1">{demand.response_text}</p>
                      </div>
                    )}
                  </div>
                  {profile?.role === "agencia" && demand.status === "pendente" && (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        placeholder="Resposta da demanda..."
                        value={selectedDemand?.id === demand.id ? responseText : ""}
                        onChange={(e) => {
                          setSelectedDemand(demand);
                          setResponseText(e.target.value);
                        }}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateDemand(demand.id, "concluida")}
                          disabled={selectedDemand?.id === demand.id && !responseText}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateDemand(demand.id, "cancelada")}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Demands;