import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineQueue, QueuedOperation } from '@/lib/offlineQueue';
import { useToast } from '@/hooks/use-toast';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(offlineQueue.count());
  const { toast } = useToast();

  // Sincronizar operações pendentes
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const operations = offlineQueue.getAll();
    if (operations.length === 0) return;

    setIsSyncing(true);
    toast({
      title: 'Sincronizando dados',
      description: `${operations.length} operação(ões) pendente(s)`,
    });

    let successCount = 0;
    let failCount = 0;

    for (const operation of operations) {
      try {
        await executeOperation(operation);
        offlineQueue.remove(operation.id);
        successCount++;
      } catch (error) {
        console.error('Erro ao sincronizar operação:', error);
        const shouldRetry = offlineQueue.incrementRetry(operation.id);
        if (!shouldRetry) {
          failCount++;
        }
      }
    }

    setPendingCount(offlineQueue.count());
    setIsSyncing(false);

    if (successCount > 0) {
      toast({
        title: 'Sincronização concluída',
        description: `${successCount} operação(ões) sincronizada(s)${failCount > 0 ? `, ${failCount} falhou(aram)` : ''}`,
      });
    }
  }, [isSyncing, toast]);

  // Executar operação no Supabase
  const executeOperation = async (operation: QueuedOperation) => {
    const { type, table, data } = operation;

    switch (type) {
      case 'insert':
        const { error: insertError } = await (supabase as any).from(table).insert(data);
        if (insertError) throw insertError;
        break;
      
      case 'update':
        const { id, ...updateData } = data;
        const { error: updateError } = await (supabase as any)
          .from(table)
          .update(updateData)
          .eq('id', id);
        if (updateError) throw updateError;
        break;
      
      case 'delete':
        const { error: deleteError } = await (supabase as any)
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  };

  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Conexão restaurada',
        description: 'Sincronizando dados pendentes...',
      });
      setTimeout(syncPendingOperations, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Modo offline',
        description: 'Suas alterações serão sincronizadas quando voltar online',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sincronizar ao carregar se houver operações pendentes
    if (isOnline && offlineQueue.count() > 0) {
      syncPendingOperations();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingOperations, toast]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncNow: syncPendingOperations,
  };
};
