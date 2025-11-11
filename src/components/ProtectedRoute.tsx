import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireEmpresa?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireEmpresa = false,
}: ProtectedRouteProps) {
  const { user, userRole, userStatus, loading } = useAuth();

  if (loading) {
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

  // Verificar se usuário está inativo (exceto admin)
  if (userRole !== 'admin' && userStatus === 'invalido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-6"
        >
          <h2 className="text-2xl font-bold text-destructive mb-4">Conta Inativa</h2>
          <p className="text-muted-foreground mb-2">
            Sua conta está temporariamente inativa. Isso pode ter ocorrido devido ao vencimento da anuidade.
          </p>
          <p className="text-muted-foreground">
            Por favor, entre em contato com o administrador do sistema para reativar sua conta.
          </p>
        </motion.div>
      </div>
    );
  }

  // Se é admin tentando acessar área não-admin, redirecionar
  if (userRole === 'admin' && !requireAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Verificar permissões específicas
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

  if (requireEmpresa && userRole !== 'empresa' && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Esta área é exclusiva para empresas.</p>
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
