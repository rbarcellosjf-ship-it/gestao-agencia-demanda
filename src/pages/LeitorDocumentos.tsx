import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileText, Upload, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { pdfjs } from 'react-pdf';

// Configure worker using local package
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const LeitorDocumentos = () => {
  const { toast } = useToast();
  const [certidaoFile, setCertidaoFile] = useState<File | null>(null);
  const [matriculaFile, setMatriculaFile] = useState<File | null>(null);
  const [certidaoTexto, setCertidaoTexto] = useState("");
  const [matriculaTexto, setMatriculaTexto] = useState("");
  const [loadingCertidao, setLoadingCertidao] = useState(false);
  const [loadingMatricula, setLoadingMatricula] = useState(false);

  const convertPdfToImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument(typedArray).promise;
          const page = await pdf.getPage(1);
          
          const scale = 2.0;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) {
            throw new Error('Não foi possível criar contexto do canvas');
          }
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext: any = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
          
          // Convert to base64 without prefix
          const base64 = canvas.toDataURL('image/png').split(',')[1];
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
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
      console.log('Convertendo PDF para imagem...');
      const base64 = await convertPdfToImage(certidaoFile);
      console.log('PDF convertido, enviando para análise...');

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
      console.log('Convertendo PDF para imagem...');
      const base64 = await convertPdfToImage(matriculaFile);
      console.log('PDF convertido, enviando para análise...');

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

  const handleSendEmail = (text: string, subject: string) => {
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.location.href = mailtoLink;
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
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <label className="text-sm font-semibold text-foreground">Texto Jurídico Gerado:</label>
                <Textarea
                  value={certidaoTexto}
                  readOnly
                  className="min-h-[140px] bg-background border-border font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopy(certidaoTexto)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    onClick={() => handleSendEmail(certidaoTexto, "Certidão de Casamento")}
                    variant="outline"
                    className="flex-1"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Email
                  </Button>
                </div>
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
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <label className="text-sm font-semibold text-foreground">Texto Jurídico Gerado:</label>
                <Textarea
                  value={matriculaTexto}
                  readOnly
                  className="min-h-[140px] bg-background border-border font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopy(matriculaTexto)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    onClick={() => handleSendEmail(matriculaTexto, "Descrição do Imóvel")}
                    variant="outline"
                    className="flex-1"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Email
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeitorDocumentos;