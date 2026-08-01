/**
 * episodicMemoryService — MEMORIA EPISÓDICA ACTIVA de la finca (TIER 2 #6).
 *
 * Problema que resuelve: el agente usaba el estado event-sourced (FarmProcess
 * + farm_process_events en IndexedDB) solo de forma REACTIVA (auditoría IA:
 * 3.0/5). Este módulo construye un bloque de system prompt con lo que la
 * finca YA VIVIÓ respecto a lo que el usuario pregunta este turno:
 *
 *   1. MEMORIA RELEVANTE: si la query menciona una especie/plaga con
 *      historial real ("sembraste tomate el 1/5, está en floración";
 *      "registraste manejo de plagas en café en mayo"). Sale del event
 *      store REAL — cero invención.
 *   2. ANTICIPACIÓN PROACTIVA (máx. EPISODIC_MAX_ANTICIPATIONS señales):
 *      - transición de etapa fenológica inminente (próximos
 *        STAGE_LOOKAHEAD_DAYS días), calculada desde la fecha de siembra
 *        REAL + la plantilla fenológica versionada (phenologyCalculator);
 *      - recurrencia estacional: un manejo de plagas registrado por estas
 *        mismas fechas en una temporada pasada.
 *      Sin dato real (sin plantilla, sin historial estacional) → sin señal.
 *
 * DEGRADACIÓN LIMPIA: sin historial, historial irrelevante a la query o
 * fallo de IndexedDB → '' (no-op silencioso). El bloque entra al
 * promptAssembler como 'memoria' (prioridad media, SACRIFICABLE): jamás
 * desplaza guardas ni grounding.
 *
 * @module episodicMemoryService
 */
import { calculateWindows } from './phenologyCalculator';
import { listFarmProcesses, getFarmEvents } from '../db/farmProcessCache';

const DAY = 86400000;

/** Máximo de procesos narrados en el bloque de memoria (anti-spam). */
export const EPISODIC_MAX_PROCESSES = 3;
/** Máximo de señales de anticipación por turno (anti-spam). */
export const EPISODIC_MAX_ANTICIPATIONS = 2;
/** Ventana hacia adelante para señalar transición de etapa (días). */
export const STAGE_LOOKAHEAD_DAYS = 14;
/** Edad mínima de un manejo de plagas para contar como "temporada pasada". */
const SEASONAL_MIN_AGE_DAYS = 60;

/** Etiquetas legibles por etapa (acepta ambos vocabularios de farmProcess). */
const STAGE_LABELS = {
  sowing: 'Siembra',
  sowing_confirmed: 'Siembra confirmada',
  emergence: 'Emergencia (brotó)',
  germination: 'Germinación',
  vegetative: 'Crecimiento vegetativo',
  growth: 'Crecimiento',
  flowering: 'Floración',
  fruiting: 'Formación de fruto',
  harvest_window: 'Ventana de cosecha',
  harvest: 'Cosecha',
  post_harvest: 'Poscosecha',
  pest_management: 'Manejo de plagas',
  closed: 'Terminado',
  fallow: 'Descanso',
};

/** Verbo de apertura por tipo de proceso (lo que el usuario REGISTRÓ). */
const PROCESS_VERBS = {
  sowing: 'Sembraste',
  restoration: 'Registraste restauración con',
  silvopasture: 'Registraste silvopastoreo con',
  harvest: 'Registraste cosecha de',
  post_harvest: 'Registraste poscosecha de',
  pest_management: 'Registraste manejo de plagas en',
};

const _norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/** Tokens útiles (≥4 chars) de un texto normalizado. */
const _tokens = (s) => _norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 4);

const _fmtFecha = (ts) =>
  new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

const _fmtMesAno = (ts) =>
  new Date(ts).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

const _truncate = (s, max = 140) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

const _isSpeciesKind = (kind) => {
  const k = String(kind || '').toLowerCase();
  return k === '' || k === 'species' || k === 'planta' || k === 'especie' || k === 'cultivo';
};

/**
 * matchRelevantProcesses — selecciona los procesos del historial que son
 * RELEVANTES a la query de este turno. Doble vía:
 *   a) slug canónico: subject_slug ∈ canonical_id de las entidades resueltas;
 *   b) texto plano (degradación sin NLU): algún token (≥4 chars, acentos
 *      normalizados) del subject_label/slug aparece en la query, o algún
 *      token del nombre de una entidad aparece en el label/notas del proceso.
 *
 * Orden: activos primero, luego por updated_at descendente.
 *
 * @param {object} args
 * @param {string} [args.query]
 * @param {Array<object>|null} [args.resolvedEntities]
 * @param {Array<import('../types/farmProcess').FarmProcess>} [args.processes]
 * @returns {Array<import('../types/farmProcess').FarmProcess>}
 */
