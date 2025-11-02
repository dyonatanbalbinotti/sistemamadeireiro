/**
 * Utilitários para manipulação de datas com fuso horário brasileiro
 * Todas as datas são armazenadas em UTC no banco e convertidas para America/Sao_Paulo na exibição
 */

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
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (includeTime) {
      return dateObj.toLocaleString(LOCALE_BR, {
        timeZone: TIMEZONE_BR,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return dateObj.toLocaleDateString(LOCALE_BR, {
      timeZone: TIMEZONE_BR,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Obter a data no fuso brasileiro
    const brDate = new Date(dateObj.toLocaleString('en-US', { timeZone: TIMEZONE_BR }));
    
    const year = brDate.getFullYear();
    const month = String(brDate.getMonth() + 1).padStart(2, '0');
    const day = String(brDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
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
  const now = new Date();
  const brDate = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE_BR }));
  
  const year = brDate.getFullYear();
  const month = String(brDate.getMonth() + 1).padStart(2, '0');
  const day = String(brDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
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
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}
