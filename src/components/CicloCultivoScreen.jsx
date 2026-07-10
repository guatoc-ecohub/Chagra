import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronDown, Sprout, Mic, RotateCcw, AlertTriangle, Beaker } from 'lucide-react';
import { listFarmProcesses, hydrateCyclesFromFarmOS } from '../db/farmProcessCache';
import { agruparEntradas, claveMataAgrupada, stripInstanceSuffix, formatFechaSiembra } from '../utils/agruparEntradas';
import { getProfile } from '../services/userProfileService';
import DailyTasksView from './DailyTasksView';
import CicloDetalle from './CicloDetalle';
import ChagraGrowLoader from './ChagraGrowLoader';

/**
 * CicloCultivoScreen — "Ciclo del cultivo": muestra los ciclos productivos
 * (FarmProcess) registrados, con su fenología (línea de tiempo de etapas),
 * tareas de la etapa actual y riesgos de plaga.
 *
 * Cablea el track de fenología/ciclo del subsistema FarmProcess (PR #1370,
 * ADR-047/049) que estaba "oscuro". Lee los ciclos de IndexedDB
 * (farmProcessCache.listFarmProcesses) — los crea "Procesos por voz" — y arma
 * la vista con piezas que estaban huérfanas: FarmProcessSummary +
 * PhenologyTimeline + cycleTaskService + climateCycleService. Todo client-side.
 */
