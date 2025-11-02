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

      // Admin não tem empresa_id
      if (isAdmin) {
        setEmpresaId(null);
        setLoading(false);
        return;
      }

      try {
        // Primeiro tenta pegar da tabela profiles (para funcionários)
        const { data: profile } = await supabase
          .from('profiles')
          .select('empresa_id')
          .eq('id', user.id)
          .single();

        if (profile?.empresa_id) {
          setEmpresaId(profile.empresa_id);
          setLoading(false);
          return;
        }

        // Se não encontrou, tenta pegar da tabela empresas (para empresas)
        const { data: empresa } = await supabase
          .from('empresas')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (empresa) {
          setEmpresaId(empresa.id);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa_id:', error);
      } finally {
        setLoading(false);
      }
    };

    getEmpresaId();
  }, [user, isAdmin]);

  return { empresaId, loading };
};
