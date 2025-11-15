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
import { ArrowLeft, Plus, Check, X, Filter, Trash2, FileText, Mail, Lock, Send } from "lucide-react";
import { DistribuirTarefaDialog } from "@/components/DistribuirTarefaDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { useUserRole } from "@/hooks/useUserRole";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PDFViewer } from "@/components/PDFViewer";
import { useEmailTemplate, generateEmail } from "@/hooks/useEmailTemplate";
import { format } from "date-fns";
import { validateCPF, formatCPF } from "@/lib/cpfValidator";
import { useWhatsAppTemplate, generateWhatsAppMessage } from "@/hooks/useWhatsAppTemplate";

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

// Helper function to send WhatsApp to manager
const sendWhatsAppToManager = async (
  type: string, 
  cpf: string, 
  matricula: string,
  description: string, 
  profile: any,
  novaDemandaTemplate: any
) => {
  console.log('🔔 [WhatsApp Manager] Starting notification...');
  console.log('🔔 [WhatsApp Manager] Input params:', { 
    type, 
    cpf, 
    matricula, 
    description, 
    profileName: profile?.full_name,
    profileCode: profile?.codigo_cca,
    hasTemplate: !!novaDemandaTemplate 
  });
  
  const { data: agenciaRoles, error: roleError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "agencia")
    .limit(1)
    .maybeSingle();

  console.log('🔍 [WhatsApp Manager] Query result:', { agenciaRoles, roleError });

  if (roleError) {
    console.error('❌ [WhatsApp Manager] Error fetching agencia role:', roleError);
    throw new Error(`Failed to fetch agencia role: ${roleError.message}`);
  }

  if (!agenciaRoles?.user_id) {
    console.warn('⚠️ [WhatsApp Manager] No agencia user found');
    throw new Error('No agencia user found in the system');
  }

  console.log('✓ [WhatsApp Manager] Found agencia user:', agenciaRoles.user_id);

  const { data: managerData, error: managerError } = await supabase
    .from("profiles")
    .select("phone, full_name")
    .eq("user_id", agenciaRoles.user_id)
    .single();

  console.log('🔍 [WhatsApp Manager] Manager data result:', { managerData, managerError });

  if (managerError) {
    console.error('❌ [WhatsApp Manager] Error fetching manager data:', managerError);
    throw new Error(`Failed to fetch manager profile: ${managerError.message}`);
  }

  if (!managerData?.phone) {
    console.warn('⚠️ [WhatsApp Manager] Manager has no phone number');
    throw new Error('Manager profile exists but has no phone number configured');
  }

  console.log('✓ [WhatsApp Manager] Manager phone found:', managerData.phone);

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

  console.log('📤 [WhatsApp Manager] Sending message...');
  console.log('📤 [WhatsApp Manager] Message payload:', { 
    phone: managerData.phone, 
    messageLength: message.length,
    messagePreview: message.substring(0, 100) + '...'
  });
  
  const { data, error } = await supabase.functions.invoke("send-whatsapp", {
    body: { phone: managerData.phone, message },
  });
  
  console.log('📥 [WhatsApp Manager] Edge function response:', { data, error });
  
  if (error) {
    console.error('❌ [WhatsApp Manager] Send error:', error);
    throw new Error(`Failed to send WhatsApp: ${error.message}`);
  }

  console.log('✅ [WhatsApp Manager] Message sent successfully:', data);
  return data;
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
  const [matricula, setMatricula] = useState("");
  const [cartorio, setCartorio] = useState("");
  const [description, setDescription] = useState("");
  const [numeroPis, setNumeroPis] = useState("");
  const [responseText, setResponseText] = useState("");
  const [selectedDemand, setSelectedDemand] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<string | null>(null);
  
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

      console.log('✅ [Demand Created] Starting WhatsApp notification process...');
      console.log('📋 [Demand Data]', { type, cpf, matricula, description, profile, hasTemplate: !!novaDemandaTemplate });

      // Send WhatsApp notification to manager (agencia) - RUNS INDEPENDENTLY
      sendWhatsAppToManager(type, cpf, matricula, description, profile, novaDemandaTemplate)
        .then(() => {
          console.log('✅ [WhatsApp] Notification sent successfully');
          toast({
            title: "WhatsApp enviado!",
            description: "Notificação enviada para o gerente.",
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

      // Send WhatsApp notification to CCA about the response - RUNS INDEPENDENTLY
      if (selectedDemand && responseText) {
        sendWhatsAppToCCA(selectedDemand, status, responseText, demandaRespondidaTemplate).catch(err => {
          console.error("WhatsApp notification to CCA failed:", err);
        });
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
    setNumeroPis("");
    setCartaSolicitacaoFile(null);
    setFichaCadastroFile(null);
    setMatriculaImovelFile(null);
    setMoAutorizacaoFile(null);
    setMoAutorizacaoAssinadoFile(null);
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
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Demandas</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {role === "agencia" ? "Gerenciar todas as demandas" : "Suas demandas"}
              </p>
            </div>
          </div>
          {role === "cca" && (
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
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        maxLength={14}
                      />
                      {cpf && !validateCPF(cpf) && (
                        <p className="text-xs text-destructive">CPF inválido</p>
                      )}
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
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
                    <div className="flex-1">
                      <CardTitle className="text-lg">{getTypeLabel(demand.type)}</CardTitle>
                      <CardDescription className="mt-1">
                        CCA: {demand.codigo_cca} | Criado em:{" "}
                        {new Date(demand.created_at).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(demand.status)}
                      {demand.type === "solicitar_avaliacao_sigdu" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendSigduEmail(demand)}
                          title="Enviar solicitação por e-mail"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDemandToDelete(demand.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
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
                    {demand.numero_pis && (
                      <p>
                        <strong>Número de PIS:</strong> {demand.numero_pis}
                      </p>
                    )}
                    {demand.description && (
                      <p>
                        <strong>Observações:</strong> {demand.description}
                      </p>
                    )}
                    
                    {/* PDF Files */}
                    {(demand.carta_solicitacao_pdf || demand.ficha_cadastro_pdf || demand.matricula_imovel_pdf || demand.mo_autorizacao_pdf || demand.mo_autorizacao_assinado_pdf) && (
                      <div className="mt-3 space-y-2">
                        <p className="font-semibold">Arquivos anexados:</p>
                        <div className="flex flex-wrap gap-2">
                          {demand.carta_solicitacao_pdf && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPdf(demand.carta_solicitacao_pdf, "Carta de Solicitação")}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Carta de Solicitação
                            </Button>
                          )}
                          {demand.ficha_cadastro_pdf && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPdf(demand.ficha_cadastro_pdf, "Ficha Cadastro")}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Ficha Cadastro
                            </Button>
                          )}
                          {demand.matricula_imovel_pdf && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPdf(demand.matricula_imovel_pdf, "Matrícula Imóvel")}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Matrícula Imóvel
                            </Button>
                          )}
                          {demand.mo_autorizacao_pdf && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPdf(demand.mo_autorizacao_pdf, "MO de Autorização")}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              MO de Autorização
                            </Button>
                          )}
                          {demand.mo_autorizacao_assinado_pdf && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPdf(demand.mo_autorizacao_assinado_pdf, "MO de Autorização Assinado")}
                              className="bg-success/10 border-success text-success hover:bg-success/20"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              MO Assinado ✓
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Special actions for vendor authorization */}
                    {demand.type === "autoriza_vendedor_restricao" && role === "agencia" && (
                      <div className="mt-4 space-y-3 p-4 bg-muted/50 rounded-md border border-border">
                        <p className="font-semibold text-sm">🔐 Assinatura Digital Gov.BR</p>
                        
                        {demand.status === "aguardando_assinatura" && (
                          <>
                  <Button
                    onClick={() => handleOpenGovBRSigning(demand)}
                    size="sm"
                    variant="default"
                  >
                    🔐 Assinar no Gov.BR
                  </Button>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`signed-pdf-${demand.id}`} className="text-sm">
                                Ou faça upload do PDF já assinado:
                              </Label>
                              <Input
                                id={`signed-pdf-${demand.id}`}
                                type="file"
                                accept=".pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadSignedPdf(demand, file);
                                }}
                                disabled={uploadingPdf}
                              />
                            </div>
                          </>
                        )}

                        {demand.status === "assinado" && demand.mo_autorizacao_assinado_pdf && (
                          <Button
                            onClick={() => handleSendSignedDocumentEmail(demand)}
                            className="w-full"
                            disabled={sendingEmail}
                          >
                            {sendingEmail ? "Enviando..." : "✉️ Enviar PDF Assinado por Email"}
                          </Button>
                        )}

                        {demand.assinatura_data && (
                          <p className="text-xs text-muted-foreground">
                            Assinado em: {new Date(demand.assinatura_data).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    )}

                    {demand.response_text && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="font-semibold text-success">Resposta:</p>
                        <p className="mt-1">{demand.response_text}</p>
                      </div>
                    )}
                  </div>
                  {role === "agencia" && demand.status === "pendente" && demand.type !== "autoriza_vendedor_restricao" && (
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
                  
                  {/* Botão de Distribuir Tarefa */}
                  {role === "agencia" && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setDistribuirReferenciaId(demand.id);
                          setDistribuirOpen(true);
                        }}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Distribuir Tarefa
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

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

      <MobileBottomNav />
    </div>
  );
};

export default Demands;
