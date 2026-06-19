import React, { useState, useEffect, useCallback } from 'react';
import { MSG } from '../config/messages.js';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { syncManager } from '../services/syncManager';

// Helpers de dismiss persistente por sesión — top-level para que sean
// estables y no requieran dependencias en useCallback.
const dismissKey = (st, count) => `chagra:netStatus:dismissed:${st}:${count}`;
const isDismissedInSession = (st, count) => {
  try { return sessionStorage.getItem(dismissKey(st, count)) === '1'; }
  catch (_) { return false; }
};
const markDismissedInSession = (st, count) => {
  try { sessionStorage.setItem(dismissKey(st, count), '1'); } catch (_) { /* noop */ }
};

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
      setPendingCount((prev) => prev !== stats.pendingCount ? stats.pendingCount : prev);

      if (stats.isSyncing) {
        setStatus(STATUS.SYNCING);
        // Bug 2026-05-18 operator: NO mostrar el bar de "Sincronizando X registros..."
        // como overlay visible — es ruido visual. El indicador rotatorio del TopBar
        // ya muestra el sync en curso. Si el operador quiere ver detalle, toca el
        // SyncProgressIndicator (z-9100 bottom-right). El bar SYNCING queda
        // disponible vía dispatch event syncStarted pero no auto-visible.
        setVisible(false);
      } else if (!stats.isOnline) {
        setStatus(STATUS.OFFLINE);
        if (!isDismissedInSession(STATUS.OFFLINE, stats.pendingCount)) setVisible(true);
      } else if (stats.pendingCount === 0 && status === STATUS.SYNCING) {
        // Transición de syncing a synced
        setSyncedCount((prev) => prev || 1);
        setStatus(STATUS.SYNCED);
        setVisible(true);
        setTimeout(() => setVisible(false), 4000);
      }
    } catch (_err) {
      // DB no inicializada aún, ignorar
    }
  }, [status]);

  useEffect(() => {
    // Polling ligero del estado de sincronización. La llamada inmediata es
    // intencional: sin ella el estado visible queda 1.5s desfasado al montar.
    // El polling NO causa cascading renders porque cada setState dentro de
    // refreshStats está guardado por comparación previa.
    const interval = setInterval(refreshStats, 1500);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      } catch (_e) { /* noop */ }
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

  const isClickable = pendingCount > 0 || status === STATUS.OFFLINE || status === STATUS.SYNCING || status === STATUS.ERROR;
  const goToBitacora = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'historial' } }));
    }
  };
  const dismiss = (e) => {
    e.stopPropagation();
    markDismissedInSession(status, pendingCount);
    setVisible(false);
  };

  const configs = {
    [STATUS.OFFLINE]: {
      bg: 'bg-frog/10',
      border: 'border-frog/50',
      icon: <WifiOff size={16} className="shrink-0 text-frog" />,
      text: `Sin conexion. ${pendingCount > 0 ? `${pendingCount} registro${pendingCount > 1 ? 's' : ''} guardado${pendingCount > 1 ? 's' : ''} localmente.` : 'Datos guardados localmente.'}`,
    },
    [STATUS.SYNCING]: {
      bg: 'bg-morpho/10',
      border: 'border-morpho/50',
      icon: <RefreshCw size={16} className="animate-spin shrink-0 text-morpho" />,
      text: MSG.format(MSG.ui.sincronizandoRegistros, { count: pendingCount }),
    },
    [STATUS.SYNCED]: {
      bg: 'bg-muzo/10',
      border: 'border-muzo/50',
      icon: <CheckCircle size={16} className="shrink-0 text-muzo" />,
      text: `${syncedCount > 0 ? syncedCount : ''} registro${syncedCount !== 1 ? 's' : ''} sincronizado${syncedCount !== 1 ? 's' : ''}.`,
    },
    [STATUS.ERROR]: {
      bg: 'bg-red-900/90',
      border: 'border-red-700',
      icon: <AlertTriangle size={16} className="shrink-0" />,
      text: errorMessage || 'Error al sincronizar.',
    },
    [STATUS.ONLINE]: {
      bg: 'bg-muzo/10',
      border: 'border-muzo/50',
      icon: <Wifi size={16} className="shrink-0 text-muzo" />,
      text: 'Conectado.',
    },
  };

  const config = configs[status] || configs[STATUS.ONLINE];

  return (
    <div
      role={isClickable ? 'button' : 'status'}
      tabIndex={isClickable ? 0 : -1}
      aria-live="polite"
      onClick={isClickable ? goToBitacora : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToBitacora(); } } : undefined}
      className={`shrink-0 w-full ${config.bg} ${config.border} border-b px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center gap-2 text-white text-sm font-medium backdrop-blur-md transition-all ${isClickable ? 'cursor-pointer hover:brightness-110 active:brightness-95' : ''}`}
    >
      {config.icon}
      <span className="flex-1 truncate">{config.text}</span>
      {status === STATUS.OFFLINE && (
        <span className="text-xs text-amber-300/70 shrink-0">Offline-First activo</span>
      )}
      {isClickable && (
        <span className="text-[10px] text-white/60 shrink-0 hidden sm:inline">Toque para detalle</span>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar barra de sincronización"
        className="shrink-0 p-1 -mr-1 rounded hover:bg-white/10 active:bg-white/20 min-h-[32px] min-w-[32px] flex items-center justify-center"
      >
        <X size={14} className="text-white/70" />
      </button>
    </div>
  );
}
