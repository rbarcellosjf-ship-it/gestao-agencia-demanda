import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/layout/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EscritorioCCA {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const GerenciamentoCCAs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, isAdminOrAgencia } = useUserRole();
  
  const [escritorios, setEscritorios] = useState<EscritorioCCA[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEscritorio, setEditingEscritorio] = useState<EscritorioCCA | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [escritorioToDelete, setEscritorioToDelete] = useState<EscritorioCCA | null>(null);
  
  // Form states
  const [formCodigo, setFormCodigo] = useState("");
  const [formNome, setFormNome] = useState("");
  
  // Filter state
  const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativos" | "inativos">("todos");

  useEffect(() => {
    if (!roleLoading && !isAdminOrAgencia) {
      navigate("/dashboard");
      return;
    }
    if (!roleLoading) {
      loadEscritorios();
    }
  }, [roleLoading, isAdminOrAgencia, navigate]);

  const loadEscritorios = async () => {
    try {
      const { data, error } = await supabase
        .from("escritorios_cca")
        .select("*")
        .order("codigo");

      if (error) throw error;
      setEscritorios(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar CCAs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (escritorio?: EscritorioCCA) => {
    if (escritorio) {
      setEditingEscritorio(escritorio);
      setFormCodigo(escritorio.codigo);
      setFormNome(escritorio.nome);
    } else {
      setEditingEscritorio(null);
      setFormCodigo("");
      setFormNome("");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formCodigo.trim() || !formNome.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Código e nome são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingEscritorio) {
        // Update
        const { error } = await supabase
          .from("escritorios_cca")
          .update({ codigo: formCodigo.trim(), nome: formNome.trim() })
          .eq("id", editingEscritorio.id);

        if (error) throw error;
        toast({ title: "CCA atualizado com sucesso!" });
      } else {
        // Insert
        const { error } = await supabase
          .from("escritorios_cca")
          .insert({ codigo: formCodigo.trim(), nome: formNome.trim() });

        if (error) {
          if (error.code === "23505") {
            throw new Error("Já existe um CCA com este código");
          }
          throw error;
        }
        toast({ title: "CCA criado com sucesso!" });
      }
      
      setDialogOpen(false);
      loadEscritorios();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar CCA",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (escritorio: EscritorioCCA) => {
    try {
      const { error } = await supabase
        .from("escritorios_cca")
        .update({ ativo: !escritorio.ativo })
        .eq("id", escritorio.id);

      if (error) throw error;
      
      toast({
        title: escritorio.ativo ? "CCA desativado" : "CCA ativado",
      });
      loadEscritorios();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!escritorioToDelete) return;

    try {
      const { error } = await supabase
        .from("escritorios_cca")
        .delete()
        .eq("id", escritorioToDelete.id);

      if (error) throw error;
      
      toast({ title: "CCA excluído com sucesso!" });
      setDeleteDialogOpen(false);
      setEscritorioToDelete(null);
      loadEscritorios();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir CCA",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredEscritorios = escritorios.filter(e => {
    if (filtroAtivo === "ativos") return e.ativo;
    if (filtroAtivo === "inativos") return !e.ativo;
    return true;
  });

  if (roleLoading || loading) {
    return <LoadingState message="Carregando CCAs..." />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gerenciamento de CCAs"
        description="Cadastre e gerencie os escritórios de correspondentes bancários"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo CCA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingEscritorio ? "Editar CCA" : "Novo CCA"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingEscritorio 
                      ? "Atualize os dados do escritório" 
                      : "Cadastre um novo escritório de correspondente bancário"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código do CCA</Label>
                    <Input
                      id="codigo"
                      placeholder="Ex: 12345"
                      value={formCodigo}
                      onChange={(e) => setFormCodigo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Escritório</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Escritório Centro"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingEscritorio ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Filtrar:</Label>
              <div className="flex gap-2">
                <Button
                  variant={filtroAtivo === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroAtivo("todos")}
                >
                  Todos ({escritorios.length})
                </Button>
                <Button
                  variant={filtroAtivo === "ativos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroAtivo("ativos")}
                >
                  Ativos ({escritorios.filter(e => e.ativo).length})
                </Button>
                <Button
                  variant={filtroAtivo === "inativos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroAtivo("inativos")}
                >
                  Inativos ({escritorios.filter(e => !e.ativo).length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              CCAs Cadastrados
            </CardTitle>
            <CardDescription>
              {filteredEscritorios.length} CCA(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEscritorios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum CCA cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEscritorios.map((escritorio) => (
                    <TableRow key={escritorio.id}>
                      <TableCell className="font-mono font-medium">
                        {escritorio.codigo}
                      </TableCell>
                      <TableCell>{escritorio.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={escritorio.ativo}
                            onCheckedChange={() => handleToggleAtivo(escritorio)}
                          />
                          <Badge variant={escritorio.ativo ? "default" : "secondary"}>
                            {escritorio.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(escritorio.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(escritorio)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setEscritorioToDelete(escritorio);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o CCA "{escritorioToDelete?.nome}" (Código: {escritorioToDelete?.codigo})?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default GerenciamentoCCAs;