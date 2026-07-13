/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. La regla chagra-i18n es soft (warn); se
 * desactiva a nivel de archivo para no bloquear el pre-commit (mismo criterio
 * que CromatografiaScreen / ToxicologiaScreen). Este archivo es anterior a la
 * regla y su migración i18n es trabajo aparte. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus, Check, X, AlertTriangle, RotateCcw, CalendarDays, MapPin, Clock, ChevronRight, ExternalLink, BookOpen } from 'lucide-react';
import { createFarmProcess, recordFarmEvent } from '../services/farmEventService';
import { confirmStage } from '../services/stageConfirmationService';
import { listFarmProcesses, getFarmEvents, putFarmProcess } from '../db/farmProcessCache';
import { stageSequenceForProcessType } from '../types/farmProcess';
import { getSeguimientoDef } from '../config/seguimientoProcesos';
import { newUlid } from '../utils/id';
import useAssetStore from '../store/useAssetStore';
import CicloObservacion from './CicloObservacion';
import CicloFotos from './CicloFotos';
import ChagraGrowLoader from './ChagraGrowLoader';
import CarbonoPsaSubvista from './CarbonoPsaSubvista';
import useFincaActiveStore from '../services/fincaActiveStore';
import { getProfile } from '../services/userProfileService';
import animalDiagnostics from '../data/animal-diagnostics.json';
import { diagnosticarAnimal, formatearGroundingAnimal } from '../services/animalDiagnostic';
import { FUENTES_OFICIALES } from '../data/fuentesAnimales';

/**
 * SeguimientoProcesoScreen — vista de SEGUIMIENTO de un proceso de finca
 * (Reforestación · Silvopastoreo · Páramo · Cerdos). Operador 2026-06-15.
 *
 * Es "Mis plantas pero para procesos": lista los procesos ACTIVOS de su tipo,
 * permite (a) INICIAR/registrar uno (qué, zona, fecha, notas), (b) ver sus
 * ETAPAS con fechas, (c) agregar registros/fotos, (d) ver el avance.
 *
 * REUSA el motor existente del subsistema FarmProcess:
 *   - createFarmProcess (escritura atómica del ciclo + evento inicial)
 *   - confirmStage (avanzar/confirmar etapa, append-only)
 *   - recordFarmEvent (nota de inicio)
 *   - CicloObservacion (anotar observación por texto/voz → evento del ciclo)
 *   - CicloFotos (adjuntar fotos al ciclo → evento photo_attached)
 *   - stageSequenceForProcessType (etapas por tipo, types/farmProcess)
 *
 * Para 'pigs' surfacea la GUARDA crítica de leucaena/mimosina desde
 * animal-diagnostics.json (fuentes públicas ICA/AGROSAVIA/CIPAV). Los
 * detalles técnicos sin fuente cerrada van marcados [VALIDAR].
 */

const PIG_GUARD = animalDiagnostics?.guardas?.leucaena_toxica || null;
const PIG_SANITY_GUARDS = [
  animalDiagnostics?.guardas?.porquinaza_bioseguridad,
  animalDiagnostics?.guardas?.reproduccion_porcina,
].filter(Boolean);
const PIG_STAGE_LABELS = {
  instalacion: 'Instalación',
  alimentacion: 'Alimentación',
  reproduccion: 'Reproducción',
  sanidad: 'Sanidad',
  cierre: 'Cierre',
};

// Etapa inicial por tipo de proceso (primer hito de su secuencia).
function initialStageFor(processType) {
  const seq = stageSequenceForProcessType(processType);
  return seq[0]?.stage || 'sowing_confirmed';
}

function getPigProfile(attributes) {
  return {
    cochera: attributes?.pig_cochera || {
      nombre: '',
      ubicacion: '',
      capacidad: '',
      cama_profunda: 'cascarilla_de_arroz',
    },
    lotes: Array.isArray(attributes?.pig_lotes) ? attributes.pig_lotes : [],
  };
}

