import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdateAvailableBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('chagra:update-available', handler);
    return () => window.removeEventListener('chagra:update-available', handler);
  }, []);

  const handleUpdate = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (_) { /* SW not ready — recargar igual abajo */ }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  // Posición: centrado abajo para no chocar con headers sticky (TaskLogScreen
  // tiene botón "+" en top-right, mismo aria-label arrancando E2E task-log
  // intercepta clicks cuando banner usa fixed top-4 right-4). bottom-4 con
  // safe-area + centrado horizontal evita interferencia con header buttons
  // y con el toast app general (bottom-8 left-1/2). pointer-events-none en
  // el wrapper permite click-through en el área transparente; sólo la card
  // (auto) recibe eventos del botón.
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-sm pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-500 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-muzo-glow" />

        <div className="bg-muzo-glow/20 p-2 rounded-xl flex-shrink-0">
          <RefreshCw className="text-muzo-glow" size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Nueva versión disponible</p>
        </div>

        <button
          onClick={handleUpdate}
          className="px-3 py-1.5 bg-muzo-glow/20 hover:bg-muzo-glow/30 text-muzo-glow text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
          type="button"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
