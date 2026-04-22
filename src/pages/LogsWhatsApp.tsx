import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MessageSquare, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MobileBottomNav } from "@/components/MobileBottomNav";

interface WhatsAppLog {
  id: string;
  contexto: string;
  referencia_tipo: string | null;
  cpf: string | null;
  codigo_cca: string | null;
  destino: string;
  destinatario_nome: string | null;
  mensagem_preview: string | null;
  sucesso: boolean;
  erro: string | null;
  created_at: string;
}

export default function LogsWhatsApp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: loadingRole } = useUserRole();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");

  useEffect(() => {
    if (loadingRole) return;
    if (role !== "admin" && role !== "agencia") {
      toast({ title: "Acesso restrito", variant: "destructive" });
      navigate("/dashboard");
      return;
    }
    loadLogs();
  }, [role, loadingRole]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "Erro ao carregar logs", description: error.message, variant: "destructive" });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const filtered = logs.filter((l) => {
    if (statusFilter === "success" && !l.sucesso) return false;
    if (statusFilter === "error" && l.sucesso) return false;
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      l.cpf?.toLowerCase().includes(f) ||
      l.codigo_cca?.toLowerCase().includes(f) ||
      l.destino?.toLowerCase().includes(f) ||
      l.destinatario_nome?.toLowerCase().includes(f) ||
      l.contexto?.toLowerCase().includes(f)
    );
  });

  if (loadingRole || loading) return <LoadingState />;

  return (
    <PageContainer>
      <PageHeader
        title="Logs de WhatsApp"
        description="Auditoria de todos os disparos de mensagens WhatsApp"
        backTo="/dashboard"
        action={
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Filtrar por CPF, CCA, número, contexto..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            Todos ({logs.length})
          </Button>
          <Button
            variant={statusFilter === "success" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("success")}
          >
            ✓ {logs.filter((l) => l.sucesso).length}
          </Button>
          <Button
            variant={statusFilter === "error" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("error")}
          >
            ✗ {logs.filter((l) => !l.sucesso).length}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum log encontrado"
          description="Os disparos de WhatsApp aparecerão aqui após serem realizados."
        />
      ) : (
        <div className="space-y-2 pb-20">
          {filtered.map((log) => (
            <Card
              key={log.id}
              className={`border-l-4 ${log.sucesso ? "border-l-success" : "border-l-destructive"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {log.sucesso ? (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <Badge variant="outline">{log.contexto}</Badge>
                    {log.referencia_tipo && (
                      <Badge variant="secondary" className="text-xs">
                        {log.referencia_tipo}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Destino: </span>
                    <span className="font-mono">{log.destino}</span>
                    {log.destinatario_nome && (
                      <span className="text-muted-foreground"> ({log.destinatario_nome})</span>
                    )}
                  </div>
                  {log.codigo_cca && (
                    <div>
                      <span className="text-muted-foreground">CCA: </span>
                      <span>{log.codigo_cca}</span>
                    </div>
                  )}
                  {log.cpf && (
                    <div>
                      <span className="text-muted-foreground">CPF: </span>
                      <span className="font-mono">{log.cpf}</span>
                    </div>
                  )}
                </div>

                {log.mensagem_preview && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Ver mensagem
                    </summary>
                    <pre className="mt-1 text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded">
                      {log.mensagem_preview}
                    </pre>
                  </details>
                )}

                {log.erro && (
                  <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                    <strong>Erro:</strong> {log.erro}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MobileBottomNav />
    </PageContainer>
  );
}
