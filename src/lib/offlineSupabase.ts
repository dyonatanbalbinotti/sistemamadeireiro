// Wrapper para operações do Supabase com suporte offline
import { supabase } from '@/integrations/supabase/client';
import { offlineQueue } from './offlineQueue';
import { toast } from 'sonner';

interface InsertOperation {
  table: string;
  data: any;
}

interface UpdateOperation {
  table: string;
  data: any;
  id: string;
}

interface DeleteOperation {
  table: string;
  id: string;
}

export const offlineSupabase = {
  // Inserir com suporte offline
  insert: async ({ table, data }: InsertOperation) => {
    if (!navigator.onLine) {
      offlineQueue.add({
        type: 'insert',
        table,
        data,
      });
      toast.info('Operação salva para sincronização offline');
      return { data: { ...data, id: crypto.randomUUID() }, error: null };
    }

    try {
      const result = await (supabase as any).from(table).insert(data).select().single();
      return result;
    } catch (error) {
      // Se falhar, adicionar à fila
      offlineQueue.add({
        type: 'insert',
        table,
        data,
      });
      toast.info('Operação salva para sincronização');
      return { data: { ...data, id: crypto.randomUUID() }, error: null };
    }
  },

  // Atualizar com suporte offline
  update: async ({ table, data, id }: UpdateOperation) => {
    if (!navigator.onLine) {
      offlineQueue.add({
        type: 'update',
        table,
        data: { ...data, id },
      });
      toast.info('Operação salva para sincronização offline');
      return { error: null };
    }

    try {
      const result = await (supabase as any).from(table).update(data).eq('id', id);
      return result;
    } catch (error) {
      offlineQueue.add({
        type: 'update',
        table,
        data: { ...data, id },
      });
      toast.info('Operação salva para sincronização');
      return { error: null };
    }
  },

  // Deletar com suporte offline
  delete: async ({ table, id }: DeleteOperation) => {
    if (!navigator.onLine) {
      offlineQueue.add({
        type: 'delete',
        table,
        data: { id },
      });
      toast.info('Operação salva para sincronização offline');
      return { error: null };
    }

    try {
      const result = await (supabase as any).from(table).delete().eq('id', id);
      return result;
    } catch (error) {
      offlineQueue.add({
        type: 'delete',
        table,
        data: { id },
      });
      toast.info('Operação salva para sincronização');
      return { error: null };
    }
  },
};
