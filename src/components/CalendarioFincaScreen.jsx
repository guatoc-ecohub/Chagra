import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ChevronDown, ChevronRight, Sprout, Flower2, Apple,
  FlaskConical, Bug, AlertTriangle, RotateCcw, MessageCircle, Info, Mountain,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import ChagraGrowLoader from './ChagraGrowLoader';
import { listFarmProcesses, hydrateCyclesFromFarmOS } from '../db/farmProcessCache';
import { getProfile } from '../services/userProfileService';
import { getAllSpecies } from '../db/catalogDB';
import { matchSpeciesInCatalog } from '../utils/speciesResolver';
import { isPerennialSpecies, monthShortName } from '../data/perennialCycles';
import { getTemplate } from '../data/phenologyTemplates';
import {
  buildPlantCalendar,
  aggregateMonthlyMatrix,
  entriesForMonth,
  CALENDAR_LAYERS,
  LAYER_META,
} from '../services/farmCalendarService';

/**
 * CalendarioFincaScreen — "Calendario de finca": UN SOLO calendario que UNIFICA,
 * por planta de la finca del usuario (o por especie del catálogo si no hay
 * finca), las tareas y fases que hoy viven dispersas:
 *
 *   FENOLOGÍA · NUTRICIÓN · SIEMBRA · COSECHA · SANIDAD (MIP) · PERENNES
 *
 * Todo GROUNDEADO (farmCalendarService): cada fecha/tarea viene de un dato real
 * (plantilla fenológica, plan de alimentación, ciclo perenne, sanidad por
 * etapa). Si una especie no tiene calendario, se dice honestamente.
 *
 * Reusa el mismo cargado de ciclos que CicloCultivoScreen (listFarmProcesses +
 * hydrateCyclesFromFarmOS) y la misma resolución de especie del catálogo
 * (matchSpeciesInCatalog) — no reinventa nada.
 */

