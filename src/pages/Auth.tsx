import { useState, useEffect } from "react";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertTriangle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dwLogo from "@/assets/dw-logo-new.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  
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

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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

  const attemptsRemaining = Math.max(0, 5 - loginAttempts);

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
                <Label htmlFor="password">Senha</Label>
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
