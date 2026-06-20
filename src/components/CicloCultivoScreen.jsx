import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Sprout, Mic, RotateCcw, AlertTriangle } from 'lucide-react';
import { listFarmProcesses, hydrateCyclesFromFarmOS } from '../db/farmProcessCache';
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
        setError(`No pude leer tus ciclos: ${err.message}`);
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
        <div className="flex flex-col items-center gap-3 py-16"><ChagraGrowLoader size={56} /><p className="text-sm text-slate-400">Cargando tus ciclos…</p></div>
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
          <p className="text-sm text-slate-300 max-w-xs">Aún no tienes ciclos de cultivo. Registra uno contándole a Chagra qué sembraste.</p>
          <button
            onClick={() => onNavigate?.('procesos')}
            className="px-6 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold flex items-center gap-2"
          >
            <Mic size={18} /> Registrar por voz
          </button>
        </div>
      ) : (
        <div className="px-4 pb-10 flex flex-col gap-3">
          {/* Digest "para hoy": labores urgentes agregadas de todos los ciclos. */}
          <DailyTasksView processes={cycles} />
          <ul className="flex flex-col gap-2">
          {cycles.map((c) => {
            const a = c.attributes || {};
            const id = c.process_id || c.id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className="w-full text-left bg-slate-900 border border-slate-800 hover:border-lime-700/50 rounded-xl p-3 flex items-center gap-3"
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
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </div>
  );
}
