import React, { useEffect, useState } from 'react';
import { AlertTriangle, Upload, X } from 'lucide-react';
import { shouldWarnDataLoss } from '../services/emptyDbDetector';

/**
 * DataLossBanner — banner rojo prominente que aparece cuando detectamos que
 * el dispositivo tenía datos antes (flag `chagra:had-data-once` en
 * localStorage) y ahora IDB está vacío. El caso disparador real es el
 * operador haciendo "Clear cache" en Chrome Android, que borra IndexedDB
 * pero NO localStorage — la huella sobrevive y permite alertar.
 *
 * UX:
 *   - Color rojo agresivo (bg-red-900 + border-red-500), NO un toast suave.
 *     El operador perdió datos reales; el banner DEBE ser imposible de
 *     ignorar.
 *   - Botón "Importar copia anterior" → modal con `<input type="file">`
 *     que SOLO lee y muestra preview del JSON. El import real vendrá en
 *     un PR posterior; este PR solo previene futuras pérdidas y permite
 *     verificar que la copia descargada es legible.
 *   - Botón "Cerrar" (×) → oculta el banner solo para esta sesión (no
 *     borra el flag). Si el operador refresca, vuelve. Sin esta vía
 *     mínima de descarte la banner bloquearía la app si fue falso
 *     positivo.
 *
 * @param {Object} props
 * @param {Function} [props.onDismiss]
 */
export default function DataLossBanner({ onDismiss }) {
  const [status, setStatus] = useState({ shouldWarn: false, lastKnownCount: 0, lastMarkedAt: null });
  const [hidden, setHidden] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    shouldWarnDataLoss()
      .then((s) => {
        if (mounted) setStatus(s);
      })
      .catch((err) => {
        console.warn('[DataLossBanner] No se pudo chequear data-loss status:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!status.shouldWarn || hidden) return null;

  const lastDate = status.lastMarkedAt ? new Date(status.lastMarkedAt) : null;
  const lastDateLabel = lastDate && !Number.isNaN(lastDate.getTime())
    ? lastDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <>
      <div
        role="alert"
        aria-live="assertive"
        className="bg-red-900 border-y-4 border-red-500 text-white px-4 py-3 shadow-lg"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-start gap-3 max-w-screen-md mx-auto">
          <AlertTriangle size={28} className="text-yellow-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-black uppercase tracking-wide leading-tight">
              ¿Hiciste clear cache?
            </p>
            <p className="text-sm mt-1 leading-snug">
              No encontramos tu información local.{' '}
              {status.lastKnownCount > 0 ? (
                <>
                  Antes tenías al menos <strong>{status.lastKnownCount}</strong> activos registrados
                  {lastDateLabel ? <> (visto por última vez el <strong>{lastDateLabel}</strong>)</> : null}.
                </>
              ) : (
                <>Antes este dispositivo tenía datos registrados y ahora aparece vacío.</>
              )}
            </p>
            <p className="text-xs mt-2 leading-snug text-red-100/90">
              Esto puede pasar si borraste el cache del navegador o reinstalaste la app.
              Lo que estaba sin sincronizar con FarmOS (fotos, plantas nuevas) se perdió.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 rounded-lg bg-white text-red-900 font-bold text-sm flex items-center gap-2 hover:bg-red-50 transition-colors min-h-[40px]"
              >
                <Upload size={16} aria-hidden="true" />
                Importar copia anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  setHidden(true);
                  onDismiss?.();
                }}
                className="px-3 py-2 rounded-lg bg-red-800 text-red-100 font-bold text-sm flex items-center gap-2 hover:bg-red-700 transition-colors min-h-[40px]"
                aria-label="Cerrar advertencia"
              >
                <X size={16} aria-hidden="true" />
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>

      {showImportModal && (
        <ImportPreviewModal onClose={() => setShowImportModal(false)} />
      )}
    </>
  );
}

/**
 * ImportPreviewModal — modal que permite seleccionar un archivo JSON de
 * backup y muestra solamente el conteo de items (preview). NO importa.
 * El import real (con su flujo de merge / overwrite / sanity checks) es
 * un PR independiente.
 */
function ImportPreviewModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(null);
    setError(null);
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      if (!parsed.version || !parsed.idb) {
        throw new Error('El archivo no parece un backup de Chagra (faltan claves version/idb).');
      }
      const counts = Object.entries(parsed.idb).map(([store, records]) => ({
        store,
        count: Array.isArray(records) ? records.length : 0,
      }));
      const totalItems = counts.reduce((acc, c) => acc + c.count, 0);
      setPreview({
        version: parsed.version,
        exportedAt: parsed.exportedAt,
        dbName: parsed.dbName,
        counts,
        totalItems,
        localStorageKeys: Object.keys(parsed.localStorage || {}).length,
      });
    } catch (err) {
      setError(err.message || 'No se pudo leer el archivo.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-preview-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="import-preview-title" className="text-lg font-black text-white">
              Importar copia anterior
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
              Por ahora solo previsualizamos. La importación efectiva se habilita en una próxima versión.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
            Archivo de backup
          </span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="text-sm text-slate-200 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:text-white file:font-bold hover:file:bg-emerald-600 cursor-pointer"
          />
          {file && (
            <p className="text-[11px] text-slate-500 truncate">
              {file.name} ({Math.round((file.size / 1024) * 10) / 10} KB)
            </p>
          )}
        </label>

        {error && (
          <div className="bg-red-950 border border-red-700 rounded-lg p-3 text-sm text-red-200" role="alert">
            {error}
          </div>
        )}

        {preview && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-slate-400">
              Backup v{preview.version} — exportado el{' '}
              <strong className="text-slate-200">
                {preview.exportedAt ? new Date(preview.exportedAt).toLocaleString('es-CO') : 'fecha desconocida'}
              </strong>
            </p>
            <p className="text-sm text-slate-200">
              Contiene <strong>{preview.totalItems}</strong> registros en{' '}
              <strong>{preview.counts.length}</strong> stores, más{' '}
              <strong>{preview.localStorageKeys}</strong> claves de configuración.
            </p>
            <ul className="text-[11px] text-slate-300 max-h-40 overflow-y-auto flex flex-col gap-0.5 mt-1">
              {preview.counts
                .filter((c) => c.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((c) => (
                  <li key={c.store} className="flex justify-between font-mono">
                    <span className="truncate">{c.store}</span>
                    <span className="tabular-nums text-emerald-300">{c.count}</span>
                  </li>
                ))}
            </ul>
            <p className="text-[10px] text-amber-300 mt-2 leading-snug">
              Para restaurar estos datos, guarda este archivo en lugar seguro.
              La importación se habilita en la próxima versión.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold min-h-[48px]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
