import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Trash2, User, Loader2, Key, Briefcase } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Funcionario {
  id: string;
  nome: string;
  email?: string;
  avatar_url?: string;
  status?: string;
  cargo?: string | null;
}

interface ManageFuncionariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string | null;
}

export default function ManageFuncionariosDialog({
  open,
  onOpenChange,
  empresaId,
}: ManageFuncionariosDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form states - Create
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newCargo, setNewCargo] = useState<'gerente' | 'financeiro'>('gerente');

  // Form states - Reset password
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPasswordName, setResetPasswordName] = useState<string>("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (open && empresaId) {
      loadFuncionarios();
    }
  }, [open, empresaId]);

  const loadFuncionarios = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      // Buscar funcionários vinculados à empresa
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, status, cargo')
        .eq('empresa_id', empresaId);

      if (error) throw error;

      // Filtrar para não mostrar o dono da empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('user_id')
        .eq('id', empresaId)
        .single();

      const funcionariosFiltered = (profilesData || []).filter(
        p => p.id !== empresaData?.user_id
      );

      setFuncionarios(funcionariosFiltered);
    } catch (error: any) {
      console.error('Erro ao carregar funcionários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar funcionários.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFuncionario = async () => {
    if (!newEmail || !newPassword || !newNome) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
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

    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            nome: newNome,
            empresaId: empresaId,
            cargo: newCargo,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar funcionário');
      }

      toast({
        title: "Sucesso!",
        description: "Funcionário criado com sucesso.",
      });

      // Reset form
      setNewEmail("");
      setNewPassword("");
      setNewNome("");
      setNewCargo('gerente');
      setShowForm(false);
      
      // Reload list
      loadFuncionarios();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetNewPassword) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Digite a nova senha.",
      });
      return;
    }

    if (resetNewPassword.length < 6) {
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-employee-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employeeId: resetPasswordId,
            newPassword: resetNewPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao trocar senha');
      }

      toast({
        title: "Sucesso!",
        description: `Senha de ${resetPasswordName} alterada com sucesso.`,
      });

      // Reset form
      setResetPasswordId(null);
      setResetPasswordName("");
      setResetNewPassword("");

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

  const handleDeleteFuncionario = async (funcionarioId: string, funcionarioNome: string) => {
    if (!confirm(`Tem certeza que deseja remover o funcionário "${funcionarioNome}"?\n\nEsta ação é irreversível.`)) {
      return;
    }

    try {
      // Remover vínculo com a empresa (definir empresa_id como null)
      const { error } = await supabase
        .from('profiles')
        .update({ empresa_id: null })
        .eq('id', funcionarioId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Funcionário "${funcionarioNome}" removido.`,
      });

      loadFuncionarios();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao remover funcionário: " + error.message,
      });
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gerenciar Funcionários
          </DialogTitle>
          <DialogDescription>
            Adicione, remova ou altere senhas dos funcionários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reset Password Form */}
          {resetPasswordId && (
            <div className="space-y-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Trocar senha de {resetPasswordName}
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="resetNewPassword">Nova Senha</Label>
                <Input
                  id="resetNewPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResetPasswordId(null);
                    setResetPasswordName("");
                    setResetNewPassword("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="flex-1"
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Add Employee Button/Form */}
          {!showForm && !resetPasswordId ? (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Adicionar Funcionário
            </Button>
          ) : showForm ? (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-2">
                <Label htmlFor="newNome">Nome</Label>
                <Input
                  id="newNome"
                  placeholder="Nome do funcionário"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newEmail">E-mail</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newCargo">Cargo</Label>
                <Select value={newCargo} onValueChange={(value: 'gerente' | 'financeiro') => setNewCargo(value)}>
                  <SelectTrigger id="newCargo">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gerente">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Gerente
                      </div>
                    </SelectItem>
                    <SelectItem value="financeiro">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Financeiro
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Gerente: acesso operacional (sem relatórios financeiros e dados da empresa).
                  Financeiro: acesso apenas a Relatórios.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setNewEmail("");
                    setNewPassword("");
                    setNewNome("");
                    setNewCargo('gerente');
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateFuncionario}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          <Separator />

          {/* Employees List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Funcionários Cadastrados
            </h4>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : funcionarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum funcionário cadastrado.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-60">
                <div className="space-y-2">
                  {funcionarios.map((func) => (
                    <div
                      key={func.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={func.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(func.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{func.nome}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {func.status === 'invalido' ? 'Inativo' : 'Ativo'}
                            </p>
                            {func.cargo && (
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                func.cargo === 'gerente' 
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "bg-green-500/10 text-green-600 dark:text-green-400"
                              )}>
                                {func.cargo === 'gerente' ? 'Gerente' : 'Financeiro'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setResetPasswordId(func.id);
                            setResetPasswordName(func.nome);
                            setShowForm(false);
                          }}
                          title="Trocar senha"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteFuncionario(func.id, func.nome)}
                          title="Remover funcionário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
