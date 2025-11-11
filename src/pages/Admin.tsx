import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Building2, Search, DollarSign, Save, RefreshCw, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { formatDateBR } from "@/lib/dateUtils";

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

export default function Admin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [valorAnuidade, setValorAnuidade] = useState("");
  const [editandoAnuidade, setEditandoAnuidade] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsuarios();
    loadConfiguracoes();
    verificarAnuidadesVencidas();
  }, []);

  const verificarAnuidadesVencidas = async () => {
    try {
      // Buscar empresas com anuidade vencida
      const hoje = new Date().toISOString().split('T')[0];
      const { data: empresasVencidas, error } = await supabase
        .from('empresas')
        .select('user_id')
        .lt('data_vencimento_anuidade', hoje);

      if (error) throw error;

      // Atualizar status dos usuários com anuidade vencida
      if (empresasVencidas && empresasVencidas.length > 0) {
        for (const empresa of empresasVencidas) {
          await supabase
            .from('profiles')
            .update({ status: 'invalido' })
            .eq('id', empresa.user_id);
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

      // Carregar roles e empresas para cada usuário
      const usuariosComDetalhes = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Buscar role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .single();

          // Buscar empresa se existir
          const { data: empresaData } = await supabase
            .from('empresas')
            .select('id, nome_empresa, cnpj, data_vencimento_anuidade')
            .eq('user_id', profile.id)
            .single();

          return {
            id: profile.id,
            nome: profile.nome,
            email: profile.email,
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

  const loadConfiguracoes = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'valor_anuidade')
        .maybeSingle();

      if (error) throw error;

      setValorAnuidade(data?.valor || '1000');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar configurações: " + error.message,
      });
    }
  };

  const handleSalvarAnuidade = async () => {
    if (!valorAnuidade || parseFloat(valorAnuidade) <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Digite um valor válido para a anuidade.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('configuracoes')
        .update({ valor: valorAnuidade })
        .eq('chave', 'valor_anuidade');

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Valor da anuidade atualizado.",
      });

      setEditandoAnuidade(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar anuidade: " + error.message,
      });
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

  const handleDelete = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário? Todos os dados relacionados serão perdidos.")) {
      return;
    }

    try {
      // Deletar empresa se existir
      await supabase
        .from('empresas')
        .delete()
        .eq('user_id', userId);

      // Deletar role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Remover da lista localmente
      setUsuarios(prev => prev.filter(u => u.id !== userId));

      toast({
        title: "Sucesso!",
        description: "Usuário excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir usuário: " + error.message,
      });
    }
  };

  const handleRenovarAnuidade = async (empresaId: string, usuarioNome: string) => {
    if (!confirm(`Confirma a renovação da anuidade para ${usuarioNome}?`)) {
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

      // Calcular nova data de vencimento (1 ano a partir de hoje ou da data atual de vencimento, o que for maior)
      const hoje = new Date();
      const dataVencimentoAtual = empresaData.data_vencimento_anuidade 
        ? new Date(empresaData.data_vencimento_anuidade) 
        : new Date();
      
      const baseDate = dataVencimentoAtual > hoje ? dataVencimentoAtual : hoje;
      const novaDataVencimento = new Date(baseDate);
      novaDataVencimento.setFullYear(novaDataVencimento.getFullYear() + 1);

      // Atualizar data de vencimento na empresa
      const { error: updateError } = await supabase
        .from('empresas')
        .update({ data_vencimento_anuidade: novaDataVencimento.toISOString().split('T')[0] })
        .eq('id', empresaId);

      if (updateError) throw updateError;

      // Buscar valor da anuidade
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'valor_anuidade')
        .maybeSingle();

      // Registrar no histórico
      await supabase
        .from('historico_anuidades')
        .insert({
          empresa_id: empresaId,
          valor_pago: parseFloat(configData?.valor || valorAnuidade),
          data_vencimento_anterior: empresaData.data_vencimento_anuidade,
          data_novo_vencimento: novaDataVencimento.toISOString().split('T')[0],
          observacao: 'Renovação manual pelo administrador'
        });

      // Reativar usuário se estava inativo
      await supabase
        .from('profiles')
        .update({ status: 'operacional' })
        .eq('id', empresaData.user_id);

      toast({
        title: "Sucesso!",
        description: `Anuidade renovada até ${formatDateBR(novaDataVencimento.toISOString())}`,
      });

      loadUsuarios();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao renovar anuidade: " + error.message,
      });
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
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Configuração de Anuidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">
                Valor da Anuidade (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorAnuidade}
                onChange={(e) => setValorAnuidade(e.target.value)}
                disabled={!editandoAnuidade}
                className="neon-input"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2 mt-6">
              {editandoAnuidade ? (
                <>
                  <Button
                    onClick={handleSalvarAnuidade}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditandoAnuidade(false);
                      loadConfiguracoes();
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditandoAnuidade(true)}
                  variant="outline"
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gerenciamento de Usuários</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 neon-input"
              />
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
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                                ? 'text-destructive font-medium'
                                : 'text-muted-foreground'
                            }`}>
                              {formatDateBR(usuario.empresa.data_vencimento_anuidade)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
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
                          {usuario.empresa && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRenovarAnuidade(usuario.empresa!.id, usuario.nome)}
                              className="hover:bg-primary/10 hover:text-primary"
                              title="Renovar anuidade"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(usuario.id)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                            disabled={usuario.role === 'admin'}
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
    </motion.div>
  );
}
