import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, MessageSquare, Phone, Plus, Trash2, Loader2, Settings2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Textarea } from "@/components/ui/textarea";
import { 
  useWhatsAppTemplates, 
  useUpdateWhatsAppTemplate, 
  useCreateWhatsAppTemplate,
  useDeleteWhatsAppTemplate 
} from "@/hooks/useWhatsAppTemplate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatCPF } from "@/lib/cpfValidator";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";

const WHATSAPP_PHONES_KEY = "whatsapp_telefones_notificacao";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [codigoCCA, setCodigoCCA] = useState("");

  // WhatsApp phones config
  const [whatsappPhones, setWhatsappPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [savingPhones, setSavingPhones] = useState(false);

  // WhatsApp template state
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [templateDemandType, setTemplateDemandType] = useState("all");
  const [templateDescription, setTemplateDescription] = useState("");

  const { data: whatsappTemplates } = useWhatsAppTemplates();
  const updateTemplate = useUpdateWhatsAppTemplate();
  const createTemplate = useCreateWhatsAppTemplate();
  const deleteTemplate = useDeleteWhatsAppTemplate();

  useEffect(() => {
    loadProfile();
    loadWhatsappPhones();
  }, []);

  const loadProfile = async () => {
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

    if (profileData) {
      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setPhone(profileData.phone || "");
      setCodigoCCA(profileData.codigo_cca || "");
    }

    setLoading(false);
  };

  const loadWhatsappPhones = async () => {
    const { data } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", WHATSAPP_PHONES_KEY)
      .maybeSingle();
    
    if (data?.valor) {
      try {
        const phones = JSON.parse(data.valor);
        setWhatsappPhones(Array.isArray(phones) ? phones : []);
      } catch {
        setWhatsappPhones([]);
      }
    }
  };

  const handleSaveWhatsappPhones = async () => {
    setSavingPhones(true);
    try {
      // Check if config exists
      const { data: existing } = await supabase
        .from("configuracoes")
        .select("id")
        .eq("chave", WHATSAPP_PHONES_KEY)
        .maybeSingle();

      const valor = JSON.stringify(whatsappPhones);

      if (existing) {
        const { error } = await supabase
          .from("configuracoes")
          .update({ valor, updated_at: new Date().toISOString() })
          .eq("chave", WHATSAPP_PHONES_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configuracoes")
          .insert({ 
            chave: WHATSAPP_PHONES_KEY, 
            valor,
            descricao: "Telefones que recebem notificação WhatsApp de novas demandas"
          });
        if (error) throw error;
      }

      toast({
        title: "Configuração salva!",
        description: "Os telefones de notificação foram atualizados.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPhones(false);
    }
  };

  const addPhone = () => {
    if (!newPhone.trim()) return;
    const formatted = formatPhoneNumber(newPhone);
    if (!whatsappPhones.includes(formatted)) {
      setWhatsappPhones([...whatsappPhones, formatted]);
    }
    setNewPhone("");
  };

  const removePhone = (phoneToRemove: string) => {
    setWhatsappPhones(whatsappPhones.filter(p => p !== phoneToRemove));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          codigo_cca: codigoCCA || null,
        })
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
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          name: templateName,
          message: templateMessage,
          demand_type: templateDemandType,
          description: templateDescription,
        });
      } else {
        await createTemplate.mutateAsync({
          name: templateName,
          template_key: templateKey,
          message: templateMessage,
          demand_type: templateDemandType,
          description: templateDescription,
          available_variables: {},
        });
      }

      resetTemplateForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateKey(template.template_key);
    setTemplateMessage(template.message);
    setTemplateDemandType(template.demand_type || "all");
    setTemplateDescription(template.description || "");
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplate.mutateAsync(id);
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateKey("");
    setTemplateMessage("");
    setTemplateDemandType("all");
    setTemplateDescription("");
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
  };

  if (loading) {
    return <LoadingState message="Carregando configurações..." />;
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title="Configurações"
          description="Gerencie suas preferências e templates"
          backTo="/dashboard"
        />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full ${(role === "agencia" || role === "admin") ? "grid-cols-3" : "grid-cols-1"}`}>
            <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
            {(role === "agencia" || role === "admin") && (
              <>
                <TabsTrigger value="notificacoes">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Notificações
                </TabsTrigger>
                <TabsTrigger value="whatsapp">Templates WhatsApp</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações de perfil e telefone para notificações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
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
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                      maxLength={15}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Este número será usado para receber notificações via WhatsApp
                    </p>
                  </div>

                  {role === "cca" && (
                    <div className="space-y-2">
                      <Label htmlFor="codigoCCA">Código CCA</Label>
                      <Input
                        id="codigoCCA"
                        value={codigoCCA}
                        onChange={(e) => setCodigoCCA(e.target.value)}
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {(role === "agencia" || role === "admin") && (
            <TabsContent value="notificacoes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Telefones para Notificações de Demandas
                  </CardTitle>
                  <CardDescription>
                    Configure os números que receberão notificações WhatsApp quando novas demandas forem criadas pelos CCAs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="(00) 00000-0000"
                      value={newPhone}
                      onChange={(e) => setNewPhone(formatPhoneNumber(e.target.value))}
                      maxLength={15}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhone())}
                    />
                    <Button onClick={addPhone} type="button">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {whatsappPhones.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Telefones Configurados</Label>
                      <div className="flex flex-wrap gap-2">
                        {whatsappPhones.map((phoneNumber, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md"
                          >
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{phoneNumber}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removePhone(phoneNumber)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum telefone configurado. Adicione telefones para receber notificações de novas demandas.
                    </p>
                  )}

                  <Button 
                    onClick={handleSaveWhatsappPhones} 
                    className="w-full"
                    disabled={savingPhones}
                  >
                    {savingPhones && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configuração
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {(role === "agencia" || role === "admin") && (
            <TabsContent value="whatsapp" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingTemplate ? "Editar Template" : "Novo Template"}
                  </CardTitle>
                  <CardDescription>
                    Crie templates personalizados para mensagens WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateName">Nome do Template *</Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Ex: Nova Demanda Criada"
                    />
                  </div>

                  {!editingTemplate && (
                    <div className="space-y-2">
                      <Label htmlFor="templateKey">Chave do Template *</Label>
                      <Input
                        id="templateKey"
                        value={templateKey}
                        onChange={(e) => setTemplateKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        placeholder="Ex: nova_demanda"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use apenas letras minúsculas, números e underline
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="templateDemandType">Tipo de Demanda</Label>
                    <Select value={templateDemandType} onValueChange={setTemplateDemandType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="conformidade">Conformidade</SelectItem>
                        <SelectItem value="demanda">Demanda</SelectItem>
                        <SelectItem value="agendamento">Agendamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="templateMessage">Mensagem *</Label>
                    <Textarea
                      id="templateMessage"
                      value={templateMessage}
                      onChange={(e) => setTemplateMessage(e.target.value)}
                      rows={8}
                      placeholder="Use {{variavel}} para inserir dados dinâmicos"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis disponíveis: {"{"}{"nome_cca}"}, {"{"}{"codigo_cca}"}, {"{"}{"tipo_demanda}"}, {"{"}{"cpf}"}, {"{"}{"descricao}"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="templateDescription">Descrição</Label>
                    <Input
                      id="templateDescription"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Breve descrição do template"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveTemplate} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      {editingTemplate ? "Atualizar" : "Criar"} Template
                    </Button>
                    {editingTemplate && (
                      <Button onClick={resetTemplateForm} variant="outline">
                        Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Templates Existentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {whatsappTemplates?.map((template) => (
                      <Card key={template.id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Chave: {template.template_key} | Tipo: {template.demand_type || 'all'}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteTemplate(template.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap">
                            {template.message}
                          </pre>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {template.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </PageContainer>
      <MobileBottomNav />
    </>
  );
};

export default Settings;
