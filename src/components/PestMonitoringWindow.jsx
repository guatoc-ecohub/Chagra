import { useEffect, useState } from 'react';
import { Bug } from 'lucide-react';
import { lunarPhase } from '../utils/skyEphemeris';
import { pestMonitoringMessage } from '../services/lunarPestService';
import { FARM_CONFIG } from '../config/defaults';

/**
 * PestMonitoringWindow — Feature C.1 ADR-033.
 *
 * Aparece SOLO en ventana de luna nueva ± 3 días con texto informativo
 * sobre muestreo nocturno con trampa de luz (Yela & Holyoak 1997 — capturas
 * 2-4× mayores). Fuera de la ventana, NO renderiza nada (return null).
 *
 * Compatible con política Opción C estricta:
 *   - Solo Nivel 2 evidencia entomológica (NO biodinámica, NO calendario lunar)
 *   - NO badge "saber tradicional", NO toggle, NO modal preventivo
 *   - Mensaje neutro opt-in: si no tiene trampa, ignora
 *
 * Refs: ADR-033, dr-033-mistral-tiebreak.md, services/lunarPestService.js
 */
export default function PestMonitoringWindow() {
  const [message, setMessage] = useState(() => computeMessage());

  useEffect(() => {
    const id = setInterval(() => setMessage(computeMessage()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!message) return null;

  return (
    <aside
      role="note"
      aria-label="Ventana de muestreo nocturno con trampa de luz"
      className="mx-4 mb-3 rounded-xl border border-indigo-800/50 bg-indigo-950/30 p-3 flex items-start gap-3"
    >
      <span aria-hidden="true" className="text-2xl shrink-0 leading-none">{'🌑'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Bug size={14} className="text-indigo-300 shrink-0" />
          <h3 className="text-sm font-bold text-indigo-200">{message.headline}</h3>
          <span className="text-[10px] text-indigo-400 font-mono">· {message.sub}</span>
        </div>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{message.body}</p>
        <p className="text-[10px] text-slate-500 italic mt-1">{message.caveat}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">Evidencia Nivel 2 · {message.citation}</p>
      </div>
    </aside>
  );
}

function computeMessage() {
  const lat = FARM_CONFIG.LATITUDE ?? 0;
  const lunar = lunarPhase(new Date(), { latitude: lat });
  return pestMonitoringMessage(lunar);
}
