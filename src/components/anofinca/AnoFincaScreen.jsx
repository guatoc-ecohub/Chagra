import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Route, Sprout, Apple, Flower2, Wrench, FlaskConical,
  Mountain, Info, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import ChagraGrowLoader from '../ChagraGrowLoader';
import { listFarmProcesses, hydrateCyclesFromFarmOS, getFarmEvents } from '../../db/farmProcessCache';
import { logCache } from '../../db/logCache';
import { HARVEST_LOG_TYPE } from '../../services/cosechaService';
import { getProfile } from '../../services/userProfileService';
import { getAllSpecies } from '../../db/catalogDB';
import { matchSpeciesInCatalog } from '../../utils/speciesResolver';
import { agruparEntradas, claveMataAgrupada } from '../../utils/agruparEntradas';
import { buildPlantCalendar } from '../../services/farmCalendarService';
import {
  buildAnoFinca, HITO_TIPOS, HITO_META, MESES_CORTOS, MESES_LARGOS,
} from '../../services/anoFincaService';
import './ano-finca.css';

/**
 * AnoFincaScreen — "EL AÑO DE LA FINCA": la línea de tiempo del año del
 * usuario. Un camino SVG cruza los 12 meses (SÓLIDO hasta hoy = lo vivido y
 * registrado; PUNTEADO de hoy en adelante = lo estimado por el calendario
 * groundeado), con las temporadas de aguas/secas del almanaque de fondo y los
 * hitos reales colgados en su mes: sembró X, cosechó Y, floreció Z, y lo que
 * viene.
 *
 * DISTINTA de "Mi cosecha" (tablero de cantidades — cosechaService es SOLO
 * LECTURA aquí) y del "Calendario de finca" (agenda por planta/capa): esta es
 * la vista TEMPORAL de la finca — cuándo pasó y cuándo viene cada cosa.
 *
 * Fuentes: ver anoFincaService (nada se inventa; sin registros → estado vacío
 * acogedor). Byte-neutral: solo CSS/SVG, cero fotos, cero deps.
 */

// Mismo lenguaje de color que el Calendario de finca (LAYER_STYLE): teal =
// siembra, orange = cosecha, violet = fenología/floración, sky = nutrición.
// Labor toma amber (no colisiona con ninguna capa existente). `hex` pinta el
// SVG; `chip`/`solid` pintan la UI HTML (clases estáticas para el JIT).
const TIPO_STYLE = {
  siembra: { Icon: Sprout, hex: '#2dd4bf', solid: 'bg-teal-700 text-white', chip: 'bg-teal-500/15 text-teal-300' },
  cosecha: { Icon: Apple, hex: '#fb923c', solid: 'bg-orange-700 text-white', chip: 'bg-orange-500/15 text-orange-300' },
  floracion: { Icon: Flower2, hex: '#a78bfa', solid: 'bg-violet-600 text-white', chip: 'bg-violet-500/15 text-violet-300' },
  labor: { Icon: Wrench, hex: '#fbbf24', solid: 'bg-amber-600 text-white', chip: 'bg-amber-500/15 text-amber-300' },
  nutricion: { Icon: FlaskConical, hex: '#38bdf8', solid: 'bg-sky-700 text-white', chip: 'bg-sky-500/15 text-sky-300' },
};

// ── Geometría del camino (SVG hecho a mano) ─────────────────────────────────
const COL_W = 72; // ancho de cada mes
const RAIL_W = COL_W * 12; // 864
const RAIL_H = 128;

/** Punto del camino en el centro de cada mes: ondulación suave de sendero de
 * ladera (senoide fija, determinista — no es dato, es dibujo). */
const puntoCamino = (i) => ({
  x: i * COL_W + COL_W / 2,
  y: 78 + Math.round(16 * Math.sin(i * 0.85 + 0.7)),
});
const PUNTOS = Array.from({ length: 12 }, (_, i) => puntoCamino(i));

