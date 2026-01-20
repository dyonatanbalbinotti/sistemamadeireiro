import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList, FileText, ArrowLeftRight, Search, ShoppingCart } from "lucide-react";
import CadastroItens from "@/components/almoxarifado/CadastroItens";
import GeracaoPedidos from "@/components/almoxarifado/GeracaoPedidos";
import LancamentoNF from "@/components/almoxarifado/LancamentoNF";
import MovimentoEstoque from "@/components/almoxarifado/MovimentoEstoque";
import ConsultaEstoque from "@/components/almoxarifado/ConsultaEstoque";
import OrdensCompra from "@/components/almoxarifado/OrdensCompra";

export default function Almoxarifado() {
  const [activeTab, setActiveTab] = useState("itens");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Almoxarifado</h1>
        <p className="text-muted-foreground">Gerencie itens, pedidos, notas fiscais e estoque</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2 h-auto p-1">
          <TabsTrigger value="itens" className="flex items-center gap-2 py-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Cadastro</span>
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center gap-2 py-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Pedidos</span>
          </TabsTrigger>
          <TabsTrigger value="nf" className="flex items-center gap-2 py-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Notas Fiscais</span>
          </TabsTrigger>
          <TabsTrigger value="movimento" className="flex items-center gap-2 py-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Movimento</span>
          </TabsTrigger>
          <TabsTrigger value="consulta" className="flex items-center gap-2 py-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Consulta</span>
          </TabsTrigger>
          <TabsTrigger value="ordens" className="flex items-center gap-2 py-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Ordens</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="itens">
          <CadastroItens />
        </TabsContent>

        <TabsContent value="pedidos">
          <GeracaoPedidos />
        </TabsContent>

        <TabsContent value="nf">
          <LancamentoNF />
        </TabsContent>

        <TabsContent value="movimento">
          <MovimentoEstoque />
        </TabsContent>

        <TabsContent value="consulta">
          <ConsultaEstoque />
        </TabsContent>

        <TabsContent value="ordens">
          <OrdensCompra />
        </TabsContent>
      </Tabs>
    </div>
  );
}