export default function CicloCultivoScreen({ onBack, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cycles, setCycles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  // Grupos expandidos (por clave) — N matas iguales se colapsan en una fila.
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

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
      // 1. Leer procesos locales de IndexedDB
      let cycles = await listFarmProcesses({ status: 'active' });

      // 2. Hidratar con plantas activas de farmOS que no tengan ciclo local
      // POLÍTICA: Todas las plantas vivas deben aparecer como ciclo, no solo páramo
      // Dedupe por nombre+lote para no duplicar plantas que ya tienen ciclo
      try {
        cycles = await hydrateCyclesFromFarmOS(cycles, { altitudeM });
      } catch (hydrateErr) {
        // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- log técnico
        console.warn('[CicloCultivoScreen] Error al hidratar ciclos desde farmOS:', hydrateErr.message);
        // Continuar con procesos locales sin hidratación
      }

      if (mounted) {
        setCycles(Array.isArray(cycles) ? cycles : []);
      }
    } catch (err) {
      if (mounted) {
        setError(`No pude leer sus ciclos: ${err.message}`);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }

    return () => { mounted = false; };
  }, [altitudeM]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- load es async, no hay cascading renders

  const selected = useMemo(
    () => cycles.find((c) => (c.process_id || c.id) === selectedId) || null,
    [cycles, selectedId],
  );

  // Agrupar ciclos equivalentes (misma especie + fecha de siembra + lote) para
  // no repetir N filas casi idénticas cuando se sembraron varias matas iguales
  // ("Fresa #01".."#20"). Cada grupo se puede expandir a sus ciclos individuales
  // (que siguen navegando a su propio detalle). Presentación pura: DailyTasksView
  // y el detalle siguen usando `cycles` sin tocar.
  const cycleGroups = useMemo(
    () => agruparEntradas(cycles, (c) => {
      const a = c.attributes || {};
      return claveMataAgrupada({
        species: a.subject_slug,
        name: a.subject_label,
        date: a.created_at,
        bed: a.location_land_asset_id,
      });
    }),
    [cycles],
  );

  const toggleGroup = useCallback((key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const Header = (
    <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
      <button
        type="button"
        onClick={selected ? () => setSelectedId(null) : onBack}
        aria-label="Volver"
        className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
      >
        <ChevronLeft size={20} />
      </button>
      <div>
        <h1 className="text-lg font-bold leading-tight text-white">Ciclo del cultivo</h1>
        <p className="text-xs text-slate-400 leading-tight">Etapas, labores y riesgos según el desarrollo.</p>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <div className="flex flex-col items-center gap-3 py-16"><ChagraGrowLoader size={56} /><p className="text-sm text-slate-400">Cargando sus ciclos…</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <div className="flex flex-col items-center gap-4 py-12 px-4">
          <AlertTriangle size={44} className="text-amber-400" />
          <p className="text-sm text-amber-200 text-center max-w-sm">{error}</p>
          <button onClick={load} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2"><RotateCcw size={16} /> Reintentar</button>
        </div>
      </div>
    );
  }

  // Detalle de un ciclo
  if (selected) {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <CicloDetalle cycle={selected} altitudeM={altitudeM} onReload={load} />
      </div>
    );
  }

  // Lista de ciclos (o vacío)
  return (
    <div className="min-h-[100dvh] text-white">
      {Header}
      {cycles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-14 px-6 text-center">
          <Sprout size={48} className="text-lime-500/70" />
          <p className="text-sm text-slate-300 max-w-xs">Aún no tiene ciclos de cultivo. Registre uno contándole a Chagra qué sembró.</p>
          <button
            onClick={() => onNavigate?.('procesos')}
            className="px-6 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold flex items-center gap-2"
          >
            <Mic size={18} /> Registrar por voz
          </button>
          {/* Conexión con el módulo Germinación: invitar a probar la semilla
              ANTES de sembrar, para no perder trabajo con semilla muerta. */}
          <button
            onClick={() => onNavigate?.('germinacion')}
            className="px-5 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 border border-sky-700/40 text-slate-200 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <Beaker size={16} className="text-sky-300" /> Haga una prueba de germinación primero
          </button>
        </div>
      ) : (
        <div className="px-4 pb-10 flex flex-col gap-3">
          {/* Atajo al módulo Germinación: ¿vas a sembrar otro lote? Prueba la
              semilla primero. Disponible aunque ya tengas ciclos activos. */}
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('germinacion')}
              className="w-full text-left bg-sky-900/20 border border-sky-700/40 hover:border-sky-600/60 rounded-xl p-3 flex items-center gap-2.5 text-sm text-sky-100"
            >
              <Beaker size={16} className="text-sky-300 shrink-0" />
              <span className="flex-1">¿Va a sembrar otro lote? Hágale primero una prueba de germinación.</span>
              <ChevronLeft size={16} className="text-sky-400/70 rotate-180 shrink-0" />
            </button>
          ) : null}
          {/* Digest "para hoy": labores urgentes agregadas de todos los ciclos. */}
          <DailyTasksView processes={cycles} />
          <ul className="flex flex-col gap-2">
          {cycleGroups.map((grupo) => {
            // Fila individual reutilizable (navega al detalle del ciclo).
            const renderCycleRow = (c, { nested = false } = {}) => {
              const a = c.attributes || {};
              const id = c.process_id || c.id;
              return (
                <button
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className={`w-full text-left border rounded-xl p-3 flex items-center gap-3 ${nested
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-lime-700/40'
                    : 'bg-slate-900 border-slate-800 hover:border-lime-700/50'}`}
                >
                  <span className="w-10 h-10 rounded-full bg-lime-900/40 border border-lime-800/50 flex items-center justify-center shrink-0">
                    <Sprout size={18} className="text-lime-400" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-slate-100 truncate">{a.subject_label || 'Ciclo'}</span>
                    <span className="block text-xs text-slate-400">Etapa: {a.current_stage || '—'}{a.quantity ? ` · ${a.quantity} ${a.unit || ''}` : ''}</span>
                  </span>
                  <ChevronLeft size={18} className="text-slate-600 rotate-180" />
                </button>
              );
            };

            // Grupo unitario o pequeño → fila normal (una sola).
            if (!grupo.grouped) {
              const c = grupo.representative;
              return <li key={grupo.key}>{renderCycleRow(c)}</li>;
            }

            // Grupo colapsado: "Fresa ×20 · sembradas 4 mar" + expandir.
            const a = grupo.representative.attributes || {};
            const nombre = stripInstanceSuffix(a.subject_label) || a.subject_label || 'Ciclo';
            const fecha = formatFechaSiembra(a.created_at);
            const isOpen = expandedGroups.has(grupo.key);
            return (
              <li key={grupo.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(grupo.key)}
                  aria-expanded={isOpen}
                  className="w-full text-left bg-slate-900 border border-slate-800 hover:border-lime-700/50 rounded-xl p-3 flex items-center gap-3"
                >
                  <span className="w-10 h-10 rounded-full bg-lime-900/40 border border-lime-800/50 flex items-center justify-center shrink-0">
                    <Sprout size={18} className="text-lime-400" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-slate-100 truncate">{nombre}</span>
                      <span className="text-2xs font-bold text-lime-300 bg-lime-900/40 border border-lime-700/40 rounded-full px-1.5 py-0.5 shrink-0 tabular-nums">×{grupo.count}</span>
                    </span>
                    <span className="block text-xs text-slate-400">
                      Etapa: {a.current_stage || '—'}{fecha ? ` · sembradas ${fecha}` : ''}
                    </span>
                  </span>
                  <ChevronDown size={18} className={`text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <ul className="mt-1.5 pl-3 border-l border-slate-800 flex flex-col gap-1.5">
                    {grupo.items.map((c) => (
                      <li key={c.process_id || c.id}>{renderCycleRow(c, { nested: true })}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </div>
  );
}
