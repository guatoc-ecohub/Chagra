import React, { useCallback } from 'react';
import { RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';

const TYPE_LABELS = {
  plant: 'Plantas',
  structure: 'Estructuras',
  equipment: 'Equipos',
  material: 'Materiales',
  land: 'Zonas',
};

export default function SyncProgressIndicator() {
  const { syncProgress, isLoading } = useAssetStore();

  const shouldShow = isLoading && syncProgress && !syncProgress.isComplete && !syncProgress.isCancelled;

  const progress = syncProgress?.total
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0;

  const assetTypeLabel = syncProgress?.assetType
    ? TYPE_LABELS[syncProgress.assetType] || syncProgress.assetType
    : '';

  const handleDismiss = useCallback(() => {
    useAssetStore.setState({ syncProgress: null });
  }, []);

  if (!shouldShow && !syncProgress) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9100] animate-slide-up">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 min-w-[300px]">
        {syncProgress?.isComplete ? (
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle size={20} />
            <span className="text-sm font-medium">
              Sincronización completa
            </span>
            <button onClick={handleDismiss} className="ml-auto text-slate-400 hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
        ) : syncProgress?.isCancelled ? (
          <div className="flex items-center gap-3 text-amber-400">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">
              Sincronización pausada en {syncProgress.current} / {syncProgress.total}
            </span>
            <button onClick={handleDismiss} className="ml-auto text-slate-400 hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
        ) : syncProgress?.error ? (
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">
              Error: {syncProgress.error}
            </span>
            <button onClick={handleDismiss} className="ml-auto text-slate-400 hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-200">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm font-medium">
                  Sincronizando {assetTypeLabel}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 text-right">
              {syncProgress?.current || 0} / {syncProgress?.total || '...'} ({progress}%)
            </div>
          </>
        )}
      </div>
    </div>
  );
}