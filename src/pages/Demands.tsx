import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Check, X, Filter, Trash2, FileText, Mail, Lock, Send, Loader2, CheckCircle2 } from "lucide-react";
import { DistribuirTarefaDialog } from "@/components/DistribuirTarefaDialog";
import { DemandCard } from "@/components/DemandCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { useUserRole } from "@/hooks/useUserRole";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PDFViewer } from "@/components/PDFViewer";
import { useEmailTemplate, generateEmail } from "@/hooks/useEmailTemplate";
import { format } from "date-fns";
import { validateCPF, formatCPF } from "@/lib/cpfValidator";
import { useWhatsAppTemplate, generateWhatsAppMessage } from "@/hooks/useWhatsAppTemplate";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClienteCache } from "@/hooks/useClienteCache";

const demandSchema = z.object({
  type: z.enum([
    "autoriza_reavaliacao",
    "desconsidera_avaliacoes",
    "vincula_imovel",
    "cancela_avaliacao_sicaq",
    "cancela_proposta_siopi",
    "solicitar_avaliacao_sigdu",
    "incluir_pis_siopi",
    "autoriza_vendedor_restricao",
    "outras"
  ]),
  cpf: z.string().optional().refine(
    (val) => !val || validateCPF(val),
    { message: "CPF inválido" }
  ),
  matricula: z.string().optional(),
  cartorio: z.string().optional(),
  description: z.string().optional(),
  numero_pis: z.string().optional(),
});

const WHATSAPP_PHONES_KEY = "whatsapp_telefones_notificacao";

