import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const agendamentoSchema = z.object({
  conformidade_id: z.string().uuid(),
  data_hora: z.date(),
  tipo: z.enum(["assinatura", "entrevista"]),
  observacoes: z.string().optional(),
});

const Agendamentos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [conformidades, setConformidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [conformidadeId, setConformidadeId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    const conformidadeParam = searchParams.get("conformidade");
    if (conformidadeParam) {
      setConformidadeId(conformidadeParam);
      setDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("agendamentos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamentos",
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

    const { data: agendamentosData } = await supabase
      .from("agendamentos")
      .select(`
        *,
        conformidades (
          cpf,
          valor_financiamento,
          modalidade,
          codigo_cca
        )
      `)
      .order("data_hora", { ascending: true });

    setAgendamentos(agendamentosData || []);

    const { data: conformidadesData } = await supabase
      .from("conformidades")
      .select("*")
      .order("created_at", { ascending: false });

    setConformidades(conformidadesData || []);

    setLoading(false);
  };

  const handleCreateAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!date || !time) {
        throw new Error("Data e hora são obrigatórios");
      }

      const [hours, minutes] = time.split(":");
      const dataHora = new Date(date);
      dataHora.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const validatedData = agendamentoSchema.parse({
        conformidade_id: conformidadeId,
        data_hora: dataHora,
        tipo,
        observacoes: observacoes || undefined,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("agendamentos").insert({
        conformidade_id: validatedData.conformidade_id,
        cca_user_id: session.user.id,
        data_hora: validatedData.data_hora.toISOString(),
        tipo: validatedData.tipo,
        observacoes: validatedData.observacoes || null,
      });

      if (error) throw error;

      toast({
        title: "Agendamento criado!",
        description: "O agendamento foi registrado com sucesso.",
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
    setConformidadeId("");
    setDate(undefined);
    setTime("");
    setTipo("");
    setObservacoes("");
  };

  const groupByDate = (agendamentos: any[]) => {
    const grouped: Record<string, any[]> = {};
    agendamentos.forEach((agendamento) => {
      const dateKey = format(new Date(agendamento.data_hora), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(agendamento);
    });
    return grouped;
  };

  const groupedAgendamentos = groupByDate(agendamentos);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Voltar</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Agendamentos</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Calendário de assinaturas e entrevistas
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Agendamento</DialogTitle>
                  <DialogDescription>Agende uma assinatura ou entrevista</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAgendamento} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="conformidade">Processo em Conformidade *</Label>
                    <Select value={conformidadeId} onValueChange={setConformidadeId} required>
                      <SelectTrigger id="conformidade">
                        <SelectValue placeholder="Selecione o processo" />
                      </SelectTrigger>
                      <SelectContent>
                        {conformidades.map((conf) => (
                          <SelectItem key={conf.id} value={conf.id}>
                            CPF: {conf.cpf} - {conf.modalidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select value={tipo} onValueChange={setTipo} required>
                      <SelectTrigger id="tipo">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assinatura">Assinatura</SelectItem>
                        <SelectItem value="entrevista">Entrevista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          className="pointer-events-auto"
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horário *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Observações adicionais..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Criar Agendamento
                  </Button>
                </form>
              </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {Object.keys(groupedAgendamentos).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum agendamento encontrado
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedAgendamentos).map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {format(new Date(dateKey), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <div className="grid gap-4">
                  {items.map((agendamento: any) => (
                    <Card key={agendamento.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Clock className="w-5 h-5 text-primary" />
                              {format(new Date(agendamento.data_hora), "HH:mm")} -{" "}
                              {agendamento.tipo.charAt(0).toUpperCase() + agendamento.tipo.slice(1)}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              CPF: {agendamento.conformidades?.cpf} | CCA:{" "}
                              {agendamento.conformidades?.codigo_cca} | Valor:{" "}
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(Number(agendamento.conformidades?.valor_financiamento))}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {agendamento.observacoes && (
                          <div className="text-sm">
                            <p className="text-muted-foreground">Observações:</p>
                            <p className="mt-1">{agendamento.observacoes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Agendamentos;