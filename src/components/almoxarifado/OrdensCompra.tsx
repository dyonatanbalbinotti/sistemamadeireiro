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
import { Plus, Eye, CheckCircle, XCircle, Send, Package, ShoppingCart, Trash2, UserPlus } from "lucide-react";
import { formatDateBR } from "@/lib/dateUtils";

interface Fornecedor {
  id: string;
  nome: string;
}

interface Item {
  id: string;
  codigo: string;
  nome: string;
  unidade_medida: string;
}

interface OrdemItem {
  id: string;
  item_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  quantidade_recebida: number;
  almoxarifado_itens?: Item;
}

interface Ordem {
  id: string;
  numero_ordem: string;
  data_ordem: string;
  data_aprovacao: string | null;
  data_envio: string | null;
  data_recebimento: string | null;
  status: string;
  valor_total: number;
  observacao: string | null;
  almoxarifado_fornecedores?: Fornecedor | null;
  almoxarifado_ordens_itens?: OrdemItem[];
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pendente: { color: "bg-yellow-500", label: "Pendente" },
  aprovada: { color: "bg-blue-500", label: "Aprovada" },
  enviada: { color: "bg-purple-500", label: "Enviada" },
  recebida: { color: "bg-green-500", label: "Recebida" },
  cancelada: { color: "bg-red-500", label: "Cancelada" },
};

