import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AgendarEntrevistaDialog } from "@/components/AgendarEntrevistaDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";
import { AgendamentoEntrevistaCard } from "@/components/AgendamentoEntrevistaCard";
import { AgendamentoAssinaturaCard } from "@/components/AgendamentoAssinaturaCard";

const Agendamentos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [entrevistas, setEntrevistas] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agendamentoToDelete, setAgendamentoToDelete] = useState<{ id: string; tipo: "entrevista" | "assinatura" } | null>(null);

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

  const handleDeleteAgendamento = async () => {
    if (!agendamentoToDelete) return;

    try {
      const tableName = agendamentoToDelete.tipo === "entrevista" 
        ? "entrevistas_agendamento" 
        : "agendamentos";

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", agendamentoToDelete.id);

      if (error) throw error;

      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi removido com sucesso.",
      });

      loadData();
    } catch (error: any) {
      console.error("Error deleting agendamento:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAgendamentoToDelete(null);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando agendamentos..." />;
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title="Agendamentos"
          description="Entrevistas e Assinaturas"
          backTo="/dashboard"
          action={<AgendarEntrevistaDialog />}
        />

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
              <EmptyState
                icon={Calendar}
                title="Nenhuma entrevista agendada"
                description="As entrevistas agendadas aparecerão aqui"
              />
            ) : (
              entrevistas.map((entrevista) => (
                <AgendamentoEntrevistaCard 
                  key={entrevista.id} 
                  entrevista={entrevista}
                  onDelete={(id) => {
                    setAgendamentoToDelete({ id, tipo: "entrevista" });
                    setDeleteDialogOpen(true);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="assinaturas" className="space-y-4">
            {assinaturas.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Nenhuma assinatura agendada"
                description="As assinaturas de contratos aparecerão aqui"
              />
            ) : (
              assinaturas.map((assinatura) => (
                <AgendamentoAssinaturaCard 
                  key={assinatura.id} 
                  assinatura={assinatura}
                  onDelete={(id) => {
                    setAgendamentoToDelete({ id, tipo: "assinatura" });
                    setDeleteDialogOpen(true);
                  }}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgendamento}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </>
  );
};

export default Agendamentos;
