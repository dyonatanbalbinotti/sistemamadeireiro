import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderPlus, Package } from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
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

const UNIDADES = ["UN", "KG", "M", "M²", "M³", "L", "CX", "PC", "PAR", "DZ", "ML", "TON"];

export default function CadastroItens() {
  const { empresaId, loading: loadingEmpresa } = useEmpresaId();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  
  // Form states
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("UN");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  
  // Categoria form
  const [categoriaNome, setCategoriaNome] = useState("");
  const [categoriaDescricao, setCategoriaDescricao] = useState("");

  const { data: categorias = [], isLoading: loadingCategorias } = useQuery({
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

  const { data: itens = [], isLoading: loadingItens } = useQuery({
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

  const createCategoria = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      const { error } = await supabase
        .from("almoxarifado_categorias")
        .insert({
          empresa_id: empresaId,
          nome: categoriaNome,
          descricao: categoriaDescricao || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-categorias"] });
      toast.success("Categoria criada com sucesso!");
      setCategoriaNome("");
      setCategoriaDescricao("");
      setCategoriaDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });

  const saveItem = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      
      const itemData = {
        empresa_id: empresaId,
        codigo,
        nome,
        descricao: descricao || null,
        unidade_medida: unidadeMedida,
        categoria_id: categoriaId || null,
        estoque_minimo: parseFloat(estoqueMinimo) || 0,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("almoxarifado_itens")
          .update(itemData)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("almoxarifado_itens")
          .insert(itemData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-itens"] });
      toast.success(editingItem ? "Item atualizado!" : "Item cadastrado!");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar item: " + error.message);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("almoxarifado_itens")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-itens"] });
      toast.success("Item excluído!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir item: " + error.message);
    },
  });

  const resetForm = () => {
    setCodigo("");
    setNome("");
    setDescricao("");
    setUnidadeMedida("UN");
    setCategoriaId("");
    setEstoqueMinimo("");
    setEditingItem(null);
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setCodigo(item.codigo);
    setNome(item.nome);
    setDescricao(item.descricao || "");
    setUnidadeMedida(item.unidade_medida);
    setCategoriaId(item.categoria_id || "");
    setEstoqueMinimo(item.estoque_minimo?.toString() || "");
    setDialogOpen(true);
  };

  if (loadingEmpresa || loadingItens) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-lg font-semibold">Cadastro de Itens</h2>
        <div className="flex gap-2">
          <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cat-nome">Nome</Label>
                  <Input
                    id="cat-nome"
                    value={categoriaNome}
                    onChange={(e) => setCategoriaNome(e.target.value)}
                    placeholder="Nome da categoria"
                  />
                </div>
                <div>
                  <Label htmlFor="cat-desc">Descrição</Label>
                  <Textarea
                    id="cat-desc"
                    value={categoriaDescricao}
                    onChange={(e) => setCategoriaDescricao(e.target.value)}
                    placeholder="Descrição opcional"
                  />
                </div>
                <Button
                  onClick={() => createCategoria.mutate()}
                  disabled={!categoriaNome || createCategoria.isPending}
                  className="w-full"
                >
                  Salvar Categoria
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="EX001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unidade">Unidade</Label>
                    <Select value={unidadeMedida} onValueChange={setUnidadeMedida}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES.map((un) => (
                          <SelectItem key={un} value={un}>{un}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do item"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição opcional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={categoriaId} onValueChange={setCategoriaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estoque-min">Estoque Mínimo</Label>
                    <Input
                      id="estoque-min"
                      type="number"
                      value={estoqueMinimo}
                      onChange={(e) => setEstoqueMinimo(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => saveItem.mutate()}
                  disabled={!codigo || !nome || saveItem.isPending}
                  className="w-full"
                >
                  {editingItem ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum item cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>
                      {item.almoxarifado_categorias?.nome && (
                        <Badge variant="secondary">{item.almoxarifado_categorias.nome}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.unidade_medida}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.estoque_atual <= item.estoque_minimo ? "text-destructive font-semibold" : ""}>
                        {item.estoque_atual}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.estoque_minimo}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Deseja excluir este item?")) {
                              deleteItem.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
