import { useState, useEffect } from "react";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, AlertTriangle, Lock, ArrowLeft, Mail, CheckCircle, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dwLogo from "@/assets/dw-logo-new.png";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; code?: string }>({});
  const [mode, setMode] = useState<'login' | 'forgot-password' | 'enter-code' | 'reset-password'>('login');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  
  
  const { user, secureSignIn, isLocked, lockoutEndTime, loginAttempts } = useSecureAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Calculate remaining lockout time
  const [remainingTime, setRemainingTime] = useState(0);
  
  useEffect(() => {
    if (isLocked && lockoutEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockoutEndTime - Date.now()) / 1000));
        setRemainingTime(remaining);
        if (remaining <= 0) {
          setRemainingTime(0);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockoutEndTime]);

  // Check for recovery mode from URL params or hash
  useEffect(() => {
    const checkRecoveryMode = async () => {
      // Check URL params
      const modeParam = searchParams.get('mode');
      if (modeParam === 'reset-password') {
        setMode('reset-password');
      }

      // Check URL hash for recovery tokens
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (type === 'recovery' && accessToken) {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (!error) {
              setHasRecoverySession(true);
              setMode('reset-password');
              // Clean URL
              window.history.replaceState(null, '', window.location.pathname);
            }
          } catch (e) {
            console.error('Error setting recovery session:', e);
          }
        }
      }

      // Also listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setHasRecoverySession(true);
          setMode('reset-password');
        }
      });

      return () => subscription.unsubscribe();
    };

    checkRecoveryMode();
  }, [searchParams]);

  useEffect(() => {
    // Only redirect if user is logged in AND we're not in reset-password mode
    if (user && mode !== 'reset-password' && !hasRecoverySession) {
      navigate('/');
    }
  }, [user, navigate, mode, hasRecoverySession]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    
    if (isLocked) {
      toast({
        variant: "destructive",
        title: "Conta bloqueada",
        description: `Aguarde ${remainingTime} segundos para tentar novamente`,
      });
      return;
    }

    setIsLoading(true);

    const result = await secureSignIn(email, password);

    if (!result.success) {
      if (result.rateLimited) {
        toast({
          variant: "destructive",
          title: "Muitas tentativas",
          description: result.error,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: result.error,
        });
      }
    } else {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
      });
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: "Digite seu email" });
      return;
    }

    setIsLoading(true);

    try {
      // Usar nosso sistema customizado de reset de senha
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Erro ao solicitar recuperação de senha",
        });
      } else if (data?.error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error,
        });
      } else {
        // Código enviado com sucesso
        setMode('enter-code');
        toast({
          title: "Código enviado!",
          description: "Verifique seu email e digite o código de 6 dígitos.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao solicitar recuperação de senha.",
      });
    }

    setIsLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!resetCode.trim() || resetCode.length !== 6) {
      setFieldErrors({ code: "Digite o código de 6 dígitos" });
      return;
    }

    // Código validado, ir para etapa de nova senha
    setMode('reset-password');
  };

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
      // Usar nosso sistema customizado para resetar a senha
      const { data, error } = await supabase.functions.invoke('verify-reset-code', {
        body: { 
          email: email.toLowerCase().trim(),
          code: resetCode,
          newPassword: password
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Erro ao alterar senha",
        });
      } else if (data?.error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error,
        });
      } else {
        setResetSuccess(true);
        toast({
          title: "Senha alterada!",
          description: "Sua senha foi alterada com sucesso.",
        });
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

  const attemptsRemaining = Math.max(0, 5 - loginAttempts);

  // Reset Password Mode (create new password)
  if (mode === 'reset-password') {
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
                {resetSuccess ? "Senha Alterada!" : "Redefinir Senha"}
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                {resetSuccess ? "Sua senha foi alterada com sucesso" : "Digite sua nova senha abaixo"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSuccess ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                      Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="w-full neon-glow" 
                    onClick={() => {
                      setMode('login');
                      setResetSuccess(false);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Ir para o Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
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
                    <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-password"
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
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => {
                      setMode('login');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Enter Code Mode
  if (mode === 'enter-code') {
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
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center font-tech bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Código de Verificação
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Digite o código de 6 dígitos enviado para seu email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-primary/50 bg-primary/10 mb-4">
                <Mail className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  Enviamos um código de 6 dígitos para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
                </AlertDescription>
              </Alert>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-code">Código de 6 dígitos</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className={`text-center text-2xl tracking-widest ${fieldErrors.code ? "border-destructive" : ""}`}
                    autoComplete="one-time-code"
                  />
                  {fieldErrors.code && (
                    <p className="text-sm text-destructive">{fieldErrors.code}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full neon-glow" 
                  disabled={resetCode.length !== 6}
                >
                  Verificar Código
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => {
                    setMode('forgot-password');
                    setResetCode('');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Forgot Password Mode
  if (mode === 'forgot-password') {
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
                Recuperar Senha
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Digite seu email para receber o código de recuperação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={fieldErrors.email ? "border-destructive" : ""}
                    autoComplete="email"
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">{fieldErrors.email}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full neon-glow" 
                  disabled={isLoading}
                >
                  {isLoading ? "Gerando código..." : "Gerar código de recuperação"}
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setMode('login')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao login
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Login Mode
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
              DwCorporation Sist. Madeireiro
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Faça login para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLocked && remainingTime > 0 && (
              <Alert variant="destructive" className="mb-4">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Conta bloqueada. Tente novamente em {remainingTime} segundos.
                </AlertDescription>
              </Alert>
            )}
            
            {loginAttempts > 0 && loginAttempts < 5 && !isLocked && (
              <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-500">
                  {attemptsRemaining} tentativa{attemptsRemaining !== 1 ? 's' : ''} restante{attemptsRemaining !== 1 ? 's' : ''}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLocked}
                  className={fieldErrors.email ? "border-destructive" : ""}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLocked}
                    className={`pr-10 ${fieldErrors.password ? "border-destructive" : ""}`}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLocked}
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
              <Button 
                type="submit" 
                className="w-full neon-glow" 
                disabled={isLoading || isLocked}
              >
                {isLoading ? "Entrando..." : isLocked ? "Bloqueado" : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
