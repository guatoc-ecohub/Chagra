import React, { useEffect } from 'react';
import { Apple, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import useCosechaStore from '../../store/useCosechaStore';

/**
 * MiCosechaPlaceholder — PLACEHOLDER MÍNIMO de "Mi cosecha".
 *
 * ⚠️ Fable REEMPLAZA esta vista por el tablero visual (tarjetas de rendimiento,
 * gráfica de tendencia, kg/planta por cultivo). Aquí solo cableamos la CAPA DE
 * DATOS (useCosechaStore + cosechaService) con los números ya agregados:
 *
 *   - summary.totalKg          → total cosechado (kg)
 *   - summary.topCrop          → cultivo estrella
 *   - summary.byCrop[]         → producción por cultivo
 *   - summary.byLote[]         → rendimiento por lote (kg/planta, kg/ha)
 *   - summary.trend            → serie mensual + dirección (subiendo/bajando)
 *
 * NO es la UI final: es el andamiaje de datos. Ver services/cosechaService.js.
 */
export default function MiCosechaPlaceholder() {
  const summary = useCosechaStore((s) => s.summary);
  const isLoading = useCosechaStore((s) => s.isLoading);
  const loadHarvests = useCosechaStore((s) => s.loadHarvests);

  useEffect(() => {
    loadHarvests();
  }, [loadHarvests]);

  if (isLoading && !summary) {
    return <div className="p-4 text-sm text-slate-400">Cargando tus cosechas…</div>;
  }

  if (!summary || summary.totalHarvests === 0) {
    return (
      <div className="p-4 text-sm text-slate-400 flex items-center gap-2">
        <Apple size={16} aria-hidden="true" /> Todavía no hay cosechas registradas. Registra una en “Cosechar”.
      </div>
    );
  }

  const TrendIcon = summary.trend.direction === 'subiendo' ? TrendingUp
    : summary.trend.direction === 'bajando' ? TrendingDown : Minus;

  return (
    <div className="p-4 flex flex-col gap-4 text-slate-100">
      <div className="rounded-xl border border-dashed border-emerald-600/60 bg-emerald-950/20 p-4">
        <p className="text-sm text-emerald-300 font-semibold flex items-center gap-2">
          <Apple size={16} aria-hidden="true" /> Aquí va el tablero de rendimiento (lo pinta Fable)
        </p>
        <p className="text-xs text-emerald-200/70 mt-1">
          Placeholder de datos: la agregación ya está lista en <code>cosechaService</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
          <div className="text-xs text-slate-400">Total cosechado</div>
          <div className="text-2xl font-bold">{summary.totalKg.toFixed(1)} <span className="text-sm font-normal text-slate-400">kg</span></div>
        </div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
          <div className="text-xs text-slate-400">Cultivo estrella</div>
          <div className="text-lg font-bold truncate">{summary.topCrop?.crop || '—'}</div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <TrendIcon size={14} aria-hidden="true" /> Tendencia: {summary.trend.direction}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {summary.trend.series.length} mes(es) con registro · {summary.totalHarvests} cosecha(s)
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold mb-2">Por cultivo</h4>
        <ul className="flex flex-col gap-1.5">
          {summary.byCrop.map((c) => (
            <li key={c.cropKey} className="flex justify-between text-sm bg-slate-900 border border-slate-800 rounded px-3 py-2">
              <span className="truncate">{c.crop}</span>
              <span className="text-slate-400 shrink-0 ml-2">
                {c.totalKg > 0 ? `${c.totalKg.toFixed(1)} kg` : `${c.totalCount} und`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
