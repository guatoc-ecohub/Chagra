import React, { useState } from 'react';
import { Trees, Download, Loader2, CheckCircle2, AlertCircle, Flame } from 'lucide-react';
import useFincaActiveStore from '../services/fincaActiveStore';
import { getProfile } from '../services/userProfileService';
import { PRIMARY_WORKER_NAME } from '../config/workerConfig';

const ROLE_LABELS = {
  operador_campo: 'Operador de Campo',
  asistente: 'Asistente',
  auditor: 'Auditor / Inspector',
  administrador: 'Administrador',
  agronomo: 'Agrónomo / Asesor',
  otro: 'Otro',
};

/**
 * RestauracionPlanPDFButton — "Descargar plan de restauración (PDF)".
 *
 * Diferenciador Pro para gestión de riesgo / restauración (caso Ana, UNGRD
 * Pasto / Galeras). El usuario describe el terreno a restaurar (talud, quebrada,
 * sitio quemado…), Chagra calcula el plan de sucesión ecológica con especies
 * NATIVAS de su piso térmico (diagnosticarRestauracion) y genera un PDF
 * institucional reutilizando el patrón de CuadernoPDFButton/cuadernoPDF.
 *
 * Opcional: incluir el "Contexto de riesgo de incendio" (incendioRiskService),
 * una ESTIMACIÓN estacional (NO alerta oficial) útil para informes UNGRD/CAR.
 *
 * CERO fabricación: el PDF solo imprime especies del diagnóstico (catálogo
 * DR-RESTAURACION-1). Si no hay datos para el piso, lo dice y remite al vivero /
 * CAR. El cómputo (jsPDF) se hace por import dinámico para no inflar el bundle.
 */
export default function RestauracionPlanPDFButton({ className = '' }) {
  const activeFinca = useFincaActiveStore((s) => s.getActiveFinca());
  const [descripcion, setDescripcion] = useState('');
  const [incluirIncendio, setIncluirIncendio] = useState(true);
  const [state, setState] = useState('idle'); // idle | generating | success | error
  const [resultMsg, setResultMsg] = useState('');

  const handleClick = async () => {
    if (state === 'generating') return;
    setState('generating');
    setResultMsg('');
    try {
      const profile = (() => { try { return getProfile(); } catch (_) { return null; } })();
      const altitud = activeFinca?.altitud ?? profile?.finca_altitud ?? profile?.altitud ?? null;

      // 1) Diagnóstico de restauración (especies nativas por piso, guardas).
      const { diagnosticarRestauracion } = await import('../services/restauracionDiagnostic');
      const desc = descripcion.trim() || 'Restauración de un terreno degradado con especies nativas';
      const diagnostico = diagnosticarRestauracion(desc, { altitud });

      // 2) Riesgo de incendio (opcional, estimación honesta).
      let riesgoIncendio = null;
      if (incluirIncendio) {
        try {
          const { evaluarRiesgoIncendio } = await import('../services/incendioRiskService');
          riesgoIncendio = evaluarRiesgoIncendio({ altitud });
        } catch (_) { /* sin riesgo no bloquea el plan */ }
      }

      // 3) PDF institucional.
      const operatorName = typeof window !== 'undefined'
        ? localStorage.getItem('chagra:operator:name') || PRIMARY_WORKER_NAME
        : PRIMARY_WORKER_NAME;
      const roleId = typeof window !== 'undefined'
        ? localStorage.getItem('chagra:operator:role') || 'operador_campo'
        : 'operador_campo';

      const { downloadRestauracionPlanPDF } = await import('../services/restauracionPlanPDF');
      const result = await downloadRestauracionPlanPDF({
        diagnostico,
        finca: activeFinca || {},
        operatorName,
        operatorRole: ROLE_LABELS[roleId] || ROLE_LABELS.operador_campo,
        descripcion: desc,
        riesgoIncendio,
      });

      const kb = Math.round(result.sizeBytes / 102.4) / 10;
      setResultMsg(`Plan generado (${kb} kB). Revisa tu carpeta de descargas.`);
      setState('success');
      setTimeout(() => setState('idle'), 5000);
    } catch (err) {
      console.error('[RestauracionPlanPDFButton] Error generando PDF:', err);
      setResultMsg(err?.message || 'No se pudo generar el plan.');
      setState('error');
      setTimeout(() => setState('idle'), 6000);
    }
  };

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2 px-1">
        <Trees size={18} className="text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Plan de restauración (PDF)
        </h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Genera un PDF con el plan de sucesión ecológica (pioneras, intermedias y
        clímax) usando especies nativas de tu piso térmico. Útil para informes a
        la UNGRD, la Corporación Autónoma Regional (CAR) y proyectos de pago por
        servicios ambientales (PSA).
      </p>

      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wide" htmlFor="rest-desc">
        ¿Qué quieres restaurar?
      </label>
      <textarea
        id="rest-desc"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        rows={2}
        placeholder="Ej: talud degradado con retamo espinoso, orilla de quebrada, sitio quemado…"
        className="w-full rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none"
      />

      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={incluirIncendio}
          onChange={(e) => setIncluirIncendio(e.target.checked)}
          className="accent-emerald-600 w-4 h-4"
        />
        <Flame size={14} className="text-amber-400" aria-hidden="true" />
        Incluir estimación de riesgo de incendio (no es alerta oficial)
      </label>

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
        {state === 'generating' && <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Generando plan…</>}
        {state === 'success' && <><CheckCircle2 size={18} aria-hidden="true" /> Plan descargado</>}
        {state === 'error' && <><AlertCircle size={18} aria-hidden="true" /> Reintentar</>}
        {state === 'idle' && <><Download size={18} aria-hidden="true" /> Descargar plan (PDF)</>}
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
        El plan se basa en investigación documentada de restauración nativa. Es
        un documento de apoyo: no reemplaza el concepto de un ingeniero forestal
        ni la autorización de la autoridad ambiental.
      </p>
    </div>
  );
}
