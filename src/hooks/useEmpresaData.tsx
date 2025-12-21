import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EmpresaData {
  id: string;
  nome_empresa: string;
  telefone: string | null;
  endereco: string | null;
  logo_url: string | null;
  cnpj: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  logo_posicao_pdf: string | null;
  logo_tamanho_pdf: string | null;
}

export function useEmpresaData() {
  const { user, userRole, isAdmin } = useAuth();
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpresa = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Se for empresa, buscar diretamente pelo user_id
        if (userRole === 'user') {
          const { data } = await supabase
            .from('empresas')
            .select('id, nome_empresa, telefone, endereco, logo_url, cnpj, cor_primaria, cor_secundaria, logo_posicao_pdf, logo_tamanho_pdf')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data) {
            setEmpresa(data);
          }
        } else if (!isAdmin) {
          // Se for funcionário, buscar pelo empresa_id do profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('empresa_id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile?.empresa_id) {
            const { data } = await supabase
              .from('empresas')
              .select('id, nome_empresa, telefone, endereco, logo_url, cnpj, cor_primaria, cor_secundaria, logo_posicao_pdf, logo_tamanho_pdf')
              .eq('id', profile.empresa_id)
              .maybeSingle();
            
            if (data) {
              setEmpresa(data);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [user, userRole, isAdmin]);

  const refetch = async () => {
    if (!user) return;
    
    try {
      if (userRole === 'user') {
        const { data } = await supabase
          .from('empresas')
          .select('id, nome_empresa, telefone, endereco, logo_url, cnpj, cor_primaria, cor_secundaria, logo_posicao_pdf, logo_tamanho_pdf')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setEmpresa(data);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
    }
  };

  return { empresa, loading, refetch };
}
