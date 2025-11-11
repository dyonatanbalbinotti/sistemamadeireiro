import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

// Hook simplificado que retorna apenas o ID do usuário logado
export const useEmpresaId = () => {
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Cada usuário agora usa apenas seu próprio ID
      setEmpresaId(user.id);
    } else {
      setEmpresaId(null);
    }
    setLoading(false);
  }, [user]);

  return { empresaId, loading };
};
