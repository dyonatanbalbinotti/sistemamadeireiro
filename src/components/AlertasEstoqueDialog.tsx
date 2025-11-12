import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface AlertaEstoque {
  id: string;
  tipo: 'serrado' | 'tora';
  quantidade_minima?: number;
  m3_minimo?: number;
  toneladas_minima?: number;
  ativo: boolean;
}

export function AlertasEstoqueDialog() {
  const { empresaId } = useEmpresaId();
  const [open, setOpen] = useState(false);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [tipoAlerta, setTipoAlerta] = useState<'serrado' | 'tora'>('serrado');
  const [quantidadeMinima, setQuantidadeMinima] = useState("");
  const [m3Minimo, setM3Minimo] = useState("");
  const [toneladasMinima, setToneladasMinima] = useState("");

  useEffect(() => {
    if (open && empresaId) {
      carregarAlertas();
    }
  }, [open, empresaId]);

  const carregarAlertas = async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alertas_estoque')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlertas((data as AlertaEstoque[]) || []);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os alertas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarAlerta = async () => {
    if (!empresaId) return;

    if (tipoAlerta === 'serrado' && (!quantidadeMinima || !m3Minimo)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a quantidade mínima e m³ mínimo para madeira serrada.",
        variant: "destructive",
      });
      return;
    }

    if (tipoAlerta === 'tora' && !toneladasMinima) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha as toneladas mínimas para toras.",
        variant: "destructive",
      });
      return;
    }

    try {
      const novoAlerta = {
        empresa_id: empresaId,
        tipo: tipoAlerta,
        quantidade_minima: tipoAlerta === 'serrado' ? parseInt(quantidadeMinima) : null,
        m3_minimo: tipoAlerta === 'serrado' ? parseFloat(m3Minimo) : null,
        toneladas_minima: tipoAlerta === 'tora' ? parseFloat(toneladasMinima) : null,
        ativo: true,
      };

      const { error } = await supabase
        .from('alertas_estoque')
        .insert(novoAlerta);

      if (error) throw error;

      toast({
        title: "Alerta criado",
        description: "Alerta de estoque configurado com sucesso!",
      });

      // Limpar form
      setQuantidadeMinima("");
      setM3Minimo("");
      setToneladasMinima("");
      
      carregarAlertas();
    } catch (error) {
      console.error('Erro ao salvar alerta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o alerta.",
        variant: "destructive",
      });
    }
  };

  const handleToggleAlerta = async (alertaId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('alertas_estoque')
        .update({ ativo })
        .eq('id', alertaId);

      if (error) throw error;

      toast({
        title: ativo ? "Alerta ativado" : "Alerta desativado",
        description: `O alerta foi ${ativo ? 'ativado' : 'desativado'} com sucesso.`,
      });

      carregarAlertas();
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o alerta.",
        variant: "destructive",
      });
    }
  };

  const handleDeletarAlerta = async (alertaId: string) => {
    try {
      const { error } = await supabase
        .from('alertas_estoque')
        .delete()
        .eq('id', alertaId);

      if (error) throw error;

      toast({
        title: "Alerta removido",
        description: "O alerta foi removido com sucesso.",
      });

      carregarAlertas();
    } catch (error) {
      console.error('Erro ao deletar alerta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o alerta.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          Configurar Alertas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alertas de Estoque Mínimo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário para novo alerta */}
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label>Tipo de Estoque</Label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      type="button"
                      variant={tipoAlerta === 'serrado' ? 'default' : 'outline'}
                      onClick={() => setTipoAlerta('serrado')}
                      className="flex-1"
                    >
                      Madeira Serrada
                    </Button>
                    <Button
                      type="button"
                      variant={tipoAlerta === 'tora' ? 'default' : 'outline'}
                      onClick={() => setTipoAlerta('tora')}
                      className="flex-1"
                    >
                      Toras
                    </Button>
                  </div>
                </div>

                {tipoAlerta === 'serrado' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantidadeMinima">Quantidade Mínima (unidades)</Label>
                      <Input
                        id="quantidadeMinima"
                        type="number"
                        value={quantidadeMinima}
                        onChange={(e) => setQuantidadeMinima(e.target.value)}
                        placeholder="Ex: 100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="m3Minimo">Volume Mínimo (m³)</Label>
                      <Input
                        id="m3Minimo"
                        type="number"
                        step="0.001"
                        value={m3Minimo}
                        onChange={(e) => setM3Minimo(e.target.value)}
                        placeholder="Ex: 5.5"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="toneladasMinima">Toneladas Mínimas</Label>
                    <Input
                      id="toneladasMinima"
                      type="number"
                      step="0.01"
                      value={toneladasMinima}
                      onChange={(e) => setToneladasMinima(e.target.value)}
                      placeholder="Ex: 10.5"
                    />
                  </div>
                )}

                <Button onClick={handleSalvarAlerta} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Alerta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de alertas existentes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Alertas Configurados</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : alertas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta configurado ainda.</p>
            ) : (
              alertas.map((alerta) => (
                <Card key={alerta.id} className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {alerta.tipo === 'serrado' ? 'Madeira Serrada' : 'Toras'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {alerta.tipo === 'serrado' 
                            ? `Mín: ${alerta.quantidade_minima} un • ${alerta.m3_minimo} m³`
                            : `Mín: ${alerta.toneladas_minima} T`
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alerta.ativo}
                          onCheckedChange={(checked) => handleToggleAlerta(alerta.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletarAlerta(alerta.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
