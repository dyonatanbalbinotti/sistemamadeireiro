import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, userRole, isGerente, isFinanceiro, isAlmoxarifado, loading } = useAuth();
  const location = useLocation();
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [motivoBloqueio, setMotivoBloqueio] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const fetchUserStatus = async () => {
      if (!user) {
        setStatusLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('status, motivo_bloqueio')
          .eq('id', user.id)
          .maybeSingle();
        
        setUserStatus(data?.status || 'operacional');
        setMotivoBloqueio(data?.motivo_bloqueio || null);
      } catch (error) {
        console.error('Erro ao buscar status:', error);
        setUserStatus('operacional');
      } finally {
        setStatusLoading(false);
      }
    };

    fetchUserStatus();
  }, [user]);

  if (loading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-primary animate-pulse text-xl font-tech"
        >
          Carregando...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se é admin tentando acessar área não-admin, redirecionar
  if (userRole === 'admin' && !requireAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Verificar permissões de admin
  if (requireAdmin && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </motion.div>
      </div>
    );
  }

  // Rotas operacionais (bloqueadas para Financeiro e Almoxarifado)
  const operationalRoutes = ['/', '/toras', '/pedidos', '/producao', '/vendas', '/estoque', '/residuos'];
  
  // Se é funcionário financeiro tentando acessar rotas operacionais ou almoxarifado
  if (isFinanceiro && (operationalRoutes.includes(location.pathname) || location.pathname === '/almoxarifado')) {
    return <Navigate to="/relatorios-financeiros" replace />;
  }

  // Se é funcionário gerente tentando acessar relatórios ou almoxarifado
  if (isGerente && (location.pathname === '/relatorios-financeiros' || location.pathname === '/almoxarifado')) {
    return <Navigate to="/" replace />;
  }

  // Se é funcionário almoxarifado tentando acessar outras rotas
  if (isAlmoxarifado && location.pathname !== '/almoxarifado') {
    return <Navigate to="/almoxarifado" replace />;
  }

  // Bloquear acesso se o status do usuário for "invalido" (exceto admins)
  if (userRole !== 'admin' && userStatus === 'invalido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-4"
        >
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Bloqueado</h2>
          
          {motivoBloqueio ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-destructive">
                Motivo: {motivoBloqueio}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mb-4">
              Seu acesso ao sistema está temporariamente bloqueado.
            </p>
          )}
          
          <p className="text-sm text-muted-foreground">
            Entre em contato com o administrador para regularizar sua situação.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
