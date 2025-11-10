import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

        if (torasData && producaoData) {
          // Agrupar por tora e calcular
          const calculoPorTora = torasData.map(tora => {
            const producoesDaTora = producaoData.filter(p => p.tora_id === tora.id);
            const m3Total = producoesDaTora.reduce((sum, p) => sum + Number(p.m3), 0);
            
            // Cálculo: peso * m³ serrado = toneladas de madeira serrada
            const toneladasMadeirasSerradas = Number(tora.toneladas) * m3Total;
            
            // Cálculo: TN da carga - TN madeiras serradas = cavaco em estoque
            const cavacoEstoque = Number(tora.toneladas) - toneladasMadeirasSerradas;

            return {
              id: tora.id,
              descricao: tora.descricao,
              data: tora.data,
              toneladasCarga: Number(tora.toneladas),
              m3Serrado: m3Total,
              toneladasMadeirasSerradas,
              cavacoEstoque: Math.max(0, cavacoEstoque), // Não permitir negativos
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  const totalCavacoEstoque = dados.reduce((sum, d) => sum + d.cavacoEstoque, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cavaco</h1>
          <p className="text-muted-foreground">Controle de cavaco em estoque</p>
        </div>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between">
            <span>Resumo de Cavaco por Lote</span>
            <span className="text-2xl text-primary">
              Total em Estoque: {totalCavacoEstoque.toFixed(2)} T
            </span>
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
                  <TableHead>m³ Serrado</TableHead>
                  <TableHead>TN Madeiras Serradas</TableHead>
                  <TableHead className="font-semibold text-primary">Cavaco Estoque (T)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  dados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.data).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell>{item.toneladasCarga.toFixed(2)} T</TableCell>
                      <TableCell>{item.m3Serrado.toFixed(2)} m³</TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {item.toneladasMadeirasSerradas.toFixed(2)} T
                      </TableCell>
                      <TableCell className="font-bold text-primary text-lg">
                        {item.cavacoEstoque.toFixed(2)} T
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Fórmula de Cálculo:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Cavaco em Estoque</strong> = TN da Carga - TN Madeiras Serradas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
