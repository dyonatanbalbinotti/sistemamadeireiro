import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Hook que retorna o ID da empresa vinculada ao usuário logado
export const useEmpresaId = () => {
  const { user, isAdmin } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresaId = async () => {
      if (!user) {
        setEmpresaId(null);
        setLoading(false);
        return;
      }

      try {
        // Primeiro, tenta buscar empresa onde o user é o dono
        const { data: empresaData, error: queryError } = await supabase
          .from('empresas')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (queryError) {
          console.error('Erro ao buscar empresa:', queryError);
          setError('Erro ao buscar empresa');
          setEmpresaId(null);
        } else if (empresaData) {
          setEmpresaId(empresaData.id);
          setError(null);
        } else {
          // Se não é dono, verifica se está vinculado via profiles.empresa_id
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('empresa_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Erro ao buscar perfil:', profileError);
            setError('Erro ao buscar empresa');
            setEmpresaId(null);
          } else if (profileData?.empresa_id) {
            setEmpresaId(profileData.empresa_id);
            setError(null);
          } else {
            // Usuário não tem empresa cadastrada nem vinculada
            console.warn('Usuário não possui empresa cadastrada');
            setEmpresaId(null);
            
            // Admins podem não ter empresa, isso é ok
            if (!isAdmin) {
              setError('Usuário não possui empresa cadastrada. Contate o administrador.');
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar empresa:', err);
        setError('Erro ao buscar empresa');
        setEmpresaId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresaId();
  }, [user, isAdmin]);

  return { empresaId, loading, error };
};
