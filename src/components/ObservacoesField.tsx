import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useTextImprovement } from "@/hooks/useTextImprovement";

interface ObservacoesFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ObservacoesField({ 
  value, 
  onChange, 
  placeholder = "Digite observações...",
  disabled = false 
}: ObservacoesFieldProps) {
  const { improveText, isImproving } = useTextImprovement();

  const handleImproveText = async () => {
    const improvedText = await improveText(value);
    if (improvedText) {
      onChange(improvedText);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isImproving}
        className="min-h-[120px]"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleImproveText}
        disabled={disabled || isImproving || !value.trim()}
        className="w-full sm:w-auto"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {isImproving ? "Melhorando..." : "Melhorar texto com IA"}
      </Button>
    </div>
  );
}
