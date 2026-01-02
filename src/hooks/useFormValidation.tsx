/**
 * Form validation hook with security features
 * Implements input sanitization and validation
 */
import { useState, useCallback } from 'react';
import { z } from 'zod';
import { sanitizeHtml, sanitizeSqlInput } from '@/lib/security';

// Common validation schemas
export const schemas = {
  // Text fields
  requiredText: z.string().trim().min(1, 'Campo obrigatório'),
  optionalText: z.string().trim().optional().or(z.literal('')),
  
  // Numbers
  positiveNumber: z.number().positive('Deve ser maior que zero'),
  nonNegativeNumber: z.number().min(0, 'Não pode ser negativo'),
  
  // Specific fields
  numeroPedido: z.string().trim()
    .min(1, 'Número do pedido é obrigatório')
    .max(50, 'Número muito longo')
    .regex(/^[a-zA-Z0-9\-_/]+$/, 'Apenas letras, números, hífen e barra'),
  
  observacao: z.string().trim().max(500, 'Observação muito longa').optional().or(z.literal('')),
  
  quantidade: z.number()
    .positive('Quantidade deve ser maior que zero')
    .max(999999, 'Quantidade muito alta'),
  
  valor: z.number()
    .min(0, 'Valor não pode ser negativo')
    .max(99999999, 'Valor muito alto'),
  
  peso: z.number()
    .positive('Peso deve ser maior que zero')
    .max(9999999, 'Peso muito alto'),
  
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  
  uuid: z.string().uuid('ID inválido'),
};

interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: Record<string, string>;
}

export function useFormValidation<T extends z.ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback((data: unknown): ValidationResult<z.infer<T>> => {
    setIsValidating(true);
    setErrors({});

    const result = schema.safeParse(data);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setIsValidating(false);
      return { valid: false, errors: fieldErrors };
    }

    setIsValidating(false);
    return { valid: true, data: result.data, errors: {} };
  }, [schema]);

  const validateField = useCallback((fieldName: string, value: unknown): string | null => {
    // Create a partial schema for just this field
    const partialData = { [fieldName]: value };
    const result = schema.safeParse(partialData);

    if (!result.success) {
      const fieldError = result.error.issues.find(
        (issue) => issue.path.join('.') === fieldName
      );
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [fieldName]: fieldError.message }));
        return fieldError.message;
      }
    }

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    return null;
  }, [schema]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    errors,
    isValidating,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
  };
}

// Sanitization helpers for form inputs
export function sanitizeFormInput(value: string): string {
  return sanitizeHtml(sanitizeSqlInput(value));
}

export function sanitizeNumericInput(value: string): string {
  // Only allow digits, decimal point, and minus sign
  return value.replace(/[^\d.-]/g, '');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseCurrency(value: string): number {
  // Remove currency formatting and convert to number
  const cleaned = value
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// Schema builders for common form patterns
export function createPedidoSchema() {
  return z.object({
    numero_pedido: schemas.numeroPedido,
    data_pedido: schemas.data,
    observacao: schemas.observacao,
    itens: z.array(
      z.object({
        produto_id: schemas.uuid,
        quantidade_pecas: z.string().min(1, 'Quantidade é obrigatória'),
        quantidade_m3: z.string().min(1, 'M³ é obrigatório'),
      })
    ).min(1, 'Adicione pelo menos um item'),
  });
}

export function createVendaSchema() {
  return z.object({
    data: schemas.data,
    produto_id: schemas.uuid,
    quantidade: schemas.quantidade,
    valor_unitario: schemas.valor,
    tipo: z.enum(['unidade', 'm3'], { message: 'Tipo inválido' }),
    unidade_medida: z.string().min(1, 'Unidade é obrigatória'),
  });
}

export function createToraSchema() {
  return z.object({
    data: schemas.data,
    descricao: z.string().trim().min(1, 'Descrição é obrigatória').max(200),
    peso: schemas.peso,
    valor_por_tonelada: schemas.valor.optional(),
    numero_lote: z.string().trim().max(50).optional().or(z.literal('')),
    quantidade_toras: z.number().int().positive().optional(),
  });
}

export function createProducaoSchema() {
  return z.object({
    data: schemas.data,
    produto_id: schemas.uuid,
    quantidade: schemas.quantidade,
    tora_id: schemas.uuid.optional().or(z.literal('')),
  });
}
