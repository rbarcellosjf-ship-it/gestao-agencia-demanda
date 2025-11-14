import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DossieUploadProps {
  onUploadComplete: (url: string) => void;
  disabled?: boolean;
}

export function DossieUpload({ onUploadComplete, disabled = false }: DossieUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie apenas arquivos PDF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("dossie-clientes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("dossie-clientes")
        .getPublicUrl(filePath);

      onUploadComplete(urlData.publicUrl);

      toast({
        title: "Dossiê enviado!",
        description: "O arquivo foi enviado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Enviar Dossiê (PDF)</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
          id="dossie-upload"
        />
        <label
          htmlFor="dossie-upload"
          className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors ${
            disabled || uploading
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-primary hover:bg-accent"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </>
          ) : fileName ? (
            <>
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm">{fileName}</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span className="text-sm">Clique para enviar o PDF (máx. 10MB)</span>
            </>
          )}
        </label>
      </div>
    </div>
  );
}
