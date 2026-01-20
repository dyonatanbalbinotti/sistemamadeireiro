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
import { Plus, ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, Settings2 } from "lucide-react";
import { formatDateBR } from "@/lib/dateUtils";

interface Item {
  id: string;
  codigo: string;
  nome: string;
  unidade_medida: string;
}

interface ItemWithStock extends Item {
  estoque_atual: number;
}

interface Movimento {
  id: string;
  item_id: string;
  tipo: string;
  quantidade: number;
  estoque_anterior: number;
  estoque_posterior: number;
  observacao: string | null;
  created_at: string;
  almoxarifado_itens?: Item;
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  entrada: <ArrowDownCircle className="h-4 w-4 text-green-500" />,
  saida: <ArrowUpCircle className="h-4 w-4 text-red-500" />,
  ajuste: <Settings2 className="h-4 w-4 text-blue-500" />,
  transferencia: <ArrowLeftRight className="h-4 w-4 text-purple-500" />,
};

const TIPO_COLORS: Record<string, string> = {
  entrada: "bg-green-500",
  saida: "bg-red-500",
  ajuste: "bg-blue-500",
  transferencia: "bg-purple-500",
};

export default function MovimentoEstoque() {
  const { empresaId, loading: loadingEmpresa } = useEmpresaId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [itemId, setItemId] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: itens = [] } = useQuery({
    queryKey: ["almoxarifado-itens", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_itens")
        .select("id, codigo, nome, unidade_medida, estoque_atual")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as ItemWithStock[];
    },
    enabled: !!empresaId,
  });

  const { data: movimentos = [], isLoading } = useQuery({
    queryKey: ["almoxarifado-movimentos", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_movimentos")
        .select("*, almoxarifado_itens(id, codigo, nome, unidade_medida)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Movimento[];
    },
    enabled: !!empresaId,
  });

  const createMovimento = useMutation({
    mutationFn: async () => {
      if (!empresaId || !user) throw new Error("Dados insuficientes");
      
      const item = itens.find((i) => i.id === itemId);
      if (!item) throw new Error("Item não encontrado");

      const qtd = parseFloat(quantidade);
      let novoEstoque = item.estoque_atual;

      if (tipo === "entrada") {
        novoEstoque = item.estoque_atual + qtd;
      } else if (tipo === "saida") {
        if (qtd > item.estoque_atual) {
          throw new Error("Quantidade maior que o estoque disponível");
        }
        novoEstoque = item.estoque_atual - qtd;
      } else if (tipo === "ajuste") {
        novoEstoque = qtd; // Ajuste define o novo valor absoluto
      }

      // Atualizar estoque do item
      const { error: updateError } = await supabase
        .from("almoxarifado_itens")
        .update({ estoque_atual: novoEstoque })
        .eq("id", itemId);

      if (updateError) throw updateError;

      // Registrar movimento
      const { error: movError } = await supabase
        .from("almoxarifado_movimentos")
        .insert({
          empresa_id: empresaId,
          item_id: itemId,
          tipo,
          quantidade: tipo === "ajuste" ? Math.abs(novoEstoque - item.estoque_atual) : qtd,
          estoque_anterior: item.estoque_atual,
          estoque_posterior: novoEstoque,
          observacao: observacao || null,
          user_id: user.id,
        });

      if (movError) throw movError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-movimentos"] });
      queryClient.invalidateQueries({ queryKey: ["almoxarifado-itens"] });
      toast.success("Movimento registrado com sucesso!");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const resetForm = () => {
    setItemId("");
    setTipo("entrada");
    setQuantidade("");
    setObservacao("");
  };

  const selectedItem = itens.find((i) => i.id === itemId);

  if (loadingEmpresa || isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-lg font-semibold">Movimento de Estoque</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Movimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Movimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item">Item *</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o item" />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.codigo} - {item.nome} (Estoque: {item.estoque_atual} {item.unidade_medida})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p>Estoque atual: <strong>{selectedItem.estoque_atual} {selectedItem.unidade_medida}</strong></p>
                </div>
              )}

              <div>
                <Label htmlFor="tipo-mov">Tipo de Movimento *</Label>
                <Select value={tipo} onValueChange={(v: "entrada" | "saida" | "ajuste") => setTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-green-500" />
                        Entrada (adicionar)
                      </div>
                    </SelectItem>
                    <SelectItem value="saida">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                        Saída (remover)
                      </div>
                    </SelectItem>
                    <SelectItem value="ajuste">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-blue-500" />
                        Ajuste (definir novo valor)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantidade">
                  {tipo === "ajuste" ? "Novo Estoque *" : "Quantidade *"}
                </Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder={tipo === "ajuste" ? "Novo valor do estoque" : "Quantidade"}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="obs-mov">Observação</Label>
                <Textarea
                  id="obs-mov"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Motivo do movimento"
                />
              </div>

              <Button
                onClick={() => createMovimento.mutate()}
                disabled={!itemId || !quantidade || createMovimento.isPending}
                className="w-full"
              >
                Registrar Movimento
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
                <TableHead>Data/Hora</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Anterior</TableHead>
                <TableHead className="text-right">Posterior</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum movimento registrado
                  </TableCell>
                </TableRow>
              ) : (
                movimentos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-sm">
                      {new Date(mov.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{mov.almoxarifado_itens?.nome}</span>
                        <span className="text-xs text-muted-foreground">{mov.almoxarifado_itens?.codigo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={TIPO_COLORS[mov.tipo]}>
                        {TIPO_ICONS[mov.tipo]}
                        <span className="ml-1 capitalize">{mov.tipo}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{mov.quantidade}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{mov.estoque_anterior}</TableCell>
                    <TableCell className="text-right font-semibold">{mov.estoque_posterior}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {mov.observacao || "-"}
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
