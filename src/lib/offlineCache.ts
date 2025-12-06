// Sistema de cache local para dados offline
const CACHE_PREFIX = 'offline_data_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export const offlineCache = {
  // Salvar dados no cache
  set: <T>(key: string, data: T, expiryMs: number = CACHE_EXPIRY): void => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiryMs,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  },

  // Obter dados do cache
  get: <T>(key: string): T | null => {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(raw);
      
      // Verificar se expirou
      if (Date.now() > entry.expiry) {
        offlineCache.remove(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  // Remover do cache
  remove: (key: string): void => {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  // Limpar todo o cache
  clear: (): void => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  },

  // Verificar se existe no cache
  has: (key: string): boolean => {
    return offlineCache.get(key) !== null;
  },

  // Obter idade do cache em segundos
  getAge: (key: string): number | null => {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    try {
      const entry: CacheEntry<unknown> = JSON.parse(raw);
      return Math.floor((Date.now() - entry.timestamp) / 1000);
    } catch {
      return null;
    }
  },

  // Atualizar dados locais (merge com cache existente)
  merge: <T extends { id: string }>(key: string, newItem: T): void => {
    const existing = offlineCache.get<T[]>(key) || [];
    const index = existing.findIndex(item => item.id === newItem.id);
    
    if (index >= 0) {
      existing[index] = newItem;
    } else {
      existing.push(newItem);
    }
    
    offlineCache.set(key, existing);
  },

  // Remover item específico do cache de array
  removeItem: <T extends { id: string }>(key: string, itemId: string): void => {
    const existing = offlineCache.get<T[]>(key) || [];
    const filtered = existing.filter(item => item.id !== itemId);
    offlineCache.set(key, filtered);
  },
};

// Hook helper para buscar dados com fallback offline
export const fetchWithOfflineSupport = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: { forceRefresh?: boolean; expiryMs?: number } = {}
): Promise<{ data: T | null; isOffline: boolean; fromCache: boolean }> => {
  const { forceRefresh = false, expiryMs = CACHE_EXPIRY } = options;

  // Se online e não forçar cache, tentar buscar
  if (navigator.onLine && !forceRefresh) {
    try {
      const data = await fetchFn();
      offlineCache.set(cacheKey, data, expiryMs);
      return { data, isOffline: false, fromCache: false };
    } catch (error) {
      console.warn('Erro ao buscar dados, usando cache:', error);
    }
  }

  // Fallback para cache
  const cachedData = offlineCache.get<T>(cacheKey);
  if (cachedData !== null) {
    return { data: cachedData, isOffline: !navigator.onLine, fromCache: true };
  }

  // Se online mas sem cache, tentar buscar novamente
  if (navigator.onLine) {
    try {
      const data = await fetchFn();
      offlineCache.set(cacheKey, data, expiryMs);
      return { data, isOffline: false, fromCache: false };
    } catch {
      return { data: null, isOffline: false, fromCache: false };
    }
  }

  return { data: null, isOffline: true, fromCache: false };
};
