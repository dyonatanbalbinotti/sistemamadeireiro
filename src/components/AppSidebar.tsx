import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Factory,
  Settings,
  Layers,
  TreeDeciduous,
  ClipboardList,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  Warehouse
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import dwLogo from "@/assets/dw-logo-new.png";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AppSidebar() {
  const location = useLocation();
  const { isAdmin, isFuncionario, isGerente, isFinanceiro, isAlmoxarifado } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Se é almoxarifado, mostra apenas a aba de almoxarifado
  if (isAlmoxarifado) {
    const almoxarifadoItems = [
      { to: "/almoxarifado", icon: Warehouse, label: "Almoxarifado" },
    ];

    return (
      <SidebarContent 
        navItems={almoxarifadoItems} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        location={location} 
      />
    );
  }

  const navItems = [
    // Dashboard visível para todos exceto financeiro e almoxarifado
    ...(!isFinanceiro && !isAlmoxarifado ? [{ to: "/", icon: LayoutDashboard, label: "Dashboard" }] : []),
    ...(isAdmin ? [
      { to: "/admin", icon: Settings, label: "Admin" },
      { to: "/auditoria", icon: Shield, label: "Auditoria" },
    ] : []),
    // Abas operacionais - visíveis para admin, user e gerente (não para financeiro/almoxarifado)
    ...(!isFinanceiro && !isAlmoxarifado ? [
      { to: "/toras", icon: TreeDeciduous, label: "Toras" },
      { to: "/pedidos", icon: ClipboardList, label: "Pedidos" },
      { to: "/producao", icon: Factory, label: "Produção" },
      { to: "/vendas", icon: ShoppingCart, label: "Vendas" },
      { to: "/estoque", icon: Package, label: "Estoque" },
      { to: "/residuos", icon: Layers, label: "Resíduos" },
    ] : []),
    // Almoxarifado - visível para admin e user (não para gerente, financeiro ou almoxarifado)
    ...(!isGerente && !isFinanceiro && !isAlmoxarifado ? [{ to: "/almoxarifado", icon: Warehouse, label: "Almoxarifado" }] : []),
    // Relatórios - visível para admin, user e financeiro (não para gerente ou almoxarifado)
    ...(!isGerente && !isAlmoxarifado ? [{ to: "/relatorios-financeiros", icon: FileText, label: "Relatórios" }] : []),
  ];

  const NavItem = ({ item }: { item: { to: string; icon: typeof LayoutDashboard; label: string } }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;

    const linkContent = (
      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center" : "",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "" : "opacity-80")} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <SidebarContent 
      navItems={navItems} 
      collapsed={collapsed} 
      setCollapsed={setCollapsed} 
      location={location} 
    />
  );
}

// Componente separado para reutilização
function SidebarContent({ 
  navItems, 
  collapsed, 
  setCollapsed, 
  location 
}: { 
  navItems: { to: string; icon: typeof LayoutDashboard; label: string }[]; 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  location: { pathname: string };
}) {
  const NavItem = ({ item }: { item: { to: string; icon: typeof LayoutDashboard; label: string } }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;

    const linkContent = (
      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center" : "",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "" : "opacity-80")} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-sidebar-background border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-16 border-b border-sidebar-border",
        collapsed ? "justify-center" : ""
      )}>
        <img 
          src={dwLogo} 
          alt="DW Corporation Logo" 
          className="h-8 w-8 object-contain flex-shrink-0" 
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-sidebar-foreground truncate">
              DwCorporation
            </h1>
            <p className="text-xs text-muted-foreground truncate">Sistema Madeireiro</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-2 text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
