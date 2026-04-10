import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { syncManager } from '../services/syncManager';

const STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
};

export default function NetworkStatusBar() {
  const [status, setStatus] = useState(navigator.onLine ? STATUS.ONLINE : STATUS.OFFLINE);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [visible, setVisible] = useState(!navigator.onLine);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await syncManager.getSyncStats();
      setPendingCount(stats.pendingCount);

      if (stats.isSyncing) {
        setStatus(STATUS.SYNCING);
        setVisible(true);
      } else if (!stats.isOnline) {
        setStatus(STATUS.OFFLINE);
        setVisible(true);
      } else if (stats.pendingCount === 0 && status === STATUS.SYNCING) {
        // Transición de syncing a synced
        setSyncedCount(syncedCount || 1);
        setStatus(STATUS.SYNCED);
        setVisible(true);
        setTimeout(() => setVisible(false), 3000);
      }
    } catch (err) {
      // DB no inicializada aún, ignorar
    }
  }, [status, syncedCount]);

  useEffect(() => {
    // Polling ligero del estado de sincronización
    const interval = setInterval(refreshStats, 1500);
    refreshStats();
    return () => clearInterval(interval);
  }, [refreshStats]);

  useEffect(() => {
    const handleOnline = async () => {
      setStatus(STATUS.SYNCING);
      setVisible(true);
      setErrorMessage('');

      // Contar pendientes antes de sync para reportar cuántos se sincronizaron
      try {
        const stats = await syncManager.getSyncStats();
        const countBefore = stats.pendingCount;
        setSyncedCount(countBefore);
      } catch (e) { /* noop */ }
    };

    const handleOffline = () => {
      setStatus(STATUS.OFFLINE);
      setVisible(true);
      setErrorMessage('');
    };

    const handleSyncError = (e) => {
      setStatus(STATUS.ERROR);
      setErrorMessage(e.detail?.message || 'Error sincronizando con FarmOS');
      setVisible(true);
      // Auto-ocultar error tras 8 segundos
      setTimeout(() => {
        if (navigator.onLine) {
          setStatus(STATUS.ONLINE);
          setVisible(false);
        } else {
          setStatus(STATUS.OFFLINE);
        }
      }, 8000);
    };

    const handleSyncComplete = () => {
      setStatus(STATUS.SYNCED);
      setVisible(true);
      setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('syncError', handleSyncError);
    window.addEventListener('syncComplete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncError', handleSyncError);
      window.removeEventListener('syncComplete', handleSyncComplete);
    };
  }, []);

  if (!visible) return null;

  const configs = {
    [STATUS.OFFLINE]: {
      bg: 'bg-amber-900/90',
      border: 'border-amber-700',
      icon: <WifiOff size={16} className="shrink-0" />,
      text: `Sin conexion. ${pendingCount > 0 ? `${pendingCount} registro${pendingCount > 1 ? 's' : ''} guardado${pendingCount > 1 ? 's' : ''} localmente.` : 'Datos guardados localmente.'}`,
    },
    [STATUS.SYNCING]: {
      bg: 'bg-blue-900/90',
      border: 'border-blue-700',
      icon: <RefreshCw size={16} className="animate-spin shrink-0" />,
      text: `Sincronizando ${pendingCount} registro${pendingCount !== 1 ? 's' : ''}...`,
    },
    [STATUS.SYNCED]: {
      bg: 'bg-green-900/90',
      border: 'border-green-700',
      icon: <CheckCircle size={16} className="shrink-0" />,
      text: `${syncedCount > 0 ? syncedCount : ''} registro${syncedCount !== 1 ? 's' : ''} sincronizado${syncedCount !== 1 ? 's' : ''}.`,
    },
    [STATUS.ERROR]: {
      bg: 'bg-red-900/90',
      border: 'border-red-700',
      icon: <AlertTriangle size={16} className="shrink-0" />,
      text: errorMessage || 'Error al sincronizar.',
    },
    [STATUS.ONLINE]: {
      bg: 'bg-green-900/90',
      border: 'border-green-700',
      icon: <Wifi size={16} className="shrink-0" />,
      text: 'Conectado.',
    },
  };

  const config = configs[status] || configs[STATUS.ONLINE];

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] ${config.bg} ${config.border} border-b px-4 py-2 flex items-center gap-2 text-white text-sm font-medium backdrop-blur-md transition-all`}>
      {config.icon}
      <span className="flex-1 truncate">{config.text}</span>
      {status === STATUS.OFFLINE && (
        <span className="text-xs text-amber-300/70 shrink-0">Offline-First activo</span>
      )}
    </div>
  );
}
