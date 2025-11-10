import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmailTemplatePreview } from "./EmailTemplatePreview";
import { validateTemplate } from "@/lib/emailUtils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailTemplateEditorProps {
  initialData?: {
    name: string;
    template_key: string;
    subject: string;
    body: string;
    description?: string;
    module: string;
    available_variables: Record<string, string>;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const MODULE_OPTIONS = [
  { value: "conformidades", label: "Conformidades" },
  { value: "demands", label: "Demandas" },
  { value: "agendamentos", label: "Agendamentos" },
  { value: "geral", label: "Geral" },
];

const VARIABLE_PRESETS: Record<string, Record<string, string>> = {
  conformidades: {
    cpf: "CPF do cliente",
    valor_financiamento: "Valor formatado do financiamento",
    modalidade: "Modalidade do financiamento",
    codigo_cca: "Código do CCA",
    nome_cca: "Nome completo do CCA",
    data_envio: "Data de envio formatada",
    telefone_cca: "Telefone do CCA",
  },
  demands: {
    tipo_demanda: "Tipo da demanda",
    status: "Status da demanda",
    cpf: "CPF do cliente",
    matricula: "Matrícula",
    cartorio: "Cartório",
    codigo_cca: "Código do CCA",
    nome_cca: "Nome completo do CCA",
    descricao: "Descrição da demanda",
  },
};

export const EmailTemplateEditor = ({
  initialData,
  onSave,
  onCancel,
  isEditing = false,
}: EmailTemplateEditorProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    template_key: initialData?.template_key || "",
    subject: initialData?.subject || "",
    body: initialData?.body || "",
    description: initialData?.description || "",
    module: initialData?.module || "geral",
    available_variables: initialData?.available_variables || {},
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (formData.module && VARIABLE_PRESETS[formData.module] && !isEditing) {
      setFormData(prev => ({
        ...prev,
        available_variables: VARIABLE_PRESETS[formData.module]
      }));
    }
  }, [formData.module, isEditing]);

  const handleValidation = () => {
    const subjectValidation = validateTemplate(formData.subject);
    const bodyValidation = validateTemplate(formData.body);
    
    const allErrors = [...subjectValidation.errors, ...bodyValidation.errors];
    setErrors(allErrors);
    
    return allErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!handleValidation()) {
      return;
    }
    
    onSave(formData);
  };

  const insertVariable = (variable: string, field: 'subject' | 'body') => {
    const textarea = document.getElementById(field) as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData[field];
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + `{{${variable}}}` + after;
    
    setFormData(prev => ({ ...prev, [field]: newText }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Pedido de Prioridade"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template_key">Chave do Template</Label>
                <Input
                  id="template_key"
                  value={formData.template_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_key: e.target.value }))}
                  placeholder="Ex: conformidade_prioridade"
                  disabled={isEditing}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use apenas letras minúsculas, números e underscores
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="module">Módulo</Label>
                <Select
                  value={formData.module}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, module: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o propósito deste template"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variáveis Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Clique para inserir no assunto ou corpo:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(formData.available_variables).map((variable) => (
                    <div key={variable} className="flex gap-1">
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => insertVariable(variable, 'subject')}
                        title={`Inserir no assunto: ${formData.available_variables[variable]}`}
                      >
                        {variable}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  As variáveis serão substituídas pelos valores reais ao gerar o e-mail
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do E-mail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Ex: Solicitação de Prioridade - CPF {{cpf}}"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Corpo do E-mail</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Digite o conteúdo do e-mail. Use {{variavel}} para inserir dados dinâmicos."
                  rows={15}
                  className="font-mono text-sm"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <EmailTemplatePreview
            subject={formData.subject}
            body={formData.body}
            highlightVariables={true}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {isEditing ? "Atualizar Template" : "Criar Template"}
        </Button>
      </div>
    </form>
  );
};
