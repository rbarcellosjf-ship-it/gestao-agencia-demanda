import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Calendar } from "lucide-react";
import { z } from "zod";

const conformidadeSchema = z.object({
  cpf: z.string().min(11, "CPF inválido"),
  valor_financiamento: z.number().positive("Valor deve ser positivo"),
  modalidade: z.enum(["SBPE", "MCMV", "OUTRO"]),
  modalidade_outro: z.string().optional(),
});

const Conformidades = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [conformidades, setConformidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [cpf, setCpf] = useState("");
  const [valorFinanciamento, setValorFinanciamento] = useState("");
  const [modalidade, setModalidade] = useState<string>("");
  const [modalidadeOutro, setModalidadeOutro] = useState("");

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("conformidades-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conformidades",
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

    const { data: conformidadesData } = await supabase
      .from("conformidades")
      .select("*")
      .order("created_at", { ascending: false });

    setConformidades(conformidadesData || []);
    setLoading(false);
  };

  const handleCreateConformidade = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = conformidadeSchema.parse({
        cpf,
        valor_financiamento: parseFloat(valorFinanciamento),
        modalidade,
        modalidade_outro: modalidade === "OUTRO" ? modalidadeOutro : undefined,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("conformidades").insert({
        cca_user_id: session.user.id,
        codigo_cca: profile?.codigo_cca || "",
        cpf: validatedData.cpf,
        valor_financiamento: validatedData.valor_financiamento,
        modalidade: validatedData.modalidade,
        modalidade_outro: validatedData.modalidade_outro || null,
      });

      if (error) throw error;

      toast({
        title: "Processo enviado!",
        description: "Processo enviado para conformidade com sucesso.",
      });

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setCpf("");
    setValorFinanciamento("");
    setModalidade("");
    setModalidadeOutro("");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
              <h1 className="text-2xl font-bold text-foreground">Conformidades</h1>
              <p className="text-sm text-muted-foreground">
                {profile?.role === "agencia"
                  ? "Processos em conformidade"
                  : "Enviar processos para conformidade"}
              </p>
            </div>
          </div>
          {profile?.role === "cca" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Enviar Processo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar Processo para Conformidade</DialogTitle>
                  <DialogDescription>Preencha os dados do processo</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateConformidade} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF do Cliente *</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor do Financiamento *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={valorFinanciamento}
                      onChange={(e) => setValorFinanciamento(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modalidade">Modalidade *</Label>
                    <Select value={modalidade} onValueChange={setModalidade} required>
                      <SelectTrigger id="modalidade">
                        <SelectValue placeholder="Selecione a modalidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SBPE">SBPE</SelectItem>
                        <SelectItem value="MCMV">MCMV</SelectItem>
                        <SelectItem value="OUTRO">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {modalidade === "OUTRO" && (
                    <div className="space-y-2">
                      <Label htmlFor="modalidade-outro">Especifique a Modalidade *</Label>
                      <Input
                        id="modalidade-outro"
                        placeholder="Digite a modalidade"
                        value={modalidadeOutro}
                        onChange={(e) => setModalidadeOutro(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full">
                    Enviar para Conformidade
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
          {conformidades.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum processo em conformidade
              </CardContent>
            </Card>
          ) : (
            conformidades.map((conformidade) => (
              <Card key={conformidade.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">CPF: {conformidade.cpf}</CardTitle>
                      <CardDescription className="mt-1">
                        CCA: {conformidade.codigo_cca} | Enviado em:{" "}
                        {new Date(conformidade.created_at).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    {profile?.role === "cca" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/agendamentos?conformidade=${conformidade.id}`)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Agendar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor do Financiamento</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(parseFloat(conformidade.valor_financiamento))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Modalidade</p>
                      <p className="font-semibold">
                        {conformidade.modalidade === "OUTRO"
                          ? conformidade.modalidade_outro
                          : conformidade.modalidade}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Conformidades;