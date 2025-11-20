import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ObservacoesCollapsibleProps {
  observacoes: string | null;
  defaultOpen?: boolean;
}

export const ObservacoesCollapsible = ({ 
  observacoes, 
  defaultOpen = false 
}: ObservacoesCollapsibleProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!observacoes) return null;

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="md:col-span-2"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
        <p className="text-xs text-muted-foreground uppercase tracking-tighter font-medium">
          Observações
        </p>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 px-2 animate-accordion-down">
        <p className="font-medium text-sm leading-relaxed whitespace-pre-wrap">
          {observacoes}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
};
