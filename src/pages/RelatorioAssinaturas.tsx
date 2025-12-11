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
  valor_financiamento: number | null;
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
};

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
        .select(`
          id,
          cpf,
          data_hora,
          status,
          tipo_contrato,
          modalidade_financiamento,
          observacoes,
          telefone_cliente,
          conformidade_id,
          conformidades (
            valor_financiamento
          )
        `)
        .eq("tipo", "assinatura")
        .in("status", ["Assinado", "Assinatura confirmada"])
        .gte("data_hora", dataInicio.toISOString())
        .lte("data_hora", dataFim.toISOString())
        .order("data_hora", { ascending: false });

      if (error) throw error;
      
      // Map data to include valor_financiamento from conformidades
      const mappedData = (data || []).map(item => ({
        id: item.id,
        cpf: item.cpf,
        data_hora: item.data_hora,
        status: item.status,
        tipo_contrato: item.tipo_contrato,
        modalidade_financiamento: item.modalidade_financiamento,
        observacoes: item.observacoes,
        telefone_cliente: item.telefone_cliente,
        valor_financiamento: (item.conformidades as any)?.valor_financiamento ?? null
      }));
      
      setAssinaturas(mappedData);
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

  // Totalizadores por modalidade
  const totalMCMV = assinaturas
    .filter(a => a.modalidade_financiamento?.toLowerCase() === 'mcmv')
    .reduce((sum, a) => sum + (a.valor_financiamento || 0), 0);
  
  const totalSBPE = assinaturas
    .filter(a => a.modalidade_financiamento?.toLowerCase() === 'sbpe')
    .reduce((sum, a) => sum + (a.valor_financiamento || 0), 0);

  const totalGeral = assinaturas.reduce((sum, a) => sum + (a.valor_financiamento || 0), 0);

  const exportToCSV = () => {
    if (assinaturas.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Data/Hora", "CPF", "Status", "Tipo Contrato", "Modalidade", "Valor Financiamento", "Telefone", "Observações"];
    const rows = assinaturas.map(a => [
      format(parseISO(a.data_hora), "dd/MM/yyyy HH:mm"),
      formatCPF(a.cpf),
      a.status || "",
      a.tipo_contrato || "",
      a.modalidade_financiamento || "",
      a.valor_financiamento ? a.valor_financiamento.toString() : "",
      a.telefone_cliente || "",
      (a.observacoes || "").replace(/"/g, '""')
    ]);

    // Adicionar linhas de totalizadores
    rows.push([]);
    rows.push(["", "", "", "", "Total MCMV:", totalMCMV.toString(), "", ""]);
    rows.push(["", "", "", "", "Total SBPE:", totalSBPE.toString(), "", ""]);
    rows.push(["", "", "", "", "Total Geral:", totalGeral.toString(), "", ""]);

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
        <td style="text-align: right;">${formatCurrency(a.valor_financiamento)}</td>
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
          .summary { margin-top: 20px; font-size: 12px; }
          .totals { margin-top: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
          .totals h3 { margin: 0 0 10px 0; font-size: 14px; }
          .totals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .total-item { text-align: center; }
          .total-label { font-size: 11px; color: #666; }
          .total-value { font-size: 16px; font-weight: bold; }
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
              <th style="text-align: right;">Valor Financiamento</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="totals">
          <h3>Totalizadores por Modalidade</h3>
          <div class="totals-grid">
            <div class="total-item">
              <div class="total-label">Total MCMV</div>
              <div class="total-value">${formatCurrency(totalMCMV)}</div>
            </div>
            <div class="total-item">
              <div class="total-label">Total SBPE</div>
              <div class="total-value">${formatCurrency(totalSBPE)}</div>
            </div>
            <div class="total-item">
              <div class="total-label">Total Geral</div>
              <div class="total-value">${formatCurrency(totalGeral)}</div>
            </div>
          </div>
        </div>
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

      {/* Resumo e Totalizadores */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            <span>
              <strong className="text-foreground">{assinaturas.length}</strong> assinatura(s) concluída(s) no período
            </span>
          </div>
          
          {assinaturas.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total MCMV</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(totalMCMV)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total SBPE</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(totalSBPE)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Geral</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(totalGeral)}</p>
              </div>
            </div>
          )}
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
                <TableHead className="hidden md:table-cell text-right">Valor</TableHead>
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
                  <TableCell className="hidden md:table-cell text-right font-medium">
                    {formatCurrency(assinatura.valor_financiamento)}
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
