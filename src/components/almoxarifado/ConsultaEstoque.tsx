import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, AlertTriangle, CheckCircle } from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
}

interface Item {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  unidade_medida: string;
  categoria_id: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  almoxarifado_categorias?: Categoria | null;
}

export default function ConsultaEstoque() {
  const { empresaId, loading: loadingEmpresa } = useEmpresaId();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: categorias = [] } = useQuery({
    queryKey: ["almoxarifado-categorias", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_categorias")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return data as Categoria[];
    },
    enabled: !!empresaId,
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["almoxarifado-itens", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_itens")
        .select("*, almoxarifado_categorias(*)")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return data as Item[];
    },
    enabled: !!empresaId,
  });

  const filteredItens = itens.filter((item) => {
    const matchesSearch = search === "" || 
      item.nome.toLowerCase().includes(search.toLowerCase()) ||
      item.codigo.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategoria = categoriaFilter === "all" || item.categoria_id === categoriaFilter;
    
    let matchesStatus = true;
    if (statusFilter === "critico") {
      matchesStatus = item.estoque_atual <= item.estoque_minimo && item.estoque_atual > 0;
    } else if (statusFilter === "zerado") {
      matchesStatus = item.estoque_atual === 0;
    } else if (statusFilter === "ok") {
      matchesStatus = item.estoque_atual > item.estoque_minimo;
    }

    return matchesSearch && matchesCategoria && matchesStatus;
  });

  const totalItens = itens.length;
  const itensCriticos = itens.filter(i => i.estoque_atual <= i.estoque_minimo && i.estoque_atual > 0).length;
  const itensZerados = itens.filter(i => i.estoque_atual === 0).length;
  const itensOk = itens.filter(i => i.estoque_atual > i.estoque_minimo).length;

  if (loadingEmpresa || isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Consulta de Estoque</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItens}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{itensOk}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Estoque Crítico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">{itensCriticos}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Sem Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{itensZerados}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="ok">Em Estoque</SelectItem>
                  <SelectItem value="critico">Estoque Crítico</SelectItem>
                  <SelectItem value="zerado">Sem Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredItens.map((item) => {
                  let status = "ok";
                  let statusColor = "bg-green-500";
                  let statusText = "OK";
                  
                  if (item.estoque_atual === 0) {
                    status = "zerado";
                    statusColor = "bg-red-500";
                    statusText = "Sem Estoque";
                  } else if (item.estoque_atual <= item.estoque_minimo) {
                    status = "critico";
                    statusColor = "bg-yellow-500";
                    statusText = "Crítico";
                  }

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.nome}</span>
                          {item.descricao && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {item.descricao}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.almoxarifado_categorias?.nome && (
                          <Badge variant="secondary">{item.almoxarifado_categorias.nome}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.unidade_medida}</TableCell>
                      <TableCell className="text-right">
                        <span className={status !== "ok" ? "font-semibold text-destructive" : "font-semibold"}>
                          {item.estoque_atual}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.estoque_minimo}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor}>
                          {statusText}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
