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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Shield, UserCheck, UserX, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  codigo_cca: string;
  ativo: boolean;
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
  role?: string;
}

interface ConfigAprovacao {
  exigir_aprovacao: boolean;
}

interface EscritorioCCA {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

const GerenciamentoUsuarios = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [configAprovacao, setConfigAprovacao] = useState<ConfigAprovacao>({ exigir_aprovacao: false });
  const [savingConfig, setSavingConfig] = useState(false);
  const [escritorios, setEscritorios] = useState<EscritorioCCA[]>([]);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newCodigoCca, setNewCodigoCca] = useState<string>("");
  const [saving, setSaving] = useState(false);
  
  // Filter states
  const [filtroRole, setFiltroRole] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!roleLoading && role !== "admin") {
      navigate("/dashboard");
      return;
    }
    if (!roleLoading && role === "admin") {
      loadUsuarios();
      loadConfigAprovacao();
      loadEscritorios();
    }
  }, [roleLoading, role, navigate]);

  const loadEscritorios = async () => {
    try {
      const { data, error } = await supabase
        .from("escritorios_cca")
        .select("*")
        .eq("ativo", true)
        .order("codigo");

      if (error) throw error;
      setEscritorios(data || []);
    } catch (error) {
      console.error("Erro ao carregar CCAs:", error);
    }
  };

  const loadUsuarios = async () => {
    try {
      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combinar dados
      const usuariosComRoles = (profiles || []).map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.user_id)?.role || "cca"
      }));

      setUsuarios(usuariosComRoles);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConfigAprovacao = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "exigir_aprovacao_cadastro")
        .single();

      if (!error && data) {
        setConfigAprovacao({ exigir_aprovacao: data.valor === "true" });
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const handleToggleAprovacaoObrigatoria = async () => {
    setSavingConfig(true);
    try {
      const novoValor = !configAprovacao.exigir_aprovacao;
      
      const { error } = await supabase
        .from("configuracoes")
        .update({ valor: novoValor ? "true" : "false" })
        .eq("chave", "exigir_aprovacao_cadastro");

      if (error) throw error;

      setConfigAprovacao({ exigir_aprovacao: novoValor });
      toast({
        title: novoValor ? "Aprovação obrigatória ativada" : "Aprovação obrigatória desativada",
        description: novoValor 
          ? "Novos usuários precisarão de aprovação para acessar o sistema"
          : "Novos usuários terão acesso imediato ao sistema",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleAtivo = async (usuario: UserProfile) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: !usuario.ativo })
        .eq("id", usuario.id);

      if (error) throw error;
      
      toast({
        title: usuario.ativo ? "Usuário desativado" : "Usuário ativado",
      });
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAprovarUsuario = async (usuario: UserProfile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString()
        })
        .eq("id", usuario.id);

      if (error) throw error;
      
      toast({ title: "Usuário aprovado com sucesso!" });
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenEditDialog = (usuario: UserProfile) => {
    setSelectedUser(usuario);
    setNewRole(usuario.role || "cca");
    setNewCodigoCca(usuario.codigo_cca || "");
    setEditDialogOpen(true);
  };

  const handleSaveUserChanges = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Atualizar role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: newRole as "admin" | "agencia" | "cca" })
        .eq("user_id", selectedUser.user_id);

      if (roleError) throw roleError;

      // Atualizar codigo_cca no profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ codigo_cca: newCodigoCca || null })
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;
      
      toast({ title: "Usuário atualizado com sucesso!" });
      setEditDialogOpen(false);
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500 hover:bg-purple-600"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case "agencia":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Agência</Badge>;
      default:
        return <Badge variant="secondary">CCA</Badge>;
    }
  };

  const filteredUsuarios = usuarios.filter(u => {
    if (filtroRole !== "todos" && u.role !== filtroRole) return false;
    if (filtroStatus === "ativos" && !u.ativo) return false;
    if (filtroStatus === "inativos" && u.ativo) return false;
    if (filtroStatus === "pendentes" && u.aprovado_por !== null) return false;
    if (searchTerm && !u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !u.codigo_cca?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (roleLoading || loading) {
    return <LoadingState message="Carregando usuários..." />;
  }

  if (role !== "admin") {
    return null;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gerenciamento de Usuários"
        description="Gerencie os usuários do sistema, altere perfis e aprove cadastros"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Configuração de Aprovação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Configuração de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Exigir aprovação para novos cadastros</p>
                <p className="text-sm text-muted-foreground">
                  Quando ativado, novos usuários precisarão de aprovação de um administrador
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savingConfig && <Loader2 className="w-4 h-4 animate-spin" />}
                <Switch
                  checked={configAprovacao.exigir_aprovacao}
                  onCheckedChange={handleToggleAprovacaoObrigatoria}
                  disabled={savingConfig}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CCA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Perfil:</Label>
                <Select value={filtroRole} onValueChange={setFiltroRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agencia">Agência</SelectItem>
                    <SelectItem value="cca">CCA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Status:</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativos">Ativos</SelectItem>
                    <SelectItem value="inativos">Inativos</SelectItem>
                    <SelectItem value="pendentes">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários Cadastrados
            </CardTitle>
            <CardDescription>
              {filteredUsuarios.length} usuário(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsuarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CCA</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.full_name}</TableCell>
                      <TableCell className="text-sm">{usuario.phone}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {usuario.codigo_cca || "-"}
                      </TableCell>
                      <TableCell>{getRoleBadge(usuario.role || "cca")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={usuario.ativo}
                              onCheckedChange={() => handleToggleAtivo(usuario)}
                            />
                            <Badge variant={usuario.ativo ? "default" : "secondary"}>
                              {usuario.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          {configAprovacao.exigir_aprovacao && !usuario.aprovado_por && (
                            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
                              Aguardando aprovação
                            </Badge>
                          )}
                          {usuario.aprovado_por && usuario.aprovado_em && (
                            <span className="text-xs text-muted-foreground">
                              Aprovado em {format(new Date(usuario.aprovado_em), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(usuario.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {configAprovacao.exigir_aprovacao && !usuario.aprovado_por && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleAprovarUsuario(usuario)}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(usuario)}
                          >
                            Alterar Perfil
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Usuário: {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cca">CCA (Correspondente Bancário)</SelectItem>
                  <SelectItem value="agencia">Agência (Gerente)</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>CCA Vinculado</Label>
              {escritorios.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2 px-3 border rounded-md bg-muted/50">
                  Nenhum CCA cadastrado. Cadastre CCAs primeiro.
                </div>
              ) : (
                <Select value={newCodigoCca} onValueChange={setNewCodigoCca}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o CCA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {escritorios.map((esc) => (
                      <SelectItem key={esc.id} value={esc.codigo}>
                        {esc.codigo} - {esc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Vincule o usuário a um escritório CCA cadastrado
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUserChanges} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default GerenciamentoUsuarios;