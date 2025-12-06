import { WifiOff, RefreshCw, Cloud, CheckCircle2, Database } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();

  return (
    <AnimatePresence>
      {/* Indicador de modo offline */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 z-50"
        >
          <div className="bg-destructive/90 text-destructive-foreground shadow-lg rounded-lg p-4 flex items-center gap-3 backdrop-blur-sm">
            <WifiOff className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Modo Offline</span>
              <span className="text-xs opacity-80">
                Seus dados estão sendo salvos localmente
              </span>
            </div>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="bg-white/20">
                {pendingCount}
              </Badge>
            )}
          </div>
        </motion.div>
      )}

      {/* Indicador de sincronização em andamento */}
      {isOnline && isSyncing && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 z-50"
        >
          <div className="bg-primary/90 text-primary-foreground shadow-lg rounded-lg p-4 flex items-center gap-3 backdrop-blur-sm">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Sincronizando...</span>
              <span className="text-xs opacity-80">
                {pendingCount} operação(ões) pendente(s)
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Indicador de dados pendentes (quando online mas tem dados para sincronizar) */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 z-50"
        >
          <div className="bg-card border shadow-lg rounded-lg p-4 flex items-center gap-3">
            <Database className="h-5 w-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Dados pendentes</span>
              <span className="text-xs text-muted-foreground">
                {pendingCount} operação(ões) para sincronizar
              </span>
            </div>
            <Button size="sm" onClick={syncNow} variant="outline">
              <RefreshCw className="h-4 w-4 mr-1" />
              Sincronizar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Indicador de cache ativo (sutil, no canto) */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-20 right-4 z-50"
        >
          <div className="bg-amber-500/90 text-white shadow-lg rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium backdrop-blur-sm">
            <Database className="h-3 w-3" />
            Cache Ativo
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