export function matchRelevantProcesses({ query = '', resolvedEntities = null, processes = [] } = {}) {
  if (!Array.isArray(processes) || processes.length === 0) return [];

  const slugSet = new Set();
  const entityTokens = new Set();
  if (Array.isArray(resolvedEntities)) {
    for (const e of resolvedEntities) {
      if (!e || typeof e !== 'object') continue;
      if (_isSpeciesKind(e.kind) && e.canonical_id) slugSet.add(String(e.canonical_id));
      for (const name of [e.nombre_comun, e.mentioned]) {
        for (const t of _tokens(name)) entityTokens.add(t);
      }
    }
  }
  const queryNorm = _norm(query);

  const matched = processes.filter((p) => {
    const at = p && p.attributes;
    if (!at) return false;
    if (at.subject_slug && slugSet.has(at.subject_slug)) return true;

    const procText = _norm(`${at.subject_label || ''} ${String(at.subject_slug || '').replace(/_/g, ' ')} ${at.notes || ''}`);
    // b1) token del proceso mencionado en la query (sin NLU)
    for (const t of _tokens(`${at.subject_label || ''} ${String(at.subject_slug || '').replace(/_/g, ' ')}`)) {
      if (queryNorm.includes(t)) return true;
    }
    // b2) token de una entidad resuelta presente en label/notas del proceso
    for (const t of entityTokens) {
      if (procText.includes(t)) return true;
    }
    return false;
  });

  const rank = (p) => (p.attributes.status === 'active' ? 0 : 1);
  matched.sort((a, b) => rank(a) - rank(b) || (b.attributes.updated_at || 0) - (a.attributes.updated_at || 0));
  return matched;
}

/** Última observación/nota REAL con texto usable de un proceso (o null). */
function _lastObservation(events) {
  if (!Array.isArray(events)) return null;
  for (const ev of events) {
    const at = ev && ev.attributes;
    if (!at) continue;
    if (at.event_type !== 'observation' && at.event_type !== 'note') continue;
    const text =
      (at.payload && typeof at.payload.text === 'string' && at.payload.text.trim()) ||
      (at.payload && typeof at.payload.note === 'string' && at.payload.note.trim()) ||
      (typeof at.evidence === 'string' && at.evidence.trim()) ||
      null;
    if (text) return { occurred_at: at.occurred_at, text };
  }
  return null;
}

/** Línea de memoria de UN proceso (solo datos reales del agregado). */
function _memoryLine(p, events, now) {
  const at = p.attributes;
  const label = at.subject_label || String(at.subject_slug || '').replace(/_/g, ' ') || 'ese cultivo';
  const verb = PROCESS_VERBS[at.process_type] || 'Registraste';
  const fecha = at.created_at ? _fmtFecha(at.created_at) : null;
  const dias = at.created_at ? Math.max(0, Math.round((now - at.created_at) / DAY)) : null;

  const partes = [`- ${verb} ${label}${fecha ? ` el ${fecha}` : ''}`];
  if (at.status === 'active') {
    const stageBase = String(at.current_stage || '').replace(/_confirmed$/, '');
    const stageLbl = STAGE_LABELS[at.current_stage] || STAGE_LABELS[stageBase] || stageBase;
    partes.push(` (hace ${dias} días): etapa actual ${stageLbl}.`);
  } else {
    partes.push(` (ciclo ${at.status === 'cancelled' ? 'cancelado' : 'terminado'}).`);
  }
  if (at.notes && typeof at.notes === 'string' && at.notes.trim()) {
    partes.push(` Nota registrada: "${_truncate(at.notes.trim(), 100)}".`);
  }
  const obs = _lastObservation(events);
  if (obs) {
    partes.push(`\n  Última observación (${_fmtFecha(obs.occurred_at)}): "${_truncate(obs.text)}".`);
  }
  return partes.join('');
}

/** Señales de anticipación (solo con dato real; máx. EPISODIC_MAX_ANTICIPATIONS). */
function _anticipationLines(matched, fincaAltitud, now) {
  const lines = [];

  // 1) Transición de etapa inminente: fecha de siembra REAL + plantilla
  //    fenológica versionada. Sin plantilla → sin señal (degradación limpia).
  for (const p of matched) {
    const at = p.attributes;
    if (at.status !== 'active') continue;
    if (!['sowing', 'restoration', 'silvopasture'].includes(at.process_type)) continue;
    if (!at.subject_slug || !at.created_at) continue;
    let windows;
    try {
      windows = calculateWindows({ speciesSlug: at.subject_slug, sowingDate: at.created_at, altitudeM: fincaAltitud || undefined });
    } catch {
      continue;
    }
    const upcoming = (windows || []).find(
      (w) =>
        w.status === 'computed' &&
        Number.isFinite(w.windowStart) &&
        w.windowStart > now &&
        w.windowStart <= now + STAGE_LOOKAHEAD_DAYS * DAY,
    );
    if (!upcoming) continue;
    const label = at.subject_label || at.subject_slug;
    const hasta = upcoming.windowEnd ? ` y el ${_fmtFecha(upcoming.windowEnd)}` : ' en adelante';
    lines.push(
      `- OJO: según tu fecha de siembra real, tu ${label} entra a ${upcoming.label} aproximadamente entre el ${_fmtFecha(upcoming.windowStart)}${hasta} (estimado fenológico, no fecha exacta).`,
    );
  }

  // 2) Recurrencia estacional: manejo de plagas registrado por estas mismas
  //    fechas (mes ±1) en una temporada pasada (≥ SEASONAL_MIN_AGE_DAYS).
  for (const p of matched) {
    const at = p.attributes;
    if (at.process_type !== 'pest_management' || !at.created_at) continue;
    const age = now - at.created_at;
    if (age < SEASONAL_MIN_AGE_DAYS * DAY) continue;
    const m1 = new Date(at.created_at).getMonth();
    const m2 = new Date(now).getMonth();
    const monthDist = Math.min((m1 - m2 + 12) % 12, (m2 - m1 + 12) % 12);
    if (monthDist > 1) continue;
    const label = at.subject_label || at.subject_slug || 'ese cultivo';
    lines.push(
      `- La temporada pasada registraste manejo de plagas en ${label} por estas mismas fechas (${_fmtMesAno(at.created_at)}) — vale la pena monitorear el cultivo esta semana.`,
    );
  }

  return lines.slice(0, EPISODIC_MAX_ANTICIPATIONS);
}

