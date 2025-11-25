import { WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-card border shadow-lg rounded-lg p-4 flex items-center gap-3">
        {!isOnline ? (
          <>
            <WifiOff className="h-5 w-5 text-destructive" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Modo Offline</span>
              {pendingCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {pendingCount} operação(ões) pendente(s)
                </span>
              )}
            </div>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Sincronizando...</span>
              <span className="text-xs text-muted-foreground">
                {pendingCount} operação(ões)
              </span>
            </div>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Cloud className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Dados pendentes</span>
              <span className="text-xs text-muted-foreground">
                {pendingCount} operação(ões)
              </span>
            </div>
            <Button size="sm" onClick={syncNow} variant="outline">
              Sincronizar
            </Button>
          </>
        ) : null}
        
        {pendingCount > 0 && (
          <Badge variant="secondary">{pendingCount}</Badge>
        )}
      </div>
    </div>
  );
};
