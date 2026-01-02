import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Building2, Search, RefreshCw, Calendar, UserPlus, Key } from "lucide-react";
import { motion } from "framer-motion";
import { formatDateBR, getTodayBR } from "@/lib/dateUtils";
import { addMonths, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toZonedTime } from "date-fns-tz";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  status: 'operacional' | 'invalido';
  created_at: string;
  empresa?: {
    id: string;
    nome_empresa: string;
    cnpj: string | null;
    data_vencimento_anuidade: string | null;
  };
  role?: 'admin' | 'empresa';
}

// Planos disponíveis
const PLANOS = [
  { id: '1_mes', label: '1 Mês', meses: 1, valor: 200 },
  { id: '6_meses', label: '6 Meses', meses: 6, valor: 1100 },
  { id: '12_meses', label: '12 Meses', meses: 12, valor: 2100 },
];

export default function Admin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planoSelecionado, setPlanoSelecionado] = useState<Record<string, string>>({});
  
  // Estados para criar usuário
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserNome, setNewUserNome] = useState("");
  const [newUserPlano, setNewUserPlano] = useState("");
  const [newUserNomeEmpresa, setNewUserNomeEmpresa] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Estados para trocar senha
  const [openResetPassword, setOpenResetPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadUsuarios();
    verificarAnuidadesVencidas();
  }, []);

  const verificarAnuidadesVencidas = async () => {
    try {
      // Buscar empresas com anuidade vencida (GMT-3)
      const hoje = getTodayBR();
      const { data: empresasVencidas, error } = await supabase
        .from('empresas')
        .select('id, user_id')
        .lt('data_vencimento_anuidade', hoje);

      if (error) throw error;

      // Atualizar status dos usuários com anuidade vencida
      if (empresasVencidas && empresasVencidas.length > 0) {
        for (const empresa of empresasVencidas) {
          // Atualizar dono da empresa
          await supabase
            .from('profiles')
            .update({ status: 'invalido' })
            .eq('id', empresa.user_id);
          
          // Atualizar todos os membros da empresa
          await supabase
            .from('profiles')
            .update({ status: 'invalido' })
            .eq('empresa_id', empresa.id);
        }
      }
    } catch (error: any) {
      console.error("Erro ao verificar anuidades:", error);
    }
  };

  const loadUsuarios = async () => {
    try {
      // Carregar todos os perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar emails via edge function (apenas admins podem acessar)
      const { data: session } = await supabase.auth.getSession();
      let emailsMap: Record<string, string> = {};
      
      if (session?.session) {
        const { data: emailsData } = await supabase.functions.invoke('get-user-emails', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });
        
        if (emailsData?.users) {
          emailsMap = emailsData.users.reduce((acc: Record<string, string>, u: any) => {
            acc[u.id] = u.email;
            return acc;
          }, {});
        }
      }

      // Carregar roles e empresas para cada usuário
      const usuariosComDetalhes = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Buscar role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();

          // Buscar empresa se existir (seja como dono ou como membro)
          let empresaData = null;
          
          // Primeiro tenta buscar por empresa_id no profile
          if (profile.empresa_id) {
            const { data } = await supabase
              .from('empresas')
              .select('id, nome_empresa, cnpj, data_vencimento_anuidade')
              .eq('id', profile.empresa_id)
              .maybeSingle();
            empresaData = data;
          }
          
          // Se não encontrou, tenta buscar onde o usuário é o dono
          if (!empresaData) {
            const { data } = await supabase
              .from('empresas')
              .select('id, nome_empresa, cnpj, data_vencimento_anuidade')
              .eq('user_id', profile.id)
              .maybeSingle();
            empresaData = data;
          }

          return {
            id: profile.id,
            nome: profile.nome,
            email: emailsMap[profile.id] || '',
            status: (profile.status as 'operacional' | 'invalido') || 'operacional',
            created_at: profile.created_at,
            empresa: empresaData || undefined,
            role: roleData?.role as 'admin' | 'empresa'
          };
        })
      );

      setUsuarios(usuariosComDetalhes);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar usuários: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'operacional' ? 'invalido' : 'operacional';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Status alterado para ${newStatus}.`,
      });

      loadUsuarios();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao alterar status: " + error.message,
      });
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"?\n\n⚠️ ATENÇÃO: Esta ação é irreversível!\n\nSerão deletados:\n• Perfil do usuário\n• Dados da empresa (se houver)\n• Todas as produções\n• Todas as vendas\n• Todo o estoque\n• Todos os registros de toras e cavaco\n• Role e permissões`)) {
      return;
    }

    try {
      // Buscar empresa_id do usuário
      const usuario = usuarios.find(u => u.id === userId);
      const empresaId = usuario?.empresa?.id;

      // Deletar todos os dados relacionados à empresa
      if (empresaId) {
        await Promise.all([
          supabase.from('producao').delete().eq('empresa_id', empresaId),
          supabase.from('vendas').delete().eq('empresa_id', empresaId),
          supabase.from('vendas_cavaco').delete().eq('empresa_id', empresaId),
          supabase.from('toras').delete().eq('empresa_id', empresaId),
          supabase.from('toras_serradas').delete().eq('empresa_id', empresaId),
          supabase.from('produtos').delete().eq('empresa_id', empresaId),
          supabase.from('historico_anuidades').delete().eq('empresa_id', empresaId),
          supabase.from('empresas').delete().eq('id', empresaId),
        ]);
      }

      // Deletar role e profile
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      // Deletar usuário do auth (requer permissões de admin)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.warn("Não foi possível deletar do auth:", authError);
      }

      // Remover da lista localmente
      setUsuarios(prev => prev.filter(u => u.id !== userId));

      toast({
        title: "Sucesso!",
        description: `Usuário "${userName}" e todos os dados relacionados foram excluídos.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir usuário: " + error.message,
      });
    }
  };

  const handleRenovarPlano = async (empresaId: string, usuarioNome: string) => {
    const planoId = planoSelecionado[empresaId];
    const plano = PLANOS.find(p => p.id === planoId);
    
    if (!plano) {
      toast({
        variant: "destructive",
        title: "Selecione um plano",
        description: "Escolha um plano antes de renovar.",
      });
      return;
    }

    if (!confirm(`Confirma a renovação para "${usuarioNome}"?\n\nPlano: ${plano.label}\nValor: R$ ${plano.valor.toFixed(2)}\n\nO vencimento será estendido por +${plano.meses} mês(es) a partir de hoje ou da data atual (o que for maior).`)) {
      return;
    }

    try {
      // Buscar empresa para obter data de vencimento atual
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('data_vencimento_anuidade, user_id')
        .eq('id', empresaId)
        .single();

      if (empresaError) throw empresaError;

      // Calcular nova data de vencimento (X meses a partir de hoje ou da data atual de vencimento, o que for maior) - GMT-3
      const hojeBR = toZonedTime(new Date(), 'America/Sao_Paulo');
      const dataVencimentoAtual = empresaData.data_vencimento_anuidade 
        ? toZonedTime(new Date(empresaData.data_vencimento_anuidade), 'America/Sao_Paulo')
        : hojeBR;
      
      const baseDate = dataVencimentoAtual > hojeBR ? dataVencimentoAtual : hojeBR;
      const novaDataVencimento = addMonths(baseDate, plano.meses);
      const novaDataFormatada = format(novaDataVencimento, 'yyyy-MM-dd');

      // Atualizar data de vencimento na empresa
      const { error: updateError } = await supabase
        .from('empresas')
        .update({ data_vencimento_anuidade: novaDataFormatada })
        .eq('id', empresaId);

      if (updateError) throw updateError;

      // Registrar no histórico
      await supabase
        .from('historico_anuidades')
        .insert({
          empresa_id: empresaId,
          valor_pago: plano.valor,
          data_vencimento_anterior: empresaData.data_vencimento_anuidade,
          data_novo_vencimento: novaDataFormatada,
          observacao: `Plano ${plano.label} - Renovação manual pelo administrador`
        });

      // Reativar usuário se estava inativo
      await supabase
        .from('profiles')
        .update({ status: 'operacional' })
        .eq('id', empresaData.user_id);
      
      // Reativar todos os membros da empresa também
      await supabase
        .from('profiles')
        .update({ status: 'operacional' })
        .eq('empresa_id', empresaId);

      toast({
        title: "Sucesso!",
        description: `Plano ${plano.label} ativado até ${formatDateBR(novaDataVencimento.toISOString())}`,
      });

      // Limpar seleção do plano
      setPlanoSelecionado(prev => {
        const next = { ...prev };
        delete next[empresaId];
        return next;
      });

      loadUsuarios();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao renovar plano: " + error.message,
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserNome || !newUserNomeEmpresa || !newUserPlano) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos, incluindo empresa e plano.",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha deve ter no mínimo 6 caracteres.",
      });
      return;
    }

    const plano = PLANOS.find(p => p.id === newUserPlano);
    if (!plano) {
      toast({
        variant: "destructive",
        title: "Plano inválido",
        description: "Selecione um plano válido.",
      });
      return;
    }

    setCreatingUser(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Calcular data de vencimento baseada no plano
      const hojeBR = toZonedTime(new Date(), 'America/Sao_Paulo');
      const dataVencimento = addMonths(hojeBR, plano.meses);
      const dataVencimentoFormatada = format(dataVencimento, 'yyyy-MM-dd');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newUserEmail,
            password: newUserPassword,
            nome: newUserNome,
            nomeEmpresa: newUserNomeEmpresa,
            planoId: newUserPlano,
            planoMeses: plano.meses,
            planoValor: plano.valor,
            dataVencimento: dataVencimentoFormatada,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast({
        title: "Sucesso!",
        description: `Usuário criado com plano ${plano.label} até ${formatDateBR(dataVencimento.toISOString())}.`,
      });

      setOpenCreateUser(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserNome("");
      setNewUserNomeEmpresa("");
      setNewUserPlano("");
      loadUsuarios();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Digite a nova senha.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha deve ter no mínimo 6 caracteres.",
      });
      return;
    }

    setResettingPassword(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUserId,
            newPassword: newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao trocar senha');
      }

      toast({
        title: "Sucesso!",
        description: `Senha de ${selectedUserName} alterada com sucesso.`,
      });

      setOpenResetPassword(false);
      setNewPassword("");
      setSelectedUserId("");
      setSelectedUserName("");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.empresa?.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-primary animate-pulse text-xl font-tech"
        >
          Carregando...
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-tech font-bold text-primary">
          Painel Administrativo
        </h1>
      </div>

      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gerenciamento de Usuários</span>
            <div className="flex items-center gap-3">
              <Dialog open={openCreateUser} onOpenChange={setOpenCreateUser}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Criar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Preencha os dados para criar um novo acesso ao sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo</Label>
                      <Input
                        id="nome"
                        value={newUserNome}
                        onChange={(e) => setNewUserNome(e.target.value)}
                        placeholder="Nome do usuário"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                      <Input
                        id="nomeEmpresa"
                        value={newUserNomeEmpresa}
                        onChange={(e) => setNewUserNomeEmpresa(e.target.value)}
                        placeholder="Nome da empresa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plano">Plano</Label>
                      <Select
                        value={newUserPlano}
                        onValueChange={setNewUserPlano}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANOS.map(plano => (
                            <SelectItem key={plano.id} value={plano.id}>
                              {plano.label} - R$ {plano.valor.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setOpenCreateUser(false)}
                      disabled={creatingUser}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateUser} disabled={creatingUser}>
                      {creatingUser ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 neon-input"
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nome}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          usuario.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {usuario.role === 'admin' ? 'Admin' : 'Empresa'}
                        </span>
                      </TableCell>
                      <TableCell>{usuario.empresa?.nome_empresa || "-"}</TableCell>
                      <TableCell>
                        {usuario.empresa?.data_vencimento_anuidade ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-sm ${
                              new Date(usuario.empresa.data_vencimento_anuidade) < new Date()
                                ? 'text-destructive font-bold animate-pulse'
                                : 'text-muted-foreground'
                            }`}>
                              {formatDateBR(usuario.empresa.data_vencimento_anuidade)}
                              {new Date(usuario.empresa.data_vencimento_anuidade) < new Date() && ' ⚠️'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {usuario.empresa && (
                          <Select
                            value={planoSelecionado[usuario.empresa.id] || ''}
                            onValueChange={(value) => setPlanoSelecionado(prev => ({
                              ...prev,
                              [usuario.empresa!.id]: value
                            }))}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {PLANOS.map(plano => (
                                <SelectItem key={plano.id} value={plano.id}>
                                  {plano.label} - R$ {plano.valor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={usuario.status === 'operacional' ? 'default' : 'destructive'}
                          size="sm"
                          onClick={() => handleToggleStatus(usuario.id, usuario.status)}
                          className="font-medium"
                        >
                          {usuario.status === 'operacional' ? 'Operacional' : 'Inválido'}
                        </Button>
                      </TableCell>
                      <TableCell>{formatDateBR(usuario.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedUserId(usuario.id);
                              setSelectedUserName(usuario.nome);
                              setOpenResetPassword(true);
                            }}
                            className="hover:bg-accent"
                            title="Trocar senha"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          {usuario.empresa && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRenovarPlano(usuario.empresa!.id, usuario.nome)}
                              className="hover:bg-primary/10 hover:text-primary"
                              title="Renovar/Ativar plano"
                              disabled={!planoSelecionado[usuario.empresa.id]}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(usuario.id, usuario.nome)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                            disabled={usuario.role === 'admin'}
                            title={usuario.role === 'admin' ? 'Não é possível excluir administradores' : 'Excluir usuário'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openResetPassword} onOpenChange={setOpenResetPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Senha do Usuário</DialogTitle>
            <DialogDescription>
              Alterar senha de: <strong>{selectedUserName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenResetPassword(false);
                setNewPassword("");
              }}
              disabled={resettingPassword}
            >
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
