import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadFieldProps {
  label: string;
  bucket: string;
  onUploadComplete: (url: string | null) => void;
  disabled?: boolean;
  currentUrl?: string | null;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUploadField({ 
  label,
  bucket,
  onUploadComplete, 
  disabled = false,
  currentUrl = null,
  accept = "application/pdf",
  maxSizeMB = 10
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (accept === "application/pdf" && file.type !== "application/pdf") {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie apenas arquivos PDF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo deve ter no máximo ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const fileExt = file.name.split(".").pop();
      const uniqueFileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(uniqueFileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uniqueFileName);

      onUploadComplete(urlData.publicUrl);

      toast({
        title: "Arquivo enviado!",
        description: "O arquivo foi enviado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFileName("");
    onUploadComplete(null);
  };

  const inputId = `file-upload-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-muted-foreground text-xs">(opcional - PDF, máx. {maxSizeMB}MB)</span></Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
          id={inputId}
        />
        <label
          htmlFor={inputId}
          className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-3 cursor-pointer transition-colors ${
            disabled || uploading
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-primary hover:bg-accent"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </>
          ) : fileName || currentUrl ? (
            <>
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm truncate max-w-[200px]">{fileName || "Arquivo anexado"}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span className="text-sm">Clique para enviar PDF</span>
            </>
          )}
        </label>
        {(fileName || currentUrl) && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            title="Remover arquivo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}