/** Path suave (Catmull-Rom simplificado a curvas cuadráticas por punto medio). */
function caminoPath(puntos) {
  if (puntos.length === 0) return '';
  let d = `M ${-8} ${puntos[0].y} L ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const mx = (a.x + b.x) / 2;
    d += ` Q ${a.x + (mx - a.x) * 0.9} ${a.y}, ${mx} ${(a.y + b.y) / 2}`;
    d += ` Q ${b.x - (b.x - mx) * 0.9} ${b.y}, ${b.x} ${b.y}`;
  }
  d += ` L ${RAIL_W + 8} ${puntos[11].y}`;
  return d;
}
const CAMINO_D = caminoPath(PUNTOS);

/** Tinte de fondo por tono de temporada (aguas/secas del almanaque). */
const TONO_FILL = {
  lluvia: 'rgba(56, 189, 248, 0.09)',
  seca: 'rgba(251, 191, 36, 0.07)',
  transicion: 'transparent',
};

/** Días del mes (para ubicar el marcador de "hoy" dentro de su mes). */
const diasDelMes = (year, month) => new Date(year, month, 0).getDate();

export default function AnoFincaScreen({ onBack, onHome, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeline, setTimeline] = useState(null);
  const [activeTipos, setActiveTipos] = useState(() => new Set(HITO_TIPOS));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const scrollRef = useRef(null);

  const altitudeM = useMemo(() => {
    const n = Number(getProfile()?.finca_altitud);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const now = Date.now();
      const speciesList = await getAllSpecies().catch(() => []);
      const catalog = Array.isArray(speciesList) ? speciesList : [];

      // 1. Ciclos reales de la finca (mismo cargado que el Calendario de finca).
      let cycles = [];
      try {
        cycles = await listFarmProcesses({ status: 'active' });
        cycles = await hydrateCyclesFromFarmOS(cycles, { altitudeM });
      } catch (cyErr) {
        console.warn('[AnoFinca] no pude leer ciclos de finca:', cyErr?.message || cyErr);
        cycles = Array.isArray(cycles) ? cycles : [];
      }

      // 2. Cosechas registradas (log--harvest, SOLO LECTURA de la fuente que
      // usa "Mi cosecha" — aquí solo nos importa CUÁNDO).
      const harvestLogs = await logCache.getByType(HARVEST_LOG_TYPE).catch(() => []);

      // 3. Labores/eventos de cada ciclo (cap defensivo: una finca real tiene
      // decenas de ciclos, no miles; si hubiera más, los primeros bastan).
      /** @type {Object<string, Array>} */
      const eventsByProcess = {};
      const conId = cycles.filter((c) => c.process_id || c.id).slice(0, 80);
      await Promise.all(conId.map(async (c) => {
        const id = c.process_id || c.id;
        eventsByProcess[id] = await getFarmEvents(id).catch(() => []);
      }));

      // 4. Lo que viene: calendario groundeado por planta, con la MISMA
      // agrupación de matas equivalentes del Calendario de finca (Fresa ×20
      // = una fila, no veinte).
      const grupos = agruparEntradas(cycles, (cycle) => {
        const a = cycle.attributes || {};
        return claveMataAgrupada({
          species: a.subject_slug,
          name: a.subject_label,
          date: a.created_at,
          bed: a.location_land_asset_id,
        });
      });
      const calendars = grupos.map((grupo) => {
        const a = grupo.representative.attributes || {};
        const species = matchSpeciesInCatalog(catalog, a.subject_slug, a.subject_label);
        const speciesSlug = species?.id || species?.slug || a.subject_slug;
        const plant = buildPlantCalendar({
          id: grupo.representative.process_id || grupo.representative.id,
          name: a.subject_label || species?.nombre_comun || speciesSlug,
          speciesSlug,
          species,
          sowingDate: a.created_at,
          altitudeM,
          now,
        });
        plant.count = grupo.count;
        return plant;
      });

      setTimeline(buildAnoFinca({ cycles, harvestLogs, eventsByProcess, calendars, now }));
    } catch (err) {
      setError(`No pude armar el año de su finca: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [altitudeM]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- load es async

  // Centrar el carril en el mes actual al cargar (sin animación si el usuario
  // pidió reducir movimiento).
  useEffect(() => {
    if (loading || !timeline || !scrollRef.current) return;
    const el = scrollRef.current;
    const x = (timeline.currentMonth - 0.5) * COL_W - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, x);
  }, [loading, timeline]);

  const toggleTipo = useCallback((tipo) => {
    setActiveTipos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo); else next.add(tipo);
      return next.size === 0 ? new Set(HITO_TIPOS) : next;
    });
  }, []);

  // porMes con el filtro de tipos aplicado (el service entrega todo; filtrar
  // es presentación).
  const meses = useMemo(() => {
    if (!timeline) return [];
    return timeline.porMes.map((m) => {
      const hitos = m.hitos.filter((h) => activeTipos.has(h.tipo));
      const counts = {};
      for (const h of hitos) {
        const key = `${h.tipo}|${h.pasado ? 'p' : 'f'}`;
        counts[key] = (counts[key] || 0) + h.count;
      }
      return { ...m, hitos, counts, total: hitos.length };
    });
  }, [timeline, activeTipos]);

  const mesSel = meses[selectedMonth - 1] || null;
  const hitosPasadosSel = mesSel ? mesSel.hitos.filter((h) => h.pasado) : [];
  const hitosFuturosSel = mesSel ? mesSel.hitos.filter((h) => !h.pasado) : [];

  // ── Marcador "hoy": posición x dentro de su mes, por día ──────────────────
  const hoy = useMemo(() => {
    const d = new Date();
    const month = d.getMonth() + 1;
    const frac = (d.getDate() - 0.5) / diasDelMes(d.getFullYear(), month);
    return { month, x: (month - 1) * COL_W + frac * COL_W };
  }, []);

  if (loading) {
    return (
      <ScreenShell title="El año de la finca" icon={Route} onBack={onBack} onHome={onHome}>
        <div className="flex justify-center py-16">
          <ChagraGrowLoader size={72} showLabel labelText="Recorriendo su año…" />
        </div>
      </ScreenShell>
    );
  }

  if (error) {
    return (
      <ScreenShell title="El año de la finca" icon={Route} onBack={onBack} onHome={onHome}>
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

  const vacio = !timeline || timeline.vacio;

  return (
    <ScreenShell title="El año de la finca" icon={Route} onBack={onBack} onHome={onHome}>
      <div className="px-4 py-3 flex flex-col gap-4 max-w-2xl mx-auto">
        {/* Intro */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-300 leading-snug">
            El camino de su año {timeline?.year}: lo que sembró, cosechó y trabajó
            (trazo lleno) y lo que viene en camino (trazo punteado).
          </p>
          <p className="text-2xs text-slate-500 flex items-center gap-1.5">
            <Mountain size={11} className="shrink-0" />
            {altitudeM
              ? `Lo que viene está ajustado a su finca (${altitudeM} msnm).`
              : 'Ponga la altitud en su perfil para afinar lo que viene a su piso térmico.'}
          </p>
        </div>

        {vacio ? (
          <EstadoVacio onNavigate={onNavigate} />
        ) : (
          <>
            {/* Leyenda-filtro por tipo de hito (mismo gesto que el Calendario) */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de hito">
              {HITO_TIPOS.map((tipo) => {
                const st = TIPO_STYLE[tipo];
                const on = activeTipos.has(tipo);
                const Icon = st.Icon;
                return (
                  <button
                    key={tipo}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTipo(tipo)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      on ? `${st.solid} border-transparent shadow-sm` : 'bg-transparent text-slate-500 border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <Icon size={13} aria-hidden="true" />
                    {HITO_META[tipo].label}
                  </button>
                );
              })}
            </div>

            {/* El camino del año: carril horizontal de 12 meses */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-2xs uppercase font-bold text-slate-500 tracking-wide">El camino del año</p>
                <p className="text-2xs text-slate-600">deslice y toque un mes</p>
              </div>

              {/* Resumen para lectores de pantalla (el SVG es decorativo). */}
              <p className="sr-only">
                Línea de tiempo del año {timeline.year}: {timeline.totalPasado} hitos
                registrados y {timeline.totalFuturo} por venir. Use los botones de mes
                para ver el detalle de cada mes en la lista de abajo.
              </p>

              <div ref={scrollRef} className="anofinca-scroll overflow-x-auto pb-1">
                <div style={{ width: RAIL_W }}>
                  <svg
                    viewBox={`0 0 ${RAIL_W} ${RAIL_H}`}
                    width={RAIL_W}
                    height={RAIL_H}
                    aria-hidden="true"
                    focusable="false"
                  >
                    <defs>
                      <clipPath id="anofinca-clip-pasado">
                        <rect x="0" y="0" width={hoy.x} height={RAIL_H} />
                      </clipPath>
                      <clipPath id="anofinca-clip-futuro">
                        <rect x={hoy.x} y="0" width={RAIL_W - hoy.x} height={RAIL_H} />
                      </clipPath>
                    </defs>

                    {/* Temporadas del almanaque (aguas/secas) de fondo */}
                    {meses.map((m, i) => (
                      <g key={`tono-${m.mes}`}>
                        <rect x={i * COL_W} y="0" width={COL_W} height={RAIL_H} fill={TONO_FILL[m.tono]} />
                        {m.tono === 'lluvia' && (
                          // Tres gotitas de lluvia (trazos cortos inclinados)
                          <g stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" opacity="0.5">
                            <line x1={i * COL_W + 20} y1="9" x2={i * COL_W + 17} y2="16" />
                            <line x1={i * COL_W + 38} y1="6" x2={i * COL_W + 35} y2="13" />
                            <line x1={i * COL_W + 54} y1="10" x2={i * COL_W + 51} y2="17" />
                          </g>
                        )}
                        {m.tono === 'seca' && (
                          // Un solecito de trazos
                          <g stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
                            <circle cx={i * COL_W + 36} cy="11" r="4" fill="none" />
                            <line x1={i * COL_W + 36} y1="3" x2={i * COL_W + 36} y2="5" />
                            <line x1={i * COL_W + 36} y1="17" x2={i * COL_W + 36} y2="19" />
                            <line x1={i * COL_W + 28} y1="11" x2={i * COL_W + 26} y2="11" />
                            <line x1={i * COL_W + 46} y1="11" x2={i * COL_W + 44} y2="11" />
                          </g>
                        )}
                        {/* Divisor sutil entre meses */}
                        {i > 0 && <line x1={i * COL_W} y1="4" x2={i * COL_W} y2={RAIL_H - 4} stroke="#1e293b" strokeWidth="1" />}
                      </g>
                    ))}

                    {/* El camino: sólido hasta hoy (lo vivido), punteado después
                        (lo estimado). Mismo path, dos recortes. */}
                    <path
                      d={CAMINO_D}
                      className="anofinca-camino-pasado"
                      clipPath="url(#anofinca-clip-pasado)"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={CAMINO_D}
                      clipPath="url(#anofinca-clip-futuro)"
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="2"
                      strokeDasharray="5 7"
                      strokeLinecap="round"
                    />

                    {/* Hitos por mes: apilados sobre el camino. Llenos = pasó;
                        huecos punteados = viene. El radio crece con el conteo. */}
                    {meses.map((m, i) => {
                      const base = PUNTOS[i];
                      const grupos = HITO_TIPOS
                        .flatMap((tipo) => ['p', 'f'].map((cual) => ({ tipo, cual, n: m.counts[`${tipo}|${cual}`] || 0 })))
                        .filter((g) => g.n > 0);
                      return grupos.map((g, k) => {
                        const r = 4.5 + Math.min(g.n - 1, 4);
                        const cy = base.y - 14 - k * 15;
                        const hex = TIPO_STYLE[g.tipo].hex;
                        return (
                          <g key={`${m.mes}-${g.tipo}-${g.cual}`}>
                            {/* Tallito que cuelga el hito del camino */}
                            {k === 0 && <line x1={base.x} y1={base.y} x2={base.x} y2={cy + r} stroke="#334155" strokeWidth="1" />}
                            <circle
                              cx={base.x}
                              cy={cy}
                              r={r}
                              fill={g.cual === 'p' ? hex : 'none'}
                              stroke={hex}
                              strokeWidth={g.cual === 'p' ? 0 : 1.6}
                              strokeDasharray={g.cual === 'p' ? undefined : '2.5 2.5'}
                              opacity={g.cual === 'p' ? 0.95 : 0.8}
                            />
                            {g.n > 1 && (
                              <text
                                x={base.x}
                                y={cy + 2.6}
                                textAnchor="middle"
                                fontSize="7.5"
                                fontWeight="700"
                                fill={g.cual === 'p' ? '#0f172a' : hex}
                              >
                                {g.n}
                              </text>
                            )}
                          </g>
                        );
                      });
                    })}

                    {/* Marcador de HOY: estaca con banderita, parte el año en dos */}
                    <g>
                      <line
                        x1={hoy.x} y1="6" x2={hoy.x} y2={RAIL_H - 4}
                        stroke="#34d399" strokeWidth="1.6"
                        className="anofinca-hoy-pulso"
                      />
                      <path d={`M ${hoy.x} 6 L ${hoy.x + 11} 10.5 L ${hoy.x} 15 Z`} fill="#34d399" />
                      <text x={hoy.x + 14} y="13.5" fontSize="9" fontWeight="700" fill="#34d399">hoy</text>
                    </g>
                  </svg>

                  {/* Botones de mes, alineados con las columnas del SVG */}
                  <div className="grid grid-cols-12" role="group" aria-label="Elegir mes">
                    {meses.map((m) => {
                      const isSel = m.mes === selectedMonth;
                      const isToday = m.estado === 'hoy';
                      return (
                        <button
                          key={m.mes}
                          type="button"
                          aria-pressed={isSel}
                          aria-label={`${MESES_LARGOS[m.mes - 1]}${isToday ? ' (mes actual)' : ''}: ${m.total} hitos`}
                          onClick={() => setSelectedMonth(m.mes)}
                          className={`anofinca-mes flex flex-col items-center gap-0.5 rounded-lg py-1.5 mx-0.5 transition-colors ${
                            isSel ? 'bg-slate-800 ring-2 ring-emerald-400' : 'hover:bg-slate-800/60'
                          }`}
                        >
                          <span className={`text-2xs font-bold ${
                            isToday ? 'text-emerald-400' : m.estado === 'pasado' ? 'text-slate-500' : 'text-slate-300'
                          }`}
                          >
                            {MESES_CORTOS[m.mes - 1]}
                          </span>
                          <span className={`text-2xs tabular-nums ${m.total > 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                            {m.total > 0 ? m.total : '·'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mini-leyenda de temporadas (fuente: almanaque campesino) */}
              <p className="text-2xs text-slate-600 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(56,189,248,0.35)' }} aria-hidden="true" />
                  aguas
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(251,191,36,0.35)' }} aria-hidden="true" />
                  secas
                </span>
                <span>Temporadas del almanaque (zona andina bimodal) — la de su vereda puede correrse.</span>
              </p>
            </div>

            {/* Detalle del mes elegido — TAMBIÉN es la alternativa textual de la
                línea de tiempo para lectores de pantalla. */}
            {mesSel && (
              <section aria-label={`Hitos de ${MESES_LARGOS[selectedMonth - 1]}`} className="flex flex-col gap-2">
                <h2 className="text-sm font-bold text-slate-200 capitalize">
                  {MESES_LARGOS[selectedMonth - 1]}
                  {mesSel.estado === 'hoy' && <span className="ml-2 text-2xs font-bold text-emerald-400 uppercase">este mes</span>}
                </h2>

                {mesSel.total === 0 && (
                  <p className="text-xs text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-3">
                    {mesSel.estado === 'proximo'
                      ? 'Nada agendado todavía para este mes.'
                      : 'Este mes no quedó nada registrado.'}
                  </p>
                )}

                {hitosPasadosSel.length > 0 && (
                  <ul className="flex flex-col gap-1.5" aria-label="Lo vivido">
                    {hitosPasadosSel.map((h) => <HitoRow key={h.id} hito={h} />)}
                  </ul>
                )}

                {hitosFuturosSel.length > 0 && (
                  <>
                    <h3 className="text-2xs uppercase font-bold text-slate-500 tracking-wide mt-1">Lo que viene</h3>
                    <ul className="flex flex-col gap-1.5" aria-label="Lo que viene">
                      {hitosFuturosSel.map((h) => <HitoRow key={h.id} hito={h} />)}
                    </ul>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  );
}

/** Una fila de hito: glifo del tipo + qué pasó/viene + cuándo. */
function HitoRow({ hito }) {
  const st = TIPO_STYLE[hito.tipo] || TIPO_STYLE.labor;
  const Icon = st.Icon;
  return (
    <li className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${
      hito.pasado ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/40 border-dashed border-slate-700'
    }`}
    >
      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${st.chip}`}>
        <Icon size={14} aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-slate-200 truncate">
          {hito.label}
          {hito.count > 1 && hito.pasado && <span className="ml-1.5 text-slate-500 font-normal">×{hito.count}</span>}
        </span>
        {hito.detail && <span className="block text-2xs text-slate-500 truncate">{hito.detail}</span>}
      </span>
      <span className="shrink-0 text-2xs text-slate-500 tabular-nums">
        {hito.pasado
          ? `${hito.day} ${MESES_CORTOS[hito.month - 1]}`
          : <span className="px-1.5 py-0.5 rounded-full border border-slate-700 text-slate-400">estimado</span>}
      </span>
    </li>
  );
}

/** Estado vacío acogedor: el camino apenas empieza. */
function EstadoVacio({ onNavigate }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-6 flex flex-col items-center gap-4 text-center">
      <svg viewBox="0 0 220 70" width="220" height="70" aria-hidden="true" focusable="false">
        <path
          d="M 4 44 Q 40 30, 74 42 T 146 40 T 216 38"
          fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 7"
        />
        {/* La primera matica del camino */}
        <g stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <line x1="20" y1="42" x2="20" y2="28" />
          <path d="M 20 34 Q 12 32, 10 24" />
          <path d="M 20 31 Q 28 29, 30 21" />
        </g>
        <circle cx="20" cy="43" r="2.6" fill="#34d399" />
      </svg>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-slate-200">Su año apenas empieza</p>
        <p className="text-xs text-slate-400 max-w-xs leading-snug">
          Este camino se irá llenando a medida que registre: cada siembra, cosecha
          y labor queda marcada en su mes.
        </p>
      </div>
      {typeof onNavigate === 'function' && (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('sembrar')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- copy campesino pendiente de migrar a messages.js (ADR-050, deuda soft igual que mundosFinca) */}
            <Sprout size={14} aria-hidden="true" /> Registrar una siembra
          </button>
          <button
            type="button"
            onClick={() => onNavigate('cosechar')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Apple size={14} aria-hidden="true" /> Anotar una cosecha
          </button>
        </div>
      )}
      <p className="text-2xs text-slate-600 flex items-center gap-1.5">
        <Info size={11} className="shrink-0" aria-hidden="true" />
        Cuando registre sus matas, aquí también verá lo que viene según su altitud.
      </p>
    </div>
  );
}
