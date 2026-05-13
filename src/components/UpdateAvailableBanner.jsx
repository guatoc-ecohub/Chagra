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
    } catch {}
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-auto max-w-sm animate-in fade-in slide-in-from-top-5 duration-500">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-muzo-glow" />

        <div className="bg-muzo-glow/20 p-2 rounded-xl flex-shrink-0">
          <RefreshCw className="text-muzo-glow" size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Nueva version disponible</p>
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
