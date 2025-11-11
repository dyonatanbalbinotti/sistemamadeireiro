import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Building2, Search, DollarSign, Save } from "lucide-react";
import { motion } from "framer-motion";
import { formatDateBR } from "@/lib/dateUtils";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  status: 'operacional' | 'invalido';
  created_at: string;
  empresa?: {
    nome_empresa: string;
    cnpj: string | null;
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
  }, []);

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
            .select('nome_empresa, cnpj')
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

      toast({
        title: "Sucesso!",
        description: "Usuário excluído com sucesso.",
      });

      loadUsuarios();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir usuário: " + error.message,
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
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(usuario.id)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                          disabled={usuario.role === 'admin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
