import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Factory,
  TreeDeciduous
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/producao", icon: Factory, label: "Produção" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas" },
  { to: "/estoque", icon: Package, label: "Estoque" },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 wood-texture">
      <nav className="glass-effect border-b neon-border backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <TreeDeciduous className="h-8 w-8 text-primary dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-all" />
              <h1 className="text-xl font-tech font-bold text-primary tracking-wider">
                MadeiraStock
              </h1>
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
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
