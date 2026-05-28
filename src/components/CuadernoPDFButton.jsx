import React, { useEffect, useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { assetCache } from '../db/assetCache';
import { logCache } from '../db/logCache';
import useFincaActiveStore from '../services/fincaActiveStore';
import { PRIMARY_WORKER_NAME } from '../config/workerConfig';
import {
  buildFincaData,
  downloadCuadernoPDF,
} from '../services/cuadernoPDF';

const ROLE_LABELS = {
  operador_campo: 'Operador de Campo',
  asistente: 'Asistente',
  auditor: 'Auditor / Inspector',
  administrador: 'Administrador',
  agronomo: 'Agrónomo / Asesor',
  otro: 'Otro',
};

/**
 * CuadernoPDFButton — botón "Descargar cuaderno de campo (PDF)".
 *
 * FEAT-D #295 — Diferenciador agronómico SNIA / EPSEA. El operador descarga
 * un PDF imprimible con TODO lo que registró en Chagra:
 *   - Portada (finca + operador + ubicación + fecha).
 *   - Resumen ejecutivo (totales).
 *   - Inventario plantas + zonas.
 *   - Bitácora cronológica.
 *   - Cosechas + insumos aplicados.
 *   - Disclaimer legal.
 *
 * Se monta en ProfileScreen (al lado de "Exportar copia") y en InformesScreen
 * como tarjeta de reporte.
 *
 * UX:
 *   - Muestra resumen pre-generación (N plantas, N logs) leído desde
 *     IndexedDB on-mount. Si la finca tiene >50 plantas avisa que puede
 *     tomar unos segundos.
 *   - Click → genera Blob → download.
 *   - Estados: idle / generating / success / error.
 *
 * Variante `compact` para usarse en headers donde solo cabe icono + label.
 */
export default function CuadernoPDFButton({ compact = false, className = '' }) {
  const activeFinca = useFincaActiveStore((s) => s.getActiveFinca());
  const [counts, setCounts] = useState(null);
  const [state, setState] = useState('idle'); // idle | generating | success | error
  const [resultMsg, setResultMsg] = useState('');

  // Resumen offline-first leído al montar para mostrar "Vas a exportar X" y
  // decidir si advertir sobre tiempo de generación.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [plants, lands, structures, materials, logs] = await Promise.all([
          assetCache.getByType('plant'),
          assetCache.getByType('land'),
          assetCache.getByType('structure'),
          assetCache.getByType('material'),
          logCache.getAll(),
        ]);
        if (!mounted) return;
        setCounts({
          plants: plants.length,
          lands: lands.length,
          structures: structures.length,
          materials: materials.length,
          logs: logs.length,
        });
      } catch (err) {
        console.warn('[CuadernoPDFButton] No se pudo leer resumen:', err);
        if (mounted) setCounts(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleClick = async () => {
    if (state === 'generating') return;
    setState('generating');
    setResultMsg('');
    try {
      const operatorName = typeof window !== 'undefined'
        ? localStorage.getItem('chagra:operator:name') || PRIMARY_WORKER_NAME
        : PRIMARY_WORKER_NAME;
      const roleId = typeof window !== 'undefined'
        ? localStorage.getItem('chagra:operator:role') || 'operador_campo'
        : 'operador_campo';
      const operator = {
        name: operatorName,
        role: ROLE_LABELS[roleId] || ROLE_LABELS.operador_campo,
      };

      const fincaData = await buildFincaData({
        assetCache,
        logCache,
        finca: activeFinca,
        operator,
      });

      const result = await downloadCuadernoPDF(fincaData);
      const kb = Math.round(result.sizeBytes / 102.4) / 10; // kB con 1 decimal
      setResultMsg(`Cuaderno generado (${kb} kB). Revisa tu carpeta de descargas.`);
      setState('success');
      setTimeout(() => setState('idle'), 5000);
    } catch (err) {
      console.error('[CuadernoPDFButton] Error generando PDF:', err);
      setResultMsg(err?.message || 'No se pudo generar el cuaderno.');
      setState('error');
      setTimeout(() => setState('idle'), 6000);
    }
  };

  // Aviso de tiempo solo si la finca es grande.
  const showLongWarning = counts && counts.plants > 50;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'generating'}
        className={`px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-sm flex items-center gap-2 transition-colors min-h-[40px] ${className}`}
        aria-label="Descargar cuaderno de campo en PDF"
      >
        {state === 'generating' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {state === 'success' && <CheckCircle2 size={16} aria-hidden="true" />}
        {state === 'error' && <AlertCircle size={16} aria-hidden="true" />}
        {state === 'idle' && <FileText size={16} aria-hidden="true" />}
        <span>
          {state === 'generating' && 'Generando…'}
          {state === 'success' && 'Listo'}
          {state === 'error' && 'Reintentar'}
          {state === 'idle' && 'Cuaderno PDF'}
        </span>
      </button>
    );
  }

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2 px-1">
        <FileText size={18} className="text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Cuaderno de campo (PDF)
        </h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Descarga un PDF imprimible con el inventario de la finca, la bitácora,
        las cosechas y los insumos aplicados. Útil para visitas de extensionista
        EPSEA, auditorías de certificación orgánica (ICA, ECOCERT, FLO-CERT) y
        reportes a cooperativas.
      </p>

      {counts && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">
            Vas a incluir:
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-200">
            <li className="flex justify-between"><span>Plantas</span><span className="tabular-nums text-emerald-300">{counts.plants}</span></li>
            <li className="flex justify-between"><span>Zonas</span><span className="tabular-nums text-emerald-300">{counts.lands}</span></li>
            <li className="flex justify-between"><span>Estructuras</span><span className="tabular-nums text-emerald-300">{counts.structures}</span></li>
            <li className="flex justify-between"><span>Insumos</span><span className="tabular-nums text-emerald-300">{counts.materials}</span></li>
            <li className="flex justify-between col-span-2"><span>Eventos bitácora</span><span className="tabular-nums text-emerald-300">{counts.logs}</span></li>
          </ul>
        </div>
      )}

      {showLongWarning && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-900/20 border border-amber-700/40">
          <Info size={14} className="text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] text-amber-200 leading-snug">
            Tu finca tiene más de 50 plantas. La generación puede tardar
            unos segundos. Mantén la app abierta hasta que termine.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'generating'}
        className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px] ${
          state === 'success'
            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
            : state === 'error'
              ? 'bg-red-900/30 text-red-300 border border-red-800'
              : 'bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white'
        }`}
      >
        {state === 'generating' && <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Generando cuaderno…</>}
        {state === 'success' && <><CheckCircle2 size={18} aria-hidden="true" /> Cuaderno descargado</>}
        {state === 'error' && <><AlertCircle size={18} aria-hidden="true" /> Reintentar</>}
        {state === 'idle' && <><Download size={18} aria-hidden="true" /> Descargar cuaderno (PDF)</>}
      </button>

      {resultMsg && state !== 'idle' && (
        <p
          className={`text-xs leading-snug ${state === 'error' ? 'text-red-300' : 'text-emerald-400'}`}
          role={state === 'error' ? 'alert' : undefined}
        >
          {resultMsg}
        </p>
      )}

      <p className="text-[10px] text-slate-500 leading-relaxed">
        El cuaderno se genera con la data sincronizada y los registros pendientes
        en este dispositivo. No incluye fotos por ahora (próximo bump v1.x).
      </p>
    </div>
  );
}
