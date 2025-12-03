import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ObservacoesField } from "./ObservacoesField";

interface EditarContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conformidade: any;
  onSuccess?: () => void;
}

export function EditarContratoDialog({
  open,
  onOpenChange,
  conformidade,
  onSuccess,
}: EditarContratoDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [valorFinanciamento, setValorFinanciamento] = useState("");
  const [modalidade, setModalidade] = useState<string>("");
  const [modalidadeOutro, setModalidadeOutro] = useState("");
  const [comiteCredito, setComiteCredito] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (open && conformidade) {
      setValorFinanciamento(conformidade.valor_financiamento?.toString() || "");
      setModalidade(conformidade.modalidade || "");
      setModalidadeOutro(conformidade.modalidade_outro || "");
      setComiteCredito(conformidade.comite_credito || false);
      setObservacoes(conformidade.observacoes || "");
    }
  }, [open, conformidade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!valorFinanciamento || !modalidade) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const updateData: any = {
        valor_financiamento: parseFloat(valorFinanciamento),
        modalidade: modalidade,
        comite_credito: comiteCredito,
        observacoes: observacoes || null,
      };

      if (modalidade === "OUTRO") {
        if (!modalidadeOutro) {
          throw new Error("Especifique a modalidade 'Outro'");
        }
        updateData.modalidade_outro = modalidadeOutro;
      } else {
        updateData.modalidade_outro = null;
      }

      const { error } = await supabase
        .from("conformidades")
        .update(updateData)
        .eq("id", conformidade.id);

      if (error) throw error;

      toast({
        title: "Contrato atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating contract:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
          <DialogDescription>
            Atualize as informações do contrato
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor">Valor do Financiamento *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                R$
              </span>
              <Input
                id="valor"
                type="number"
                min="50000"
                step="1000"
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
              Valor mínimo: R$ 50.000,00 • Use as setas para incrementar R$ 1.000,00
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

          <div className="flex items-center space-x-2 p-3 border rounded-md">
            <Checkbox
              id="comite"
              checked={comiteCredito}
              onCheckedChange={(checked) => setComiteCredito(checked as boolean)}
            />
            <div className="flex-1">
              <label
                htmlFor="comite"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Requer Comitê de Crédito
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Marque se este contrato necessita aprovação do comitê
              </p>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}