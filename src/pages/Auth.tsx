import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import dwLogo from "@/assets/dw-logo-new.png";
import { z } from "zod";

// Schema de validação para login
const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z.string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(128, "Senha muito longa"),
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{email?: string; password?: string}>({});
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validar inputs com Zod
    const result = loginSchema.safeParse({ email, password });
    
    if (!result.success) {
      const errors: {email?: string; password?: string} = {};
      result.error.errors.forEach(err => {
        if (err.path[0] === 'email') errors.email = err.message;
        if (err.path[0] === 'password') errors.password = err.message;
      });
      setValidationErrors(errors);
      return;
    }
    
    setIsLoading(true);

    const { error } = await signIn(result.data.email, result.data.password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message,
      });
    } else {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
      });
    }

    setIsLoading(false);
  };

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
                className={validationErrors.email ? "border-destructive" : ""}
              />
              {validationErrors.email && (
                <p className="text-xs text-destructive">{validationErrors.email}</p>
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
                  className={`pr-10 ${validationErrors.password ? "border-destructive" : ""}`}
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
              {validationErrors.password && (
                <p className="text-xs text-destructive">{validationErrors.password}</p>
              )}
            </div>
            <Button type="submit" className="w-full neon-glow" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
