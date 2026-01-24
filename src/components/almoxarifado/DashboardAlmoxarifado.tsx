import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaId } from "@/hooks/useEmpresaId";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  ClipboardList, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/dateUtils";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardAlmoxarifado({ onNavigate }: DashboardProps) {
  const { empresaId, loading: loadingEmpresa } = useEmpresaId();
  const { isAlmoxarifado } = useAuth();

  // Buscar itens do estoque
  const { data: itens = [] } = useQuery({
    queryKey: ["almoxarifado-itens-dashboard", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_itens")
        .select("id, codigo, nome, estoque_atual, estoque_minimo, unidade_medida")
        .eq("empresa_id", empresaId)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Buscar pedidos
  const { data: pedidos = [] } = useQuery({
    queryKey: ["almoxarifado-pedidos-dashboard", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_pedidos")
        .select("id, numero_pedido, status, data_pedido, solicitante")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Buscar ordens de compra
  const { data: ordens = [] } = useQuery({
    queryKey: ["almoxarifado-ordens-dashboard", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_ordens_compra")
        .select("id, numero_ordem, status, data_ordem, valor_total, almoxarifado_fornecedores(nome)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Buscar movimentos recentes
  const { data: movimentos = [] } = useQuery({
    queryKey: ["almoxarifado-movimentos-dashboard", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("almoxarifado_movimentos")
        .select("id, tipo, quantidade, created_at, almoxarifado_itens(nome, codigo)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Calcular métricas
  const totalItens = itens.length;
  const itensCriticos = itens.filter(i => i.estoque_atual <= i.estoque_minimo && i.estoque_atual > 0);
  const itensZerados = itens.filter(i => i.estoque_atual === 0);
  const itensOk = itens.filter(i => i.estoque_atual > i.estoque_minimo);

  const pedidosPendentes = pedidos.filter(p => p.status === "pendente");
  const pedidosAprovados = pedidos.filter(p => p.status === "aprovado");

  const ordensPendentes = ordens.filter(o => o.status === "pendente");
  const ordensAprovadas = ordens.filter(o => o.status === "aprovada");
  const ordensEnviadas = ordens.filter(o => o.status === "enviada");

  if (loadingEmpresa) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalItens}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {itensOk.length} em estoque normal
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Itens Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {itensCriticos.length + itensZerados.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {itensZerados.length} sem estoque
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pedidos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {pedidosPendentes.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pedidosAprovados.length} aguardando atendimento
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ordens Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {ordensPendentes.length + ordensAprovadas.length + ordensEnviadas.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ordensEnviadas.length} aguardando recebimento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de detalhes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Itens críticos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Itens Críticos
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("consulta")}>
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...itensZerados, ...itensCriticos].slice(0, 5).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                Nenhum item crítico
              </div>
            ) : (
              [...itensZerados, ...itensCriticos].slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{item.codigo}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.estoque_atual === 0 ? "destructive" : "secondary"}>
                      {item.estoque_atual} {item.unidade_medida}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Mín: {item.estoque_minimo}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pedidos recentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-yellow-500" />
                Pedidos Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("pedidos")}>
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pedidos.slice(0, 5).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhum pedido
              </div>
            ) : (
              pedidos.slice(0, 5).map((pedido) => (
                <div key={pedido.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{pedido.numero_pedido}</p>
                    <p className="text-xs text-muted-foreground">{pedido.solicitante}</p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={
                        pedido.status === "pendente" ? "bg-yellow-500" :
                        pedido.status === "aprovado" ? "bg-blue-500" :
                        pedido.status === "atendido" ? "bg-green-500" : "bg-red-500"
                      }
                    >
                      {pedido.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{formatDateBR(pedido.data_pedido)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ordens de compra */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
                Ordens de Compra
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("ordens")}>
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {ordens.slice(0, 5).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhuma ordem
              </div>
            ) : (
              ordens.slice(0, 5).map((ordem: any) => (
                <div key={ordem.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{ordem.numero_ordem}</p>
                    <p className="text-xs text-muted-foreground">
                      {ordem.almoxarifado_fornecedores?.nome || "Sem fornecedor"}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={
                        ordem.status === "pendente" ? "bg-yellow-500" :
                        ordem.status === "aprovada" ? "bg-blue-500" :
                        ordem.status === "enviada" ? "bg-purple-500" :
                        ordem.status === "recebida" ? "bg-green-500" : "bg-red-500"
                      }
                    >
                      {ordem.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movimentos recentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Últimos Movimentos
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("movimento")}>
              Ver todos <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {movimentos.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Nenhum movimento registrado
            </div>
          ) : (
            <div className="space-y-2">
              {movimentos.map((mov: any) => (
                <div key={mov.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className={`p-2 rounded-full ${
                    mov.tipo === "entrada" ? "bg-green-100 text-green-600" :
                    mov.tipo === "saida" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    {mov.tipo === "entrada" ? <TrendingUp className="h-4 w-4" /> : 
                     mov.tipo === "saida" ? <TrendingDown className="h-4 w-4" /> :
                     <Package className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {mov.almoxarifado_itens?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mov.almoxarifado_itens?.codigo} • {new Date(mov.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={mov.tipo === "entrada" ? "default" : mov.tipo === "saida" ? "destructive" : "secondary"}>
                    {mov.tipo === "entrada" ? "+" : mov.tipo === "saida" ? "-" : ""}
                    {mov.quantidade}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