/**
 * buildEpisodicMemoryBlock — formateador PURO del bloque de memoria episódica.
 * Solo narra eventos REALES del event store; sin historial relevante → ''.
 *
 * @param {object} args
 * @param {string} [args.query]
 * @param {Array<object>|null} [args.resolvedEntities]
 * @param {Array<import('../types/farmProcess').FarmProcess>} [args.processes]
 * @param {Object<string, Array<import('../types/farmProcess').FarmProcessEvent>>} [args.eventsByProcess]
 *   eventos por process_id, ordenados por occurred_at DESC (como getFarmEvents).
 * @param {number|null} [args.fincaAltitud] - msnm para la corrección fenológica.
 * @param {number} [args.now=Date.now()]
 * @returns {string} bloque de system prompt, o '' (no-op).
 */
export function buildEpisodicMemoryBlock({
  query = '',
  resolvedEntities = null,
  processes = [],
  eventsByProcess = {},
  fincaAltitud = null,
  now = Date.now(),
} = {}) {
  const matched = matchRelevantProcesses({ query, resolvedEntities, processes });
  if (matched.length === 0) return '';

  const narrados = matched.slice(0, EPISODIC_MAX_PROCESSES);
  const memLines = narrados.map((p) => _memoryLine(p, eventsByProcess[p.process_id], now));
  const anticipaciones = _anticipationLines(matched, fincaAltitud, now);

  const secciones = [
    `=== MEMORIA DE TU FINCA (historial REAL registrado — personaliza con esto) ===
${memLines.join('\n')}`,
  ];
  if (anticipaciones.length > 0) {
    secciones.push(`ANTICIPACIÓN (derivada de tu historial + fenología — menciónala solo si aporta):
${anticipaciones.join('\n')}`);
  }
  secciones.push(`REGLA: estos son los ÚNICOS eventos registrados en la finca del usuario sobre lo que pregunta. Úsalos para personalizar la respuesta ("tu lote que sembraste el…"). JAMÁS inventes eventos, fechas, plagas ni cosechas que no estén listados aquí; si el usuario pregunta por algo sin registro, dilo honestamente.
=== FIN MEMORIA DE TU FINCA ===`);

  return secciones.join('\n\n');
}

/**
 * buildEpisodicMemoryContext — loader + formateador. Lee el event store local
 * (farmProcessCache en IndexedDB) y arma el bloque. CUALQUIER fallo (IDB no
 * disponible, datos corruptos) degrada a '' sin romper el turno.
 *
 * @param {object} args
 * @param {string} [args.query]
 * @param {Array<object>|null} [args.resolvedEntities]
 * @param {number|null} [args.fincaAltitud]
 * @param {number} [args.now=Date.now()]
 * @returns {Promise<string>}
 */
export async function buildEpisodicMemoryContext({
  query = '',
  resolvedEntities = null,
  fincaAltitud = null,
  now = Date.now(),
} = {}) {
  try {
    const processes = (await listFarmProcesses()) || [];
    if (processes.length === 0) return '';

    const matched = matchRelevantProcesses({ query, resolvedEntities, processes });
    if (matched.length === 0) return '';

    const eventsByProcess = {};
    await Promise.all(
      matched.slice(0, EPISODIC_MAX_PROCESSES).map(async (p) => {
        try {
          eventsByProcess[p.process_id] = (await getFarmEvents(p.process_id)) || [];
        } catch {
          eventsByProcess[p.process_id] = [];
        }
      }),
    );

    return buildEpisodicMemoryBlock({ query, resolvedEntities, processes, eventsByProcess: /** @type {any} */ (eventsByProcess), fincaAltitud, now });
  } catch (err) {
    console.warn('[EpisodicMemory] degradando a no-op:', err && err.message);
    return '';
  }
}
