import { ReactNode } from "react";
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
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import FloatingSupport from "@/components/FloatingSupport";
import UserAccountDrawer from "@/components/UserAccountDrawer";
import dwLogo from "@/assets/dw-logo-new.png";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ['admin', 'user'] },
    ...(isAdmin ? [
      { to: "/admin", icon: Settings, label: "Admin", roles: ['admin'] },
      { to: "/auditoria", icon: Shield, label: "Auditoria", roles: ['admin'] },
    ] : []),
    { to: "/toras", icon: TreeDeciduous, label: "Toras", roles: ['admin', 'user'] },
    { to: "/pedidos", icon: ClipboardList, label: "Pedidos", roles: ['admin', 'user'] },
    { to: "/producao", icon: Factory, label: "Produção", roles: ['admin', 'user'] },
    { to: "/vendas", icon: ShoppingCart, label: "Vendas", roles: ['admin', 'user'] },
    { to: "/estoque", icon: Package, label: "Estoque", roles: ['admin', 'user'] },
    { to: "/residuos", icon: Layers, label: "Resíduos", roles: ['admin', 'user'] },
    { to: "/relatorios-financeiros", icon: FileText, label: "Relatórios", roles: ['admin', 'user'] },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Reduced height, clean design */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <img 
                src={dwLogo} 
                alt="DW Corporation Logo" 
                className="h-8 w-8 object-contain" 
              />
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold text-foreground">
                  DwCorporation
                </h1>
                <p className="text-xs text-muted-foreground">Sistema Madeireiro</p>
              </div>
            </div>

            {/* Navigation - Clean, monochromatic */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", !isActive && "opacity-70")} />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Account */}
            <UserAccountDrawer />
          </div>
        </div>
      </header>

      {/* Main Content - More white space */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <OfflineIndicator />
      <FloatingSupport />
    </div>
  );
}
