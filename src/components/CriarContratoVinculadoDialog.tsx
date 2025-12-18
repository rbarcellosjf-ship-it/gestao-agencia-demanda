import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, normalizeCPF, validateCPF } from "@/lib/cpfValidator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface CriarContratoVinculadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrevistaId: string;
  cpfCliente?: string;
  nomeCliente: string;
  onSuccess?: () => void;
}

export const CriarContratoVinculadoDialog = ({
  open,
  onOpenChange,
  entrevistaId,
  cpfCliente,
  nomeCliente,
  onSuccess
}: CriarContratoVinculadoDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState(cpfCliente || "");
  const [valorFinanciamento, setValorFinanciamento] = useState("50000");
  const [modalidade, setModalidade] = useState<string>("");
  const [modalidadeOutro, setModalidadeOutro] = useState("");
  const [tipoContrato, setTipoContrato] = useState<string>("individual");
  const [comiteCredito, setComiteCredito] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validateCPF(cpf)) {
        throw new Error("CPF inválido");
      }

      if (!valorFinanciamento || !modalidade || !tipoContrato) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      // Buscar perfil para obter codigo_cca
      const { data: profile } = await supabase
        .from("profiles")
        .select("codigo_cca")
        .eq("user_id", session.user.id)
        .single();

      if (!profile?.codigo_cca) {
        throw new Error("Código CCA não encontrado no perfil");
      }

      // Criar conformidade vinculada à entrevista
      const { data: conformidadeData, error: conformidadeError } = await supabase
        .from("conformidades")
        .insert([{
          cca_user_id: session.user.id,
          codigo_cca: profile.codigo_cca,
          cpf: normalizeCPF(cpf),
          nome_cliente: nomeCliente || null,
          valor_financiamento: parseFloat(valorFinanciamento),
          modalidade: modalidade as "SBPE" | "MCMV" | "OUTRO",
          modalidade_outro: modalidade === "OUTRO" ? modalidadeOutro : null,
          tipo_contrato: tipoContrato,
          comite_credito: comiteCredito,
          observacoes: observacoes || null,
          entrevista_id: entrevistaId,
          entrevista_aprovada: true, // Marca como aprovada pois vem de entrevista aprovada
        }])
        .select()
        .single();

      if (conformidadeError) throw conformidadeError;

      // Atualizar entrevista com conformidade_id
      const { error: entrevistaError } = await supabase
        .from("entrevistas_agendamento")
        .update({ conformidade_id: conformidadeData.id })
        .eq("id", entrevistaId);

      if (entrevistaError) throw entrevistaError;

      toast({
        title: "Contrato criado!",
        description: "Contrato vinculado à entrevista com sucesso.",
      });

      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      toast({
        title: "Erro ao criar contrato",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Contrato Vinculado</DialogTitle>
          <DialogDescription>
            Criar contrato a partir de entrevista aprovada
          </DialogDescription>
        </DialogHeader>

        <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-1 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-xs font-semibold text-green-900">Entrevista Aprovada</p>
          </div>
          <p className="text-xs text-green-700">
            <span className="font-medium">Cliente:</span> {nomeCliente}
          </p>
          {cpfCliente && (
            <p className="text-xs text-green-700">
              <span className="font-medium">CPF:</span> {formatCPF(cpfCliente)}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="valor">Valor do Financiamento *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                R$
              </span>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="50.000,00"
                value={valorFinanciamento}
                onChange={(e) => setValorFinanciamento(e.target.value)}
                onBlur={(e) => {
                  const valor = parseFloat(e.target.value);
                  if (valor < 50000 && e.target.value !== "") {
                    setValorFinanciamento("50000");
                  }
                }}
                className="pl-9"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Valor mínimo: R$ 50.000,00
            </p>
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
            <Textarea
              id="observacoes"
              placeholder="Adicione observações sobre o contrato..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Criando..." : "Criar Contrato"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
