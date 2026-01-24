import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, CheckCircle, XCircle, ClipboardList, Trash2 } from "lucide-react";
import { formatDateBR } from "@/lib/dateUtils";

interface Item {
  id: string;
  codigo: string;
  nome: string;
  unidade_medida: string;
}

interface PedidoItem {
  id: string;
  item_id: string;
  quantidade_solicitada: number;
  quantidade_atendida: number;
  almoxarifado_itens?: Item;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  data_pedido: string;
  solicitante: string;
  setor: string | null;
  status: string;
  observacao: string | null;
  almoxarifado_pedidos_itens?: PedidoItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-500",
  aprovado: "bg-blue-500",
  atendido: "bg-green-500",
  cancelado: "bg-red-500",
};

export default function GeracaoPedidos() {
  const { empresaId, loading: loadingEmpresa } = useEmpresaId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  
  // Form states
  const [numeroPedido, setNumeroPedido] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [setor, setSetor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pedidoItens, setPedidoItens] = useState<{ itemId: string; quantidade: number }[]>([]);

  const { data: itens = [] } = useQuery({
    queryKey: ["almoxarifado-itens", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_itens")
        .select("id, codigo, nome, unidade_medida")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Item[];
    },
    enabled: !!empresaId,
  });

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["almoxarifado-pedidos", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_pedidos")
        .select("*, almoxarifado_pedidos_itens(*, almoxarifado_itens(*))")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pedido[];
    },
    enabled: !!empresaId,
  });

  const createPedido = useMutation({
    mutationFn: async () => {
      if (!empresaId || !user) throw new Error("Dados insuficientes");
      
      const { data: pedido, error: pedidoError } = await supabase
        .from("almoxarifado_pedidos")
        .insert({
          empresa_id: empresaId,
          numero_pedido: numeroPedido,
          solicitante,
          setor: setor || null,
          observacao: observacao || null,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (pedidoError) throw pedidoError;

      if (pedidoItens.length > 0) {
        const itensData = pedidoItens.map((pi) => ({
          pedido_id: pedido.id,
          item_id: pi.itemId,
          quantidade_solicitada: pi.quantidade,
        }));

        const { error: itensError } = await supabase
          .from("almoxarifado_pedidos_itens")
          .insert(itensData);

        if (itensError) throw itensError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-pedidos"] });
      toast.success("Pedido criado com sucesso!");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar pedido: " + error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("almoxarifado_pedidos")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-pedidos"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const resetForm = () => {
    setNumeroPedido("");
    setSolicitante("");
    setSetor("");
    setObservacao("");
    setPedidoItens([]);
  };

  const addItemToPedido = () => {
    setPedidoItens([...pedidoItens, { itemId: "", quantidade: 1 }]);
  };

  const updatePedidoItem = (index: number, field: "itemId" | "quantidade", value: string | number) => {
    const updated = [...pedidoItens];
    updated[index] = { ...updated[index], [field]: value };
    setPedidoItens(updated);
  };

  const removePedidoItem = (index: number) => {
    setPedidoItens(pedidoItens.filter((_, i) => i !== index));
  };

  if (loadingEmpresa || isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-lg font-semibold">Geração de Pedidos</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero">Número do Pedido *</Label>
                  <Input
                    id="numero"
                    value={numeroPedido}
                    onChange={(e) => setNumeroPedido(e.target.value)}
                    placeholder="PED-001"
                  />
                </div>
                <div>
                  <Label htmlFor="solicitante">Solicitante *</Label>
                  <Input
                    id="solicitante"
                    value={solicitante}
                    onChange={(e) => setSolicitante(e.target.value)}
                    placeholder="Nome do solicitante"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="setor">Setor</Label>
                <Input
                  id="setor"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  placeholder="Setor (opcional)"
                />
              </div>
              <div>
                <Label htmlFor="obs">Observação</Label>
                <Textarea
                  id="obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Itens do Pedido</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItemToPedido}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                  </Button>
                </div>
                {pedidoItens.map((pi, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={pi.itemId}
                        onValueChange={(v) => updatePedidoItem(index, "itemId", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o item" />
                        </SelectTrigger>
                        <SelectContent>
                          {itens.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.codigo} - {item.nome} ({item.unidade_medida})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={pi.quantidade}
                        onChange={(e) => updatePedidoItem(index, "quantidade", parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePedidoItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => createPedido.mutate()}
                disabled={!numeroPedido || !solicitante || createPedido.isPending}
                className="w-full"
              >
                Criar Pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-mono">{pedido.numero_pedido}</TableCell>
                    <TableCell>{formatDateBR(pedido.data_pedido)}</TableCell>
                    <TableCell>{pedido.solicitante}</TableCell>
                    <TableCell>{pedido.setor || "-"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[pedido.status]}>
                        {pedido.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pedido.almoxarifado_pedidos_itens?.reduce(
                        (sum, item) => sum + (item.quantidade_solicitada || 0), 
                        0
                      ) || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPedido(pedido);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {pedido.status === "pendente" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatus.mutate({ id: pedido.id, status: "aprovado" })}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatus.mutate({ id: pedido.id, status: "cancelado" })}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {pedido.status === "aprovado" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatus.mutate({ id: pedido.id, status: "atendido" })}
                          >
                            <CheckCircle className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedido {selectedPedido?.numero_pedido}</DialogTitle>
          </DialogHeader>
          {selectedPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Solicitante:</span>
                  <p className="font-medium">{selectedPedido.solicitante}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Setor:</span>
                  <p className="font-medium">{selectedPedido.setor || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{formatDateBR(selectedPedido.data_pedido)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={STATUS_COLORS[selectedPedido.status]}>
                    {selectedPedido.status}
                  </Badge>
                </div>
              </div>
              {selectedPedido.observacao && (
                <div>
                  <span className="text-muted-foreground text-sm">Observação:</span>
                  <p className="text-sm">{selectedPedido.observacao}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-sm">Itens:</span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qtd Solicitada</TableHead>
                      <TableHead className="text-right">Qtd Atendida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPedido.almoxarifado_pedidos_itens?.map((pi) => (
                      <TableRow key={pi.id}>
                        <TableCell>
                          {pi.almoxarifado_itens?.codigo} - {pi.almoxarifado_itens?.nome}
                        </TableCell>
                        <TableCell className="text-right">{pi.quantidade_solicitada}</TableCell>
                        <TableCell className="text-right">{pi.quantidade_atendida}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