export default function OrdensCompra() {
  const { empresaId, loading: loadingEmpresa } = useEmpresaId();
  const { user, isAlmoxarifado, isFinanceiro, isAdmin, userRole } = useAuth();
  const queryClient = useQueryClient();
  
  // Apenas financeiro ou admin podem aprovar ordens
  const canApproveOrders = isFinanceiro || isAdmin || userRole === 'user';
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<Ordem | null>(null);
  
  // Form states
  const [numeroOrdem, setNumeroOrdem] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [ordemItens, setOrdemItens] = useState<{ itemId: string; quantidade: number }[]>([]);
  
  // Fornecedor form
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedorCnpj, setFornecedorCnpj] = useState("");
  const [fornecedorTelefone, setFornecedorTelefone] = useState("");
  const [fornecedorEmail, setFornecedorEmail] = useState("");

  // Máscaras de formatação
  const formatCnpjCpf = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // CNPJ: 00.000.000/0000-00
      return digits
        .substring(0, 14)
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").substring(0, 11);
    if (digits.length <= 10) {
      // Fixo: (00) 0000-0000
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      // Celular: (00) 00000-0000
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
  };

  const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFornecedorCnpj(formatCnpjCpf(e.target.value));
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFornecedorTelefone(formatTelefone(e.target.value));
  };

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["almoxarifado-fornecedores", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_fornecedores")
        .select("id, nome")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Fornecedor[];
    },
    enabled: !!empresaId,
  });

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

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["almoxarifado-ordens", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_ordens_compra")
        .select("*, almoxarifado_fornecedores(id, nome), almoxarifado_ordens_itens(*, almoxarifado_itens(*))")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ordem[];
    },
    enabled: !!empresaId,
  });

  const createFornecedor = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      const { error } = await supabase
        .from("almoxarifado_fornecedores")
        .insert({
          empresa_id: empresaId,
          nome: fornecedorNome,
          cnpj_cpf: fornecedorCnpj || null,
          telefone: fornecedorTelefone || null,
          email: fornecedorEmail || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-fornecedores"] });
      toast.success("Fornecedor cadastrado!");
      setFornecedorNome("");
      setFornecedorCnpj("");
      setFornecedorTelefone("");
      setFornecedorEmail("");
      setFornecedorDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const createOrdem = useMutation({
    mutationFn: async () => {
      if (!empresaId || !user) throw new Error("Dados insuficientes");
      
      const { data: ordem, error: ordemError } = await supabase
        .from("almoxarifado_ordens_compra")
        .insert({
          empresa_id: empresaId,
          numero_ordem: numeroOrdem,
          fornecedor_id: fornecedorId || null,
          valor_total: 0,
          observacao: observacao || null,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (ordemError) throw ordemError;

      if (ordemItens.length > 0) {
        const itensData = ordemItens.map((item) => ({
          ordem_id: ordem.id,
          item_id: item.itemId,
          quantidade: item.quantidade,
          valor_unitario: 0,
          valor_total: 0,
        }));

        const { error: itensError } = await supabase
          .from("almoxarifado_ordens_itens")
          .insert(itensData);

        if (itensError) throw itensError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-ordens"] });
      toast.success("Ordem de compra criada!");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, updateData = {} }: { id: string; status: string; updateData?: object }) => {
      const { error } = await supabase
        .from("almoxarifado_ordens_compra")
        .update({ status, ...updateData })
        .eq("id", id);
      if (error) throw error;

      // Se recebida, atualizar estoque
      if (status === "recebida") {
        const ordem = ordens.find(o => o.id === id);
        if (ordem?.almoxarifado_ordens_itens) {
          for (const ordemItem of ordem.almoxarifado_ordens_itens) {
            const { data: currentItem } = await supabase
              .from("almoxarifado_itens")
              .select("estoque_atual")
              .eq("id", ordemItem.item_id)
              .single();

            if (currentItem) {
              const novoEstoque = currentItem.estoque_atual + ordemItem.quantidade;

              await supabase
                .from("almoxarifado_itens")
                .update({ estoque_atual: novoEstoque })
                .eq("id", ordemItem.item_id);

              await supabase.from("almoxarifado_movimentos").insert({
                empresa_id: empresaId,
                item_id: ordemItem.item_id,
                tipo: "entrada",
                quantidade: ordemItem.quantidade,
                estoque_anterior: currentItem.estoque_atual,
                estoque_posterior: novoEstoque,
                ordem_compra_id: id,
                observacao: `Recebimento OC ${ordem.numero_ordem}`,
                user_id: user?.id,
              });

              await supabase
                .from("almoxarifado_ordens_itens")
                .update({ quantidade_recebida: ordemItem.quantidade })
                .eq("id", ordemItem.id);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-ordens"] });
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-itens"] });
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-movimentos"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const resetForm = () => {
    setNumeroOrdem("");
    setFornecedorId("");
    setObservacao("");
    setOrdemItens([]);
  };

  const addItem = () => {
    setOrdemItens([...ordemItens, { itemId: "", quantidade: 1 }]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...ordemItens];
    updated[index] = { ...updated[index], [field]: value };
    setOrdemItens(updated);
  };

  const removeItem = (index: number) => {
    setOrdemItens(ordemItens.filter((_, i) => i !== index));
  };

  

  if (loadingEmpresa || isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-lg font-semibold">Ordens de Compra</h2>
        <div className="flex gap-2">
          <Dialog open={fornecedorDialogOpen} onOpenChange={setFornecedorDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Fornecedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="forn-nome">Nome *</Label>
                  <Input
                    id="forn-nome"
                    value={fornecedorNome}
                    onChange={(e) => setFornecedorNome(e.target.value)}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div>
                  <Label htmlFor="forn-cnpj">CNPJ/CPF</Label>
                  <Input
                    id="forn-cnpj"
                    value={fornecedorCnpj}
                    onChange={handleCnpjCpfChange}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="forn-tel">Telefone</Label>
                    <Input
                      id="forn-tel"
                      value={fornecedorTelefone}
                      onChange={handleTelefoneChange}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <Label htmlFor="forn-email">Email</Label>
                    <Input
                      id="forn-email"
                      type="email"
                      value={fornecedorEmail}
                      onChange={(e) => setFornecedorEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => createFornecedor.mutate()}
                  disabled={!fornecedorNome || createFornecedor.isPending}
                  className="w-full"
                >
                  Cadastrar Fornecedor
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
                Nova Ordem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Ordem de Compra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero-oc">Número da Ordem *</Label>
                    <Input
                      id="numero-oc"
                      value={numeroOrdem}
                      onChange={(e) => setNumeroOrdem(e.target.value)}
                      placeholder="OC-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fornecedor-oc">Fornecedor</Label>
                    <Select value={fornecedorId} onValueChange={setFornecedorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="obs-oc">Observação</Label>
                  <Textarea
                    id="obs-oc"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Itens da Ordem</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                    </Button>
                  </div>
                  {ordemItens.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select
                          value={item.itemId}
                          onValueChange={(v) => updateItem(index, "itemId", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o item" />
                          </SelectTrigger>
                          <SelectContent>
                            {itens.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.codigo} - {i.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qtd"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, "quantidade", parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => createOrdem.mutate()}
                  disabled={!numeroOrdem || ordemItens.length === 0 || createOrdem.isPending}
                  className="w-full"
                >
                  Criar Ordem
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
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma ordem de compra
                  </TableCell>
                </TableRow>
              ) : (
                ordens.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-mono">{ordem.numero_ordem}</TableCell>
                    <TableCell>{formatDateBR(ordem.data_ordem)}</TableCell>
                    <TableCell>{ordem.almoxarifado_fornecedores?.nome || "-"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[ordem.status]?.color}>
                        {STATUS_CONFIG[ordem.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{ordem.almoxarifado_ordens_itens?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrdem(ordem);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ordem.status === "pendente" && (
                          <>
                            {canApproveOrders && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Aprovar"
                                onClick={() => updateStatus.mutate({ 
                                  id: ordem.id, 
                                  status: "aprovada",
                                  updateData: { data_aprovacao: new Date().toISOString().split("T")[0], aprovado_por: user?.id }
                                })}
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancelar"
                              onClick={() => updateStatus.mutate({ id: ordem.id, status: "cancelada" })}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {ordem.status === "aprovada" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Marcar como Enviada"
                            onClick={() => updateStatus.mutate({ 
                              id: ordem.id, 
                              status: "enviada",
                              updateData: { data_envio: new Date().toISOString().split("T")[0] }
                            })}
                          >
                            <Send className="h-4 w-4 text-purple-500" />
                          </Button>
                        )}
                        {ordem.status === "enviada" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Marcar como Recebida"
                            onClick={() => updateStatus.mutate({ 
                              id: ordem.id, 
                              status: "recebida",
                              updateData: { data_recebimento: new Date().toISOString().split("T")[0] }
                            })}
                          >
                            <Package className="h-4 w-4 text-green-500" />
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ordem {selectedOrdem?.numero_ordem}</DialogTitle>
          </DialogHeader>
          {selectedOrdem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={STATUS_CONFIG[selectedOrdem.status]?.color + " ml-2"}>
                    {STATUS_CONFIG[selectedOrdem.status]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{formatDateBR(selectedOrdem.data_ordem)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fornecedor:</span>
                  <p className="font-medium">{selectedOrdem.almoxarifado_fornecedores?.nome || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total:</span>
                  <p className="font-medium text-primary">R$ {selectedOrdem.valor_total.toFixed(2)}</p>
                </div>
                {selectedOrdem.data_aprovacao && (
                  <div>
                    <span className="text-muted-foreground">Aprovação:</span>
                    <p className="font-medium">{formatDateBR(selectedOrdem.data_aprovacao)}</p>
                  </div>
                )}
                {selectedOrdem.data_envio && (
                  <div>
                    <span className="text-muted-foreground">Envio:</span>
                    <p className="font-medium">{formatDateBR(selectedOrdem.data_envio)}</p>
                  </div>
                )}
                {selectedOrdem.data_recebimento && (
                  <div>
                    <span className="text-muted-foreground">Recebimento:</span>
                    <p className="font-medium">{formatDateBR(selectedOrdem.data_recebimento)}</p>
                  </div>
                )}
              </div>
              {selectedOrdem.observacao && (
                <div>
                  <span className="text-muted-foreground text-sm">Observação:</span>
                  <p className="text-sm">{selectedOrdem.observacao}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-sm">Itens:</span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrdem.almoxarifado_ordens_itens?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.almoxarifado_itens?.codigo} - {item.almoxarifado_itens?.nome}
                        </TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">R$ {item.valor_unitario.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">R$ {item.valor_total.toFixed(2)}</TableCell>
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
