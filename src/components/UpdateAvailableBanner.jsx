import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { writeAckedVersion } from '../services/swUpdateAck';
import { reloadPage } from '../services/pageReload';

export default function UpdateAvailableBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // Capturamos la version reportada por el SW (via event.detail) para
  // persistir el ack en click "Actualizar". Fix Antigravity QA #18.
  const announcedVersionRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      const version = event?.detail?.version ?? null;
      if (version) announcedVersionRef.current = version;
      setUpdateAvailable(true);
    };
    window.addEventListener('chagra:update-available', handler);
    return () => window.removeEventListener('chagra:update-available', handler);
  }, []);

  // Pulso sutil del badge (sparkle) — solo durante los primeros 8s.
  // Después se queda quieto para no ser ansioso. Quick-win UX 2026-05-28.
  const [pulsing, setPulsing] = useState(true);
  useEffect(() => {
    if (!updateAvailable) return undefined;
    const t = setTimeout(() => setPulsing(false), 8000);
    return () => clearTimeout(t);
  }, [updateAvailable]);

  const handleUpdate = async () => {
    // Persistimos el ack ANTES de activar: si la recarga falla o el usuario
    // cierra la pestaña, no queremos repetir el toast en la proxima sesion
    // para una version que ya acepto.
    if (announcedVersionRef.current) {
      writeAckedVersion(announcedVersionRef.current);
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      // Bug operador 2026-06-10 ("dar Actualizar N veces"): si hubo varios
      // deploys con la pestaña abierta, update() trae el SW MAS NUEVO y el
      // browser reemplaza el waiting → un click lleva a la ultima version.
      try {
        await reg.update();
      } catch (_) { /* offline — activamos el waiting que ya tengamos */ }
      if (reg.waiting) {
        // NO recargamos aca. El SW activa → controllerchange → main.jsx
        // recarga UNA sola vez (patron Workbox). El reload inmediato creaba
        // la carrera "recarga antes de que el SW nuevo tome control" que
        // re-mostraba el banner.
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
    } catch (_) { /* SW no disponible — recargar directo abajo */ }
    // Sin SW en waiting (banner stale o SW no soportado) → recarga directa.
    reloadPage();
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

        <div className={`bg-muzo-glow/20 p-2 rounded-xl flex-shrink-0 relative ${pulsing ? 'ring-2 ring-muzo-glow/60' : ''}`}>
          <RefreshCw className="text-muzo-glow" size={20} />
          {pulsing && (
            <Sparkles
              className="absolute -top-1 -right-1 text-muzo-glow w-3 h-3 animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Nueva versión disponible</p>
          <p className="text-slate-400 text-xs leading-snug">Actualiza para ver las mejoras más recientes.</p>
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
