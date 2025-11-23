import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Trash2, Mail, Loader2, Filter } from "lucide-react";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useEmailTemplate, generateEmail } from "@/hooks/useEmailTemplate";
import { formatEmailData } from "@/lib/emailUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { validateCPF, formatCPF, normalizeCPF } from "@/lib/cpfValidator";
import { StatusSelect } from "@/components/StatusSelect";
import { AgendarAssinaturaDialog } from "@/components/AgendarAssinaturaDialog";
import { ObservacoesField } from "@/components/ObservacoesField";
import { Textarea } from "@/components/ui/textarea";
import { DistribuirTarefaDialog } from "@/components/DistribuirTarefaDialog";
import { AgendarAssinaturaContratoDialog } from "@/components/AgendarAssinaturaContratoDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConformidadeCard } from "@/components/ConformidadeCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AgendarEntrevistaDialog } from "@/components/AgendarEntrevistaDialog";
import { EditarContratoDialog } from "@/components/EditarContratoDialog";

const conformidadeSchema = z.object({
  cpf: z.string()
    .min(11, "CPF inválido")
    .refine(validateCPF, { message: "CPF inválido" }),
  valor_financiamento: z.number().positive("Valor deve ser positivo"),
  modalidade: z.enum(["SBPE", "MCMV", "OUTRO"]),
  modalidade_outro: z.string().optional(),
  tipo_contrato: z.enum(["individual", "empreendimento"]),
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
  const [tipoContrato, setTipoContrato] = useState<string>("individual");
  const [comiteCredito, setComiteCredito] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [entrevistaAprovada, setEntrevistaAprovada] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conformidadeToDelete, setConformidadeToDelete] = useState<string | null>(null);
  
  // Agendar entrevista state
  const [agendarEntrevistaOpen, setAgendarEntrevistaOpen] = useState(false);
  const [conformidadeSelecionada, setConformidadeSelecionada] = useState<any>(null);
  
  // Distribuir tarefa state
  const [distribuirOpen, setDistribuirOpen] = useState(false);
  const [distribuirTipo, setDistribuirTipo] = useState<"demanda" | "assinatura" | "comite">("comite");
  const [distribuirReferenciaId, setDistribuirReferenciaId] = useState<string>("");
  
  // Editar contrato state
  const [editarContratoOpen, setEditarContratoOpen] = useState(false);
  const [conformidadeParaEditar, setConformidadeParaEditar] = useState<any>(null);

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
        tipo_contrato: tipoContrato,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await (supabase as any).from("conformidades").insert({
        cca_user_id: session.user.id,
        codigo_cca: profile?.codigo_cca || "",
        cpf: normalizeCPF(validatedData.cpf),
        valor_financiamento: validatedData.valor_financiamento,
        modalidade: validatedData.modalidade,
        modalidade_outro: validatedData.modalidade_outro || null,
        tipo_contrato: validatedData.tipo_contrato,
        comite_credito: comiteCredito,
        observacoes: observacoes || null,
      });

      if (error) throw error;

      await loadData();

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
    setTipoContrato("individual");
    setComiteCredito(false);
    setObservacoes("");
    setEntrevistaAprovada(false);
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

  const handleAgendarEntrevista = (conformidade: any) => {
    setConformidadeSelecionada(conformidade);
    setAgendarEntrevistaOpen(true);
  };

  const handleUpdateEntrevistaAprovada = async (conformidadeId: string, aprovada: boolean) => {
    try {
      const { error } = await supabase
        .from('conformidades')
        .update({ entrevista_aprovada: aprovada })
        .eq('id', conformidadeId);

      if (error) throw error;

      toast({
        title: aprovada ? "Entrevista marcada como aprovada" : "Aprovação removida",
        description: aprovada 
          ? "O botão de agendar assinatura foi habilitado" 
          : "O agendamento de assinatura foi bloqueado",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditarContrato = (conformidade: any) => {
    setConformidadeParaEditar(conformidade);
    setEditarContratoOpen(true);
  };

  if (loading) {
    return <LoadingState message="Carregando contratos..." />;
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title="Gerenciar Contratos"
          description="Contratos e agendamentos"
          backTo="/dashboard"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Contratos" }
          ]}
          action={
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="tipo_contrato">Tipo de Contrato *</Label>
                    <Select value={tipoContrato} onValueChange={setTipoContrato} required>
                      <SelectTrigger id="tipo_contrato">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="empreendimento">Empreendimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
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
          }
        />

        <div className="grid gap-4">
          {conformidades.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nenhum contrato cadastrado"
              description="Os contratos e conformidades aparecerão aqui"
              action={
                {
                  label: "Incluir Primeiro Contrato",
                  onClick: () => setDialogOpen(true)
                }
              }
            />
          ) : (
            conformidades.map((conformidade) => {
              const agendamento = getAgendamentoForConformidade(conformidade.id);
              
              return (
                <ConformidadeCard
                  key={conformidade.id}
                  conformidade={conformidade}
                  agendamento={agendamento}
                  role={role}
                  onDelete={(id) => {
                    setConformidadeToDelete(id);
                    setDeleteDialogOpen(true);
                  }}
                  onPedirPrioridade={handlePedirPrioridade}
                  onAgendarAssinatura={(id) => {
                    // Implementar lógica de agendamento se necessário
                    toast({
                      title: "Funcionalidade em desenvolvimento",
                      description: "Agendamento de assinatura estará disponível em breve.",
                    });
                  }}
                  onDistribute={(id) => {
                    setDistribuirReferenciaId(id);
                    setDistribuirOpen(true);
                  }}
                  onUpdateObservacoes={async (id, newValue) => {
                    await supabase
                      .from("conformidades")
                      .update({ observacoes: newValue })
                      .eq("id", id);
                    
                    toast({
                      title: "Observações salvas",
                      description: "As observações foram atualizadas com sucesso.",
                    });
                  }}
                  onAgendarEntrevista={handleAgendarEntrevista}
                  onUpdateEntrevistaAprovada={handleUpdateEntrevistaAprovada}
                  onEdit={handleEditarContrato}
                  formatCurrency={formatCurrency}
                />
              );
            })
          )}
      </div>

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

      {conformidadeSelecionada && (
        <AgendarEntrevistaDialog
          open={agendarEntrevistaOpen}
          onOpenChange={setAgendarEntrevistaOpen}
          conformidadeId={conformidadeSelecionada.id}
          cpfCliente={conformidadeSelecionada.cpf}
          modalidade={conformidadeSelecionada.modalidade}
          tipoContrato={conformidadeSelecionada.tipo_contrato}
          valorFinanciamento={parseFloat(conformidadeSelecionada.valor_financiamento)}
          codigoCca={conformidadeSelecionada.codigo_cca}
          onSuccess={() => {
            setAgendarEntrevistaOpen(false);
            setConformidadeSelecionada(null);
            loadData();
          }}
        />
      )}

      {conformidadeParaEditar && (
        <EditarContratoDialog
          open={editarContratoOpen}
          onOpenChange={setEditarContratoOpen}
          conformidade={conformidadeParaEditar}
          onSuccess={() => {
            setEditarContratoOpen(false);
            setConformidadeParaEditar(null);
            loadData();
          }}
        />
      )}
      </PageContainer>
      <MobileBottomNav />
    </>
  );
};

export default Conformidades;