import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileText, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const LeitorDocumentos = () => {
  const { toast } = useToast();
  const [certidaoFile, setCertidaoFile] = useState<File | null>(null);
  const [matriculaFile, setMatriculaFile] = useState<File | null>(null);
  const [certidaoTexto, setCertidaoTexto] = useState("");
  const [matriculaTexto, setMatriculaTexto] = useState("");
  const [loadingCertidao, setLoadingCertidao] = useState(false);
  const [loadingMatricula, setLoadingMatricula] = useState(false);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
    });
  };

  const handleExtractCertidao = async () => {
    if (!certidaoFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    setLoadingCertidao(true);
    try {
      const base64 = await convertToBase64(certidaoFile);

      const { data, error } = await supabase.functions.invoke('extrair-certidao', {
        body: { pdfBase64: base64 }
      });

      if (error) throw error;

      if (data.status === 'ok') {
        setCertidaoTexto(data.texto_gerado);
        toast({
          title: "Sucesso",
          description: "Dados extraídos com sucesso!",
        });
      } else {
        throw new Error(data.error || 'Erro ao extrair dados');
      }
    } catch (error) {
      console.error('Erro ao extrair certidão:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao extrair dados da certidão",
        variant: "destructive",
      });
    } finally {
      setLoadingCertidao(false);
    }
  };

  const handleExtractMatricula = async () => {
    if (!matriculaFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    setLoadingMatricula(true);
    try {
      const base64 = await convertToBase64(matriculaFile);

      const { data, error } = await supabase.functions.invoke('extrair-matricula', {
        body: { pdfBase64: base64 }
      });

      if (error) throw error;

      if (data.status === 'ok') {
        setMatriculaTexto(data.texto_gerado);
        toast({
          title: "Sucesso",
          description: "Dados extraídos com sucesso!",
        });
      } else {
        throw new Error(data.error || 'Erro ao extrair dados');
      }
    } catch (error) {
      console.error('Erro ao extrair matrícula:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao extrair dados da matrícula",
        variant: "destructive",
      });
    } finally {
      setLoadingMatricula(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Leitor de Documentos</h1>
        <p className="text-muted-foreground">
          Extraia informações de certidões de casamento e matrículas de imóvel
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Certidão de Casamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Certidão de Casamento
            </CardTitle>
            <CardDescription>
              Extraia dados jurídicos de certidões de casamento em PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="certidao-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      {certidaoFile ? (
                        <span className="text-foreground font-medium">{certidaoFile.name}</span>
                      ) : (
                        <>
                          <span className="font-semibold text-primary">Clique para selecionar</span>
                          <span> ou arraste um arquivo PDF</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </label>
              <Input
                id="certidao-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setCertidaoFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button 
              onClick={handleExtractCertidao} 
              disabled={!certidaoFile || loadingCertidao}
              className="w-full"
            >
              {loadingCertidao ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extraindo...
                </>
              ) : (
                'Extrair Dados'
              )}
            </Button>

            {certidaoTexto && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto Jurídico Gerado:</label>
                <Textarea
                  value={certidaoTexto}
                  readOnly
                  className="min-h-[120px] bg-muted"
                />
                <Button
                  onClick={() => handleCopy(certidaoTexto)}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Texto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matrícula do Imóvel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Matrícula do Imóvel
            </CardTitle>
            <CardDescription>
              Extraia descrição jurídica de matrículas de imóveis em PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="matricula-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      {matriculaFile ? (
                        <span className="text-foreground font-medium">{matriculaFile.name}</span>
                      ) : (
                        <>
                          <span className="font-semibold text-primary">Clique para selecionar</span>
                          <span> ou arraste um arquivo PDF</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </label>
              <Input
                id="matricula-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setMatriculaFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button 
              onClick={handleExtractMatricula} 
              disabled={!matriculaFile || loadingMatricula}
              className="w-full"
            >
              {loadingMatricula ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extraindo...
                </>
              ) : (
                'Gerar Descrição do Imóvel'
              )}
            </Button>

            {matriculaTexto && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto Jurídico Gerado:</label>
                <Textarea
                  value={matriculaTexto}
                  readOnly
                  className="min-h-[120px] bg-muted"
                />
                <Button
                  onClick={() => handleCopy(matriculaTexto)}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Texto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeitorDocumentos;