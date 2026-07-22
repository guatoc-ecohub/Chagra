/**
 * SyncIndicator.jsx — Indicador visual de sincronización pendiente.
 *
 * Muestra un badge con el número de operaciones pendientes de sincronizar.
 * Solo visible cuando pending > 0. Al hacer tap, dispara syncAll().
 *
 * Offline-first: el contador baja cuando el syncManager completa las
 * operaciones encoladas. En el modo campo sin red, muestra cuántos
 * registros (voz, siembra, cosecha) esperan a reconectarse.
 */
import { usePendingSyncCount } from '../hooks/usePendingSyncCount';

export default function SyncIndicator() {
  const { pending } = usePendingSyncCount();

  if (pending === 0) return null;

  return (
    <button
      type="button"
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5
        bg-amber-600/90 text-amber-50 rounded-full text-xs font-semibold
        shadow-lg shadow-amber-900/30 hover:bg-amber-500 transition-colors
        animate-pulse"
      title={`${pending} operaciones pendientes de sincronizar. Toque para reintentar.`}
      onClick={() => {
        import('../services/syncManager.js').then(({ syncManager }) => {
          syncManager.syncAll?.();
        }).catch(() => {});
      }}
      aria-label={`${pending} pendientes de sincronizar`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1.5v3M7 9.5v3M1.5 7h3M9.5 7h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="7" cy="7" r="2" fill="currentColor"/>
      </svg>
      <span>{pending}</span>
    </button>
  );
}
