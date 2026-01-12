import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger 
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  Settings,
  Moon,
  Sun,
  ChevronRight,
  Pencil,
  Phone,
  MapPin,
  Building2,
  FileText,
  Users
} from "lucide-react";
import { useTheme } from "next-themes";
import EditProfileDialog from "@/components/EditProfileDialog";
import EditEmpresaDialog from "@/components/EditEmpresaDialog";
import ManageFuncionariosDialog from "@/components/ManageFuncionariosDialog";

export default function UserAccountDrawer() {
  const { user, userName, userRole, signOut, isAdmin, isFuncionario } = useAuth();
  const { theme, setTheme } = useTheme();
  const { empresa, refetch: refetchEmpresa } = useEmpresaData();
  const [open, setOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editEmpresaOpen, setEditEmpresaOpen] = useState(false);
  const [manageFuncionariosOpen, setManageFuncionariosOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localUserName, setLocalUserName] = useState<string | null>(userName);
  const [isEmpresaOwner, setIsEmpresaOwner] = useState(false);

  // Fetch avatar URL from profiles and check if user is empresa owner
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, nome')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        setAvatarUrl(data.avatar_url);
        setLocalUserName(data.nome);
      }

      // Check if user is the owner of an empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsEmpresaOwner(!!empresaData);
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Update local name when userName prop changes
  useEffect(() => {
    if (userName) {
      setLocalUserName(userName);
    }
  }, [userName]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, nome')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setAvatarUrl(data.avatar_url);
      setLocalUserName(data.nome);
    }
  };

  const getRoleLabel = () => {
    if (userRole === 'admin') return 'Administrador';
    if (userRole === 'funcionario') return 'Funcionário';
    if (userRole === 'user') return 'Usuário';
    return 'Carregando...';
  };

  const getRoleBadgeClass = () => {
    if (userRole === 'admin') return 'bg-primary/20 text-primary border-primary/30';
    if (userRole === 'funcionario') return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getInitials = () => {
    if (localUserName) {
      return localUserName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleEditProfile = () => {
    setEditProfileOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl || ""} alt={localUserName || "Usuário"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="right" className="w-80 sm:w-96 bg-background border-l border-border p-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <SheetHeader className="text-left pb-4">
                <SheetTitle className="text-lg font-semibold">Minha Conta</SheetTitle>
              </SheetHeader>
              
              {/* User Profile Section */}
              <div className="flex flex-col items-center py-6 space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                    <AvatarImage src={avatarUrl || ""} alt={localUserName || "Usuário"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-7 w-7 rounded-full shadow-lg"
                    onClick={handleEditProfile}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-semibold text-foreground">
                    {localUserName || "Usuário"}
                  </h3>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass()}`}>
                    <Shield className="h-3 w-3" />
                    {getRoleLabel()}
                  </span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* User Info */}
              <div className="space-y-3 py-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Informações Pessoais
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {localUserName || "Não definido"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.email || "Não definido"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empresa Info - Não visível para funcionários */}
              {empresa && !isFuncionario && (
                <>
                  <Separator className="my-4" />
                  
                  <div className="space-y-3 py-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Dados da Empresa
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setEditEmpresaOpen(true)}
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Logo e Nome da Empresa */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        {empresa.logo_url ? (
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={empresa.logo_url} alt={empresa.nome_empresa} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <Building2 className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Nome</p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {empresa.nome_empresa}
                          </p>
                        </div>
                      </div>
                      
                      {/* Telefone */}
                      {empresa.telefone && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
                            <Phone className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Telefone</p>
                            <p className="text-sm font-medium text-foreground truncate">
                              {empresa.telefone}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* CNPJ */}
                      {empresa.cnpj && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">CNPJ</p>
                            <p className="text-sm font-medium text-foreground truncate">
                              {empresa.cnpj}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Endereço */}
                      {empresa.endereco && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Endereço</p>
                            <p className="text-sm font-medium text-foreground line-clamp-2">
                              {empresa.endereco}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
          
          <Separator className="my-4" />
          
          {/* Actions */}
          <div className="space-y-3 py-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Ações
            </h4>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between h-12 px-3"
                onClick={handleEditProfile}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
                    <Pencil className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-sm font-medium">Editar Perfil</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between h-12 px-3"
                onClick={toggleTheme}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
                    {theme === 'dark' ? (
                      <Moon className="h-4 w-4 text-foreground" />
                    ) : (
                      <Sun className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              
              {/* Manage Employees - Only for empresa owners */}
              {isEmpresaOwner && (
                <Button
                  variant="ghost"
                  className="w-full justify-between h-12 px-3"
                  onClick={() => setManageFuncionariosOpen(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
                      <Users className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium">Gerenciar Funcionários</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}

              {isAdmin && (
                <Button
                  variant="ghost"
                  className="w-full justify-between h-12 px-3"
                  onClick={() => {
                    setOpen(false);
                    window.location.href = '/admin';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
                      <Settings className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium">Configurações Admin</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
          
              <Separator className="my-4" />
              
              {/* Sign Out */}
              <div className="py-4">
                <Button
                  variant="destructive"
                  className="w-full h-12 gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sair da Conta
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        currentName={localUserName}
        currentAvatarUrl={avatarUrl}
        onProfileUpdate={handleProfileUpdate}
      />

      <EditEmpresaDialog
        open={editEmpresaOpen}
        onOpenChange={setEditEmpresaOpen}
        empresa={empresa}
        onEmpresaUpdate={refetchEmpresa}
      />

      <ManageFuncionariosDialog
        open={manageFuncionariosOpen}
        onOpenChange={setManageFuncionariosOpen}
        empresaId={empresa?.id || null}
      />
    </>
  );
}