// Helper function to send WhatsApp to configured phones
const sendWhatsAppToConfiguredPhones = async (
  type: string, 
  cpf: string, 
  matricula: string,
  description: string, 
  profile: any,
  novaDemandaTemplate: any
) => {
  console.log('🔔 [WhatsApp Notification] Starting notification...');
  console.log('🔔 [WhatsApp Notification] Input params:', { 
    type, 
    cpf, 
    matricula, 
    description, 
    profileName: profile?.full_name,
    profileCode: profile?.codigo_cca,
    hasTemplate: !!novaDemandaTemplate 
  });
  
  // Buscar telefones configurados
  const { data: configData, error: configError } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", WHATSAPP_PHONES_KEY)
    .maybeSingle();

  if (configError) {
    console.error('❌ [WhatsApp Notification] Error fetching config:', configError);
    throw new Error(`Failed to fetch notification config: ${configError.message}`);
  }

  let phonesToNotify: string[] = [];
  
  if (configData?.valor) {
    try {
      phonesToNotify = JSON.parse(configData.valor);
    } catch (e) {
      console.error('❌ [WhatsApp Notification] Error parsing phones:', e);
    }
  }

  // Se não houver telefones configurados, tentar fallback para agencia ou admin
  if (phonesToNotify.length === 0) {
    console.log('⚠️ [WhatsApp Notification] No phones configured, trying fallback...');
    
    // Buscar usuários com role agencia ou admin
    const { data: roleUsers } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["agencia", "admin"]);

    if (roleUsers && roleUsers.length > 0) {
      // Priorizar agencia sobre admin
      const priorityUser = roleUsers.find(u => u.role === 'agencia') || roleUsers[0];
      
      const { data: userData } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", priorityUser.user_id)
        .single();
      
      if (userData?.phone) {
        phonesToNotify = [userData.phone];
        console.log(`✓ [WhatsApp Notification] Using ${priorityUser.role} fallback phone:`, userData.phone);
      }
    }
  }

  if (phonesToNotify.length === 0) {
    console.warn('⚠️ [WhatsApp Notification] No phones to notify');
    throw new Error('Nenhum telefone configurado para receber notificações. Configure em Configurações > Notificações.');
  }

  console.log('✓ [WhatsApp Notification] Phones to notify:', phonesToNotify);

  const typeLabels: Record<string, string> = {
    autoriza_reavaliacao: "Autoriza Reavaliação",
    desconsidera_avaliacoes: "Desconsidera Avaliações",
    vincula_imovel: "Vincula Imóvel",
    cancela_avaliacao_sicaq: "Cancela Avaliação SICAQ",
    cancela_proposta_siopi: "Cancela Proposta SIOPI",
    solicitar_avaliacao_sigdu: "Solicitar Avaliação SIGDU",
    incluir_pis_siopi: "Incluir PIS no SIOPI",
    autoriza_vendedor_restricao: "Autorização de Vendedor com Restrição",
    outras: "Outras",
  };
  const typeLabel = typeLabels[type] || type;
  
  let message: string;
  
  // Use specific template for vendor authorization
  if (type === "autoriza_vendedor_restricao") {
    const { data: autorizacaoTemplate } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('template_key', 'nova_autorizacao_vendedor')
      .maybeSingle();
    
    if (autorizacaoTemplate) {
      const templateData = {
        nome_cca: profile?.full_name || "N/A",
        codigo_cca: profile?.codigo_cca || "N/A",
        cpf: cpf || "N/A",
        matricula: matricula || "N/A"
      };
      message = generateWhatsAppMessage(autorizacaoTemplate as any, templateData);
    } else {
      message = `🔐 *Nova Autorização de Vendedor com Restrição*\n\n` +
        `*CCA:* ${profile?.full_name || "N/A"} (${profile?.codigo_cca})\n` +
        `*CPF:* ${cpf || "N/A"}\n` +
        `*Matrícula:* ${matricula || "N/A"}\n\n` +
        `📄 PDF anexado para assinatura digital no Gov.BR`;
    }
  } else if (novaDemandaTemplate) {
    const templateData = {
      nome_cca: profile?.full_name || "N/A",
      codigo_cca: profile?.codigo_cca || "N/A",
      tipo_demanda: typeLabel,
      cpf: cpf || "N/A",
      descricao: description || "N/A"
    };
    message = generateWhatsAppMessage(novaDemandaTemplate, templateData);
  } else {
    message = `🔔 *Nova Demanda Criada*\n\n` +
      `*CCA:* ${profile?.full_name || "N/A"} (${profile?.codigo_cca})\n` +
      `*Tipo:* ${typeLabel}\n` +
      `*CPF:* ${cpf || "N/A"}\n` +
      `*Descrição:* ${description || "N/A"}`;
  }

  console.log('📤 [WhatsApp Notification] Sending messages to configured phones...');
  
  // Enviar para todos os telefones configurados
  const results = await Promise.allSettled(
    phonesToNotify.map(async (phone) => {
      console.log('📤 [WhatsApp Notification] Sending to:', phone);
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { phone, message },
      });
      
      if (error) {
        console.error(`❌ [WhatsApp Notification] Error sending to ${phone}:`, error);
        throw error;
      }
      
      console.log(`✅ [WhatsApp Notification] Sent to ${phone}:`, data);
      return { phone, data };
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`📊 [WhatsApp Notification] Results: ${successful} sent, ${failed} failed`);
  
  if (successful === 0 && failed > 0) {
    throw new Error('Falha ao enviar notificações WhatsApp');
  }

  return { successful, failed, total: phonesToNotify.length };
};

