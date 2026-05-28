import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';

// Auto-dismiss: cuando sync completa o cancela/error, el toast se va
// solo en 2.5s con fade-out 400ms. Operator 2026-05-28: "el mensaje de
// sincronización completa debe desaparecer con una transición suave en
// menos de 3 segundos".
const AUTO_DISMISS_MS = 2500;
const FADE_OUT_MS = 400;

const TYPE_LABELS = {
  plant: 'Plantas',
  structure: 'Estructuras',
  equipment: 'Equipos',
  material: 'Materiales',
  land: 'Zonas',
};

export default function SyncProgressIndicator() {
  const { syncProgress, isLoading } = useAssetStore();
  const [fadingOut, setFadingOut] = useState(false);

  const shouldShow = isLoading && syncProgress && !syncProgress.isComplete && !syncProgress.isCancelled;

  const progress = syncProgress?.total
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0;

  const assetTypeLabel = syncProgress?.assetType
    ? TYPE_LABELS[syncProgress.assetType] || syncProgress.assetType
    : '';

  const handleDismiss = useCallback(() => {
    setFadingOut(true);
    // Esperar transición CSS antes de remover del store
    setTimeout(() => {
      useAssetStore.setState({ syncProgress: null });
      setFadingOut(false);
    }, FADE_OUT_MS);
  }, []);

  // Auto-dismiss para estados terminales (complete/cancelled/error).
  useEffect(() => {
    const isTerminal = syncProgress?.isComplete || syncProgress?.isCancelled || syncProgress?.error;
    if (!isTerminal || fadingOut) return;
    const t = setTimeout(handleDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [syncProgress?.isComplete, syncProgress?.isCancelled, syncProgress?.error, fadingOut, handleDismiss]);

  if (!shouldShow && !syncProgress) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9100] animate-slide-up pointer-events-none ease-out"
      style={{
        transition: `opacity ${FADE_OUT_MS}ms ease-out, transform ${FADE_OUT_MS}ms ease-out`,
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? 'translateY(8px)' : 'translateY(0)',
      }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 min-w-[300px] pointer-events-auto">
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