function getPigClimateContext(label = '') {
  const text = String(label).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/(frio|templado|andino|alt[oa]|sierra|montana|montana)/.test(text)) {
    return {
      title: 'Clima frio o templado',
      foods: ['Maiz', 'Papa en poca cantidad', 'Balu o chachafruto', 'Suero de leche'],
      caution: 'La papa amarilla va solo en pequenas cantidades. La papa en exceso los revienta.',
    };
  }
  return {
    title: 'Clima caliente',
    foods: ['Soya', 'Maiz', 'Yuca cocida', 'Platano de rechazo', 'Suero de leche'],
    caution: 'Asegura sombra, agua limpia y revolcadero. El cerdo no suda y se estresa con el calor.',
  };
}

const fmtDate = (ms) => {
  try { return new Date(ms).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

/** @param {{ procesoKey: string, onBack: () => void, onSave?: (msg: string) => void }} props */
export default function SeguimientoProcesoScreen({ procesoKey, onBack, onSave }) {
  const def = useMemo(() => getSeguimientoDef(procesoKey), [procesoKey]);
  const lands = useAssetStore((s) => s.lands);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const stageSeq = useMemo(
    () => (def ? stageSequenceForProcessType(def.processType) : []),
    [def],
  );

  const locationOptions = useMemo(
    () => (lands || [])
      .filter((l) => l?.id && l?.attributes?.name)
      .map((l) => ({ id: l.id, label: l.attributes.name })),
    [lands],
  );

  const load = useCallback(async () => {
    if (!def) return;
    setLoading(true);
    setError('');
    try {
      const list = await listFarmProcesses({ process_type: def.processType });
      // Activos primero, más recientes arriba.
      const sorted = (Array.isArray(list) ? list : []).slice().sort((a, b) => {
        const sa = a.attributes?.status === 'active' ? 0 : 1;
        const sb = b.attributes?.status === 'active' ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return (b.attributes?.updated_at || 0) - (a.attributes?.updated_at || 0);
      });
      setItems(sorted);
    } catch (err) {
      setError(`No pude leer tus procesos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [def]);

  useEffect(() => {
    // Carga al montar / al cambiar de proceso. load() hace su setState de forma
    // asíncrona tras await IndexedDB (patrón establecido "cargar al montar",
    // igual que CicloCultivoScreen/GlaciarHistorialScreen).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const selected = useMemo(
    () => items.find((p) => (p.process_id || p.id) === selectedId) || null,
    [items, selectedId],
  );

  if (!def) {
    return (
      <div className="min-h-[100dvh] text-white flex items-center justify-center px-4">
        <p className="text-slate-400 text-sm">Proceso no disponible.</p>
      </div>
    );
  }

  const Header = (
    <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
      <button
        type="button"
        onClick={creating ? () => setCreating(false) : (selected ? () => setSelectedId(null) : onBack)}
        aria-label="Volver"
        className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">{def.emoji}</span>
        <div>
          <h1 className="text-lg font-bold leading-tight text-white">{def.title}</h1>
          <p className="text-xs text-slate-400 leading-tight">{def.subtitle}</p>
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <div className="flex flex-col items-center gap-3 py-16"><ChagraGrowLoader size={56} /><p className="text-sm text-slate-400">Cargando tu seguimiento…</p></div>
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

  // Formulario de inicio
  if (creating) {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <IniciarProcesoForm
          def={def}
          locationOptions={locationOptions}
          onCancel={() => setCreating(false)}
          onCreated={async (newId) => {
            await load();
            setCreating(false);
            setSelectedId(newId);
            onSave?.(`${def.title}: seguimiento iniciado.`);
          }}
        />
      </div>
    );
  }

  // Detalle de un proceso
  if (selected) {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <ProcesoDetalle def={def} proceso={selected} stageSeq={stageSeq} locationOptions={locationOptions} onReload={load} />
      </div>
    );
  }

  // Lista / vacío
  return (
    <div className="min-h-[100dvh] text-white">
      {Header}
      <div className="px-4 pb-10 flex flex-col gap-3">
        {def.processType === 'pigs' && PIG_GUARD && (
          <div className="bg-red-900/25 border border-red-800/60 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-200 leading-snug">{PIG_GUARD}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full px-4 py-3 min-h-[48px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Plus size={18} /> {def.startVerb}
        </button>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
            <span className="text-5xl" aria-hidden="true">{def.emoji}</span>
            <p className="text-sm text-slate-300 max-w-xs">
              Aún no tienes seguimiento de {def.title.toLowerCase()}. Toca
              "{def.startVerb}" para registrar el primero y seguir sus etapas.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((p) => {
              const a = p.attributes || {};
              const id = p.process_id || p.id;
              const stageLabel = stageSeq.find((s) => s.stage === a.current_stage)?.label || a.current_stage || '—';
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className="w-full text-left bg-slate-900 border border-slate-800 hover:border-lime-700/50 rounded-xl p-3 flex items-center gap-3"
                  >
                    <span className="w-10 h-10 rounded-full bg-lime-900/40 border border-lime-800/50 flex items-center justify-center shrink-0 text-lg">
                      {def.emoji}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-100 truncate">{a.subject_label || def.title}</span>
                      <span className="block text-xs text-slate-400 truncate">
                        {a.status === 'active' ? 'En curso' : 'Cerrado'} · {stageLabel}
                        {a.quantity ? ` · ${a.quantity} ${a.unit || ''}` : ''}
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-slate-600 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * IniciarProcesoForm — formulario para registrar un nuevo proceso. Crea el
 * FarmProcess vía createFarmProcess (escritura atómica) con la etapa inicial
 * de su secuencia, y deja una nota de inicio si el campesino escribió algo.
 */
function IniciarProcesoForm({ def, locationOptions, onCancel, onCreated }) {
  const [subject, setSubject] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(def.defaultUnit);
  const [areaHa, setAreaHa] = useState('');
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const valid = subject.trim().length > 0 && Number(quantity) > 0;

  const handleSubmit = useCallback(async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr('');
    try {
      const now = Date.now();
      const createdAt = new Date(date).getTime() || now;
      const processId = newUlid();
      const process = {
        process_id: processId,
        type: 'farm_process',
        attributes: {
          process_type: def.processType,
          subject_kind: def.subjectKind,
          // Sin slug del catálogo: estos procesos no siempre mapean a una
          // especie del catálogo de cultivos. subject_label basta para validar.
          subject_slug: '',
          subject_label: subject.trim(),
          variety: null,
          quantity: Number(quantity),
          unit: unit || def.defaultUnit,
          area_ha: areaHa === '' ? undefined : Number(areaHa),
          location_land_asset_id: locationId,
          status: 'active',
          current_stage: initialStageFor(def.processType),
          created_at: createdAt,
          updated_at: now,
          notes: notes.trim() || undefined,
        },
      };
      await createFarmProcess(/** @type {import('../types/farmProcess').FarmProcess} */ (/** @type {any} */ (process)));
      // Nota de inicio (opcional) como evento del ciclo.
      if (notes.trim()) {
        await recordFarmEvent({
          process_id: processId,
          event_type: 'note',
          occurred_at: createdAt,
          actor: 'operator',
          payload: { text: notes.trim() },
        }).catch(() => {});
      }
      onCreated?.(processId);
    } catch (e) {
      setErr(`No se pudo iniciar el seguimiento: ${e.message}`);
      setSaving(false);
    }
  }, [valid, saving, date, def, subject, quantity, unit, areaHa, locationId, notes, onCreated]);

  return (
    <div className="p-4 flex flex-col gap-4">
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <p className="text-xs text-slate-400">{def.emoji} Nuevo seguimiento de {def.title.toLowerCase()}</p>
      </section>

      {def.processType === 'pigs' && PIG_GUARD && (
        <div className="bg-red-900/25 border border-red-800/60 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200 leading-snug">{PIG_GUARD}</p>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">¿Qué vas a seguir?</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={saving}
          placeholder={def.subjectLabelPlaceholder}
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-2xs font-bold text-slate-400 uppercase">Cantidad</span>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-2xs font-bold text-slate-400 uppercase">Unidad</span>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
            disabled={saving}
            placeholder={def.defaultUnit}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">Área plantada (ha) <span className="text-slate-600 font-normal">(opcional)</span></span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={areaHa}
          onChange={(e) => setAreaHa(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={saving}
          placeholder="Ej: 1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">Zona / Lote</span>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={saving}
        >
          <option value="">{locationOptions.length === 0 ? 'Sin lotes disponibles' : 'Seleccionar…'}</option>
          {locationOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        {!locationId && (
          <span className="text-3xs text-slate-500">Sin asignar (puedes asignarlo después)</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">Fecha de inicio</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={saving}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">Notas <span className="text-slate-600 font-normal">(opcional)</span></span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none resize-none"
          disabled={saving}
          placeholder="¿Algo importante para arrancar?"
        />
      </label>

      {err && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 text-sm text-amber-200">{err}</div>
      )}

      <div className="flex gap-2 sticky bottom-0 bg-slate-950 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 px-4 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <X size={18} /> Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!valid || saving}
          className="flex-1 px-4 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-700"
        >
          <Check size={18} /> {saving ? 'Guardando…' : def.startVerb}
        </button>
      </div>
    </div>
  );
}

/**
 * ProcesoDetalle — detalle de un proceso en seguimiento: resumen + línea de
 * tiempo de ETAPAS (con confirmación de avance), observaciones por texto/voz,
 * fotos del ciclo y el AVANCE (eventos del ciclo en orden).
 */
function ProcesoDetalle({ def, proceso, stageSeq, locationOptions = [], onReload }) {
  const a = useMemo(() => proceso.attributes || {}, [proceso]);
  const processId = proceso.process_id || proceso.id;
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState([]);
  const pigProfile = useMemo(() => getPigProfile(a), [a]);
  const [cocheraDraft, setCocheraDraft] = useState(pigProfile.cochera);
  const [loteDraft, setLoteDraft] = useState({
    raza: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    cantidad: '',
    peso_inicial: '',
  });
  const [eventoDraft, setEventoDraft] = useState({
    tipo: 'peso',
    fecha: new Date().toISOString().split('T')[0],
    valor: '',
    detalle: '',
  });
  const [pigBusy, setPigBusy] = useState(false);
  const [pigMessage, setPigMessage] = useState('');
  const pigClimate = useMemo(() => getPigClimateContext(a.subject_label || def.title), [a.subject_label, def.title]);
  const pigDiagnosis = useMemo(() => diagnosticarAnimal(a.subject_label || 'cerdos'), [a.subject_label]);

  // Nombre del lote resuelto desde el store (NO inventamos el nombre).
  const locName = useMemo(() => {
    if (!a.location_land_asset_id) return null;
    return locationOptions.find((o) => o.id === a.location_land_asset_id)?.label || null;
  }, [a.location_land_asset_id, locationOptions]);

  // Perfil de la finca para la sub-vista de Carbono/PSA (solo reforestación).
  // Misma fuente que RestauracionPlanPDFButton: finca activa + perfil de usuario.
  // Si no hay altitud conocida, queda undefined — NO se inventa.
  const activeFinca = useFincaActiveStore((s) => s.getActiveFinca());
  const perfilFinca = useMemo(() => {
    const profile = (() => { try { return getProfile(); } catch { return null; } })();
    const altitud = activeFinca?.altitud ?? profile?.finca_altitud ?? profile?.altitud ?? undefined;
    return { altitud: altitud == null ? undefined : Number(altitud), enParamo: Number(altitud) >= 3000 || undefined };
  }, [activeFinca]);

  const loadEvents = useCallback(async () => {
    try { setEvents((await getFarmEvents(processId)) || []); }
    catch { setEvents([]); }
  }, [processId]);

  useEffect(() => {
    // Carga los eventos del proceso al montar el detalle (patrón "cargar al
    // montar"; loadEvents hace su setState tras await IndexedDB).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  const currentIdx = stageSeq.findIndex((s) => s.stage === a.current_stage);

  const handleStage = useCallback(async (newStage) => {
    if (busy || newStage === a.current_stage) return;
    setBusy(true);
    try {
      await confirmStage({ processId, newStage, actor: 'operator', reason: 'avance en campo' });
      await loadEvents();
      onReload?.();
    } catch (e) {
      console.warn('[SeguimientoProceso] confirmStage:', e.message);
    } finally {
      setBusy(false);
    }
  }, [busy, a.current_stage, processId, loadEvents, onReload]);

  const savePigProfile = useCallback(async () => {
    if (def.processType !== 'pigs') return;
    setPigBusy(true);
    setPigMessage('');
    try {
      const next = {
        ...proceso,
        attributes: {
          ...a,
          pig_cochera: {
            nombre: cocheraDraft.nombre.trim(),
            ubicacion: cocheraDraft.ubicacion.trim(),
            capacidad: cocheraDraft.capacidad === '' ? '' : Number(cocheraDraft.capacidad),
            cama_profunda: cocheraDraft.cama_profunda,
          },
          pig_lotes: pigProfile.lotes,
          updated_at: Date.now(),
        },
      };
      await putFarmProcess(next);
      setPigMessage('Cochera guardada.');
      onReload?.();
    } finally {
      setPigBusy(false);
    }
  }, [a, cocheraDraft, def.processType, onReload, pigProfile.lotes, proceso]);

  const addPigLote = useCallback(async () => {
    if (def.processType !== 'pigs') return;
    if (!loteDraft.raza.trim() || !Number(loteDraft.cantidad) || !Number(loteDraft.peso_inicial)) return;
    setPigBusy(true);
    setPigMessage('');
    try {
      const lote = {
        raza: loteDraft.raza.trim(),
        fecha_ingreso: loteDraft.fecha_ingreso,
        cantidad: Number(loteDraft.cantidad),
        peso_inicial: Number(loteDraft.peso_inicial),
      };
      const next = {
        ...proceso,
        attributes: {
          ...a,
          pig_lotes: [...pigProfile.lotes, lote],
          updated_at: Date.now(),
        },
      };
      await putFarmProcess(next);
      await recordFarmEvent({
        process_id: processId,
        event_type: 'observation',
        payload: { kind: 'pig_lote', ...lote },
      });
      setLoteDraft({
        raza: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        cantidad: '',
        peso_inicial: '',
      });
      setPigMessage('Lote registrado.');
      onReload?.();
      await loadEvents();
    } finally {
      setPigBusy(false);
    }
  }, [a, def.processType, loteDraft, loadEvents, onReload, pigProfile.lotes, processId, proceso]);

  const addPigEvent = useCallback(async () => {
    if (def.processType !== 'pigs') return;
    const basePayload = { kind: eventoDraft.tipo, fecha: eventoDraft.fecha };
    if (eventoDraft.tipo === 'peso') {
      if (!Number(eventoDraft.valor)) return;
      basePayload.peso_kg = Number(eventoDraft.valor);
    } else if (eventoDraft.tipo === 'alimentacion') {
      if (!eventoDraft.detalle.trim()) return;
      basePayload.detalle = eventoDraft.detalle.trim();
    } else {
      if (!eventoDraft.detalle.trim()) return;
      basePayload.detalle = eventoDraft.detalle.trim();
    }
    setPigBusy(true);
    setPigMessage('');
    try {
      await recordFarmEvent({
        process_id: processId,
        event_type: 'observation',
        payload: basePayload,
      });
      setEventoDraft({
        tipo: eventoDraft.tipo,
        fecha: new Date().toISOString().split('T')[0],
        valor: '',
        detalle: '',
      });
      setPigMessage('Evento guardado.');
      await loadEvents();
      onReload?.();
    } finally {
      setPigBusy(false);
    }
  }, [def.processType, eventoDraft, loadEvents, onReload, processId]);

  return (
    <div className="px-4 pb-10 flex flex-col gap-4">
      {/* Resumen */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-200">{a.subject_label || def.title}</span>
          <span className={`text-2xs px-2 py-0.5 rounded-full font-bold ${a.status === 'active' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
            {a.status === 'active' ? 'EN CURSO' : (a.status || '').toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-400">
          {a.quantity ? <span>{a.quantity} {a.unit}</span> : null}
          <span className="flex items-center gap-1"><CalendarDays size={11} /> Inicio: {fmtDate(a.created_at)}</span>
          {locName && <span className="flex items-center gap-1"><MapPin size={11} /> {locName}</span>}
        </div>
        {a.notes && <p className="text-xs text-slate-300 italic">"{a.notes}"</p>}
      </section>

      {def.processType === 'pigs' && PIG_GUARD && (
        <div className="bg-red-900/25 border border-red-800/60 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200 leading-snug">{PIG_GUARD}</p>
        </div>
      )}

      {def.processType === 'pigs' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Guía de manejo del cerdo</h2>
            <p className="text-2xs text-slate-500">Resumen práctico de manejo, alimentación y sanidad, basado en fuentes públicas.</p>
          </div>
          {pigClimate && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs font-bold text-lime-200">{pigClimate.title}</p>
              <p className="text-2xs text-slate-400 mt-1">{pigClimate.caution}</p>
              <p className="text-2xs text-slate-500 mt-2">Alimentos sugeridos: {pigClimate.foods.join(', ')}</p>
            </div>
          )}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs font-bold text-slate-200">Alertas sanitarias</p>
            <ul className="mt-2 space-y-1 text-2xs text-slate-400">
              <li>Vacunas y desparasitacion dependen del municipio y de la resolucion ICA vigente.</li>
              <li>Aborto, mortalidad súbita o sangrados exigen veterinario y posible aviso al ICA.</li>
              <li>No dar lavaza cruda ni sobras con carne sin manejo termico.</li>
            </ul>
          </div>
          {Array.isArray(PIG_SANITY_GUARDS) && PIG_SANITY_GUARDS.length > 0 && (
            <div className="rounded-lg border border-red-800/60 bg-red-950/20 p-3">
              <p className="text-xs font-bold text-red-200">Guardas activas</p>
              <ul className="mt-2 space-y-1 text-2xs text-red-100/90">
                {PIG_SANITY_GUARDS.map((g) => <li key={g}>- {g}</li>)}
              </ul>
            </div>
          )}
          {pigDiagnosis?.especie && (
            <details className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <summary className="cursor-pointer text-xs font-bold text-slate-200">Ver detalle de alimentación y guardas</summary>
              <pre className="mt-2 whitespace-pre-wrap text-2xs text-slate-400 leading-relaxed">{formatearGroundingAnimal(pigDiagnosis)}</pre>
            </details>
          )}
          {/* Fuentes / Saber más — enlaces públicos reales (cama profunda y
              porcicultura agroecológica: FAO/AGROSAVIA; sanidad: ICA). */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <BookOpen size={14} aria-hidden="true" /> Fuentes y saber más
            </p>
            <ul className="mt-2 space-y-1.5">
              {['ica', 'agrosavia', 'fao', 'sena'].map((k) => {
                const f = FUENTES_OFICIALES[k];
                if (!f) return null;
                return (
                  <li key={f.url}>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 text-2xs text-sky-300 hover:text-sky-200"
                    >
                      <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
                      <span className="font-bold">{f.nombre}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-2xs text-slate-500 leading-relaxed">
              Vacunas, desparasitación y tratamientos dependen del municipio y de la
              resolución ICA vigente. Consulta a un técnico o veterinario; esta guía no
              reemplaza la asistencia profesional.
            </p>
          </div>
        </section>
      )}

      {def.processType === 'pigs' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Cochera y lotes</h2>
              <p className="text-2xs text-slate-500">Guarda la cochera, registra el lote y sigue los eventos del cerdo.</p>
            </div>
            <span className="text-2xs px-2 py-0.5 rounded-full bg-pink-900/30 text-pink-200 border border-pink-800/60">Porcicultura</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-bold text-slate-400 uppercase">Nombre de la cochera</span>
              <input
                type="text"
                value={cocheraDraft.nombre}
                onChange={(e) => setCocheraDraft((p) => ({ ...p, nombre: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                disabled={pigBusy}
                placeholder="Ej: Cochera El Mango"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-bold text-slate-400 uppercase">Ubicación</span>
              <input
                type="text"
                value={cocheraDraft.ubicacion}
                onChange={(e) => setCocheraDraft((p) => ({ ...p, ubicacion: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                disabled={pigBusy}
                placeholder="Ej: Junto al corral de servicio"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-bold text-slate-400 uppercase">Capacidad</span>
                <input
                  type="number"
                  min="1"
                  value={cocheraDraft.capacidad}
                  onChange={(e) => setCocheraDraft((p) => ({ ...p, capacidad: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  disabled={pigBusy}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-bold text-slate-400 uppercase">Cama profunda</span>
                <select
                  value={cocheraDraft.cama_profunda}
                  onChange={(e) => setCocheraDraft((p) => ({ ...p, cama_profunda: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  disabled={pigBusy}
                >
                  <option value="cascarilla_de_arroz">Cascarilla de arroz</option>
                  <option value="aserrin">Aserrín</option>
                  <option value="bagazo">Bagazo seco</option>
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-2xs text-slate-400">
              <p className="font-bold text-slate-200">{pigClimate.title}</p>
              <p className="mt-1">{pigClimate.caution}</p>
            </div>
            <button
              type="button"
              onClick={savePigProfile}
              disabled={pigBusy}
              className="px-4 py-2.5 rounded-xl bg-pink-700 hover:bg-pink-600 text-white font-bold disabled:opacity-50"
            >
              Guardar cochera
            </button>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold text-slate-200 mb-2">Registrar lote</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input
                  list="razas-cerdos"
                  value={loteDraft.raza}
                  onChange={(e) => setLoteDraft((p) => ({ ...p, raza: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white w-full"
                  placeholder="Raza"
                  disabled={pigBusy}
                />
                <datalist id="razas-cerdos">
                  <option value="Yorkshire (Large White)" />
                  <option value="Landrace" />
                  <option value="Duroc" />
                  <option value="Pietrain" />
                  <option value="Hampshire" />
                  <option value="Criollo Zungo costeño" />
                  <option value="San Pedreño" />
                  <option value="Casco de Mula" />
                  <option value="Yorkshire x Landrace" />
                  <option value="Landrace x Duroc" />
                </datalist>
              </div>
              <input type="date" value={loteDraft.fecha_ingreso} onChange={(e) => setLoteDraft((p) => ({ ...p, fecha_ingreso: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" disabled={pigBusy} />
              <input type="number" min="1" value={loteDraft.cantidad} onChange={(e) => setLoteDraft((p) => ({ ...p, cantidad: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" placeholder="Cantidad" disabled={pigBusy} />
              <input type="number" min="0" step="0.1" value={loteDraft.peso_inicial} onChange={(e) => setLoteDraft((p) => ({ ...p, peso_inicial: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" placeholder="Peso inicial kg" disabled={pigBusy} />
            </div>
            <button type="button" onClick={addPigLote} disabled={pigBusy} className="mt-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold disabled:opacity-50">
              Registrar lote
            </button>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold text-slate-200 mb-2">Eventos</h3>
            <div className="grid grid-cols-1 gap-2">
              <select value={eventoDraft.tipo} onChange={(e) => setEventoDraft((p) => ({ ...p, tipo: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" disabled={pigBusy}>
                <option value="peso">Peso</option>
                <option value="alimentacion">Alimentación</option>
                <option value="sanidad">Sanidad / vacunas</option>
                <option value="reproduccion">Reproducción</option>
              </select>
              <input type="date" value={eventoDraft.fecha} onChange={(e) => setEventoDraft((p) => ({ ...p, fecha: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" disabled={pigBusy} />
              {eventoDraft.tipo === 'peso' ? (
                <input type="number" min="0" step="0.1" value={eventoDraft.valor} onChange={(e) => setEventoDraft((p) => ({ ...p, valor: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" placeholder="Peso en kg" disabled={pigBusy} />
              ) : (
                <textarea value={eventoDraft.detalle} onChange={(e) => setEventoDraft((p) => ({ ...p, detalle: e.target.value }))} rows={3} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white resize-none" placeholder={eventoDraft.tipo === 'alimentacion' ? 'Ej: maíz, yuca cocida, suero' : (eventoDraft.tipo === 'reproduccion' ? 'Ej: celo, monta, preñez confirmada, parto, destete' : 'Ej: vacuna, desparasitación, observación sanitaria')} disabled={pigBusy} />
              )}
              <button type="button" onClick={addPigEvent} disabled={pigBusy} className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold disabled:opacity-50">
                Registrar evento
              </button>
            </div>
          </div>

          {pigMessage && <p className="text-xs text-emerald-200">{pigMessage}</p>}

          <div className="border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold text-slate-200 mb-2">Lotes activos</h3>
            {pigProfile.lotes.length === 0 ? (
              <p className="text-xs text-slate-500">Aún no has registrado lotes.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pigProfile.lotes.map((lote, idx) => (
                  <li key={`${lote.raza}-${idx}`} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">
                    <strong className="block text-slate-100">{lote.raza}</strong>
                    <span className="block text-slate-500">{lote.cantidad} animales · {lote.peso_inicial} kg iniciales · {lote.fecha_ingreso}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Etapas con fechas — toca una para confirmar el avance. */}
      <section>
        <h2 className="text-2xs uppercase font-bold text-slate-500 mb-2">Etapas del proceso</h2>
        <ol className="flex flex-col gap-1.5">
          {stageSeq.map((s, i) => {
            const done = currentIdx >= 0 && i <= currentIdx;
            const isCurrent = s.stage === a.current_stage;
            const stageEvent = events.find(
              (e) => e?.attributes?.event_type === 'stage_confirmed' && e?.attributes?.payload?.new_stage === s.stage,
            );
            const when = isCurrent && i === 0 ? a.created_at : stageEvent?.attributes?.occurred_at;
            return (
              <li key={s.stage}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleStage(s.stage)}
                  aria-label={`Confirmar etapa ${s.label}`}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border flex items-center gap-3 disabled:opacity-60 transition-colors ${
                    isCurrent
                      ? 'bg-lime-900/30 border-lime-700/60'
                      : done
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full shrink-0 grid place-items-center text-2xs font-bold ${
                    done ? 'bg-lime-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {done ? <Check size={13} /> : i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm leading-tight ${isCurrent ? 'font-bold text-lime-200' : 'text-slate-200'}`}>{s.label}</span>
                    {when ? (
                      <span className="block text-3xs text-slate-500 flex items-center gap-1"><Clock size={9} /> {fmtDate(when)}</span>
                    ) : (
                      <span className="block text-3xs text-slate-600">Pendiente</span>
                    )}
                  </span>
                  {isCurrent && <span className="text-3xs text-lime-400 shrink-0 font-bold">ACTUAL</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-3xs text-slate-600 mt-1.5">Toca una etapa para marcar el avance. Los detalles técnicos de cada hito están por validar [VALIDAR].</p>
      </section>

      {/* Carbono y PSA — solo en Reforestación (restoration). Hereda el gate por
          perfil de Reforestación (el perfil urbano nunca llega a esta vista). */}
      {def.processType === 'restoration' && (
        <CarbonoPsaSubvista proceso={proceso} perfilFinca={perfilFinca} />
      )}

      {/* Observaciones (reusa el motor del ciclo) */}
      <CicloObservacion processId={processId} processHint={a.attributes?.process_type || ''} currentStage={a.current_stage} onSaved={() => { loadEvents(); onReload?.(); }} />

      {/* Fotos del proceso */}
      <CicloFotos processId={processId} />

      {/* Avance — bitácora del proceso */}
      <section>
        <h2 className="text-2xs uppercase font-bold text-slate-500 mb-2">Avance</h2>
        {events.length === 0 ? (
          <p className="text-xs text-slate-500">Sin registros todavía. Confirma una etapa, anota una observación o agrega una foto.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {events.map((e) => (
              <li key={e.event_id} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 flex items-center gap-2">
                <span className="flex-1 min-w-0">{describeEvent(e, stageSeq)}</span>
                <span className="text-3xs text-slate-600 shrink-0">{fmtDate(e.attributes?.occurred_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function describeEvent(e, stageSeq) {
  const t = e?.attributes?.event_type;
  const p = e?.attributes?.payload || {};
  if (t === 'observation' && p?.kind === 'pig_lote') {
    return `Lote: ${p.raza} · ${p.cantidad} animales · ${p.peso_inicial} kg`;
  }
  if (t === 'observation' && p?.kind === 'peso') {
    return `Peso registrado: ${p.peso_kg} kg`;
  }
  if (t === 'observation' && p?.kind === 'alimentacion') {
    return `Alimentación: ${p.detalle}`;
  }
  if (t === 'observation' && p?.kind === 'sanidad') {
    return `Sanidad: ${p.detalle}`;
  }
  if (t === 'stage_confirmed' || t === 'stage_corrected') {
    const lbl = stageSeq.find((s) => s.stage === p.new_stage)?.label || p.new_stage;
    return `Etapa: ${lbl}`;
  }
  if (t === 'photo_attached') return 'Foto agregada';
  if (t === 'observation') return p.text ? `Observación: "${p.text}"` : 'Observación';
  if (t === 'note') return p.text ? `Nota: "${p.text}"` : 'Nota de inicio';
  if (t && t.endsWith('_confirmed')) return 'Proceso iniciado';
  return t || 'Registro';
}
