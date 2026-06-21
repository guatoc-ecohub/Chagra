import { useMemo } from 'react';
import { TreeDeciduous, Sprout, Flower2, Apple, CalendarDays, Info } from 'lucide-react';
import { resolvePerennialCycle } from '../services/perennialCalculator';
import { monthShortName } from '../data/perennialCycles';

/**
 * PerennialCycleView — vista HÍBRIDA del ciclo de una especie perenne.
 *
 * Muestra dos cosas que el ciclo anual (siembra → cosecha) no puede mostrar para
 * un árbol o arbusto que vive años:
 *   1. Barra de ESTABLECIMIENTO + año estimado de la primera cosecha.
 *   2. Tira de 12 meses con floración/cosecha resaltadas, o el aviso de que
 *      produce casi todo el año / que el calendario varía por región.
 *
 * Theme-aware: usa la rampa slate/emerald/amber + acento orchid que se remapea
 * por tema (themes.css), igual que PhenologyTimeline, para verse bien en
 * nature/minimalista (claro) y biopunk (oscuro).
 *
 * Degrada limpio: si no hay datos perennes para la especie, no renderiza nada
 * (devuelve null) y el contenedor mantiene el ciclo anual existente.
 *
 * Props:
 *   - speciesId: string (id de catálogo)
 *   - plantingDate: number (timestamp ms, opcional)
 *   - commonName: string (opcional, para el encabezado)
 */
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function PerennialCycleView({ speciesId, plantingDate, commonName }) {
  const cycle = useMemo(
    () => resolvePerennialCycle({ speciesId, plantingDate }),
    [speciesId, plantingDate],
  );

  if (!cycle) return null;

  const { establishment, annual } = cycle;
  const inEstablishment = cycle.phase === 'establishment';
  const progressPct = establishment.progress !== null
    ? Math.round(establishment.progress * 100)
    : null;

  const [minY, maxY] = establishment.yearsToFirstHarvest;
  const yearsLabel = minY === maxY ? `${minY}` : `${minY}–${maxY}`;
  const continuous = annual.regime === 'continuous';
  const unknown = annual.regime === 'unknown';
  const hasMonthData = annual.floweringMonths.length > 0 || annual.harvestMonths.length > 0;

  const floweringSet = new Set(annual.floweringMonths);
  const harvestSet = new Set(annual.harvestMonths);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TreeDeciduous size={16} className="text-emerald-400 shrink-0" />
        <h2 className="text-2xs uppercase font-bold text-slate-500">
          Ciclo del perenne{commonName ? ` · ${commonName}` : ''}
        </h2>
      </div>

      {/* ── Establecimiento ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-300 flex items-center gap-1.5">
            <Sprout size={14} className="text-emerald-400 shrink-0" />
            {inEstablishment ? 'En crecimiento' : 'En producción'}
          </span>
          {progressPct !== null && (
            <span className="text-xs font-bold text-emerald-400">{progressPct}%</span>
          )}
        </div>

        {progressPct !== null && (
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        <p className="text-xs text-slate-400">
          Da su primera producción entre los <strong className="text-slate-200">{yearsLabel} años</strong> de sembrada
          {establishment.firstHarvestYear !== null && (
            <> · estimada hacia el año <strong className="text-slate-200">{establishment.firstHarvestYear}</strong></>
          )}
          {cycle.productiveLifeYears && (
            <> · produce por unos <strong className="text-slate-200">{cycle.productiveLifeYears} años</strong></>
          )}
          .
        </p>
      </div>

      {/* ── Calendario anual ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-slate-300 flex items-center gap-1.5">
          <CalendarDays size={14} className="text-emerald-400 shrink-0" />
          Cada año, una vez establecida
        </span>

        {continuous && !hasMonthData ? (
          <p className="text-xs text-emerald-300">Produce casi todo el año.</p>
        ) : unknown ? (
          <p className="text-xs text-amber-400">
            El calendario varía por región y altitud; consulta el comportamiento en tu zona.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-0.5" role="list" aria-label="Calendario de floración y cosecha">
              {MONTHS.map((m) => {
                const isF = floweringSet.has(m);
                const isH = harvestSet.has(m);
                const cls = isH
                  ? 'bg-amber-600 text-slate-950'
                  : isF
                    ? 'bg-orchid text-slate-950'
                    : 'bg-slate-800 text-slate-500';
                return (
                  <div
                    key={m}
                    role="listitem"
                    aria-label={`${monthShortName(m)}${isH ? ' cosecha' : ''}${isF ? ' floración' : ''}`}
                    className={`text-2xs text-center py-1 rounded ${cls}`}
                  >
                    {monthShortName(m).charAt(0).toUpperCase()}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-slate-400">
              <span className="flex items-center gap-1">
                <Flower2 size={11} className="text-orchid" /> floración
              </span>
              <span className="flex items-center gap-1">
                <Apple size={11} className="text-amber-400" /> cosecha
              </span>
            </div>
          </>
        )}

        <p className="text-xs text-slate-400">{annual.note}</p>
      </div>

      {/* ── Pie: fuente + caveat ── */}
      <p className="text-2xs text-slate-500 flex items-start gap-1.5 border-t border-slate-800 pt-2">
        <Info size={11} className="shrink-0 mt-0.5" />
        <span>
          Fuente: {cycle.source}. Aproximado; varía por región, altitud y manejo.
        </span>
      </p>
    </section>
  );
}
