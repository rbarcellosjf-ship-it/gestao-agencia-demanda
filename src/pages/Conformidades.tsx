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
import { ArrowLeft, Plus, Calendar, Trash2, Mail } from "lucide-react";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useEmailTemplate, generateEmail } from "@/hooks/useEmailTemplate";
import { formatEmailData } from "@/lib/emailUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { validateCPF, formatCPF } from "@/lib/cpfValidator";
import { StatusSelect } from "@/components/StatusSelect";
import { AgendarAssinaturaDialog } from "@/components/AgendarAssinaturaDialog";
import { ObservacoesField } from "@/components/ObservacoesField";
import { Textarea } from "@/components/ui/textarea";
import { DistribuirTarefaDialog } from "@/components/DistribuirTarefaDialog";
import { AgendarAssinaturaContratoDialog } from "@/components/AgendarAssinaturaContratoDialog";
import { Checkbox } from "@/components/ui/checkbox";

const conformidadeSchema = z.object({
  cpf: z.string()
    .min(11, "CPF inválido")
    .refine(validateCPF, { message: "CPF inválido" }),
  valor_financiamento: z.number().positive("Valor deve ser positivo"),
  modalidade: z.enum(["SBPE", "MCMV", "OUTRO"]),
  modalidade_outro: z.string().optional(),
});

const Conformidades = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useUserRole();
  const [profile, setProfile] = useState<any>(null);
  const [conformidades, setConformidades] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Hook para buscar template de email
  const { data: emailTemplate } = useEmailTemplate('conformidade_prioridade');

  // Form state
  const [cpf, setCpf] = useState("");
  const [valorFinanciamento, setValorFinanciamento] = useState("");
  const [modalidade, setModalidade] = useState<string>("");
  const [modalidadeOutro, setModalidadeOutro] = useState("");
  const [comiteCredito, setComiteCredito] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conformidadeToDelete, setConformidadeToDelete] = useState<string | null>(null);
  
  // Distribuir tarefa state
  const [distribuirOpen, setDistribuirOpen] = useState(false);
  const [distribuirTipo, setDistribuirTipo] = useState<"demanda" | "assinatura" | "comite">("comite");
  const [distribuirReferenciaId, setDistribuirReferenciaId] = useState<string>("");

  useEffect(() => {
    loadData();

    const conformidadesChannel = supabase
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

    const agendamentosChannel = supabase
      .channel("agendamentos-changes-conformidades")
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
      supabase.removeChannel(conformidadesChannel);
      supabase.removeChannel(agendamentosChannel);
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

    // Load agendamentos for conformidades
    const { data: agendamentosData } = await supabase
      .from("agendamentos")
      .select("*");

    setAgendamentos(agendamentosData || []);
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

      const { error } = await (supabase as any).from("conformidades").insert({
        cca_user_id: session.user.id,
        codigo_cca: profile?.codigo_cca || "",
        cpf: validatedData.cpf,
        valor_financiamento: validatedData.valor_financiamento,
        modalidade: validatedData.modalidade,
        modalidade_outro: validatedData.modalidade_outro || null,
        comite_credito: comiteCredito,
        observacoes: observacoes || null,
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
    setComiteCredito(false);
    setObservacoes("");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getAgendamentoForConformidade = (conformidadeId: string) => {
    return agendamentos.find(ag => ag.conformidade_id === conformidadeId);
  };

  const handleDeleteConformidade = async () => {
    if (!conformidadeToDelete) return;

    try {
      const { error } = await supabase
        .from("conformidades")
        .delete()
        .eq("id", conformidadeToDelete);

      if (error) throw error;

      toast({
        title: "Conformidade excluída!",
        description: "O processo foi removido com sucesso.",
      });

      setDeleteDialogOpen(false);
      setConformidadeToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePedirPrioridade = (conformidade: any) => {
    if (!emailTemplate || !profile) {
      toast({
        title: "Erro",
        description: "Template de e-mail não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      const emailData = formatEmailData(conformidade, profile);
      const email = generateEmail(emailTemplate, emailData);
      
      const mailtoLink = `mailto:${profile.email}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
      window.location.href = mailtoLink;
      
      toast({
        title: "E-mail preparado!",
        description: "O cliente de e-mail será aberto com o conteúdo pré-formatado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar e-mail",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Gerenciar Contratos</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Contratos e agendamentos
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Incluir Contrato
              </Button>
            </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Incluir Contrato</DialogTitle>
                  <DialogDescription>Preencha os dados do contrato</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateConformidade} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF do Cliente *</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      maxLength={14}
                      required
                    />
                    {cpf && !validateCPF(cpf) && (
                      <p className="text-xs text-destructive">CPF inválido</p>
                    )}
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
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="comite"
                        checked={comiteCredito}
                        onChange={(e) => setComiteCredito(e.target.checked)}
                        className="w-4 h-4 rounded border-input"
                      />
                      <Label htmlFor="comite" className="cursor-pointer">
                        Necessita aprovação do Comitê de Crédito
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <ObservacoesField
                      value={observacoes}
                      onChange={setObservacoes}
                      placeholder="Adicione observações sobre o contrato..."
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Incluir Contrato
                  </Button>
                </form>
              </DialogContent>
          </Dialog>
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
            conformidades.map((conformidade) => {
              const agendamento = getAgendamentoForConformidade(conformidade.id);
              
              return (
                <Card key={conformidade.id}>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg">CPF: {conformidade.cpf}</CardTitle>
                        <CardDescription className="mt-1">
                          CCA: {conformidade.codigo_cca} | Enviado em:{" "}
                          {new Date(conformidade.created_at).toLocaleDateString("pt-BR")}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setConformidadeToDelete(conformidade.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                      {(conformidade as any).comite_credito && (
                        <div className="md:col-span-2">
                          <Badge variant="secondary">
                            Requer Comitê de Crédito
                          </Badge>
                        </div>
                      )}
                    </div>

                    {(conformidade as any).observacoes && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Observações</Label>
                        <ObservacoesField
                          value={(conformidade as any).observacoes}
                          onChange={async (newValue) => {
                            await (supabase as any)
                              .from("conformidades")
                              .update({ observacoes: newValue })
                              .eq("id", conformidade.id);
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Status do Contrato</Label>
                      <StatusSelect 
                        conformidadeId={conformidade.id}
                        currentStatus={conformidade.status || "Em conformidade"}
                        dataAgendamento={conformidade.data_agendamento}
                      />
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePedirPrioridade(conformidade)}
                        title="Solicitar prioridade via e-mail"
                        className="w-full md:w-auto"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Pedir Prioridade
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDistribuirTipo("comite");
                          setDistribuirReferenciaId(conformidade.id);
                          setDistribuirOpen(true);
                        }}
                        title="Solicitar análise do comitê de crédito"
                        className="w-full md:w-auto"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Solicitar Comitê de Crédito
                      </Button>
                      
                      <AgendarAssinaturaContratoDialog
                        conformidade={conformidade}
                        entrevistaAprovada={conformidade.entrevista_aprovada || false}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conformidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConformidadeToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConformidade} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
      
      <DistribuirTarefaDialog
        open={distribuirOpen}
        onOpenChange={setDistribuirOpen}
        tipoTarefa={distribuirTipo}
        referenciaId={distribuirReferenciaId}
        onSuccess={() => {
          toast({
            title: "Sucesso!",
            description: "Tarefa distribuída com sucesso.",
          });
        }}
      />
    </div>
  );
};

export default Conformidades;