/**
 * Enhanced authentication hook with security features
 * Implements rate limiting, input validation, and secure session management
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  validateLoginForm, 
  validateSignUpForm, 
  checkClientRateLimit, 
  clearRateLimit,
  sanitizeErrorMessage,
  isSessionExpiringSoon 
} from '@/lib/security';

interface SecureAuthResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
}

export function useSecureAuth() {
  const auth = useAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);

  // Check session expiration
  useEffect(() => {
    if (!auth.session?.expires_at) return;

    const checkSession = () => {
      const expiresAt = auth.session?.expires_at;
      if (expiresAt && isSessionExpiringSoon(expiresAt, 5)) {
        setSessionWarning(true);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [auth.session?.expires_at]);

  // Check if user is locked out
  useEffect(() => {
    if (lockoutEndTime && Date.now() >= lockoutEndTime) {
      setIsLocked(false);
      setLockoutEndTime(null);
      setLoginAttempts(0);
    }
  }, [lockoutEndTime]);

  const secureSignIn = useCallback(async (email: string, password: string): Promise<SecureAuthResult> => {
    // Check lockout
    if (isLocked && lockoutEndTime && Date.now() < lockoutEndTime) {
      const remainingSeconds = Math.ceil((lockoutEndTime - Date.now()) / 1000);
      return {
        success: false,
        error: `Conta bloqueada. Tente novamente em ${remainingSeconds} segundos`,
        rateLimited: true
      };
    }

    // Client-side rate limiting (defense in depth)
    const rateLimitKey = `login_${email.toLowerCase().trim()}`;
    if (!checkClientRateLimit(rateLimitKey, 5, 900000)) { // 5 attempts per 15 minutes
      setIsLocked(true);
      setLockoutEndTime(Date.now() + 900000);
      return {
        success: false,
        error: 'Muitas tentativas de login. Aguarde 15 minutos',
        rateLimited: true
      };
    }

    // Validate inputs
    const validation = validateLoginForm(email, password);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.email || validation.errors.password || 'Dados inválidos'
      };
    }

    try {
      // Check server-side rate limit
      const { data: canLogin } = await supabase.rpc('check_login_rate_limit', { 
        _email: email.toLowerCase().trim() 
      });

      if (canLogin === false) {
        setIsLocked(true);
        setLockoutEndTime(Date.now() + 900000);
        return {
          success: false,
          error: 'Muitas tentativas de login. Aguarde 15 minutos',
          rateLimited: true
        };
      }

      // Attempt login
      const { error } = await auth.signIn(email, password);

      // Record attempt
      await supabase.rpc('record_login_attempt', {
        _email: email.toLowerCase().trim(),
        _success: !error
      });

      if (error) {
        setLoginAttempts(prev => prev + 1);
        
        // Lock after 5 failed attempts
        if (loginAttempts + 1 >= 5) {
          setIsLocked(true);
          setLockoutEndTime(Date.now() + 900000);
        }

        return {
          success: false,
          error: sanitizeErrorMessage(error)
        };
      }

      // Success - clear rate limit
      clearRateLimit(rateLimitKey);
      setLoginAttempts(0);
      setIsLocked(false);
      setLockoutEndTime(null);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: sanitizeErrorMessage(error)
      };
    }
  }, [auth, isLocked, lockoutEndTime, loginAttempts]);

  const secureSignUp = useCallback(async (email: string, password: string, nome: string): Promise<SecureAuthResult> => {
    // Validate inputs
    const validation = validateSignUpForm(email, password, nome);
    if (!validation.valid) {
      const firstError = validation.errors.email || validation.errors.password || validation.errors.nome;
      return {
        success: false,
        error: firstError || 'Dados inválidos'
      };
    }

    try {
      const { error } = await auth.signUp(email, password, nome);

      if (error) {
        return {
          success: false,
          error: sanitizeErrorMessage(error)
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: sanitizeErrorMessage(error)
      };
    }
  }, [auth]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        setSessionWarning(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    ...auth,
    secureSignIn,
    secureSignUp,
    refreshSession,
    loginAttempts,
    isLocked,
    lockoutEndTime,
    sessionWarning
  };
}
