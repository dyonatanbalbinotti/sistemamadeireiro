import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'empresa' | null;
  userStatus: 'operacional' | 'invalido' | null;
  loading: boolean;
  isAdmin: boolean;
  isEmpresa: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string, role: 'admin' | 'empresa', nomeEmpresa?: string, cnpj?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'empresa' | null>(null);
  const [userStatus, setUserStatus] = useState<'operacional' | 'invalido' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAdmin = userRole === 'admin';
  const isEmpresa = userRole === 'empresa';

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role and status
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            const { data: profileData } = await supabase
              .from('profiles')
              .select('status')
              .eq('id', session.user.id)
              .maybeSingle();
            
            // Apenas aceitar roles válidos (admin ou empresa)
            const role = roleData?.role;
            if (role === 'admin' || role === 'empresa') {
              setUserRole(role);
            } else {
              setUserRole(null);
            }
            
            setUserStatus((profileData?.status as 'operacional' | 'invalido') || 'operacional');
          }, 0);
        } else {
          setUserRole(null);
          setUserStatus(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('status')
            .eq('id', session.user.id)
            .maybeSingle()
        ]).then(([{ data: roleData }, { data: profileData }]) => {
          // Apenas aceitar roles válidos (admin ou empresa)
          const role = roleData?.role;
          if (role === 'admin' || role === 'empresa') {
            setUserRole(role);
          } else {
            setUserRole(null);
          }
          
          setUserStatus((profileData?.status as 'operacional' | 'invalido') || 'operacional');
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.user) {
      // Buscar role do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      // Redirecionar baseado no role
      if (roleData?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string, role: 'admin' | 'empresa', nomeEmpresa?: string, cnpj?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome,
        }
      }
    });

    if (error) return { error };

    // Create user role
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });
      
      if (roleError) return { error: roleError };

      // If empresa, create empresa record
      if (role === 'empresa' && nomeEmpresa) {
        const { error: empresaError } = await supabase
          .from('empresas')
          .insert({ 
            user_id: data.user.id, 
            nome_empresa: nomeEmpresa,
            cnpj: cnpj || null
          });
        
        if (empresaError) return { error: empresaError };
      }
    }

    navigate('/');
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole, 
      userStatus,
      loading, 
      isAdmin, 
      isEmpresa,
      signIn, 
      signUp, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
