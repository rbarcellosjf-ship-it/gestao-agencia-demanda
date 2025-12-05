import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WeekCalendarFilterProps {
  selectedDays: Date[];
  onSelectionChange: (days: Date[]) => void;
  className?: string;
}

export const WeekCalendarFilter = ({ 
  selectedDays, 
  onSelectionChange,
  className 
}: WeekCalendarFilterProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });

  const toggleDay = (day: Date) => {
    const isSelected = selectedDays.some(d => isSameDay(d, day));
    if (isSelected) {
      onSelectionChange(selectedDays.filter(d => !isSameDay(d, day)));
    } else {
      onSelectionChange([...selectedDays, day]);
    }
  };

  const selectAll = () => {
    onSelectionChange(weekDays);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">
            {format(currentWeekStart, "dd/MM", { locale: ptBR })} - {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
          </p>
          <Button 
            variant="link" 
            size="sm" 
            onClick={goToCurrentWeek}
            className="text-xs text-muted-foreground h-auto p-0"
          >
            Ir para semana atual
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const isSelected = selectedDays.some(d => isSameDay(d, day));
          const dayIsToday = isToday(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => toggleDay(day)}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-all text-center",
                "hover:bg-muted/80",
                isSelected 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-muted/30",
                dayIsToday && !isSelected && "ring-2 ring-primary ring-offset-1"
              )}
            >
              <span className="text-[10px] uppercase font-medium opacity-70">
                {format(day, "EEE", { locale: ptBR })}
              </span>
              <span className={cn(
                "text-lg font-semibold",
                dayIsToday && !isSelected && "text-primary"
              )}>
                {format(day, "dd")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ações rápidas */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {selectedDays.length} dia{selectedDays.length !== 1 ? 's' : ''} selecionado{selectedDays.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
            Selecionar todos
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
};
