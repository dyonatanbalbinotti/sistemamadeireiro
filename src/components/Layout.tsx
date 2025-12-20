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
  FileText
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
    ...(isAdmin ? [{ to: "/admin", icon: Settings, label: "Admin", roles: ['admin'] }] : []),
    { to: "/toras", icon: TreeDeciduous, label: "Toras", roles: ['admin', 'user'] },
    { to: "/pedidos", icon: ClipboardList, label: "Pedidos", roles: ['admin', 'user'] },
    { to: "/producao", icon: Factory, label: "Produção", roles: ['admin', 'user'] },
    { to: "/vendas", icon: ShoppingCart, label: "Vendas", roles: ['admin', 'user'] },
    { to: "/estoque", icon: Package, label: "Estoque", roles: ['admin', 'user'] },
    { to: "/residuos", icon: Layers, label: "Resíduos", roles: ['admin', 'user'] },
    { to: "/relatorios-financeiros", icon: FileText, label: "Relatórios", roles: ['admin', 'user'] },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 wood-texture">
      <nav className="glass-effect border-b neon-border backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src={dwLogo} 
                alt="DW Corporation Logo" 
                className="h-10 w-10 object-contain dark:drop-shadow-[0_0_12px_rgba(0,255,255,0.6)] transition-all" 
              />
              <div>
                <h1 className="text-lg font-tech font-bold text-primary tracking-wider">
                  DwCorporation Sist. Madeireiro
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg dark:shadow-[0_0_15px_rgba(0,255,255,0.3)] scale-105"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground neon-glow"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <UserAccountDrawer />
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <OfflineIndicator />
      <FloatingSupport />
    </div>
  );
}
