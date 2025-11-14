import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Badge } from "@/components/ui/badge";

const Agendamentos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [entrevistas, setEntrevistas] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const entrevistasChannel = supabase
      .channel("entrevistas-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entrevistas_agendamento",
        },
        () => loadData()
      )
      .subscribe();

    const agendamentosChannel = supabase
      .channel("agendamentos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamentos",
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(entrevistasChannel);
      supabase.removeChannel(agendamentosChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Buscar entrevistas
      const { data: entrevistasData, error: entrevistasError } = await supabase
        .from("entrevistas_agendamento")
        .select(`
          *,
          conformidades (cpf, valor_financiamento, modalidade, codigo_cca)
        `)
        .order("created_at", { ascending: false });

      if (entrevistasError) throw entrevistasError;

      // Buscar assinaturas (agendamentos do tipo assinatura)
      const { data: assinaturasData, error: assinaturasError } = await supabase
        .from("agendamentos")
        .select(`
          *,
          conformidades!agendamentos_conformidade_id_fkey (cpf, valor_financiamento, modalidade, codigo_cca)
        `)
        .eq("tipo", "assinatura")
        .order("data_hora", { ascending: false });

      if (assinaturasError) throw assinaturasError;

      setEntrevistas(entrevistasData || []);
      setAssinaturas(assinaturasData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendente: "outline",
      confirmado: "default",
      cancelado: "destructive",
      concluido: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Voltar</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Agendamentos
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Entrevistas e Assinaturas
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/conformidades")}>
            <Plus className="mr-2 h-4 w-4" />
            Incluir Agendamento
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="entrevistas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="entrevistas">
              Entrevistas ({entrevistas.length})
            </TabsTrigger>
            <TabsTrigger value="assinaturas">
              Assinaturas ({assinaturas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entrevistas" className="space-y-4">
            {entrevistas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma entrevista agendada
                </CardContent>
              </Card>
            ) : (
              entrevistas.map((entrevista) => (
                <Card key={entrevista.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {entrevista.cliente_nome}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Telefone: {entrevista.telefone}
                        </p>
                      </div>
                      {getStatusBadge(entrevista.status || "pendente")}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Opção 1</p>
                        <p className="font-medium">
                          {format(new Date(entrevista.data_opcao_1), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}{" "}
                          - {entrevista.horario_inicio} às {entrevista.horario_fim}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Opção 2</p>
                        <p className="font-medium">
                          {format(new Date(entrevista.data_opcao_2), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}{" "}
                          - {entrevista.horario_inicio} às {entrevista.horario_fim}
                        </p>
                      </div>
                      {entrevista.data_confirmada && (
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground">Data Confirmada</p>
                          <p className="font-semibold text-primary">
                            {format(
                              new Date(entrevista.data_confirmada),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Local</p>
                        <p className="font-medium">
                          {entrevista.agencia} - {entrevista.endereco_agencia}
                        </p>
                      </div>
                      {entrevista.conformidades && (
                        <div>
                          <p className="text-muted-foreground">CPF</p>
                          <p className="font-medium">
                            {entrevista.conformidades.cpf}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="assinaturas" className="space-y-4">
            {assinaturas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma assinatura agendada
                </CardContent>
              </Card>
            ) : (
              assinaturas.map((assinatura) => (
                <Card key={assinatura.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {format(new Date(assinatura.data_hora), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {assinatura.tipo === "assinatura"
                            ? "Assinatura de Documento"
                            : assinatura.tipo}
                        </p>
                      </div>
                      {getStatusBadge(assinatura.status || "Aguardando entrevista")}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {assinatura.conformidades && (
                        <>
                          <div>
                            <p className="text-muted-foreground">CPF</p>
                            <p className="font-medium">
                              {assinatura.conformidades.cpf}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Modalidade</p>
                            <p className="font-medium">
                              {assinatura.conformidades.modalidade}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Valor do Financiamento
                            </p>
                            <p className="font-medium">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(
                                parseFloat(assinatura.conformidades.valor_financiamento)
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Código CCA</p>
                            <p className="font-medium">
                              {assinatura.conformidades.codigo_cca}
                            </p>
                          </div>
                        </>
                      )}
                      {assinatura.observacoes && (
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground">Observações</p>
                          <p className="font-medium">{assinatura.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <MobileBottomNav />
    </div>
  );
};

export default Agendamentos;
