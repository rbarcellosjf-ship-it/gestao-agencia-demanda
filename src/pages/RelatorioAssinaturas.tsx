import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { EmptyState } from "@/components/layout/EmptyState";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, FileText, FileSpreadsheet, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Assinatura {
  id: string;
  cpf: string | null;
  data_hora: string;
  status: string | null;
  tipo_contrato: string | null;
  modalidade_financiamento: string | null;
  observacoes: string | null;
  telefone_cliente: string | null;
}

export default function RelatorioAssinaturas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      loadData();
    }
  }, [dataInicio, dataFim]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("tipo", "assinatura")
        .in("status", ["Assinado", "Assinatura confirmada"])
        .gte("data_hora", dataInicio.toISOString())
        .lte("data_hora", dataFim.toISOString())
        .order("data_hora", { ascending: false });

      if (error) throw error;
      setAssinaturas(data || []);
    } catch (error) {
      console.error("Erro ao carregar assinaturas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "-";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const exportToCSV = () => {
    if (assinaturas.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Data/Hora", "CPF", "Status", "Tipo Contrato", "Modalidade", "Telefone", "Observações"];
    const rows = assinaturas.map(a => [
      format(parseISO(a.data_hora), "dd/MM/yyyy HH:mm"),
      formatCPF(a.cpf),
      a.status || "",
      a.tipo_contrato || "",
      a.modalidade_financiamento || "",
      a.telefone_cliente || "",
      (a.observacoes || "").replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-assinaturas-${format(dataInicio, "yyyy-MM-dd")}-${format(dataFim, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportado",
      description: "Arquivo CSV gerado com sucesso."
    });
  };

  const exportToPDF = () => {
    if (assinaturas.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar.",
        variant: "destructive"
      });
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir a janela de impressão.",
        variant: "destructive"
      });
      return;
    }

    const tableRows = assinaturas.map(a => `
      <tr>
        <td>${format(parseISO(a.data_hora), "dd/MM/yyyy HH:mm")}</td>
        <td>${formatCPF(a.cpf)}</td>
        <td>${a.status || "-"}</td>
        <td>${a.tipo_contrato || "-"}</td>
        <td>${a.modalidade_financiamento || "-"}</td>
        <td>${a.telefone_cliente || "-"}</td>
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Assinaturas</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          h2 { font-size: 14px; color: #666; margin-bottom: 20px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
          .summary { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Relatório de Assinaturas Concluídas</h1>
        <h2>Período: ${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}</h2>
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>CPF</th>
              <th>Status</th>
              <th>Tipo Contrato</th>
              <th>Modalidade</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Total de assinaturas:</strong> ${assinaturas.length}</p>
          <p>Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    toast({
      title: "PDF",
      description: "Janela de impressão aberta."
    });
  };

  const statusBadgeVariant = (status: string | null) => {
    if (status === "Assinado") return "default";
    if (status === "Assinatura confirmada") return "secondary";
    return "outline";
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Relatório de Assinaturas" }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Relatório de Assinaturas"
        description="Visualize e exporte assinaturas concluídas por período"
        breadcrumbs={breadcrumbs}
        backTo="/dashboard"
      />

      {/* Filtros e Exportação */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal w-full sm:w-auto")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={(date) => date && setDataInicio(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground self-center hidden sm:block">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal w-full sm:w-auto")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dataFim, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataFim}
                onSelect={(date) => date && setDataFim(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="flex-1 sm:flex-none">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF} className="flex-1 sm:flex-none">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          <span>
            <strong className="text-foreground">{assinaturas.length}</strong> assinatura(s) concluída(s) no período
          </span>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <LoadingState />
      ) : assinaturas.length === 0 ? (
        <EmptyState
          icon={Download}
          title="Nenhuma assinatura encontrada"
          description="Não há assinaturas concluídas no período selecionado."
        />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Tipo Contrato</TableHead>
                <TableHead className="hidden md:table-cell">Modalidade</TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assinaturas.map((assinatura) => (
                <TableRow key={assinatura.id}>
                  <TableCell className="font-medium">
                    {format(parseISO(assinatura.data_hora), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{formatCPF(assinatura.cpf)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(assinatura.status)}>
                      {assinatura.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {assinatura.tipo_contrato || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {assinatura.modalidade_financiamento || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {assinatura.telefone_cliente || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MobileBottomNav />
    </PageContainer>
  );
}
