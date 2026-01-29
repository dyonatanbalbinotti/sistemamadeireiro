import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dwLogo from "@/assets/dw-logo-new.png";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const validateRecoverySession = async () => {
      // Check URL hash first - tokens may still be there
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      console.log('Recovery check:', { type, hasAccessToken: !!accessToken, hash: hash.substring(0, 50) });

      // If we have recovery tokens, try to set session manually
      if (type === 'recovery' && accessToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (!error && data.session && isMounted) {
            console.log('Recovery session set from URL tokens');
            setIsValidSession(true);
            setIsValidating(false);
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        } catch (e) {
          console.error('Error setting session from tokens:', e);
        }
      }

      // Check if Supabase already has a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && isMounted) {
        console.log('Existing session found');
        setIsValidSession(true);
        setIsValidating(false);
        return;
      }

      // Listen for PASSWORD_RECOVERY event (Supabase auto-processes tokens)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event in ResetPassword:', event);
        
        if (event === 'PASSWORD_RECOVERY' && session && isMounted) {
          console.log('PASSWORD_RECOVERY event received');
          setIsValidSession(true);
          setIsValidating(false);
        } else if (event === 'SIGNED_IN' && session && isMounted) {
          // Sometimes recovery comes as SIGNED_IN
          console.log('SIGNED_IN event received during recovery');
          setIsValidSession(true);
          setIsValidating(false);
        }
      });

      // Give Supabase time to process tokens from URL
      setTimeout(() => {
        if (isMounted && !isValidSession) {
          // Final check
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && isMounted) {
              setIsValidSession(true);
            }
            setIsValidating(false);
          });
        }
      }, 1500);

      return () => {
        subscription.unsubscribe();
      };
    };

    validateRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Validations
    if (password.length < 6) {
      setFieldErrors({ password: "A senha deve ter pelo menos 6 caracteres" });
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "As senhas não coincidem" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      } else {
        setResetSuccess(true);
        toast({
          title: "Senha alterada!",
          description: "Sua senha foi alterada com sucesso.",
        });
        
        // Sign out the user so they can log in with new password
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao alterar a senha.",
      });
    }

    setIsLoading(false);
  };

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="w-full max-w-md glass-effect neon-border">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={dwLogo} 
                  alt="DW Corporation Logo" 
                  className="h-16 w-auto dark:drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]" 
                />
              </div>
              <CardTitle className="text-2xl text-center font-tech bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Validando...
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show error if session is not valid after validation
  if (!isValidSession && !resetSuccess && !isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="w-full max-w-md glass-effect neon-border">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={dwLogo} 
                  alt="DW Corporation Logo" 
                  className="h-16 w-auto dark:drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]" 
                />
              </div>
              <CardTitle className="text-2xl text-center font-tech bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Link Inválido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertDescription className="text-destructive">
                  Este link de recuperação é inválido ou expirou. Por favor, solicite um novo link.
                </AlertDescription>
              </Alert>
              <Button 
                className="w-full neon-glow" 
                onClick={() => navigate('/auth')}
              >
                Voltar para o Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="w-full max-w-md glass-effect neon-border">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={dwLogo} 
                  alt="DW Corporation Logo" 
                  className="h-16 w-auto dark:drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]" 
                />
              </div>
              <CardTitle className="text-2xl text-center font-tech bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Senha Alterada!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-500">
                  Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.
                </AlertDescription>
              </Alert>
              <Button 
                className="w-full neon-glow" 
                onClick={() => navigate('/auth')}
              >
                Ir para o Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full max-w-md glass-effect neon-border">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <img 
                src={dwLogo} 
                alt="DW Corporation Logo" 
                className="h-16 w-auto dark:drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]" 
              />
            </div>
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-tech bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              Redefinir Senha
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite a nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`pr-10 ${fieldErrors.password ? "border-destructive" : ""}`}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`pr-10 ${fieldErrors.confirmPassword ? "border-destructive" : ""}`}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full neon-glow" 
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Alterar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