// Helper function to send WhatsApp to CCA
const sendWhatsAppToCCA = async (
  demand: any,
  status: string,
  responseText: string,
  demandaRespondidaTemplate: any
) => {
  console.log('🔔 [WhatsApp CCA] Starting notification...');
  
  const { data: ccaData, error: ccaError } = await supabase
    .from("profiles")
    .select("phone, full_name")
    .eq("user_id", demand.cca_user_id)
    .maybeSingle();

  if (ccaError) {
    console.error('❌ [WhatsApp CCA] Error fetching CCA data:', ccaError);
    throw ccaError;
  }

  if (!ccaData?.phone) {
    console.warn('⚠️ [WhatsApp CCA] CCA has no phone number');
    return;
  }

  console.log('✓ [WhatsApp CCA] CCA phone found:', ccaData.phone);

  const typeLabels: Record<string, string> = {
    autoriza_reavaliacao: "Autoriza Reavaliação",
    desconsidera_avaliacoes: "Desconsidera Avaliações",
    vincula_imovel: "Vincula Imóvel",
    cancela_avaliacao_sicaq: "Cancela Avaliação SICAQ",
    cancela_proposta_siopi: "Cancela Proposta SIOPI",
    solicitar_avaliacao_sigdu: "Solicitar Avaliação SIGDU",
    incluir_pis_siopi: "Incluir PIS no SIOPI",
    autoriza_vendedor_restricao: "Autorização de Vendedor com Restrição",
    outras: "Outras",
  };
  const typeLabel = typeLabels[demand.type] || demand.type;
  const statusLabel = status === "concluida" ? "✅ Concluída" : "❌ Cancelada";
  
  let message: string;
  if (demandaRespondidaTemplate) {
    const templateData = {
      status: statusLabel,
      tipo_demanda: typeLabel,
      resposta: responseText
    };
    message = generateWhatsAppMessage(demandaRespondidaTemplate, templateData);
  } else {
    message = `🔔 *Demanda Respondida*\n\n` +
      `*Status:* ${statusLabel}\n` +
      `*Tipo:* ${typeLabel}\n` +
      `*Resposta:* ${responseText}\n\n` +
      `A gerência analisou sua demanda.`;
  }

  console.log('📤 [WhatsApp CCA] Sending message...');
  
  const { data, error } = await supabase.functions.invoke("send-whatsapp", {
    body: { phone: ccaData.phone, message },
  });
  
  if (error) {
    console.error('❌ [WhatsApp CCA] Send error:', error);
    throw error;
  }

  console.log('✅ [WhatsApp CCA] Message sent successfully:', data);
};

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
  const { role, loading: roleLoading } = useUserRole();
  const { data: sigduTemplate } = useEmailTemplate('sigdu_solicitacao');
  const { data: novaDemandaTemplate } = useWhatsAppTemplate('nova_demanda');
  const { data: demandaRespondidaTemplate } = useWhatsAppTemplate('demanda_respondida');

  // Form state
  const [type, setType] = useState<string>("");
  const [cpf, setCpf] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [clientePreenchido, setClientePreenchido] = useState(false);
  const [matricula, setMatricula] = useState("");
  const [cartorio, setCartorio] = useState("");
  const [description, setDescription] = useState("");
  const [numeroPis, setNumeroPis] = useState("");
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [selectedDemand, setSelectedDemand] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<string | null>(null);
  
  // Hook de cache de clientes
  const { clienteData, loading: cacheLoading, salvarCliente, buscarCliente, limparCache } = useClienteCache();
  
  // Distribuir tarefa state
  const [distribuirOpen, setDistribuirOpen] = useState(false);
  const [distribuirReferenciaId, setDistribuirReferenciaId] = useState("");

  // PDF upload state
  const [cartaSolicitacaoFile, setCartaSolicitacaoFile] = useState<File | null>(null);
  const [fichaCadastroFile, setFichaCadastroFile] = useState<File | null>(null);
  const [matriculaImovelFile, setMatriculaImovelFile] = useState<File | null>(null);
  const [moAutorizacaoFile, setMoAutorizacaoFile] = useState<File | null>(null);
  const [moAutorizacaoAssinadoFile, setMoAutorizacaoAssinadoFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // PDF viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [viewingPdfUrl, setViewingPdfUrl] = useState("");
  const [viewingPdfName, setViewingPdfName] = useState("");
  
  // Auto-preencher quando encontrar dados no cache
  useEffect(() => {
    if (clienteData && dialogOpen) {
      if (clienteData.nome && !nomeCliente) {
        setNomeCliente(clienteData.nome);
        setClientePreenchido(true);
      }
      if (clienteData.telefone && !telefoneCliente) {
        setTelefoneCliente(clienteData.telefone);
        setClientePreenchido(true);
      }
    }
  }, [clienteData, dialogOpen]);

  // Buscar no cache quando CPF mudar
  const handleCpfChange = (value: string) => {
    const formattedCpf = formatCPF(value);
    setCpf(formattedCpf);
    setClientePreenchido(false);
    
    // Buscar no cache se CPF válido
    if (validateCPF(formattedCpf)) {
      buscarCliente(formattedCpf);
    }
  };

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

  const uploadPdf = async (file: File, fieldName: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fieldName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('demand-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Retorna apenas o path, não a URL completa
      return filePath;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      return null;
    }
  };

  const handleCreateDemand = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      demandSchema.parse({ type, cpf, matricula, cartorio, description, numero_pis: numeroPis });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUploadingPdf(true);

      // Upload PDFs if present
      let cartaSolicitacaoPdfUrl = null;
      let fichaCadastroPdfUrl = null;
      let matriculaImovelPdfUrl = null;
      let moAutorizacaoPdfUrl = null;

      if (cartaSolicitacaoFile) {
        cartaSolicitacaoPdfUrl = await uploadPdf(cartaSolicitacaoFile, 'carta_solicitacao');
      }
      if (fichaCadastroFile) {
        fichaCadastroPdfUrl = await uploadPdf(fichaCadastroFile, 'ficha_cadastro');
      }
      if (matriculaImovelFile) {
        matriculaImovelPdfUrl = await uploadPdf(matriculaImovelFile, 'matricula_imovel');
      }
      if (moAutorizacaoFile) {
        moAutorizacaoPdfUrl = await uploadPdf(moAutorizacaoFile, 'mo_autorizacao');
      }

      const { error } = await supabase.from("demands").insert({
        cca_user_id: session.user.id,
        codigo_cca: profile?.codigo_cca || "",
        type: type as Database["public"]["Enums"]["demand_type"],
        cpf: cpf || null,
        nome_cliente: nomeCliente || null,
        matricula: matricula || null,
        cartorio: cartorio || null,
        description: description || null,
        numero_pis: numeroPis || null,
        carta_solicitacao_pdf: cartaSolicitacaoPdfUrl,
        ficha_cadastro_pdf: fichaCadastroPdfUrl,
        matricula_imovel_pdf: matriculaImovelPdfUrl,
        mo_autorizacao_pdf: moAutorizacaoPdfUrl,
        status: type === "autoriza_vendedor_restricao" ? "aguardando_assinatura" : "pendente",
      });

      if (error) throw error;

      // Salvar no cache de clientes
      if (cpf) {
        await salvarCliente(cpf, nomeCliente, telefoneCliente);
      }

      console.log('✅ [Demand Created] Starting WhatsApp notification process...');
      console.log('📋 [Demand Data]', { type, cpf, matricula, description, profile, hasTemplate: !!novaDemandaTemplate });

      // Send WhatsApp notification to configured phones - RUNS INDEPENDENTLY
      sendWhatsAppToConfiguredPhones(type, cpf, matricula, description, profile, novaDemandaTemplate)
        .then((result) => {
          console.log('✅ [WhatsApp] Notification sent successfully', result);
          toast({
            title: "WhatsApp enviado!",
            description: `Notificação enviada para ${result.successful} telefone(s).`,
          });
        })
        .catch(err => {
          console.error("❌ [WhatsApp] Notification failed:", err);
          toast({
            title: "WhatsApp não enviado",
            description: `Erro: ${err.message}`,
            variant: "destructive",
          });
        });
      
      // Close dialog and reset form AFTER everything is done
      setDialogOpen(false);
      resetForm();
      
      toast({
        title: "Demanda criada!",
        description: "Sua demanda foi registrada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleUpdateDemand = async (demandId: string, status: string, responseTextParam: string) => {
    try {
      const { error } = await supabase
        .from("demands")
        .update({
          status: status as Database["public"]["Enums"]["demand_status"],
          response_text: responseTextParam || null,
          concluded_at: status === "concluida" ? new Date().toISOString() : null,
        })
        .eq("id", demandId);

      if (error) throw error;

      // Find the demand for WhatsApp notification
      const demand = demands.find(d => d.id === demandId);
      
      // Send WhatsApp notification to CCA about the response - RUNS INDEPENDENTLY
      if (demand && responseTextParam) {
        sendWhatsAppToCCA(demand, status, responseTextParam, demandaRespondidaTemplate).catch(err => {
          console.error("WhatsApp notification to CCA failed:", err);
        });
      }

      toast({
        title: "Demanda atualizada!",
        description: "Status alterado com sucesso.",
      });

      // Clear the response text for this specific demand
      setResponseTexts(prev => {
        const newTexts = { ...prev };
        delete newTexts[demandId];
        return newTexts;
      });
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
    setNomeCliente("");
    setTelefoneCliente("");
    setClientePreenchido(false);
    setMatricula("");
    setCartorio("");
    setDescription("");
    setNumeroPis("");
    setCartaSolicitacaoFile(null);
    setFichaCadastroFile(null);
    setMatriculaImovelFile(null);
    setMoAutorizacaoFile(null);
    setMoAutorizacaoAssinadoFile(null);
    limparCache();
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      autoriza_reavaliacao: "Autoriza Reavaliação",
      desconsidera_avaliacoes: "Desconsidera Avaliações",
      vincula_imovel: "Vincula Imóvel",
      cancela_avaliacao_sicaq: "Cancela Avaliação SICAQ",
      cancela_proposta_siopi: "Cancela Proposta SIOPI",
      solicitar_avaliacao_sigdu: "Solicitar Avaliação SIGDU",
      incluir_pis_siopi: "Incluir PIS no SIOPI",
      autoriza_vendedor_restricao: "Autorização de Vendedor com Restrição",
      outras: "Outras",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendente: "default",
      aguardando_assinatura: "default",
      assinado: "secondary",
      concluida: "secondary",
      cancelada: "destructive",
    };
    
    const labels: Record<string, string> = {
      pendente: "Pendente",
      aguardando_assinatura: "Aguardando Assinatura",
      assinado: "Assinado",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };
    
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDeleteDemand = async () => {
    if (!demandToDelete) return;

    try {
      const { error } = await supabase
        .from("demands")
        .delete()
        .eq("id", demandToDelete);

      if (error) throw error;

      toast({
        title: "Demanda excluída!",
        description: "A demanda foi removida com sucesso.",
      });

      setDeleteDialogOpen(false);
      setDemandToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewPdf = async (pdfPath: string | null, fileName: string) => {
    if (!pdfPath) {
      toast({
        title: "Erro",
        description: "Arquivo PDF não encontrado",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Cria uma URL assinada válida por 1 hora para buckets privados
      const { data, error } = await supabase.storage
        .from('demand-pdfs')
        .createSignedUrl(pdfPath, 3600); // 3600 segundos = 1 hora

      if (error) throw error;

      if (!data?.signedUrl) {
        throw new Error('URL assinada não gerada');
      }

      setViewingPdfUrl(data.signedUrl);
      setViewingPdfName(fileName);
      setPdfViewerOpen(true);
    } catch (error: any) {
      console.error('Error opening PDF:', error);
      toast({
        title: "Erro ao abrir PDF",
        description: error.message || "Não foi possível carregar o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleSendSigduEmail = (demand: any) => {
    if (!sigduTemplate || !profile) {
      toast({
        title: "Erro",
        description: "Template de e-mail não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      const emailData = {
        cpf: demand.cpf || '',
        matricula: demand.matricula || '',
        codigo_cca: profile.codigo_cca || '',
        nome_cca: profile.full_name || '',
        data_solicitacao: format(new Date(demand.created_at), "dd/MM/yyyy"),
        telefone_cca: profile.phone || '',
        observacoes: demand.description || 'Sem observações adicionais'
      };

      const email = generateEmail(sigduTemplate, emailData);
      
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

  const handleOpenGovBRSigning = async (demand: any) => {
    if (!demand.mo_autorizacao_pdf) {
      toast({
        title: "Erro",
        description: "PDF de autorização não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Preparando download...",
        description: "Aguarde enquanto preparamos o PDF",
      });

      // Generate signed URL for the PDF (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('demand-pdfs')
        .createSignedUrl(demand.mo_autorizacao_pdf, 3600);

      if (error) throw error;

      if (!data?.signedUrl) {
        throw new Error('URL assinada não gerada');
      }

      // Download using fetch + Blob (robust and reliable)
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error('Erro ao baixar PDF');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `autorizacao_${demand.cpf || 'documento'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      // Open Gov.BR signing portal
      window.open('https://assinador.iti.br/assinatura/', '_blank');

      toast({
        title: "Download concluído!",
        description: "PDF baixado. Assine no Gov.BR e depois faça upload do arquivo assinado.",
        duration: 8000,
      });
    } catch (error: any) {
      console.error('Error opening Gov.BR:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível baixar o PDF",
        variant: "destructive",
      });
    }
  };

  const handleUploadSignedPdf = async (demand: any, file: File) => {
    try {
      setUploadingPdf(true);
      
      // Upload the signed PDF
      const signedPdfPath = await uploadPdf(file, 'mo_autorizacao_assinado');
      
      if (!signedPdfPath) {
        throw new Error('Erro ao fazer upload do PDF assinado');
      }

      // Update the demand with the signed PDF and change status
      const { error } = await supabase
        .from('demands')
        .update({
          mo_autorizacao_assinado_pdf: signedPdfPath,
          status: 'assinado',
          assinatura_data: new Date().toISOString(),
        })
        .eq('id', demand.id);

      if (error) throw error;

      toast({
        title: "PDF assinado enviado!",
        description: "O documento assinado foi carregado com sucesso.",
      });

      // Close the file input
      const fileInput = document.getElementById(`signed-pdf-${demand.id}`) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      console.error('Error uploading signed PDF:', error);
      toast({
        title: "Erro ao enviar PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSendSignedDocumentEmail = async (demand: any) => {
    if (!demand.mo_autorizacao_assinado_pdf) {
      toast({
        title: "Erro",
        description: "PDF assinado não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);

      toast({
        title: "Enviando...",
        description: "Processando e enviando o PDF assinado por email e WhatsApp",
      });

      console.log('📧 Sending email for demand:', demand.id);

      // Call edge function to send email with attachment
      // The edge function will fetch CCA email and name using service role
      const { data, error } = await supabase.functions.invoke('send-signed-document-email', {
        body: {
          demandId: demand.id,
          ccaUserId: demand.cca_user_id,
          cpf: demand.cpf || '',
          matricula: demand.matricula || '',
          pdfPath: demand.mo_autorizacao_assinado_pdf,
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Enviado com sucesso!",
        description: "O PDF assinado foi enviado por email e WhatsApp para o CCA",
      });

      // Update demand to concluded
      await supabase
        .from('demands')
        .update({ status: 'concluida' })
        .eq('id', demand.id);

    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredDemands = demands.filter((demand) => {
    const statusMatch = filterStatus === "all" || demand.status === filterStatus;
    const ccaMatch = filterCCA === "all" || demand.codigo_cca === filterCCA;
    return statusMatch && ccaMatch;
  });

  if (loading || roleLoading) {
    return <LoadingState message="Carregando demandas..." />;
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title="Demandas"
          description={role === "agencia" ? "Gerenciar todas as demandas" : "Suas demandas"}
          backTo="/dashboard"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Demandas" }
          ]}
          action={
            role === "cca" && (
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
                        <SelectItem value="incluir_pis_siopi">Incluir PIS no SIOPI</SelectItem>
                        <SelectItem value="autoriza_vendedor_restricao">Autorização de Vendedor com Restrição</SelectItem>
                        <SelectItem value="outras">Outras</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(type === "autoriza_reavaliacao" ||
                    type === "desconsidera_avaliacoes" ||
                    type === "cancela_avaliacao_sicaq" ||
                    type === "cancela_proposta_siopi" ||
                    type === "solicitar_avaliacao_sigdu" ||
                    type === "incluir_pis_siopi" ||
                    type === "autoriza_vendedor_restricao") && (
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        maxLength={14}
                      />
                      {cpf && !validateCPF(cpf) && (
                        <p className="text-xs text-destructive">CPF inválido</p>
                      )}
                      {cacheLoading && (
                        <p className="text-xs text-muted-foreground">Buscando dados...</p>
                      )}
                    </div>
                  )}

                  {(type === "autoriza_reavaliacao" ||
                    type === "desconsidera_avaliacoes" ||
                    type === "cancela_avaliacao_sicaq" ||
                    type === "cancela_proposta_siopi" ||
                    type === "solicitar_avaliacao_sigdu" ||
                    type === "incluir_pis_siopi" ||
                    type === "autoriza_vendedor_restricao") && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="nomeCliente">Nome do Cliente</Label>
                        {clientePreenchido && clienteData?.nome && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Preenchido
                          </span>
                        )}
                      </div>
                      <Input
                        id="nomeCliente"
                        placeholder="Nome completo do cliente"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                  )}

                  {(type === "autoriza_reavaliacao" ||
                    type === "desconsidera_avaliacoes" ||
                    type === "cancela_avaliacao_sicaq" ||
                    type === "cancela_proposta_siopi" ||
                    type === "solicitar_avaliacao_sigdu" ||
                    type === "incluir_pis_siopi" ||
                    type === "autoriza_vendedor_restricao") && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="telefoneCliente">Telefone do Cliente</Label>
                        {clientePreenchido && clienteData?.telefone && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Preenchido
                          </span>
                        )}
                      </div>
                      <Input
                        id="telefoneCliente"
                        placeholder="(11) 99999-9999"
                        value={telefoneCliente}
                        onChange={(e) => setTelefoneCliente(e.target.value)}
                        maxLength={20}
                      />
                    </div>
                  )}

                  {type === "cancela_avaliacao_sicaq" && (
                    <div className="space-y-2">
                      <Label htmlFor="carta_solicitacao">Carta de Solicitação (PDF - Opcional)</Label>
                      <Input
                        id="carta_solicitacao"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setCartaSolicitacaoFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  )}

                  {type === "incluir_pis_siopi" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="ficha_cadastro">Ficha Cadastro (PDF - Opcional)</Label>
                        <Input
                          id="ficha_cadastro"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setFichaCadastroFile(e.target.files?.[0] || null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numero_pis">Número de PIS</Label>
                        <Input
                          id="numero_pis"
                          placeholder="000.00000.00-0"
                          value={numeroPis}
                          onChange={(e) => setNumeroPis(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {type === "solicitar_avaliacao_sigdu" && (
                    <div className="space-y-2">
                      <Label htmlFor="matricula_imovel">Matrícula Imóvel (PDF - Opcional)</Label>
                      <Input
                        id="matricula_imovel"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setMatriculaImovelFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  )}

                  {type === "autoriza_vendedor_restricao" && (
                    <div className="space-y-2">
                      <Label htmlFor="mo_autorizacao">MO de Autorização (PDF) *</Label>
                      <Input
                        id="mo_autorizacao"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setMoAutorizacaoFile(e.target.files?.[0] || null)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Este PDF será assinado digitalmente no Gov.BR pela gerência
                      </p>
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

                  <Button type="submit" className="w-full" disabled={uploadingPdf}>
                    {uploadingPdf ? "Enviando..." : "Criar Demanda"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )
          }
        />

        {role === "agencia" && (
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
                    <SelectItem value="aguardando_assinatura">Aguardando Assinatura</SelectItem>
                    <SelectItem value="assinado">Assinado</SelectItem>
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
            <EmptyState
              icon={FileText}
              title="Nenhuma demanda encontrada"
              description="Não há demandas que correspondam aos filtros selecionados."
            />
          ) : (
            filteredDemands.map((demand) => (
              <DemandCard
                key={demand.id}
                demand={demand}
                role={role}
                responseText={responseTexts[demand.id] || ""}
                onResponseChange={(text) => setResponseTexts({ ...responseTexts, [demand.id]: text })}
                onUpdate={handleUpdateDemand}
                onDelete={(id) => {
                  setDemandToDelete(id);
                  setDeleteDialogOpen(true);
                }}
                onViewPdf={handleViewPdf}
                onSendSigduEmail={handleSendSigduEmail}
                onOpenGovBRSigning={handleOpenGovBRSigning}
                onUploadSignedPdf={handleUploadSignedPdf}
                onSendSignedDocument={handleSendSignedDocumentEmail}
                onDistribute={(id) => {
                  setDistribuirReferenciaId(id);
                  setDistribuirOpen(true);
                }}
                getTypeLabel={getTypeLabel}
                getStatusBadge={getStatusBadge}
              />
            ))
          )}
        </div>

      <DistribuirTarefaDialog
        open={distribuirOpen}
        onOpenChange={setDistribuirOpen}
        tipoTarefa="demanda"
        referenciaId={distribuirReferenciaId}
        onSuccess={() => {
          toast({
            title: "Tarefa distribuída!",
            description: "A demanda foi atribuída com sucesso.",
          });
          loadData();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDemandToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDemand} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PDFViewer
        fileUrl={viewingPdfUrl}
        fileName={viewingPdfName}
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
      />
      </PageContainer>
      <MobileBottomNav />
    </>
  );
};

export default Demands;
