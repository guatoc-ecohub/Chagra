import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { exportTraceabilityCsv } from '../services/exportService';

/**
 * InformesScreen — sección dedicada para descargar reportes de la finca
 * (Lili #118). Antes los downloads vivían dentro de InventoryDashboard
 * como acción secundaria; Lili pidió: "el informe que se descarga
 * debería ir en otra sección de INFORMES a detalle y especificando todo
 * por cada iconos o segmento."
 *
 * Cada reporte tiene su propia card con:
 * - Título + descripción de qué incluye
 * - Estado (idle / generating / success / error)
 * - Botón descargar
 *
 * Reportes disponibles:
 * - Trazabilidad CSV (cosechas + aplicaciones + observaciones por asset)
 *
 * Futuros (placeholders):
 * - Inventario por categoría (PDF)
 * - Bitácora completa con fotos (ZIP)
 * - Resumen mensual (PDF con gráficas)
 */

// eslint-disable-next-line no-unused-vars -- IconComponent SE USA en JSX línea 55, eslint react-jsx detection falla en mi config
function ReportCard({ icon: IconComponent, title, description, onExport, helpText }) {
  const [state, setState] = useState('idle'); // idle | generating | success | error
  const [resultMsg, setResultMsg] = useState('');

  const handleClick = async () => {
    if (state === 'generating') return;
    setState('generating');
    setResultMsg('');
    try {
      const result = await onExport();
      const msg = result?.rowCount !== undefined
        ? `${result.rowCount} registros exportados${result.pendingCount > 0 ? ` (${result.pendingCount} pendientes de sync)` : ''}`
        : 'Reporte generado correctamente';
      setResultMsg(msg);
      setState('success');
      setTimeout(() => setState('idle'), 4000);
    } catch (err) {
      console.error('[InformesScreen] Error generando reporte:', err);
      setResultMsg(err?.message || 'Error generando reporte');
      setState('error');
      setTimeout(() => setState('idle'), 6000);
    }
  };

  return (
    <article className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <header className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-emerald-900/30 shrink-0">
          <IconComponent size={22} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400 leading-snug mt-0.5">{description}</p>
        </div>
      </header>

      {helpText && (
        <p className="text-[11px] text-slate-500 italic leading-relaxed">{helpText}</p>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'generating'}
        className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] disabled:opacity-50 ${
          state === 'success'
            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
            : state === 'error'
              ? 'bg-red-900/30 text-red-300 border border-red-800'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
        }`}
      >
        {state === 'generating' && <><Loader2 size={18} className="animate-spin" /> Generando…</>}
        {state === 'success' && <><CheckCircle2 size={18} /> Generado</>}
        {state === 'error' && <><AlertCircle size={18} /> Reintentar</>}
        {state === 'idle' && <><Download size={18} /> Descargar</>}
      </button>

      {resultMsg && state !== 'idle' && (
        <p className={`text-xs leading-snug ${state === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {resultMsg}
        </p>
      )}
    </article>
  );
}

export default function InformesScreen({ onBack }) {
  return (
    <ScreenShell title="Informes" icon={FileText} onBack={onBack}>
      <div className="flex flex-col gap-4 pb-8">
        <p className="text-sm text-slate-400 leading-relaxed">
          Reportes descargables consolidados de la finca. Cada uno se genera
          con la data sincronizada al momento — incluye registros pendientes
          de sync con un marcador.
        </p>

        <ReportCard
          icon={FileText}
          title="Trazabilidad CSV"
          description="Cosechas, aplicaciones de biopreparados, observaciones y siembras por activo."
          helpText="Formato CSV abierto, compatible con Excel, Google Sheets, R, Python pandas. Se descarga en tu dispositivo."
          onExport={exportTraceabilityCsv}
        />

        {/* Placeholders próximos reportes — comentado hasta tener implementación */}
        <div className="rounded-2xl border border-dashed border-slate-700/60 p-5 bg-slate-900/30">
          <h3 className="text-sm font-bold text-slate-500 mb-2">Próximamente</h3>
          <ul className="space-y-1.5 text-xs text-slate-500">
            <li>• Inventario por categoría (PDF con gráficas)</li>
            <li>• Bitácora completa con fotos (ZIP)</li>
            <li>• Resumen mensual con métricas de bio-eficiencia</li>
            <li>• Reporte de plagas reportadas + tratamientos</li>
          </ul>
          <p className="text-[10px] text-slate-600 mt-3 italic">
            Si quiere priorizar alguno, abra un issue en el repo etiquetado "informes".
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}
