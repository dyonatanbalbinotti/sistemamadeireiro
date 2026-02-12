import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'user' | 'funcionario' | null;
  userName: string | null;
  userCargo: 'gerente' | 'financeiro' | 'almoxarifado' | 'supervisor_geral' | null;
  loading: boolean;
  isAdmin: boolean;
  isFuncionario: boolean;
  isGerente: boolean;
  isFinanceiro: boolean;
  isAlmoxarifado: boolean;
  isSupervisorGeral: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'funcionario' | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<'gerente' | 'financeiro' | 'almoxarifado' | 'supervisor_geral' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAdmin = userRole === 'admin';
  const isFuncionario = userRole === 'funcionario';
  const isGerente = isFuncionario && userCargo === 'gerente';
  const isFinanceiro = isFuncionario && userCargo === 'financeiro';
  const isAlmoxarifado = isFuncionario && userCargo === 'almoxarifado';
  const isSupervisorGeral = isFuncionario && userCargo === 'supervisor_geral';

  useEffect(() => {
    // Check for recovery tokens in URL hash IMMEDIATELY on mount
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      console.log('Recovery tokens detected in URL, redirecting to /reset-password');
      // Clear the hash and redirect
      window.history.replaceState(null, '', '/reset-password');
      navigate('/reset-password');
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        // Handle PASSWORD_RECOVERY event - redirect to reset password page
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected, redirecting to /reset-password');
          navigate('/reset-password');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role and name
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            // Aceitar admin, funcionario ou user
            const role = roleData?.role;
            if (role === 'admin') {
              setUserRole('admin');
            } else if (role === 'funcionario') {
              setUserRole('funcionario');
            } else {
              setUserRole('user');
            }

            // Fetch user name and cargo from profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nome, cargo')
              .eq('id', session.user.id)
              .maybeSingle();
            
            setUserName(profileData?.nome || null);
            setUserCargo(profileData?.cargo as 'gerente' | 'financeiro' | 'almoxarifado' | 'supervisor_geral' | null);
          }, 0);
        } else {
          setUserRole(null);
          setUserName(null);
          setUserCargo(null);
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
            .select('nome, cargo')
            .eq('id', session.user.id)
            .maybeSingle()
        ]).then(([{ data: roleData }, { data: profileData }]) => {
          const role = roleData?.role;
          if (role === 'admin') {
            setUserRole('admin');
          } else if (role === 'funcionario') {
            setUserRole('funcionario');
          } else {
            setUserRole('user');
          }
          setUserName(profileData?.nome || null);
          setUserCargo(profileData?.cargo as 'gerente' | 'financeiro' | 'almoxarifado' | 'supervisor_geral' | null);
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

  const signUp = async (email: string, password: string, nome: string) => {
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

    // Create user role (default: user)
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ user_id: data.user.id, role: 'user' }]);
      
      if (roleError) return { error: roleError };
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
      userName,
      userCargo,
      loading, 
      isAdmin,
      isFuncionario,
      isGerente,
      isFinanceiro,
      isAlmoxarifado,
      isSupervisorGeral,
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
