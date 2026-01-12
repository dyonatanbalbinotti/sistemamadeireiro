import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateBR } from "@/lib/dateUtils";

interface Funcionario {
  id: string;
  nome: string;
  email?: string;
  status: string;
  created_at: string;
  empresa_nome?: string;
}

export default function AdminFuncionariosList() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadFuncionarios();
  }, []);

  const loadFuncionarios = async () => {
    try {
      // Buscar todos os usuários com role 'funcionario'
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'funcionario');

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setFuncionarios([]);
        setLoading(false);
        return;
      }

      const userIds = rolesData.map(r => r.user_id);

      // Buscar profiles desses usuários
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, status, created_at, empresa_id')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Buscar emails via edge function
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

      // Buscar nomes das empresas
      const empresaIds = [...new Set((profilesData || []).filter(p => p.empresa_id).map(p => p.empresa_id))];
      let empresasMap: Record<string, string> = {};
      
      if (empresaIds.length > 0) {
        const { data: empresasData } = await supabase
          .from('empresas')
          .select('id, nome_empresa')
          .in('id', empresaIds);
        
        if (empresasData) {
          empresasMap = empresasData.reduce((acc: Record<string, string>, e: any) => {
            acc[e.id] = e.nome_empresa;
            return acc;
          }, {});
        }
      }

      const funcionariosList: Funcionario[] = (profilesData || []).map(profile => ({
        id: profile.id,
        nome: profile.nome,
        email: emailsMap[profile.id] || '',
        status: profile.status || 'operacional',
        created_at: profile.created_at,
        empresa_nome: profile.empresa_id ? empresasMap[profile.empresa_id] : undefined,
      }));

      setFuncionarios(funcionariosList);
    } catch (error: any) {
      console.error('Erro ao carregar funcionários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar funcionários: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFuncionarios = funcionarios.filter(func =>
    func.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    func.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    func.empresa_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="glass-effect neon-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Funcionários Cadastrados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionário por nome, email ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum funcionário cadastrado no sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuncionarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum funcionário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFuncionarios.map((func) => (
                    <TableRow key={func.id}>
                      <TableCell className="font-medium">{func.nome}</TableCell>
                      <TableCell>{func.email || '-'}</TableCell>
                      <TableCell>
                        {func.empresa_nome ? (
                          <Badge variant="outline">{func.empresa_nome}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Sem empresa</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={func.status === 'operacional' ? 'default' : 'destructive'}>
                          {func.status === 'operacional' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateBR(func.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
