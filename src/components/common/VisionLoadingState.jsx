import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const PHASES = [
  { secs: 0, label: 'Preparando análisis…' },
  { secs: 3, label: 'Cargando modelo de visión…' },
  { secs: 8, label: 'Analizando la foto…' },
  { secs: 15, label: 'Identificando la especie…' },
  { secs: 22, label: 'Aún procesando, casi listo…' },
  { secs: 30, label: 'Tomando más de lo normal, espera un momento…' },
];

const EXPECTED_SECS = 25;

export default function VisionLoadingState({ label = 'Analizando foto' }) {
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
      className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-amber-400">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        <span className="text-xs font-medium">{label}</span>
        <span className="ml-auto text-[10px] font-mono text-slate-500">
          {elapsed}s
        </span>
      </div>
      <p className="text-[11px] text-slate-400">{phase.label}</p>
      <div
        className="h-1 rounded-full bg-slate-700 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-amber-500/60 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
