import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineCache } from '@/lib/offlineCache';
import { offlineQueue } from '@/lib/offlineQueue';
import { toast } from 'sonner';

interface UseOfflineDataOptions<T> {
  cacheKey: string;
  tableName: string;
  selectQuery?: string;
  filterColumn?: string;
  filterValue?: string;
  orderBy?: { column: string; ascending?: boolean };
  enabled?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T[];
  isLoading: boolean;
  isOffline: boolean;
  fromCache: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addItem: (item: Omit<T, 'id'>) => Promise<T | null>;
  updateItem: (id: string, updates: Partial<T>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
}

export function useOfflineData<T extends { id: string }>({
  cacheKey,
  tableName,
  selectQuery = '*',
  filterColumn,
  filterValue,
  orderBy,
  enabled = true,
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);

    // Verificar status online
    const online = navigator.onLine;
    setIsOffline(!online);

    if (online) {
      try {
        let query = (supabase as any).from(tableName).select(selectQuery);
        
        if (filterColumn && filterValue) {
          query = query.eq(filterColumn, filterValue);
        }
        
        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }

        const { data: freshData, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Salvar no cache
        offlineCache.set(cacheKey, freshData);
        setData(freshData || []);
        setFromCache(false);
      } catch (err) {
        console.warn('Erro ao buscar dados, usando cache:', err);
        // Tentar usar cache em caso de erro
        const cachedData = offlineCache.get<T[]>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setFromCache(true);
        } else {
          setError(err as Error);
        }
      }
    } else {
      // Modo offline - usar cache
      const cachedData = offlineCache.get<T[]>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setFromCache(true);
      } else {
        setData([]);
        toast.warning('Sem dados em cache para modo offline');
      }
    }

    setIsLoading(false);
  }, [cacheKey, tableName, selectQuery, filterColumn, filterValue, orderBy, enabled]);

  // Adicionar item (com suporte offline)
  const addItem = useCallback(async (item: Omit<T, 'id'>): Promise<T | null> => {
    const tempId = crypto.randomUUID();
    const newItem = { ...item, id: tempId } as T;

    if (!navigator.onLine) {
      // Modo offline - salvar localmente
      offlineQueue.add({
        type: 'insert',
        table: tableName,
        data: item,
      });
      
      // Atualizar cache local
      offlineCache.merge(cacheKey, newItem);
      setData(prev => [...prev, newItem]);
      
      toast.info('Dados salvos localmente. Serão sincronizados quando online.');
      return newItem;
    }

    try {
      const { data: insertedData, error: insertError } = await (supabase as any)
        .from(tableName)
        .insert(item)
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar cache e estado
      offlineCache.merge(cacheKey, insertedData);
      setData(prev => [...prev, insertedData]);
      
      return insertedData;
    } catch (err) {
      // Fallback para modo offline
      offlineQueue.add({
        type: 'insert',
        table: tableName,
        data: item,
      });
      
      offlineCache.merge(cacheKey, newItem);
      setData(prev => [...prev, newItem]);
      
      toast.info('Erro de conexão. Dados salvos localmente.');
      return newItem;
    }
  }, [cacheKey, tableName]);

  // Atualizar item (com suporte offline)
  const updateItem = useCallback(async (id: string, updates: Partial<T>): Promise<boolean> => {
    if (!navigator.onLine) {
      offlineQueue.add({
        type: 'update',
        table: tableName,
        data: { ...updates, id },
      });
      
      // Atualizar localmente
      setData(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      const cachedData = offlineCache.get<T[]>(cacheKey) || [];
      const updatedCache = cachedData.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );
      offlineCache.set(cacheKey, updatedCache);
      
      toast.info('Atualização salva localmente.');
      return true;
    }

    try {
      const { error: updateError } = await (supabase as any)
        .from(tableName)
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Atualizar estado e cache
      setData(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      const cachedData = offlineCache.get<T[]>(cacheKey) || [];
      const updatedCache = cachedData.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );
      offlineCache.set(cacheKey, updatedCache);
      
      return true;
    } catch (err) {
      offlineQueue.add({
        type: 'update',
        table: tableName,
        data: { ...updates, id },
      });
      
      setData(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      toast.info('Erro de conexão. Atualização salva localmente.');
      return true;
    }
  }, [cacheKey, tableName]);

  // Deletar item (com suporte offline)
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    if (!navigator.onLine) {
      offlineQueue.add({
        type: 'delete',
        table: tableName,
        data: { id },
      });
      
      setData(prev => prev.filter(item => item.id !== id));
      offlineCache.removeItem(cacheKey, id);
      
      toast.info('Exclusão salva localmente.');
      return true;
    }

    try {
      const { error: deleteError } = await (supabase as any)
        .from(tableName)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setData(prev => prev.filter(item => item.id !== id));
      offlineCache.removeItem(cacheKey, id);
      
      return true;
    } catch (err) {
      offlineQueue.add({
        type: 'delete',
        table: tableName,
        data: { id },
      });
      
      setData(prev => prev.filter(item => item.id !== id));
      offlineCache.removeItem(cacheKey, id);
      
      toast.info('Erro de conexão. Exclusão salva localmente.');
      return true;
    }
  }, [cacheKey, tableName]);

  // Monitorar mudanças de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData]);

  // Carregar dados iniciais
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isOffline,
    fromCache,
    error,
    refetch: fetchData,
    addItem,
    updateItem,
    deleteItem,
  };
}
