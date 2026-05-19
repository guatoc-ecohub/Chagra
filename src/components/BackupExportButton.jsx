import React, { useEffect, useState } from 'react';
import { Save, Download, Check } from 'lucide-react';
import { downloadBackupJSON, getBackupSummary } from '../services/dataBackup';

/**
 * BackupExportButton — botón "Exportar copia" reutilizable.
 *
 * Diseño:
 *   - Lee resumen al montar para mostrar "Vas a exportar X plantas, Y fotos"
 *     ANTES del click. Operator pide saber qué se va a llevar.
 *   - Al clickear, genera el JSON y dispara descarga. Flash de
 *     confirmación 2s. Errores se muestran inline (no toast porque a veces
 *     se monta en flujos sin sistema de toast cercano).
 *
 * Variante: prop `compact` para el botón en headers / widgets donde solo
 * cabe el icono + label corto.
 */
export default function BackupExportButton({ compact = false, className = '' }) {
  const [summary, setSummary] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [doneFlash, setDoneFlash] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    getBackupSummary()
      .then((s) => {
        if (mounted) setSummary(s);
      })
      .catch((err) => {
        if (mounted) {
          console.warn('[BackupExportButton] No se pudo leer resumen:', err);
          setSummary(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleClick = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadBackupJSON();
      setDoneFlash(true);
      setTimeout(() => setDoneFlash(false), 2500);
    } catch (err) {
      console.error('[BackupExportButton] Falló la exportación:', err);
      setError(err?.message || 'No se pudo exportar.');
    } finally {
      setDownloading(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={downloading}
        className={`px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-sm flex items-center gap-2 transition-colors min-h-[40px] ${className}`}
        aria-label="Exportar copia de seguridad"
      >
        {doneFlash ? <Check size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
        <span>{doneFlash ? 'Listo' : 'Exportar copia'}</span>
      </button>
    );
  }

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2 px-1">
        <Download size={18} className="text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Copia de seguridad
        </h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Descarga un archivo JSON con TODO lo que vive en este dispositivo:
        plantas, bitácora, fotos, biopreparados, tareas pendientes y configuración local.
        Guárdalo en un lugar seguro — te salva si borras el cache del navegador,
        cambias de teléfono o reinstalas la app.
      </p>

      {summary && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">
            Vas a exportar:
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-200">
            <li className="flex justify-between"><span>Plantas</span><span className="tabular-nums text-emerald-300">{summary.plants}</span></li>
            <li className="flex justify-between"><span>Zonas</span><span className="tabular-nums text-emerald-300">{summary.lands}</span></li>
            <li className="flex justify-between"><span>Infraestructura</span><span className="tabular-nums text-emerald-300">{summary.structures}</span></li>
            <li className="flex justify-between"><span>Insumos</span><span className="tabular-nums text-emerald-300">{summary.materials}</span></li>
            <li className="flex justify-between"><span>Bitácora</span><span className="tabular-nums text-emerald-300">{summary.logs}</span></li>
            <li className="flex justify-between"><span>Fotos</span><span className="tabular-nums text-emerald-300">{summary.photos}</span></li>
            <li className="flex justify-between"><span>Pendiente sync</span><span className="tabular-nums text-amber-300">{summary.pendingTx}</span></li>
            <li className="flex justify-between"><span>Voz pendiente</span><span className="tabular-nums text-amber-300">{summary.pendingVoice}</span></li>
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={downloading}
        className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px] ${
          doneFlash
            ? 'bg-emerald-600 text-white'
            : 'bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white'
        }`}
      >
        {downloading ? (
          <>Exportando…</>
        ) : doneFlash ? (
          <><Check size={18} aria-hidden="true" /> Descarga iniciada</>
        ) : (
          <><Save size={18} aria-hidden="true" /> Exportar copia ahora</>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-300 bg-red-950 border border-red-800 rounded-lg p-2" role="alert">
          {error}
        </p>
      )}

      <p className="text-[10px] text-slate-500 leading-relaxed">
        El archivo NO incluye tu token de FarmOS por seguridad. Si lo importas
        en otro dispositivo, vas a tener que volver a iniciar sesión.
      </p>
    </div>
  );
}
