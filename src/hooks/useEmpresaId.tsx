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
        // Busca na tabela empresas primeiro (para donos de empresa)
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (empresaError) {
          console.error('Erro ao buscar empresa:', empresaError);
        }

        if (empresa?.id) {
          console.log('Empresa encontrada como dono:', empresa.id);
          setEmpresaId(empresa.id);
          setLoading(false);
          return;
        }

        // Se não encontrou, busca no profile (para funcionários)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('empresa_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar profile:', profileError);
        }

        if (profile?.empresa_id) {
          console.log('Empresa encontrada no profile:', profile.empresa_id);
          setEmpresaId(profile.empresa_id);
        } else {
          console.log('Nenhuma empresa encontrada para o usuário:', user.id);
          setEmpresaId(null);
        }
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
