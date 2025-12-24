import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Hook que retorna o ID da empresa vinculada ao usuário logado
export const useEmpresaId = () => {
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpresaId = async () => {
      if (!user) {
        setEmpresaId(null);
        setLoading(false);
        return;
      }

      try {
        // Primeiro, tenta buscar empresa onde o user é o dono
        const { data: empresaData, error } = await supabase
          .from('empresas')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar empresa:', error);
          // Fallback: usar user.id se não encontrar empresa
          setEmpresaId(user.id);
        } else if (empresaData) {
          setEmpresaId(empresaData.id);
        } else {
          // Se não tem empresa cadastrada, usa o user.id como fallback
          // Isso pode acontecer para usuários sem empresa criada
          setEmpresaId(user.id);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        setEmpresaId(user.id);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresaId();
  }, [user]);

  return { empresaId, loading };
};
