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
import { Plus, Eye, FileText, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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

interface NFItem {
  id: string;
  item_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  almoxarifado_itens?: Item;
}

interface NotaFiscal {
  id: string;
  numero_nf: string;
  tipo: string;
  data_emissao: string;
  data_entrada_saida: string | null;
  valor_total: number;
  observacao: string | null;
  almoxarifado_fornecedores?: Fornecedor | null;
  almoxarifado_nf_itens?: NFItem[];
}

export default function LancamentoNF() {
  const { empresaId, loading: loadingEmpresa } = useEmpresaId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNF, setSelectedNF] = useState<NotaFiscal | null>(null);
  
  // Form states
  const [numeroNF, setNumeroNF] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split("T")[0]);
  const [dataEntradaSaida, setDataEntradaSaida] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [nfItens, setNfItens] = useState<{ itemId: string; quantidade: number; valorUnitario: number }[]>([]);

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

  const { data: notasFiscais = [], isLoading } = useQuery({
    queryKey: ["almoxarifado-nfs", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_notas_fiscais")
        .select("*, almoxarifado_fornecedores(id, nome), almoxarifado_nf_itens(*, almoxarifado_itens(*))")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NotaFiscal[];
    },
    enabled: !!empresaId,
  });

  const createNF = useMutation({
    mutationFn: async () => {
      if (!empresaId || !user) throw new Error("Dados insuficientes");
      
      const valorTotal = nfItens.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);
      
      const { data: nf, error: nfError } = await supabase
        .from("almoxarifado_notas_fiscais")
        .insert({
          empresa_id: empresaId,
          numero_nf: numeroNF,
          tipo,
          data_emissao: dataEmissao,
          data_entrada_saida: dataEntradaSaida || null,
          fornecedor_id: fornecedorId || null,
          valor_total: valorTotal,
          observacao: observacao || null,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (nfError) throw nfError;

      if (nfItens.length > 0) {
        const itensData = nfItens.map((item) => ({
          nota_fiscal_id: nf.id,
          item_id: item.itemId,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          valor_total: item.quantidade * item.valorUnitario,
        }));

        const { error: itensError } = await supabase
          .from("almoxarifado_nf_itens")
          .insert(itensData);

        if (itensError) throw itensError;

        // NF é apenas para controle financeiro, não afeta o estoque
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-nfs"] });
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-itens"] });
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-movimentos"] });
      toast.success("Nota Fiscal lançada com sucesso!");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao lançar NF: " + error.message);
    },
  });

  const resetForm = () => {
    setNumeroNF("");
    setTipo("entrada");
    setDataEmissao(new Date().toISOString().split("T")[0]);
    setDataEntradaSaida("");
    setFornecedorId("");
    setObservacao("");
    setNfItens([]);
  };

  const addItem = () => {
    setNfItens([...nfItens, { itemId: "", quantidade: 1, valorUnitario: 0 }]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...nfItens];
    updated[index] = { ...updated[index], [field]: value };
    setNfItens(updated);
  };

  const removeItem = (index: number) => {
    setNfItens(nfItens.filter((_, i) => i !== index));
  };

  const valorTotal = nfItens.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);

  if (loadingEmpresa || isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-lg font-semibold">Lançamento de Notas Fiscais</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova NF
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Nota Fiscal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero-nf">Número da NF *</Label>
                  <Input
                    id="numero-nf"
                    value={numeroNF}
                    onChange={(e) => setNumeroNF(e.target.value)}
                    placeholder="000001"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo-nf">Tipo *</Label>
                  <Select value={tipo} onValueChange={(v: "entrada" | "saida") => setTipo(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="h-4 w-4 text-green-500" />
                          Entrada
                        </div>
                      </SelectItem>
                      <SelectItem value="saida">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="h-4 w-4 text-red-500" />
                          Saída
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data-emissao">Data Emissão *</Label>
                  <Input
                    id="data-emissao"
                    type="date"
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="data-es">Data {tipo === "entrada" ? "Entrada" : "Saída"}</Label>
                  <Input
                    id="data-es"
                    type="date"
                    value={dataEntradaSaida}
                    onChange={(e) => setDataEntradaSaida(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="obs-nf">Observação</Label>
                <Textarea
                  id="obs-nf"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Itens da NF</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                  </Button>
                </div>
                {nfItens.map((item, index) => (
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
                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="R$ Unit."
                        value={item.valorUnitario}
                        onChange={(e) => updateItem(index, "valorUnitario", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
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
                {nfItens.length > 0 && (
                  <div className="text-right font-semibold text-lg">
                    Total: R$ {valorTotal.toFixed(2)}
                  </div>
                )}
              </div>

              <Button
                onClick={() => createNF.mutate()}
                disabled={!numeroNF || nfItens.length === 0 || createNF.isPending}
                className="w-full"
              >
                Lançar NF
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
                <TableHead>Tipo</TableHead>
                <TableHead>Data Emissão</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiscais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma NF lançada
                  </TableCell>
                </TableRow>
              ) : (
                notasFiscais.map((nf) => (
                  <TableRow key={nf.id}>
                    <TableCell className="font-mono">{nf.numero_nf}</TableCell>
                    <TableCell>
                      <Badge variant={nf.tipo === "entrada" ? "default" : "secondary"}>
                        {nf.tipo === "entrada" ? (
                          <><ArrowDownCircle className="h-3 w-3 mr-1" /> Entrada</>
                        ) : (
                          <><ArrowUpCircle className="h-3 w-3 mr-1" /> Saída</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateBR(nf.data_emissao)}</TableCell>
                    <TableCell>{nf.almoxarifado_fornecedores?.nome || "-"}</TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {nf.valor_total.toFixed(2)}
                    </TableCell>
                    <TableCell>{nf.almoxarifado_nf_itens?.length || 0}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedNF(nf);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>NF {selectedNF?.numero_nf}</DialogTitle>
          </DialogHeader>
          {selectedNF && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant={selectedNF.tipo === "entrada" ? "default" : "secondary"} className="ml-2">
                    {selectedNF.tipo}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Emissão:</span>
                  <p className="font-medium">{formatDateBR(selectedNF.data_emissao)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fornecedor:</span>
                  <p className="font-medium">{selectedNF.almoxarifado_fornecedores?.nome || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total:</span>
                  <p className="font-medium text-primary">R$ {selectedNF.valor_total.toFixed(2)}</p>
                </div>
              </div>
              {selectedNF.observacao && (
                <div>
                  <span className="text-muted-foreground text-sm">Observação:</span>
                  <p className="text-sm">{selectedNF.observacao}</p>
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
                    {selectedNF.almoxarifado_nf_itens?.map((item) => (
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
