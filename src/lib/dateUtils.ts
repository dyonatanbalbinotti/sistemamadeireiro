/**
 * Utilitários para manipulação de datas com fuso horário brasileiro
 * Todas as datas são armazenadas em UTC no banco e convertidas para America/Sao_Paulo na exibição
 * Fuso horário: GMT-3 (Brasília)
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIMEZONE_BR = 'America/Sao_Paulo';
const LOCALE_BR = 'pt-BR';

/**
 * Converte uma data UTC para o horário brasileiro e formata
 * @param date - Data em UTC (string ISO ou Date)
 * @param includeTime - Se deve incluir hora na formatação
 * @returns String formatada no padrão brasileiro
 */
export function formatDateBR(date: string | Date | null | undefined, includeTime: boolean = false): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const formatPattern = includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
    
    return formatInTimeZone(dateObj, TIMEZONE_BR, formatPattern, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
}

/**
 * Converte data do input HTML para UTC mantendo a data local
 * @param dateStr - String no formato YYYY-MM-DD do input
 * @returns Data em UTC preservando a data local brasileira
 */
export function parseInputDateToUTC(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Input já está no formato YYYY-MM-DD, apenas retornar
  return dateStr;
}

/**
 * Converte data UTC para o formato do input (YYYY-MM-DD) considerando fuso brasileiro
 * @param date - Data em UTC
 * @returns String no formato YYYY-MM-DD
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, TIMEZONE_BR, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Erro ao formatar data para input:', error);
    return '';
  }
}

/**
 * Obtém a data atual no fuso brasileiro no formato YYYY-MM-DD
 * @returns String no formato YYYY-MM-DD
 */
export function getTodayBR(): string {
  return formatInTimeZone(new Date(), TIMEZONE_BR, 'yyyy-MM-dd');
}

/**
 * Formata timestamp para exibição com hora
 * @param timestamp - Timestamp em UTC
 * @returns String formatada dd/MM/yyyy HH:mm
 */
export function formatTimestampBR(timestamp: string | Date | null | undefined): string {
  return formatDateBR(timestamp, true);
}

/**
 * Calcula diferença em dias entre duas datas considerando fuso brasileiro
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns Número de dias de diferença
 */
export function getDaysDifference(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  // Converter para o fuso de Brasília antes de calcular
  const d1BR = toZonedTime(d1, TIMEZONE_BR);
  const d2BR = toZonedTime(d2, TIMEZONE_BR);
  
  const diffTime = Math.abs(d2BR.getTime() - d1BR.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Converte data do input para UTC mantendo a data/hora no fuso de Brasília
 * @param dateStr - String no formato YYYY-MM-DD
 * @returns Data ISO em UTC
 */
export function inputDateToUTC(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  // Cria data no fuso de Brasília e converte para UTC
  const date = new Date(dateStr + 'T00:00:00');
  const utcDate = fromZonedTime(date, TIMEZONE_BR);
  
  return utcDate.toISOString();
}

/**
 * Obtém a data/hora atual no fuso de Brasília
 * @returns Date object no fuso de Brasília
 */
export function getNowBR(): Date {
  return toZonedTime(new Date(), TIMEZONE_BR);
}

/**
 * Formata uma data considerando o fuso de Brasília
 * @param date - Data a ser formatada
 * @param formatStr - Padrão de formatação (date-fns)
 * @returns String formatada
 */
export function formatInBrazilTimezone(date: string | Date, formatStr: string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, TIMEZONE_BR, formatStr, { locale: ptBR });
}
