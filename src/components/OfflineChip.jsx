import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { MSG } from '../config/messages.js';

/**
 * OfflineChip — indicador ambient persistente del estado offline (UX-2).
 *
 * Pequeño chip que vive en el header (top-right, al lado del nombre del
 * operador) y aparece SOLO cuando `navigator.onLine === false`. Cuando la
 * conexión vuelve, se oculta automáticamente. No tiene botón de cerrar —
 * es un indicador ambient, no un banner intermitente.
 *
 * Coexiste con `NetworkStatusBar`:
 *   - `NetworkStatusBar` es la barra full-width que aparece arriba del
 *     dashboard con detalle (cantidad de registros pendientes, dismiss
 *     manual, etc.). Se puede ocultar por sesión.
 *   - `OfflineChip` es el indicador permanente, siempre visible en el
 *     header cuando estás offline, sin importar si el operador descartó
 *     la barra. Garantiza que el operador NO se confunda creyendo que
 *     todo está OK cuando no hay red.
 *
 * Decisión UX (#286): el chip NO es interactivo (no abre detalle al
 * tocar). El detalle vive en `NetworkStatusBar` (que el operador puede
 * reabrir desde la sección Bitácora). Esto mantiene el header limpio y
 * el chip cumple un solo trabajo (informar).
 */
export default function OfflineChip() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label="Sin conexión a internet"
      data-testid="offline-chip"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-700/60 text-amber-300 text-[10px] font-bold uppercase tracking-wider shrink-0"
      title="Sin conexión a internet. Tus registros se guardan localmente y se sincronizan al volver."
    >
      <WifiOff size={11} aria-hidden="true" />
      <span className="hidden sm:inline">{MSG.SIN_CONEXION}</span>
    </span>
  );
}
