/**
 * Security utilities for input validation and sanitization
 * Implements OWASP Top 10 protections
 */
import { z } from 'zod';

// =============================================
// INPUT VALIDATION SCHEMAS
// =============================================

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Email inválido' })
  .max(255, { message: 'Email muito longo' });

export const passwordSchema = z
  .string()
  .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  .max(128, { message: 'Senha muito longa' })
  .regex(/[A-Z]/, { message: 'Senha deve conter pelo menos uma letra maiúscula' })
  .regex(/[a-z]/, { message: 'Senha deve conter pelo menos uma letra minúscula' })
  .regex(/[0-9]/, { message: 'Senha deve conter pelo menos um número' });

export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  .max(100, { message: 'Nome muito longo' })
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'Nome contém caracteres inválidos' });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d\s()+-]+$/, { message: 'Telefone inválido' })
  .max(20, { message: 'Telefone muito longo' })
  .optional()
  .or(z.literal(''));

export const cnpjSchema = z
  .string()
  .trim()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, { message: 'CNPJ inválido' })
  .optional()
  .or(z.literal(''));

export const addressSchema = z
  .string()
  .trim()
  .max(500, { message: 'Endereço muito longo' })
  .optional()
  .or(z.literal(''));

export const textSchema = z
  .string()
  .trim()
  .max(1000, { message: 'Texto muito longo' });

export const uuidSchema = z
  .string()
  .uuid({ message: 'ID inválido' });

export const numberSchema = z
  .number()
  .positive({ message: 'Número deve ser positivo' })
  .finite({ message: 'Número inválido' });

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' });

// =============================================
// SANITIZATION FUNCTIONS
// =============================================

/**
 * Sanitizes HTML to prevent XSS attacks
 * Removes all HTML tags and entities
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove HTML entities
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitizes input for SQL safety (defense in depth)
 * Note: Always use parameterized queries with Supabase
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/['";\\]/g, '') // Remove dangerous SQL characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .trim();
}

/**
 * Validates and sanitizes URL parameters
 */
export function sanitizeUrlParam(input: string): string {
  if (!input) return '';
  return encodeURIComponent(input.trim());
}

/**
 * Validates file uploads
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'] } = options;

  if (file.size > maxSize) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }

  // Check file extension matches mime type
  const ext = file.name.split('.').pop()?.toLowerCase();
  const typeExtMap: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
  };

  const allowedExts = typeExtMap[file.type] || [];
  if (!ext || !allowedExts.includes(ext)) {
    return { valid: false, error: 'Extensão de arquivo não corresponde ao tipo' };
  }

  return { valid: true };
}

// =============================================
// RATE LIMITING (CLIENT-SIDE)
// =============================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Client-side rate limiting
 * This is defense in depth - real rate limiting must be server-side
 */
export function checkClientRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const stored = rateLimitStore.get(key);

  if (!stored || now > stored.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (stored.count >= maxAttempts) {
    return false;
  }

  stored.count++;
  return true;
}

/**
 * Clear rate limit for a key (e.g., after successful auth)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// =============================================
// SECURE DATA HANDLING
// =============================================

/**
 * Masks sensitive data for display
 */
export function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2 
    ? local[0] + '***' + local[local.length - 1]
    : '***';
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '***';
  return '(' + cleaned.slice(0, 2) + ') ***-' + cleaned.slice(-4);
}

export function maskCnpj(cnpj: string): string {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length < 6) return '***';
  return cleaned.slice(0, 2) + '.***.' + cleaned.slice(-2);
}

// =============================================
// SESSION SECURITY
// =============================================

/**
 * Checks if session is about to expire
 */
export function isSessionExpiringSoon(expiresAt: number, thresholdMinutes: number = 5): boolean {
  const now = Math.floor(Date.now() / 1000);
  const threshold = thresholdMinutes * 60;
  return (expiresAt - now) < threshold;
}

/**
 * Generates a secure random string for CSRF-like tokens
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// =============================================
// ERROR MESSAGE SANITIZATION
// =============================================

/**
 * Converts technical error messages to user-friendly ones
 * Prevents information disclosure
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    // Auth errors
    if (msg.includes('invalid login credentials')) {
      return 'Email ou senha incorretos';
    }
    if (msg.includes('email not confirmed')) {
      return 'Por favor, confirme seu email antes de fazer login';
    }
    if (msg.includes('user not found') || msg.includes('user already registered')) {
      return 'Verifique suas credenciais';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Muitas tentativas. Por favor, aguarde alguns minutos';
    }
    if (msg.includes('password')) {
      return 'Verifique sua senha';
    }
    
    // Network errors
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet';
    }
    
    // Generic database errors - don't expose details
    if (msg.includes('rls') || msg.includes('policy') || msg.includes('permission')) {
      return 'Você não tem permissão para esta ação';
    }
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return 'Este registro já existe';
    }
    if (msg.includes('foreign key') || msg.includes('reference')) {
      return 'Este item está vinculado a outros registros';
    }
  }
  
  // Default generic message - never expose technical details
  return 'Ocorreu um erro. Tente novamente';
}

// =============================================
// FORM VALIDATION HELPERS
// =============================================

export function validateLoginForm(email: string, password: string): { 
  valid: boolean; 
  errors: { email?: string; password?: string } 
} {
  const errors: { email?: string; password?: string } = {};
  
  const emailResult = emailSchema.safeParse(email);
  if (!emailResult.success) {
    errors.email = emailResult.error.issues[0]?.message;
  }
  
  if (!password || password.length < 1) {
    errors.password = 'Senha é obrigatória';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateSignUpForm(email: string, password: string, nome: string): {
  valid: boolean;
  errors: { email?: string; password?: string; nome?: string }
} {
  const errors: { email?: string; password?: string; nome?: string } = {};
  
  const emailResult = emailSchema.safeParse(email);
  if (!emailResult.success) {
    errors.email = emailResult.error.issues[0]?.message;
  }
  
  const passwordResult = passwordSchema.safeParse(password);
  if (!passwordResult.success) {
    errors.password = passwordResult.error.issues[0]?.message;
  }
  
  const nameResult = nameSchema.safeParse(nome);
  if (!nameResult.success) {
    errors.nome = nameResult.error.issues[0]?.message;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
