// Sistema de fila para operações offline
export interface QueuedOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline_sync_queue';
const MAX_RETRIES = 3;

export const offlineQueue = {
  // Adicionar operação à fila
  add: (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>) => {
    const queue = offlineQueue.getAll();
    const newOperation: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(newOperation);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newOperation;
  },

  // Obter todas operações pendentes
  getAll: (): QueuedOperation[] => {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Remover operação da fila
  remove: (id: string) => {
    const queue = offlineQueue.getAll().filter(op => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  // Incrementar contador de tentativas
  incrementRetry: (id: string) => {
    const queue = offlineQueue.getAll();
    const operation = queue.find(op => op.id === id);
    if (operation) {
      operation.retries += 1;
      if (operation.retries >= MAX_RETRIES) {
        offlineQueue.remove(id);
        return false;
      }
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      return true;
    }
    return false;
  },

  // Limpar fila
  clear: () => {
    localStorage.removeItem(QUEUE_KEY);
  },

  // Obter contagem de operações pendentes
  count: (): number => {
    return offlineQueue.getAll().length;
  },
};
