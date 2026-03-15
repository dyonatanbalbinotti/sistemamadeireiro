import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
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
import ExportarDados from "./pages/ExportarDados";
import { SecurityHeaders } from "@/components/SecurityHeaders";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const } 
  },
};

// Wrapper for AlterarSenha that handles both recovery mode (public) and authenticated mode
const AlterarSenhaWrapper = () => {
  const location = useLocation();
  const hash = window.location.hash;
  const search = location.search;
  
  // Check for recovery token in hash or search params
  const hasRecoveryToken = (hash && hash.includes('type=recovery')) || 
                           (search && search.includes('type=recovery')) ||
                           sessionStorage.getItem('password_recovery_mode') === 'true';
  
  // Store recovery mode in session to persist across renders
  if (hash && hash.includes('type=recovery')) {
    sessionStorage.setItem('password_recovery_mode', 'true');
  }
  
  // If has recovery token, show page without protection (for email link recovery)
  if (hasRecoveryToken) {
    return <AlterarSenha />;
  }
  
  // Otherwise, require authentication and show with layout
  return (
    <ProtectedRoute>
      <Layout>
        <AlterarSenha />
      </Layout>
    </ProtectedRoute>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="min-h-screen"
      >
        <Routes location={location}>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><Layout><Admin /></Layout></ProtectedRoute>} />
          <Route path="/auditoria" element={<ProtectedRoute requireAdmin><Layout><AuditLogs /></Layout></ProtectedRoute>} />
          <Route path="/exportar-dados" element={<ProtectedRoute requireAdmin><Layout><ExportarDados /></Layout></ProtectedRoute>} />
          <Route path="/toras" element={<ProtectedRoute><Layout><Toras /></Layout></ProtectedRoute>} />
          <Route path="/producao" element={<ProtectedRoute><Layout><Producao /></Layout></ProtectedRoute>} />
          <Route path="/vendas" element={<ProtectedRoute><Layout><Vendas /></Layout></ProtectedRoute>} />
          <Route path="/estoque" element={<ProtectedRoute><Layout><Estoque /></Layout></ProtectedRoute>} />
          <Route path="/residuos" element={<ProtectedRoute><Layout><Cavaco /></Layout></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><Layout><Pedidos /></Layout></ProtectedRoute>} />
          <Route path="/relatorios-financeiros" element={<ProtectedRoute><Layout><RelatoriosFinanceiros /></Layout></ProtectedRoute>} />
          <Route path="/almoxarifado" element={<ProtectedRoute><Layout><Almoxarifado /></Layout></ProtectedRoute>} />
          <Route path="/fluxo-financeiro" element={<ProtectedRoute><Layout><FluxoFinanceiro /></Layout></ProtectedRoute>} />
          <Route path="/alterar-senha" element={<AlterarSenhaWrapper />} />
          <Route path="/install" element={<Install />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <SecurityHeaders />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
