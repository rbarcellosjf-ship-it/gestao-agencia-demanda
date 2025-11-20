import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { statusBorders } from "@/lib/design-tokens";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

interface EntrevistaPendenteCardProps {
  entrevista: {
    id: string;
    cliente_nome: string;
    telefone: string;
    data_opcao_1: string;
    data_opcao_2: string;
    horario_inicio: string;
    horario_fim: string;
    agencia?: string;
    endereco_agencia?: string;
    nome_empresa?: string;
    status: string;
  };
  onConfirmarData: (entrevistaId: string, dataEscolhida: Date, opcao?: 1 | 2) => Promise<void>;
}

export const EntrevistaPendenteCard = ({ entrevista, onConfirmarData }: EntrevistaPendenteCardProps) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleConfirm = async (opcao: 1 | 2) => {
    setIsConfirming(true);
    try {
      const dataEscolhida = opcao === 1 
        ? new Date(entrevista.data_opcao_1)
        : new Date(entrevista.data_opcao_2);
      await onConfirmarData(entrevista.id, dataEscolhida, opcao);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirmOtraData = async () => {
    if (!selectedDate) return;
    
    setIsConfirming(true);
    try {
      await onConfirmarData(entrevista.id, selectedDate);
      setIsCalendarOpen(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card
      className={cn(
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        statusBorders.pendente
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">
              {entrevista.cliente_nome}
            </CardTitle>
            <CardDescription className="text-xs">
              Tel: {entrevista.telefone}
              {entrevista.nome_empresa && ` • ${entrevista.nome_empresa}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            Pendente Confirmação
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-3 space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Horário
          </p>
          <p className="font-medium text-sm">
            {entrevista.horario_inicio} às {entrevista.horario_fim}
          </p>
        </div>

        {(entrevista.agencia || entrevista.endereco_agencia) && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Local</p>
            <p className="font-medium text-sm">
              {entrevista.agencia && `${entrevista.agencia} - `}
              {entrevista.endereco_agencia}
            </p>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-3">Escolha a data da entrevista:</p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleConfirm(1)}
              disabled={isConfirming}
              variant="outline"
              className="w-full justify-start"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              1ª Data: {format(new Date(entrevista.data_opcao_1), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
            </Button>
            
            <Button
              onClick={() => handleConfirm(2)}
              disabled={isConfirming}
              variant="outline"
              className="w-full justify-start"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              2ª Data: {format(new Date(entrevista.data_opcao_2), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
            </Button>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {selectedDate ? (
                    format(selectedDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })
                  ) : (
                    "Escolher Outra Data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className={cn("p-3 pointer-events-auto")}
                />
                {selectedDate && (
                  <div className="p-3 border-t">
                    <Button
                      onClick={handleConfirmOtraData}
                      disabled={isConfirming}
                      className="w-full"
                    >
                      Confirmar Data
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
