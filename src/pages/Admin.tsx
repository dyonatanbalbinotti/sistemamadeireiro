import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Building2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { formatDateBR } from "@/lib/dateUtils";

interface Empresa {
  id: string;
  nome_empresa: string;
  cnpj: string | null;
  user_id: string;
  created_at: string;
  profiles?: {
    nome: string;
    email: string;
  };
}

export default function Admin() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      const { data: empresasData, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for each empresa
      const empresasWithProfiles = await Promise.all(
        (empresasData || []).map(async (empresa) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome, email')
            .eq('id', empresa.user_id)
            .single();

          return {
            ...empresa,
            profiles: profile || undefined
          };
        })
      );

      setEmpresas(empresasWithProfiles);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar empresas: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, userId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa? Todos os dados relacionados serão perdidos.")) {
      return;
    }

    try {
      // Delete empresa
      const { error: empresaError } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (empresaError) throw empresaError;

      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      toast({
        title: "Sucesso!",
        description: "Empresa excluída com sucesso.",
      });

      loadEmpresas();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir empresa: " + error.message,
      });
    }
  };

  const filteredEmpresas = empresas.filter(empresa =>
    empresa.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase())
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
            <span>Empresas Cadastradas</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar empresa..."
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
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpresas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmpresas.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium">{empresa.nome_empresa}</TableCell>
                      <TableCell>{empresa.cnpj || "-"}</TableCell>
                      <TableCell>{empresa.profiles?.nome || "-"}</TableCell>
                      <TableCell>{empresa.profiles?.email || "-"}</TableCell>
                      <TableCell>{formatDateBR(empresa.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(empresa.id, empresa.user_id)}
                          className="hover:bg-destructive/10 hover:text-destructive"
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
