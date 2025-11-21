import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Calendar, User, FileText, DollarSign, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface EntrevistaPendenteCardProps {
  entrevista: {
    id: string;
    cliente_nome: string;
    telefone: string;
    data_opcao_1: string;
    data_opcao_2: string;
    horario_inicio: string;
    horario_fim: string;
    conformidade_id?: string;
    cpf?: string;
    tipo_contrato?: string;
    modalidade?: string;
    valor_financiamento?: number;
    comite_credito?: boolean;
    codigo_cca?: string;
  };
  onConfirmar: (entrevistaId: string, dataConfirmada: string, opcaoEscolhida: number | null, horarioEscolhido: string) => void;
}

export const EntrevistaPendenteCard = ({ entrevista, onConfirmar }: EntrevistaPendenteCardProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [horarioEscolhido, setHorarioEscolhido] = useState<string>("");

  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatCPF = (cpf?: string) => {
    if (!cpf) return "N/A";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const isHorarioValid = () => {
    if (!horarioEscolhido) return false;
    
    // Verificar se está no formato correto
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(horarioEscolhido)) return false;
    
    // Verificar se está dentro da janela disponível
    const [horaEscolhida, minutoEscolhido] = horarioEscolhido.split(':').map(Number);
    const [horaInicio, minutoInicio] = entrevista.horario_inicio.split(':').map(Number);
    const [horaFim, minutoFim] = entrevista.horario_fim.split(':').map(Number);
    
    const escolhidoEmMinutos = horaEscolhida * 60 + minutoEscolhido;
    const inicioEmMinutos = horaInicio * 60 + minutoInicio;
    const fimEmMinutos = horaFim * 60 + minutoFim;
    
    return escolhidoEmMinutos >= inicioEmMinutos && escolhidoEmMinutos <= fimEmMinutos;
  };

  const handleConfirmarOpcao1 = () => {
    if (!isHorarioValid()) {
      toast({
        title: "Horário inválido",
        description: "Escolha um horário válido dentro da janela disponível.",
        variant: "destructive"
      });
      return;
    }
    onConfirmar(entrevista.id, entrevista.data_opcao_1, 1, horarioEscolhido);
  };

  const handleConfirmarOpcao2 = () => {
    if (!isHorarioValid()) {
      toast({
        title: "Horário inválido",
        description: "Escolha um horário válido dentro da janela disponível.",
        variant: "destructive"
      });
      return;
    }
    onConfirmar(entrevista.id, entrevista.data_opcao_2, 2, horarioEscolhido);
  };

  const handleConfirmarOutraData = () => {
    if (!selectedDate) return;
    
    if (!isHorarioValid()) {
      toast({
        title: "Horário inválido",
        description: "Escolha um horário válido dentro da janela disponível.",
        variant: "destructive"
      });
      return;
    }
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    onConfirmar(entrevista.id, dateStr, null, horarioEscolhido);
    setShowCalendar(false);
    setSelectedDate(undefined);
  };

  return (
    <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-base">{entrevista.cliente_nome}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {entrevista.telefone}
            </p>
          </div>
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">
            🟡 Aguardando Confirmação
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações do Contrato */}
        {entrevista.conformidade_id && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              📋 Dados do Contrato Vinculado
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">CPF</p>
                  <p className="font-medium">{formatCPF(entrevista.cpf)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium capitalize">{entrevista.tipo_contrato || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Modalidade</p>
                  <p className="font-medium">{entrevista.modalidade || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-medium">{formatCurrency(entrevista.valor_financiamento)}</p>
                </div>
              </div>
            </div>
            {entrevista.comite_credito && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <AlertCircle className="h-3 w-3 text-orange-600" />
                <p className="text-xs text-orange-700 font-medium">Requer Comitê de Crédito</p>
              </div>
            )}
          </div>
        )}

        {/* Opções de Data */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Escolha a data da entrevista:</p>
          
          <div className="grid gap-2">
            <div className="rounded-lg border p-3 bg-background hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Opção 1</span>
              </div>
              <p className="text-sm font-medium">{formatDate(entrevista.data_opcao_1)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                {entrevista.horario_inicio} às {entrevista.horario_fim}
              </p>
            </div>

            <div className="rounded-lg border p-3 bg-background hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Opção 2</span>
              </div>
              <p className="text-sm font-medium">{formatDate(entrevista.data_opcao_2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                {entrevista.horario_inicio} às {entrevista.horario_fim}
              </p>
            </div>
          </div>
        </div>

        {/* Campo de Horário da Entrevista */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Escolha o Horário da Entrevista
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Janela disponível: {entrevista.horario_inicio} às {entrevista.horario_fim}
            </p>
            
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={horarioEscolhido}
                onChange={(e) => setHorarioEscolhido(e.target.value)}
                className="max-w-[150px] font-mono text-base"
                placeholder="00:00"
              />
              
              {horarioEscolhido && !isHorarioValid() && (
                <Badge variant="destructive" className="text-xs">
                  Fora da janela disponível
                </Badge>
              )}
              
              {horarioEscolhido && isHorarioValid() && (
                <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                  ✓ Horário válido
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 pt-4 border-t">
        <Button
          onClick={handleConfirmarOpcao1}
          disabled={!isHorarioValid()}
          className="flex-1"
        >
          Confirmar 1ª Data
        </Button>
        <Button
          onClick={handleConfirmarOpcao2}
          disabled={!isHorarioValid()}
          className="flex-1"
        >
          Confirmar 2ª Data
        </Button>
        
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full" disabled={!isHorarioValid()}>
              <Calendar className="h-4 w-4 mr-2" />
              Escolher Outra Data 📅
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              disabled={(date) => date < new Date()}
            />
            <div className="p-3 border-t">
              <Button
                onClick={handleConfirmarOutraData}
                disabled={!selectedDate}
                className="w-full"
              >
                Confirmar Data Escolhida
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </CardFooter>
    </Card>
  );
};
