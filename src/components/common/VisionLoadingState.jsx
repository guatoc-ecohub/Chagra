import { useEffect, useState } from 'react';
import { Loader2, ScanSearch } from 'lucide-react';

/**
 * VisionLoadingState — estado de "analizando su foto" amable y honesto.
 *
 * Pulido visual foto-visión 2026-07: se usa tanto en SpeciesSelect (identificar
 * especie) como en AgentScreen (diagnóstico de plaga/enfermedad por foto).
 * Muestra fases de progreso realistas (el modelo de visión puede tardar 20-30s
 * en el campo), copy en usted, y opcionalmente la miniatura de la foto que se
 * está analizando (`previewUrl`) para que la persona vea QUÉ se está mirando.
 *
 * Accesibilidad: role="status" + aria-live="polite" (el lector anuncia las
 * fases). El shimmer/spin se apaga con prefers-reduced-motion (motion-safe /
 * motion-reduce de Tailwind) — la barra y el texto siguen comunicando avance.
 * Tokens: radios y sombra desde tokens.css (var(--r-md), var(--sombra-2)).
 */

const PHASES = [
  { secs: 0, label: 'Preparando el análisis…' },
  { secs: 3, label: 'Despertando el modelo de visión…' },
  { secs: 8, label: 'Mirando su foto con calma…' },
  { secs: 15, label: 'Identificando la especie y el estado de las hojas…' },
  { secs: 22, label: 'Ya casi está listo…' },
  { secs: 30, label: 'Está tardando más de lo normal — deme un momento más, por favor…' },
];

const EXPECTED_SECS = 25;

export default function VisionLoadingState({ label = 'Analizando su foto', previewUrl = undefined }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const phase = [...PHASES].reverse().find((p) => elapsed >= p.secs) || PHASES[0];
  const pct = Math.min(95, Math.round((elapsed / EXPECTED_SECS) * 100));

  return (
    <div
      data-testid="vision-loading-state"
      className="p-3 bg-slate-800/90 border border-slate-700"
      style={{ borderRadius: 'var(--r-md, 16px)', boxShadow: 'var(--sombra-2, 0 6px 18px rgba(8,30,22,0.22))' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {/* Miniatura de la foto en análisis (si el caller la pasa): la persona
            ve que ES SU FOTO la que se está mirando, no una pantalla muerta. */}
        {previewUrl && (
          <div className="relative shrink-0" aria-hidden="true">
            <img
              src={previewUrl}
              alt=""
              className="w-14 h-14 object-cover border border-emerald-700/50"
              style={{ borderRadius: 'var(--r-sm, 12px)' }}
            />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 border-2 border-slate-800 flex items-center justify-center">
              <ScanSearch size={13} className="text-white" />
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400">
            <Loader2 size={15} className="motion-safe:animate-spin shrink-0" aria-hidden="true" />
            <span className="text-sm font-bold text-slate-100">{label}</span>
            <span className="ml-auto text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
              {elapsed}s
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-snug">{phase.label}</p>
          <div
            className="h-1.5 rounded-full bg-slate-700 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500/70 to-amber-500/70 transition-all duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
