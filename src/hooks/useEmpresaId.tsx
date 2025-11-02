import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useEmpresaId = () => {
  const { user, isAdmin } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getEmpresaId = async () => {
      if (!user) {
        setEmpresaId(null);
        setLoading(false);
        return;
      }

      if (isAdmin) {
        // Admins não têm empresa_id específico
        setEmpresaId(null);
        setLoading(false);
        return;
      }

      try {
        // Primeiro tenta buscar do profile (para funcionários)
        const { data: profile } = await supabase
          .from('profiles')
          .select('empresa_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.empresa_id) {
          setEmpresaId(profile.empresa_id);
          setLoading(false);
          return;
        }

        // Se não encontrou, busca na tabela empresas (para donos de empresa)
        const { data: empresa } = await supabase
          .from('empresas')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        setEmpresaId(empresa?.id || null);
      } catch (error) {
        console.error('Erro ao buscar empresa_id:', error);
        setEmpresaId(null);
      } finally {
        setLoading(false);
      }
    };

    getEmpresaId();
  }, [user, isAdmin]);

  return { empresaId, loading };
};
