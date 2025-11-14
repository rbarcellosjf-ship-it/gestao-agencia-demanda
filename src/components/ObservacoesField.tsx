import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useTextImprovement } from "@/hooks/useTextImprovement";

interface ObservacoesFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  autoSave?: boolean;
}

export function ObservacoesField({ 
  value, 
  onChange, 
  onSave,
  placeholder = "Digite observações...",
  disabled = false,
  autoSave = false
}: ObservacoesFieldProps) {
  const { improveText, isImproving } = useTextImprovement();
  const [isSaving, setIsSaving] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleImproveText = async () => {
    const improvedText = await improveText(localValue);
    if (improvedText) {
      setLocalValue(improvedText);
      onChange(improvedText);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(localValue);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
    
    if (autoSave && onSave) {
      onSave(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isImproving || isSaving}
        className="min-h-[120px]"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleImproveText}
          disabled={disabled || isImproving || isSaving || !localValue.trim()}
          className="flex-1 sm:flex-initial"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isImproving ? "Melhorando..." : "Melhorar com IA"}
        </Button>
        
        {!autoSave && onSave && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={disabled || isSaving || isImproving}
            className="flex-1 sm:flex-initial"
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        )}
      </div>
    </div>
  );
}
