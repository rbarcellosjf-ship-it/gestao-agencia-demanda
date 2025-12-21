import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Mail, Lock, Send, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DemandCardProps {
  demand: any;
  role: string;
  responseText: string;
  onResponseChange: (text: string) => void;
  onUpdate: (id: string, status: string, responseText: string) => void;
  onDelete: (id: string) => void;
  onViewPdf: (path: string, title: string) => void;
  onSendSigduEmail?: (demand: any) => void;
  onOpenGovBRSigning?: (demand: any) => void;
  onUploadSignedPdf?: (demand: any, file: File) => void;
  onSendSignedDocument?: (demand: any) => void;
  onDistribute?: (id: string) => void;
  getTypeLabel: (type: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

const statusBorderColors: Record<string, string> = {
  pendente: "border-l-yellow-500",
  aguardando_assinatura: "border-l-orange-500",
  assinado: "border-l-purple-500",
  concluida: "border-l-green-500",
  cancelada: "border-l-red-500",
};

export const DemandCard = ({
  demand,
  role,
  responseText,
  onResponseChange,
  onUpdate,
  onDelete,
  onViewPdf,
  onSendSigduEmail,
  onOpenGovBRSigning,
  onUploadSignedPdf,
  onSendSignedDocument,
  onDistribute,
  getTypeLabel,
  getStatusBadge,
}: DemandCardProps) => {
  const hasPdfs = demand.carta_solicitacao_pdf || demand.ficha_cadastro_pdf || 
                  demand.matricula_imovel_pdf || demand.mo_autorizacao_pdf || 
                  demand.mo_autorizacao_assinado_pdf;

  return (
    <Card 
      className={cn(
        "border-l-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        statusBorderColors[demand.status] || "border-l-gray-300"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">
              {getTypeLabel(demand.type)}
            </CardTitle>
            <CardDescription className="text-xs">
              CCA: {demand.codigo_cca} • {format(new Date(demand.created_at), "dd/MM/yyyy")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(demand.status)}
            {demand.type === "solicitar_avaliacao_sigdu" && onSendSigduEmail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendSigduEmail(demand)}
                title="Enviar solicitação por e-mail"
              >
                <Mail className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(demand.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3 space-y-3">
        {/* Grid 2 colunas para dados principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {demand.cpf && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
              <p className="font-medium">
                {demand.cpf}
                {demand.nome_cliente && (
                  <span className="text-muted-foreground font-normal"> • {demand.nome_cliente}</span>
                )}
              </p>
            </div>
          )}
          {demand.matricula && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Matrícula</p>
              <p className="font-medium">{demand.matricula}</p>
            </div>
          )}
          {demand.cartorio && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cartório</p>
              <p className="font-medium">{demand.cartorio}</p>
            </div>
          )}
          {demand.numero_pis && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">PIS</p>
              <p className="font-medium">{demand.numero_pis}</p>
            </div>
          )}
        </div>

        {demand.description && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
            <p className="text-sm">{demand.description}</p>
          </div>
        )}

        {/* PDFs em grid compacto */}
        {hasPdfs && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Arquivos</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {demand.carta_solicitacao_pdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPdf(demand.carta_solicitacao_pdf, "Carta de Solicitação")}
                  className="w-full text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Carta
                </Button>
              )}
              {demand.ficha_cadastro_pdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPdf(demand.ficha_cadastro_pdf, "Ficha Cadastro")}
                  className="w-full text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Ficha
                </Button>
              )}
              {demand.matricula_imovel_pdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPdf(demand.matricula_imovel_pdf, "Matrícula Imóvel")}
                  className="w-full text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Matrícula
                </Button>
              )}
              {demand.mo_autorizacao_pdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPdf(demand.mo_autorizacao_pdf, "MO de Autorização")}
                  className="w-full text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  MO
                </Button>
              )}
              {demand.mo_autorizacao_assinado_pdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPdf(demand.mo_autorizacao_assinado_pdf, "MO Assinado")}
                  className="w-full text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  MO Assinado
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Área de resposta - visível para todos os roles */}
        {demand.status === "pendente" && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Responder Demanda</Label>
            <Textarea 
              placeholder="Digite sua resposta..."
              value={responseText}
              onChange={(e) => onResponseChange(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        {/* Mostrar resposta se existir */}
        {demand.response_text && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Resposta da Agência</Label>
            <p className="text-sm bg-muted/50 p-2 rounded-md">{demand.response_text}</p>
          </div>
        )}

        {/* Gov.BR Signing - visível para todos os roles */}
        {demand.type === "autoriza_vendedor_restricao" && 
         demand.status === "pendente" && 
         demand.mo_autorizacao_pdf && 
         !demand.mo_autorizacao_assinado_pdf && 
         onOpenGovBRSigning && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Assinatura Digital Gov.BR
            </Label>
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenGovBRSigning(demand)}
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              Assinar no Gov.BR
            </Button>
          </div>
        )}

        {/* Upload Signed PDF - visível para todos os roles */}
        {demand.type === "autoriza_vendedor_restricao" && 
         demand.status === "aguardando_assinatura" && 
         !demand.mo_autorizacao_assinado_pdf && 
         onUploadSignedPdf && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Upload Documento Assinado</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadSignedPdf(demand, file);
              }}
              className="text-xs"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex-wrap gap-2">
        {/* Ações - visíveis para todos os roles */}
        {demand.status === "pendente" && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => onUpdate(demand.id, "concluida", responseText)}
            >
              <Check className="w-4 h-4 mr-1" />
              Concluir
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onUpdate(demand.id, "cancelada", responseText)}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            {onDistribute && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDistribute(demand.id)}
              >
                Distribuir Tarefa
              </Button>
            )}
          </>
        )}

        {/* Send Signed Document - visível para todos os roles */}
        {demand.type === "autoriza_vendedor_restricao" && 
         demand.status === "assinado" && 
         demand.mo_autorizacao_assinado_pdf && 
         onSendSignedDocument && (
          <Button
            size="sm"
            variant="default"
            onClick={() => onSendSignedDocument(demand)}
          >
            <Send className="w-4 h-4 mr-1" />
            Enviar para CCA
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
