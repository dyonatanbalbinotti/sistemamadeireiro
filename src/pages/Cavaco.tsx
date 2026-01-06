import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/dateUtils";

// Componente para o input de peso por m³ com atualização apenas ao pressionar Enter
const PesoPorM3Input = ({ 
  toraId, 
  valorInicial, 
  onUpdate 
}: { 
  toraId: string; 
  valorInicial: number; 
  onUpdate: (toraId: string, valor: string) => void 
}) => {
  const [valor, setValor] = useState(valorInicial.toString());

  useEffect(() => {
    setValor(valorInicial.toString());
  }, [valorInicial]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      onUpdate(toraId, valor);
    }
  };

  const handleBlur = () => {
    // Restaurar valor original se não foi confirmado com Enter
    setValor(valorInicial.toString());
  };

  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-20 text-center"
      title="Pressione Enter para confirmar"
    />
  );
};

export default function Cavaco() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Carregar toras
        const { data: torasData } = await supabase
          .from('toras')
          .select('*')
          .order('created_at', { ascending: false });

        // Carregar produção
        const { data: producaoData } = await supabase
          .from('producao')
          .select('*, toras(id)')
          .order('created_at', { ascending: false });

        // Carregar toras serradas
        const { data: torasSerradasData } = await supabase
          .from('toras_serradas')
          .select('*')
          .order('created_at', { ascending: false });

        // Carregar vendas de cavaco
        const { data: vendasCavacoData } = await supabase
          .from('vendas_cavaco')
          .select('*')
          .order('created_at', { ascending: false });

        if (torasData && producaoData && torasSerradasData) {
          // Agrupar por tora e calcular
          const calculoPorTora = torasData.map(tora => {
            const producoesDaTora = producaoData.filter(p => p.tora_id === tora.id);
            const m3Total = producoesDaTora.reduce((sum, p) => sum + Number(p.m3), 0);
            
            // Buscar toneladas das toras serradas ao invés do peso total da carga
            const torasSerradasDoLote = torasSerradasData.filter(ts => ts.tora_id === tora.id);
            const toneladasSerradas = torasSerradasDoLote.reduce((sum, ts) => sum + Number(ts.toneladas), 0);
            
            // Cálculo: peso por m³ × m³ serrado = toneladas de madeira serrada
            const pesoPorM3 = Number(tora.peso_por_m3) || 0.6;
            const toneladasMadeirasSerradas = pesoPorM3 * m3Total;
            
            // Buscar vendas de cavaco do lote
            const vendasCavacoDoLote = vendasCavacoData?.filter(vc => vc.tora_id === tora.id) || [];
            const toneladasVendidasCavaco = vendasCavacoDoLote.reduce((sum, vc) => sum + Number(vc.toneladas), 0);
            
            // Cálculo: TN serradas - TN madeiras serradas - TN vendidas de cavaco = cavaco em estoque
            const cavacoEstoque = toneladasSerradas - toneladasMadeirasSerradas - toneladasVendidasCavaco;

            // Calcular porcentagens de aproveitamento
            // O percentual deve considerar o total da carga + o cavaco vendido para calcular o total processado
            const totalProcessado = toneladasSerradas;
            const percentualMadeiraSerrada = totalProcessado > 0 
              ? (toneladasMadeirasSerradas / totalProcessado) * 100 
              : 0;
            const percentualCavaco = totalProcessado > 0 
              ? ((cavacoEstoque + toneladasVendidasCavaco) / totalProcessado) * 100 
              : 0;

            return {
              id: tora.id,
              descricao: tora.descricao,
              data: tora.data,
              toneladasCarga: toneladasSerradas,
              pesoPorM3,
              m3Serrado: m3Total,
              toneladasMadeirasSerradas,
              cavacoEstoque: Math.max(0, cavacoEstoque),
              percentualMadeiraSerrada,
              percentualCavaco,
            };
          });

          setDados(calculoPorTora);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handlePesoPorM3Change = async (toraId: string, novoPeso: string) => {
    const peso = parseFloat(novoPeso) || 0.6;
    
    try {
      const { error } = await supabase
        .from('toras')
        .update({ peso_por_m3: peso })
        .eq('id', toraId);

      if (error) throw error;

      // Atualizar dados localmente recalculando corretamente
      setDados(prevDados =>
        prevDados.map(item => {
          if (item.id === toraId) {
            const novasToneladasMadeiras = peso * item.m3Serrado;
            const novoCavacoEstoque = Math.max(0, item.toneladasCarga - novasToneladasMadeiras);
            const percentualMadeiraSerrada = item.toneladasCarga > 0
              ? (novasToneladasMadeiras / item.toneladasCarga) * 100
              : 0;
            const percentualCavaco = item.toneladasCarga > 0
              ? (novoCavacoEstoque / item.toneladasCarga) * 100
              : 0;
            
            return {
              ...item,
              pesoPorM3: peso,
              toneladasMadeirasSerradas: novasToneladasMadeiras,
              cavacoEstoque: novoCavacoEstoque,
              percentualMadeiraSerrada,
              percentualCavaco
            };
          }
          return item;
        })
      );

      toast.success("Peso por m³ atualizado com sucesso!");
    } catch (error) {
      console.error('Erro ao atualizar peso por m³:', error);
      toast.error("Erro ao atualizar peso por m³");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  const totalCavacoEstoque = dados.reduce((sum, d) => sum + d.cavacoEstoque, 0);
  const totalToneladasCarga = dados.reduce((sum, d) => sum + d.toneladasCarga, 0);
  const totalMadeiraSerrada = dados.reduce((sum, d) => sum + d.toneladasMadeirasSerradas, 0);
  const percentualMedioMadeira = totalToneladasCarga > 0 
    ? (totalMadeiraSerrada / totalToneladasCarga) * 100 
    : 0;
  const percentualMedioCavaco = totalToneladasCarga > 0 
    ? (totalCavacoEstoque / totalToneladasCarga) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resíduos</h1>
          <p className="text-muted-foreground">Controle de resíduos em estoque</p>
        </div>
      </div>

      {/* Card de Eficiência Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Processado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalToneladasCarga.toFixed(2)} T
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Madeira Serrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {totalMadeiraSerrada.toFixed(2)} T
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {percentualMedioMadeira.toFixed(2)}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cavaco em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalCavacoEstoque.toFixed(2)} T
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {percentualMedioCavaco.toFixed(2)}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eficiência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {percentualMedioMadeira.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aproveitamento em madeira
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">
            Resumo de Cavaco por Lote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Lote (Tora)</TableHead>
                  <TableHead>TN Carga</TableHead>
                  <TableHead>Peso por m³ (T)</TableHead>
                  <TableHead>m³ Serrado</TableHead>
                  <TableHead>TN Madeiras Serradas</TableHead>
                  <TableHead>% Madeira</TableHead>
                  <TableHead>Cavaco Estoque (T)</TableHead>
                  <TableHead>% Cavaco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  dados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDateBR(item.data)}</TableCell>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell>{item.toneladasCarga.toFixed(2)} T</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PesoPorM3Input
                            toraId={item.id}
                            valorInicial={item.pesoPorM3}
                            onUpdate={handlePesoPorM3Change}
                          />
                          <span className="text-sm text-muted-foreground">T</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.m3Serrado.toFixed(2)} m³</TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {item.toneladasMadeirasSerradas.toFixed(2)} T
                      </TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {item.percentualMadeiraSerrada.toFixed(2)}%
                      </TableCell>
                      <TableCell className="font-bold text-primary text-lg">
                        {item.cavacoEstoque.toFixed(2)} T
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {item.percentualCavaco.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
