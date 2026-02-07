import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Toras from "./pages/Toras";
import Producao from "./pages/Producao";
import Vendas from "./pages/Vendas";
import Estoque from "./pages/Estoque";
import Cavaco from "./pages/Cavaco";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Admin from "./pages/Admin";
import Pedidos from "./pages/Pedidos";
import RelatoriosFinanceiros from "./pages/RelatoriosFinanceiros";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import AuditLogs from "./pages/AuditLogs";
import Almoxarifado from "./pages/Almoxarifado";
import FluxoFinanceiro from "./pages/FluxoFinanceiro";
import AlterarSenha from "./pages/AlterarSenha";
import { SecurityHeaders } from "@/components/SecurityHeaders";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// Layout wrapper that stays mounted across route changes
const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);

const AdminLayout = () => (
  <ProtectedRoute requireAdmin>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);

// Wrapper for AlterarSenha that handles both recovery mode (public) and authenticated mode
const AlterarSenhaWrapper = () => {
  const location = useLocation();
  const hash = window.location.hash;
  const search = location.search;

  const hasRecoveryToken = (hash && hash.includes('type=recovery')) ||
                           (search && search.includes('type=recovery')) ||
                           sessionStorage.getItem('password_recovery_mode') === 'true';

  if (hash && hash.includes('type=recovery')) {
    sessionStorage.setItem('password_recovery_mode', 'true');
  }

  if (hasRecoveryToken) {
    return <AlterarSenha />;
  }

  return (
    <ProtectedRoute>
      <Layout>
        <AlterarSenha />
      </Layout>
    </ProtectedRoute>
  );
};

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/auth" element={<Auth />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/install" element={<Install />} />
    <Route path="/alterar-senha" element={<AlterarSenhaWrapper />} />

    {/* Protected routes with persistent Layout */}
    <Route element={<ProtectedLayout />}>
      <Route path="/" element={<Index />} />
      <Route path="/toras" element={<Toras />} />
      <Route path="/producao" element={<Producao />} />
      <Route path="/vendas" element={<Vendas />} />
      <Route path="/estoque" element={<Estoque />} />
      <Route path="/residuos" element={<Cavaco />} />
      <Route path="/pedidos" element={<Pedidos />} />
      <Route path="/relatorios-financeiros" element={<RelatoriosFinanceiros />} />
      <Route path="/almoxarifado" element={<Almoxarifado />} />
      <Route path="/fluxo-financeiro" element={<FluxoFinanceiro />} />
    </Route>

    {/* Admin routes with persistent Layout */}
    <Route element={<AdminLayout />}>
      <Route path="/admin" element={<Admin />} />
      <Route path="/auditoria" element={<AuditLogs />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <SecurityHeaders />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
