import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Search, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: unknown;
  new_data: unknown;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
  empresa_id: string | null;
}

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: unknown;
  success: boolean;
  created_at: string;
}

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const [auditResponse, loginResponse] = await Promise.all([
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("login_attempts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500)
      ]);

      if (auditResponse.data) {
        setAuditLogs(auditResponse.data);
      }
      if (loginResponse.data) {
        setLoginAttempts(loginResponse.data);
      }
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getActionBadge = (action: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
      INSERT: { variant: "default", icon: CheckCircle },
      UPDATE: { variant: "secondary", icon: RefreshCw },
      DELETE: { variant: "destructive", icon: XCircle },
    };
    const config = variants[action] || { variant: "outline" as const, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {action}
      </Badge>
    );
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      user_roles: "Papéis de Usuário",
      empresas: "Empresas",
      configuracoes: "Configurações",
      historico_anuidades: "Histórico Anuidades",
      produtos: "Produtos",
      vendas: "Vendas",
      toras: "Toras",
      producao: "Produção",
    };
    return labels[tableName] || tableName;
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesTable = tableFilter === "all" || log.table_name === tableFilter;
    return matchesSearch && matchesAction && matchesTable;
  });

  const filteredLoginAttempts = loginAttempts.filter(attempt =>
    attempt.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueTables = [...new Set(auditLogs.map(log => log.table_name))];

  const successRate = loginAttempts.length > 0
    ? ((loginAttempts.filter(a => a.success).length / loginAttempts.length) * 100).toFixed(1)
    : "0";

  const failedAttempts = loginAttempts.filter(a => !a.success).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Auditoria de Segurança</h1>
            <p className="text-muted-foreground">Carregando logs...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Auditoria de Segurança</h1>
            <p className="text-muted-foreground">Logs de login e alterações críticas</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tentativas de Login</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginAttempts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa de Sucesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Logins Falhados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-destructive">{failedAttempts}</span>
              {failedAttempts > 10 && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="login">Tentativas de Login</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alterações no Sistema</CardTitle>
              <CardDescription>
                Registro de todas as alterações críticas realizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por tabela, ação ou usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Ações</SelectItem>
                    <SelectItem value="INSERT">INSERT</SelectItem>
                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Tabelas</SelectItem>
                    {uniqueTables.map(table => (
                      <SelectItem key={table} value={table}>
                        {getTableLabel(table)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Usuário ID</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum log encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getTableLabel(log.table_name)}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.user_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {String(log.ip_address || "N/A")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.new_data ? JSON.stringify(log.new_data).substring(0, 50) + "..." : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Exibindo {filteredAuditLogs.length} de {auditLogs.length} registros
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login Attempts Tab */}
        <TabsContent value="login" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tentativas de Login</CardTitle>
              <CardDescription>
                Histórico de tentativas de autenticação no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoginAttempts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhuma tentativa de login encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLoginAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{attempt.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {String(attempt.ip_address || "N/A")}
                          </TableCell>
                          <TableCell>
                            {attempt.success ? (
                              <Badge variant="default" className="gap-1 bg-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Falhou
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Exibindo {filteredLoginAttempts.length} de {loginAttempts.length} registros
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
