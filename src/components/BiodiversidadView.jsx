/**
 * BiodiversidadView, Vista del ecosistema y diversidad biológica de la finca.
 *
 * Fondo: usa el fondo estándar de la app (catálogo biopunk, default
 * "Páramo completo"). Se eliminó el viejo fondo propio "biodiversidad-bg.jpg".
 *
 * Bug operator 2026-05-18: estratos y gremios siempre mostraban 0 aunque
 * las 37 species reales del operator cubrían 4 estratos y >3 gremios. El
 * cálculo previo solo parseaba `attributes.notes` ("Estrato: X | Gremio: Y"
 * — formato AssetsDashboard.formatNotes), pero plants creadas por
 * VoiceCapture o sincronizadas desde FarmOS no llevan ese inline. El nuevo
 * cálculo resuelve estrato + gremio vía lookup contra el catálogo SQLite
 * por nombre normalizado (con fallback al parser legacy de notes para
 * compatibilidad con plants viejas que SÍ tengan el inline).
 *
 * Lógica extraída a `src/utils/biodiversityStats.js` (función pura, tests
 * en `biodiversityStats.test.js`).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Leaf } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import useAssetStore from '../store/useAssetStore';
import { getAllSpecies } from '../db/catalogDB';
import {
  buildSpeciesIndex,
  computeBiodiversityStats,
} from '../utils/biodiversityStats';

const STRATA = [
  { key: 'emergente', label: 'Emergente', color: 'text-emerald-300' },
  { key: 'alto',      label: 'Alto',      color: 'text-lime-300'    },
  { key: 'medio',     label: 'Medio',     color: 'text-amber-300'   },
  { key: 'bajo',      label: 'Bajo',      color: 'text-orange-300'  },
];

// Timeout duro del load del catálogo: igual al de SpeciesSelect. Si SQLite
// WASM se cuelga (OPFS bloqueado, cold boot offline), seguimos renderizando
// con índice vacío → los stats caen al parser de notes legacy en vez de
// quedar en blanco.
const CATALOG_LOAD_TIMEOUT_MS = 2000;

export default function BiodiversidadView({ onBack, onHome }) {
  const plants = useAssetStore((s) => s.plants || []);
  const [speciesIndex, setSpeciesIndex] = useState(() => new Map());

  // Catálogo SQLite (v3.1+ ≈480 species con estrato + gremio curados). Se
  // pre-carga en App.jsx pero leemos defensivamente: si tarda >2s o falla,
  // dejamos el índice vacío y el stats calc cae a notes parsing.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        console.warn('[BiodiversidadView] catalogDB timeout >2s, stats con índice vacío');
      }
    }, CATALOG_LOAD_TIMEOUT_MS);

    Promise.race([
      getAllSpecies(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('catalog_timeout')), CATALOG_LOAD_TIMEOUT_MS)),
    ])
      .then((rows) => {
        if (cancelled) return;
        if (!Array.isArray(rows) || rows.length === 0) return;
        setSpeciesIndex(buildSpeciesIndex(rows));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[BiodiversidadView] catalogDB load failed:', err?.message || err);
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // useMemo: con 100+ plants el lookup contra el índice (O(N·log N) en
  // promedio por los prefix matches) es barato pero igual conviene no
  // re-computarlo en cada render de scroll/resize.
  const { speciesCount, strataCount, guildsCount, byStratum } = useMemo(
    () => computeBiodiversityStats(plants, speciesIndex),
    [plants, speciesIndex]
  );

  // La vista usa el fondo estándar de la app (catálogo biopunk, default
  // "Páramo completo"). Se eliminó el viejo fondo `biodiversidad-bg.jpg`.
  return (
    <ScreenShell title="Biodiversidad" icon={Leaf} onBack={onBack} onHome={onHome}>
      <div
        className="min-h-full p-4 flex flex-col gap-4"
      >
        {/* Feedback piloto #119: agregado intro contextual. Antes solo había stats
            sin explicación de qué significaban (Estratos? Gremios?). */}
        <section className="bg-slate-900/85 backdrop-blur-sm border border-emerald-800/30 rounded-xl p-4">
          <p className="text-sm text-slate-200 leading-snug mb-2">
            <span className="text-emerald-300 font-bold">Biodiversidad de la finca.</span>{' '}
            Métrica clave del diseño agroforestal sintrópico, más especies en
            estratos diversos = mayor resiliencia climática, mejor regulación de
            plagas y suelo más vivo.
          </p>
          <p className="text-[11px] text-slate-400 leading-tight">
            <strong>Estratos</strong>: capas verticales del agroecosistema (emergente, alto, medio, bajo).{' '}
            <strong>Gremios</strong>: rol funcional de cada especie (productiva, fijadora N, atrayente polinizadores, dinámica suelo).
          </p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-center" title="Cantidad de especies únicas registradas en la finca">
            <p className="text-3xl font-black text-emerald-300 tabular-nums">{speciesCount}</p>
            <p className="text-2xs text-slate-400 uppercase font-bold mt-1">Especies</p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-center" title="Niveles verticales ocupados (emergente, alto, medio, bajo)">
            <p className="text-3xl font-black text-amber-300 tabular-nums">{strataCount}</p>
            <p className="text-2xs text-slate-400 uppercase font-bold mt-1">Estratos</p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-center" title="Roles funcionales distintos en el agroecosistema">
            <p className="text-3xl font-black text-lime-300 tabular-nums">{guildsCount}</p>
            <p className="text-2xs text-slate-400 uppercase font-bold mt-1">Gremios</p>
          </div>
        </section>

        <section className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Leaf size={16} className="text-emerald-400" aria-hidden="true" />
            Distribución por estrato ecológico
          </h2>
          <div className="flex flex-col gap-2">
            {STRATA.map((s) => {
              const count = byStratum[s.key] || 0;
              const pct = plants.length > 0 ? Math.round((count / plants.length) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-20 ${s.color}`}>{s.label}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/60"
                      style={{ width: `${pct}%` }}
                      aria-label={`${pct}% de los cultivos`}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-12 text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
          {plants.length === 0 && (
            <p className="text-xs text-slate-500 italic mt-3">
              Aún no hay cultivos registrados. Registra un activo de tipo Cultivo desde Activos →
              Cultivos para empezar a poblar esta vista.
            </p>
          )}
        </section>

      </div>
    </ScreenShell>
  );
}
