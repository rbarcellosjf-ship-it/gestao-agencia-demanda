import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Mail, Edit, Trash2, Filter, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailTemplateEditor } from "@/components/EmailTemplateEditor";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  EmailTemplate,
} from "@/hooks/useEmailTemplate";
import { useUserRole } from "@/hooks/useUserRole";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";

const EmailTemplates = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  const { data: templates, isLoading } = useEmailTemplates(
    moduleFilter === "all" ? undefined : moduleFilter
  );
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();

  if (role !== "agencia") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
        <MobileBottomNav />
      </div>
    );
  }

  const handleSave = (data: any) => {
    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, ...data },
        {
          onSuccess: () => {
            setShowEditor(false);
            setEditingTemplate(null);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setShowEditor(false);
        },
      });
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteTemplateId(null);
      },
    });
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  if (showEditor) {
    return (
      <PageContainer>
        <div className="sticky top-0 z-10 bg-background border-b -mx-4 md:-mx-6 -mt-6 md:-mt-8 mb-6">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEditor(false);
                  setEditingTemplate(null);
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {editingTemplate ? "Editar Template" : "Novo Template"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Configure o template de e-mail
                </p>
              </div>
            </div>
          </div>
        </div>

        <EmailTemplateEditor
          initialData={editingTemplate || undefined}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
          isEditing={!!editingTemplate}
        />
        <MobileBottomNav />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Templates de Email"
        description="Gerencie os templates de email do sistema"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Templates de Email" }
        ]}
        action={
          <Button onClick={handleNewTemplate} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                <SelectItem value="demands">Demandas</SelectItem>
                <SelectItem value="conformidades">Conformidades</SelectItem>
                <SelectItem value="agendamentos">Agendamentos</SelectItem>
                <SelectItem value="tarefas">Tarefas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      {isLoading ? (
        <LoadingState message="Carregando templates..." />
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nenhum template encontrado"
          description="Comece criando seu primeiro template de email."
          action={{
            label: "Criar Primeiro Template",
            onClick: handleNewTemplate,
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Mail className="h-8 w-8 text-primary" />
                  <Badge variant="secondary">{template.module}</Badge>
                </div>
                <CardTitle className="mt-4">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description || "Sem descrição"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Chave do template
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {template.template_key}
                    </code>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Variáveis disponíveis
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(template.available_variables).map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTemplateId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="fixed bottom-24 right-4 md:hidden">
        <Button onClick={handleNewTemplate} size="lg" className="rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && handleDelete(deleteTemplateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </PageContainer>
  );
};

export default EmailTemplates;