// Presentación por capa: color de chip y de celda en la tira anual. Estáticos
// para que el JIT de Tailwind los genere (no construir clases dinámicas).
const LAYER_STYLE = {
  siembra: { Icon: Sprout, chip: 'bg-teal-500/20 text-teal-200 border-teal-500/40', dot: 'bg-teal-400', cell: 'bg-teal-600' },
  fenologia: { Icon: Flower2, chip: 'bg-violet-500/20 text-violet-200 border-violet-500/40', dot: 'bg-violet-400', cell: 'bg-violet-600' },
  nutricion: { Icon: FlaskConical, chip: 'bg-amber-500/20 text-amber-200 border-amber-500/40', dot: 'bg-amber-400', cell: 'bg-amber-600' },
  sanidad: { Icon: Bug, chip: 'bg-rose-500/20 text-rose-200 border-rose-500/40', dot: 'bg-rose-400', cell: 'bg-rose-600' },
  cosecha: { Icon: Apple, chip: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40', dot: 'bg-emerald-400', cell: 'bg-emerald-600' },
};

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Slugs del catálogo con plantilla fenológica o ciclo perenne grounded. Se usa
 * como fallback cuando el usuario no tiene ciclos en su finca: mostramos el
 * calendario de las especies para las que SÍ hay datos honestos. */
function speciesHasCalendar(species) {
  const slug = species?.id || species?.slug || '';
  if (!slug) return false;
  if (isPerennialSpecies(slug)) return true;
  if (getTemplate(slug)) return true;
  const cat = species?.category;
  return cat === 'frutales_perennes' || cat === 'arboles_sombra';
}

export default function CalendarioFincaScreen({ onBack, onHome, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plants, setPlants] = useState([]);
  const [usingCatalogFallback, setUsingCatalogFallback] = useState(false);
  const [activeLayers, setActiveLayers] = useState(() => new Set(CALENDAR_LAYERS));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [expanded, setExpanded] = useState({});

  const altitudeM = useMemo(() => {
    const v = getProfile()?.finca_altitud;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  const load = useCallback(async () => {
    let mounted = true;
    setLoading(true);
    setError('');
    try {
      const speciesList = await getAllSpecies().catch(() => []);
      const catalog = Array.isArray(speciesList) ? speciesList : [];

      // 1. Ciclos reales de la finca del usuario (igual que CicloCultivoScreen).
      let cycles = [];
      try {
        cycles = await listFarmProcesses({ status: 'active' });
        cycles = await hydrateCyclesFromFarmOS(cycles, { altitudeM });
      } catch (cyErr) {
        console.warn('[CalendarioFinca] no pude leer ciclos de finca:', cyErr?.message || cyErr);
        cycles = Array.isArray(cycles) ? cycles : [];
      }

      const now = Date.now();
      let built = [];
      let fallback = false;

      if (Array.isArray(cycles) && cycles.length > 0) {
        built = cycles.map((cycle) => {
          const a = cycle.attributes || {};
          const species = matchSpeciesInCatalog(catalog, a.subject_slug, a.subject_label);
          const speciesSlug = species?.id || species?.slug || a.subject_slug;
          return buildPlantCalendar({
            id: cycle.process_id || cycle.id,
            name: a.subject_label || species?.nombre_comun || speciesSlug,
            speciesSlug,
            species,
            sowingDate: a.created_at,
            altitudeM,
            now,
          });
        });
      } else {
        // 2. Sin finca: calendario por especie del catálogo con datos honestos.
        fallback = true;
        built = catalog
          .filter(speciesHasCalendar)
          .map((species) => {
            const slug = species.id || species.slug;
            return buildPlantCalendar({
              id: slug,
              name: species.nombre_comun || slug,
              speciesSlug: slug,
              species,
              sowingDate: null,
              altitudeM,
              now,
            });
          })
          .filter((p) => p.status === 'ok');
      }

      // Orden: primero las que tienen datos, luego sin datos; alfabético.
      built.sort((p1, p2) => {
        if (p1.status !== p2.status) return p1.status === 'ok' ? -1 : 1;
        return String(p1.name).localeCompare(String(p2.name), 'es');
      });

      if (mounted) {
        setPlants(built);
        setUsingCatalogFallback(fallback);
      }
    } catch (err) {
      if (mounted) setError(`No pude armar tu calendario: ${err.message}`);
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
  }, [altitudeM]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- load es async

  const toggleLayer = useCallback((layer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer); else next.add(layer);
      // Nunca dejar el set vacío: re-activar todas si se apagó la última.
      return next.size === 0 ? new Set(CALENDAR_LAYERS) : next;
    });
  }, []);

  const matrix = useMemo(
    () => aggregateMonthlyMatrix(plants, activeLayers),
    [plants, activeLayers],
  );
  const maxCell = useMemo(
    () => matrix.reduce((m, c) => Math.max(m, c.total), 0),
    [matrix],
  );

  const plantsWithData = useMemo(() => plants.filter((p) => p.status === 'ok'), [plants]);
  const plantsNoData = useMemo(() => plants.filter((p) => p.status === 'no_data'), [plants]);

  // Plantas con al menos una entrada en el mes seleccionado y capas activas.
  const plantsForMonth = useMemo(
    () => plantsWithData
      .map((p) => ({ plant: p, entries: entriesForMonth(p, selectedMonth, activeLayers) }))
      .filter((x) => x.entries.length > 0),
    [plantsWithData, selectedMonth, activeLayers],
  );

  const askAgent = useCallback((plant, entry) => {
    if (typeof onNavigate !== 'function') return;
    const layerLabel = LAYER_META[entry.layer]?.label || entry.layer;
    const prompt =
      `En el calendario de mi finca, para ${plant.name} aparece "${entry.title}" ` +
      `(${layerLabel}) en ${monthShortName(selectedMonth)}. ¿Qué debo hacer y cómo lo hago bien?`;
    onNavigate('agente', { prefilledPrompt: prompt });
  }, [onNavigate, selectedMonth]);

  if (loading) {
    return (
      <ScreenShell title="Calendario de finca" icon={CalendarDays} onBack={onBack} onHome={onHome}>
        <div className="flex flex-col items-center gap-3 py-16">
          <ChagraGrowLoader size={56} />
          <p className="text-sm text-slate-400">Armando tu calendario…</p>
        </div>
      </ScreenShell>
    );
  }

  if (error) {
    return (
      <ScreenShell title="Calendario de finca" icon={CalendarDays} onBack={onBack} onHome={onHome}>
        <div className="flex flex-col items-center gap-4 py-12 px-4">
          <AlertTriangle size={44} className="text-amber-400" />
          <p className="text-sm text-amber-200 text-center max-w-sm">{error}</p>
          <button onClick={load} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2">
            <RotateCcw size={16} /> Reintentar
          </button>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Calendario de finca" icon={CalendarDays} onBack={onBack} onHome={onHome}>
      <div className="px-4 py-3 flex flex-col gap-4 max-w-2xl mx-auto">
        {/* Intro + contexto del perfil */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-300 leading-snug">
            Todo junto en un solo calendario: cuándo siembra, abona, vigila plagas
            y cosecha cada planta de tu finca.
          </p>
          <p className="text-2xs text-slate-500 flex items-center gap-1.5">
            <Mountain size={11} className="shrink-0" />
            {altitudeM
              ? `Ajustado a tu finca (${altitudeM} msnm).`
              : 'Pon tu altitud en el perfil para afinar las fechas a tu piso térmico.'}
          </p>
          {usingCatalogFallback && (
            <p className="text-2xs text-amber-300 flex items-start gap-1.5 mt-0.5">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>
                Aún no tienes cultivos registrados; te muestro el calendario de las
                especies del catálogo con datos. Registra tus plantas para verlo por tu finca.
              </span>
            </p>
          )}
        </div>

        {/* Filtros por capa */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
          {CALENDAR_LAYERS.map((layer) => {
            const meta = LAYER_STYLE[layer];
            const on = activeLayers.has(layer);
            const Icon = meta.Icon;
            return (
              <button
                key={layer}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLayer(layer)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-opacity ${meta.chip} ${on ? 'opacity-100' : 'opacity-35'}`}
              >
                <Icon size={13} aria-hidden="true" />
                {LAYER_META[layer].label}
              </button>
            );
          })}
        </div>

        {/* Tira anual de 12 meses — densidad por mes según capas activas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-2xs uppercase font-bold text-slate-500 mb-2">El año de tu finca</p>
          <div className="grid grid-cols-12 gap-1" role="list" aria-label="Calendario anual">
            {matrix.map((cell) => {
              const isSel = cell.month === selectedMonth;
              const intensity = maxCell > 0 ? cell.total / maxCell : 0;
              const hasAny = cell.total > 0;
              return (
                <button
                  key={cell.month}
                  type="button"
                  role="listitem"
                  aria-label={`${monthShortName(cell.month)}: ${cell.total} tareas`}
                  aria-pressed={isSel}
                  onClick={() => setSelectedMonth(cell.month)}
                  className={`flex flex-col items-center gap-1 rounded-lg py-1.5 transition-colors ${isSel ? 'bg-slate-700 ring-2 ring-emerald-400' : 'bg-slate-800/60 hover:bg-slate-800'}`}
                >
                  <span className={`text-2xs font-bold ${isSel ? 'text-white' : 'text-slate-400'}`}>
                    {monthShortName(cell.month).charAt(0).toUpperCase()}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-6 w-2 rounded-full ${hasAny ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    style={hasAny ? { opacity: 0.35 + intensity * 0.65 } : undefined}
                  />
                  <span className={`text-2xs ${hasAny ? 'text-slate-300' : 'text-slate-600'}`}>{cell.total || ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del mes seleccionado, por planta */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays size={15} className="text-emerald-400" />
            {monthShortName(selectedMonth)} en tu finca
            <span className="text-xs font-normal text-slate-500">· {plantsForMonth.length} {plantsForMonth.length === 1 ? 'planta' : 'plantas'}</span>
          </h2>

          {plantsForMonth.length === 0 ? (
            <p className="text-sm text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-3">
              Nada programado en {monthShortName(selectedMonth)} con los filtros activos. Prueba otro mes o activa más capas.
            </p>
          ) : (
            plantsForMonth.map(({ plant, entries }) => {
              const isOpen = expanded[plant.id] !== false; // abierto por defecto
              return (
                <div key={plant.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [plant.id]: e[plant.id] === false }))}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-white truncate">{plant.name}</span>
                      {plant.isGeneric && (
                        <span className="text-2xs text-amber-400 shrink-0">aprox.</span>
                      )}
                      {plant.kind === 'perennial' && (
                        <span className="text-2xs text-emerald-400 shrink-0">perenne</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="flex gap-0.5">
                        {[...new Set(entries.map((e) => e.layer))].map((l) => (
                          <span key={l} className={`h-1.5 w-1.5 rounded-full ${LAYER_STYLE[l].dot}`} aria-hidden="true" />
                        ))}
                      </span>
                      {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                    </span>
                  </button>

                  {isOpen && (
                    <ul className="px-3 pb-3 flex flex-col gap-2">
                      {entries.map((entry, i) => {
                        const meta = LAYER_STYLE[entry.layer];
                        const Icon = meta.Icon;
                        return (
                          <li key={`${plant.id}-${entry.layer}-${i}`} className="flex items-start gap-2.5 border-t border-slate-800 pt-2 first:border-t-0 first:pt-0">
                            <span className={`mt-0.5 h-7 w-7 shrink-0 rounded-lg flex items-center justify-center border ${meta.chip}`}>
                              <Icon size={14} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-100">{entry.title}</span>
                                <span className={`text-2xs px-1.5 py-0.5 rounded-full border ${meta.chip}`}>{LAYER_META[entry.layer].label}</span>
                                {entry.approximate && (
                                  <span className="text-2xs text-amber-400">aproximado</span>
                                )}
                                {entry.continuous && (
                                  <span className="text-2xs text-emerald-400">todo el año</span>
                                )}
                              </div>
                              {entry.detail && (
                                <p className="text-xs text-slate-400 leading-snug mt-0.5">{entry.detail}</p>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <p className="text-2xs text-slate-500 flex items-center gap-1 min-w-0">
                                  <Info size={10} className="shrink-0" />
                                  <span className="truncate">{entry.source}</span>
                                </p>
                                {typeof onNavigate === 'function' && (
                                  <button
                                    type="button"
                                    onClick={() => askAgent(plant, entry)}
                                    className="shrink-0 flex items-center gap-1 text-2xs font-bold text-emerald-300 hover:text-emerald-200"
                                  >
                                    <MessageCircle size={11} /> Pregúntale al agente
                                  </button>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Plantas sin calendario — deflección honesta */}
        {plantsNoData.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <p className="text-xs text-slate-400 flex items-start gap-1.5">
              <Info size={12} className="shrink-0 mt-0.5 text-slate-500" />
              <span>
                Sin calendario todavía para: {plantsNoData.map((p) => p.name).join(', ')}.
                {' '}No tengo datos de ciclo para estas especies; no invento fechas.
              </span>
            </p>
          </div>
        )}

        {/* Pie: caveat global */}
        <p className="text-2xs text-slate-500 flex items-start gap-1.5 border-t border-slate-800 pt-3">
          <Info size={11} className="shrink-0 mt-0.5" />
          <span>
            Fechas estimadas a partir de plantillas fenológicas, planes de
            alimentación y ciclos perennes del catálogo. Aproximadas; varían por
            región, altitud, clima y manejo. Confirma con lo que veas en la planta.
          </span>
        </p>
      </div>
    </ScreenShell>
  );
}
