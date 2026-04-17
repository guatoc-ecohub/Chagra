import { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { syncManager } from '../services/syncManager';

interface SyncStats {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}

export default function SyncIndicator() {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingCount: 0,
    isOnline: true,
    isSyncing: false,
  });

  useEffect(() => {
    const updateStats = () => {
      syncManager.getSyncStats().then(setSyncStats).catch(() => {});
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const { pendingCount, isOnline, isSyncing } = syncStats;

  return (
    <div className="flex items-center gap-2 text-xs">
      {isOnline ? (
        <div className="flex items-center gap-1 text-green-400">
          <Wifi size={14} />
          <span>Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-400">
          <WifiOff size={14} />
          <span>Offline</span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-1 text-amber-400">
          {isSyncing ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <span>{pendingCount} pendientes</span>
          )}
        </div>
      )}

      {pendingCount === 0 && isOnline && (
        <div className="flex items-center gap-1 text-green-400">
          <CheckCircle size={14} />
          <span>Sync</span>
        </div>
      )}
    </div>
  );
}
