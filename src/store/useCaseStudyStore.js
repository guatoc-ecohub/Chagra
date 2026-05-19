import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * useCaseStudyStore — Módulo "Casos de Estudio"
 * ================================================================
 * MVP 2026-05-17 (driver: caso David invernadero trozador). Diseña un
 * caso como wrapper UX sobre primitives Asset+Log existentes. Los
 * campos con sufijo `_freetext` se refactorizarán a refs formales
 * cuando cierren DR-040 (pest catalog entity) y DR-041 (cohort entity).
 *
 * 2026-05-18 extensión "modo foro + validación profesional + timeline":
 *   - visibility: private | finca | public — preparado para Capa 2 de
 *     federación RAG (cases compartidos cross-finca). Hoy es solo flag
 *     local; el sync federado llega en DR-044 sub-iii.
 *   - validation: bloque que certifica el caso (status, validator, creds).
 *     Una recomendación pasa de "self-reported" a "certified" solo cuando
 *     un agrónomo/profesional la firma. Pre-requisito antes de exportar
 *     el caso a la red Chagra.
 *   - timeline[]: eventos cronológicos (observación, intervención,
 *     resultado, nota) con foto opcional. Cohabita con state_history
 *     (que sigue siendo el log append-only de transiciones de máquina
 *     de estados); timeline es la línea narrativa user-facing.
 *   - recommendations[]: sugerencias accionables (del RAG/agente o
 *     manuales) con flag `validation_required` y trazabilidad de quién
 *     las validó.
 *
 * Modelo (schema MVP):
 * ```
 * Case = {
 *   id: ULID,
 *   title: string,                 // ej. "Trozador invernadero David 2026-05-17"
 *   finca_slug: string,            // ref public/fincas-publicas.json
 *   zone_freetext: string,         // DR-041 lo formaliza
 *   subject: {
 *     species_ids: string[],       // refs catalog.species[]
 *     count_total: number | null,  // pre-DR-041 cohort
 *     count_affected: number | null,
 *   },
 *   problem: {
 *     name_freetext: string,       // ej. "Trozador (Agrotis ipsilon)"
 *     pest_id: string | null,      // DR-040 lo llena
 *     severity: 'low'|'medium'|'high'|'critical',
 *     detected_at: ISO_8601,
 *   },
 *   treatments_applied: [{
 *     biopreparado_id: string,     // ref catalog.biopreparados[]
 *     applied_at: ISO_8601,
 *     dose: string,
 *     notes: string,
 *   }],
 *   event_log_ids: string[],       // refs a logs FarmOS/IDB (ADR-019)
 *   photo_asset_ids: string[],     // refs a media FarmOS
 *   state: 'open'|'in_treatment'|'monitoring'|'closed_resolved'|'closed_failed'|'escalated',
 *   state_history: [{state, at, notes}],
 *   outcome: {
 *     closed_at: ISO_8601 | null,
 *     final_count_affected: number | null,
 *     lessons_learned: string,
 *   },
 *   // 2026-05-18 extensión foro + validación + timeline (todos opcionales,
 *   // los selectors aplican defaults defensivos para cases legacy):
 *   visibility: 'private'|'finca'|'public',
 *   validation: {
 *     status: 'pending'|'self-reported'|'certified'|'rejected',
 *     validator_name: string | null,
 *     validator_credentials: string | null,
 *     validated_at: ISO_8601 | null,
 *     notes: string | null,
 *   },
 *   timeline: [{
 *     id: string,
 *     event_type: 'observation'|'intervention'|'result'|'note',
 *     date: ISO_8601,
 *     description: string,
 *     photo_id?: string,
 *     photo_url?: string,
 *     actor?: string,
 *   }],
 *   recommendations: [{
 *     id: string,
 *     text: string,
 *     suggested_by: string,
 *     validation_required: boolean,
 *     validated_by?: string,
 *     validated_at?: ISO_8601,
 *   }],
 *   created_at: ISO_8601,
 *   created_by_did: string | null,  // ADR-036 multi-finca did:key
 *   updated_at: ISO_8601,
 * }
 * ```
 *
 * Storage MVP: localStorage via zustand persist. Sin sync FarmOS aún
 * (DR-044 sub-i decide entity model formal, luego sync layer).
 *
 * ADR-019 compliance: cada update es append-only en `state_history`,
 * `treatments_applied`, `timeline` y `recommendations`. Las
 * recomendaciones se VALIDAN (no se mutan), preservando trazabilidad.
 */

const STATES_VALID = [
  'open',
  'in_treatment',
  'monitoring',
  'closed_resolved',
  'closed_failed',
  'escalated',
];

const SEVERITY_VALID = ['low', 'medium', 'high', 'critical'];

// 2026-05-18 — modo foro + validación profesional
const VISIBILITY_VALID = ['private', 'finca', 'public'];
const VALIDATION_STATUS_VALID = ['pending', 'self-reported', 'certified', 'rejected'];
const TIMELINE_EVENT_TYPES = ['observation', 'intervention', 'result', 'note'];

// Defaults defensivos para cases pre-2026-05-18 (sin estos campos en LS).
// Se mergean lazy on-read vía getById/selectors; los mutators los aplican
// al write para que el storage quede normalizado a partir del primer save.
const DEFAULT_VALIDATION = Object.freeze({
  status: 'pending',
  validator_name: null,
  validator_credentials: null,
  validated_at: null,
  notes: null,
});

// Normaliza un case legacy (sin campos extendidos) para garantizar
// que UI siempre lee shape estable. Idempotente: si ya tiene los
// campos, no los pisa.
const withExtendedDefaults = (c) => {
  if (!c) return c;
  return {
    ...c,
    visibility: c.visibility || 'private',
    validation: c.validation
      ? { ...DEFAULT_VALIDATION, ...c.validation }
      : { ...DEFAULT_VALIDATION },
    timeline: Array.isArray(c.timeline) ? c.timeline : [],
    recommendations: Array.isArray(c.recommendations) ? c.recommendations : [],
  };
};

// ULID-lite (timestamp-sortable) sin dependency externa
const makeId = () => {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(36).toUpperCase().padStart(2, '0'))
    .join('');
  return `${ts}${rand}`.slice(0, 26);
};

const nowIso = () => new Date().toISOString();

export const useCaseStudyStore = create(
  persist(
    (set, get) => ({
      cases: [], // Case[]

      // ─── Selectors (computed, no setters) ───
      // Selectors normalizan defaults extendidos (foro/validación/timeline)
      // para cases legacy almacenados antes de 2026-05-18.
      getById: (id) => withExtendedDefaults(get().cases.find((c) => c.id === id)),

      getByFinca: (slug) =>
        get().cases.filter((c) => c.finca_slug === slug).map(withExtendedDefaults),

      getActive: () =>
        get()
          .cases.filter(
            (c) => !['closed_resolved', 'closed_failed'].includes(c.state)
          )
          .map(withExtendedDefaults),

      // Filtra por visibility (private/finca/public). Útil para UI tab
      // "Compartidos en red".
      getByVisibility: (visibility) =>
        get()
          .cases.filter((c) => (c.visibility || 'private') === visibility)
          .map(withExtendedDefaults),

      // Casos cuya recomendación o validation_status reclama un agrónomo.
      // Útil para tab "Pendiente validación".
      getPendingValidation: () =>
        get()
          .cases.filter((c) => {
            const v = c.validation?.status || 'pending';
            if (v === 'pending' || v === 'self-reported') return true;
            const recs = c.recommendations || [];
            return recs.some((r) => r.validation_required && !r.validated_by);
          })
          .map(withExtendedDefaults),

      // Top problemas activos para dashboard. Severidad × tiempo × afectados.
      // Devuelve top N ordenados (default 10).
      getTopActiveProblems: (limit = 10) => {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const now = Date.now();
        return [...get().cases]
          .filter((c) => !['closed_resolved', 'closed_failed'].includes(c.state))
          .map((c) => {
            const ageMs = now - new Date(c.problem.detected_at || c.created_at).getTime();
            const ageDays = Math.max(1, ageMs / 86400000);
            const sevW = severityWeight[c.problem.severity] || 1;
            const affPct = c.subject.count_total
              ? (c.subject.count_affected || 0) / c.subject.count_total
              : 0.1;
            // Score: severidad pesada, % afectados, tiempo sin tratamiento.
            const treated = (c.treatments_applied || []).length > 0;
            const treatPenalty = treated ? 0.5 : 1;
            const score = sevW * (0.3 + 0.7 * affPct) * Math.log2(ageDays + 1) * treatPenalty;
            return { ...withExtendedDefaults(c), _score: score };
          })
          .sort((a, b) => b._score - a._score)
          .slice(0, limit);
      },

      // ─── Mutations (append-only spirit ADR-019) ───

      createCase: ({ title, finca_slug, zone_freetext, subject, problem, visibility }) => {
        if (!title || !finca_slug || !problem?.name_freetext) {
          throw new Error('createCase: title/finca_slug/problem.name_freetext son obligatorios');
        }
        if (problem.severity && !SEVERITY_VALID.includes(problem.severity)) {
          throw new Error(`createCase: severity inválida (${problem.severity})`);
        }
        if (visibility && !VISIBILITY_VALID.includes(visibility)) {
          throw new Error(`createCase: visibility inválida (${visibility})`);
        }
        const id = makeId();
        const ts = nowIso();
        const newCase = {
          id,
          title,
          finca_slug,
          zone_freetext: zone_freetext || '',
          subject: {
            species_ids: subject?.species_ids || [],
            count_total: subject?.count_total ?? null,
            count_affected: subject?.count_affected ?? null,
          },
          problem: {
            name_freetext: problem.name_freetext,
            pest_id: problem.pest_id || null,
            severity: problem.severity || 'medium',
            detected_at: problem.detected_at || ts,
          },
          treatments_applied: [],
          event_log_ids: [],
          photo_asset_ids: [],
          state: 'open',
          state_history: [{ state: 'open', at: ts, notes: 'Caso creado' }],
          outcome: { closed_at: null, final_count_affected: null, lessons_learned: '' },
          // 2026-05-18 — extensión foro/validación/timeline
          visibility: visibility || 'private',
          validation: { ...DEFAULT_VALIDATION },
          timeline: [],
          recommendations: [],
          created_at: ts,
          created_by_did: null, // ADR-036 lo llenará en multi-finca real
          updated_at: ts,
        };
        set((s) => ({ cases: [...s.cases, newCase] }));
        return id;
      },

      // Cambia estado del caso. Append en state_history.
      transitionState: (id, newState, notes = '') => {
        if (!STATES_VALID.includes(newState)) {
          throw new Error(`transitionState: estado inválido (${newState})`);
        }
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  state: newState,
                  state_history: [
                    ...c.state_history,
                    { state: newState, at: nowIso(), notes },
                  ],
                  outcome:
                    newState.startsWith('closed_')
                      ? { ...c.outcome, closed_at: nowIso() }
                      : c.outcome,
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
      },

      // Agrega tratamiento. Append-only.
      addTreatment: (id, { biopreparado_id, dose = '', notes = '' }) => {
        if (!biopreparado_id) throw new Error('addTreatment: biopreparado_id obligatorio');
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  treatments_applied: [
                    ...c.treatments_applied,
                    { biopreparado_id, applied_at: nowIso(), dose, notes },
                  ],
                  // Auto-transition open → in_treatment si es el primer tratamiento
                  state: c.state === 'open' ? 'in_treatment' : c.state,
                  state_history:
                    c.state === 'open'
                      ? [
                          ...c.state_history,
                          {
                            state: 'in_treatment',
                            at: nowIso(),
                            notes: `Tratamiento aplicado: ${biopreparado_id}`,
                          },
                        ]
                      : c.state_history,
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
      },

      // Linka log existente (asset+log ADR-019) al caso.
      linkLog: (id, log_id) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id && !c.event_log_ids.includes(log_id)
              ? {
                  ...c,
                  event_log_ids: [...c.event_log_ids, log_id],
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
      },

      // Linka foto (media asset FarmOS).
      linkPhoto: (id, photo_asset_id) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id && !c.photo_asset_ids.includes(photo_asset_id)
              ? {
                  ...c,
                  photo_asset_ids: [...c.photo_asset_ids, photo_asset_id],
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
      },

      // Cierra caso con outcome. Wrapper sobre transitionState.
      closeCase: (id, { resolved = true, final_count_affected = null, lessons_learned = '' }) => {
        const newState = resolved ? 'closed_resolved' : 'closed_failed';
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  state: newState,
                  state_history: [
                    ...c.state_history,
                    {
                      state: newState,
                      at: nowIso(),
                      notes: lessons_learned || 'Caso cerrado',
                    },
                  ],
                  outcome: {
                    closed_at: nowIso(),
                    final_count_affected,
                    lessons_learned,
                  },
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
      },

      // ─── 2026-05-18 extensión: foro + validación + timeline ───

      // Append-only timeline event. Genera id si no se pasa.
      linkTimelineEvent: (id, eventPayload = {}) => {
        const { event_type, date, description } = eventPayload;
        if (!event_type || !TIMELINE_EVENT_TYPES.includes(event_type)) {
          throw new Error(
            `linkTimelineEvent: event_type inválido (${event_type}). Válidos: ${TIMELINE_EVENT_TYPES.join(', ')}`
          );
        }
        if (!description || !description.trim()) {
          throw new Error('linkTimelineEvent: description obligatoria');
        }
        const evt = {
          id: eventPayload.id || makeId(),
          event_type,
          date: date || nowIso(),
          description: description.trim(),
          ...(eventPayload.photo_id ? { photo_id: eventPayload.photo_id } : {}),
          ...(eventPayload.photo_url ? { photo_url: eventPayload.photo_url } : {}),
          ...(eventPayload.actor ? { actor: eventPayload.actor } : {}),
        };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  timeline: [...(c.timeline || []), evt],
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
        return evt.id;
      },

      // Actualiza bloque validation (status, validator, creds, notes).
      // No es append-only: el bloque es un puntero al último estado de
      // validación profesional. La trazabilidad histórica vive en las
      // recommendations individuales y en validated_at.
      setValidation: (id, validation = {}) => {
        const { status } = validation;
        if (status && !VALIDATION_STATUS_VALID.includes(status)) {
          throw new Error(
            `setValidation: status inválido (${status}). Válidos: ${VALIDATION_STATUS_VALID.join(', ')}`
          );
        }
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  validation: {
                    ...DEFAULT_VALIDATION,
                    ...(c.validation || {}),
                    ...validation,
                    // Si pasa a certified/rejected sin validated_at explícito,
                    // estampa la hora actual.
                    validated_at:
                      validation.validated_at ||
                      (status === 'certified' || status === 'rejected'
                        ? nowIso()
                        : c.validation?.validated_at || null),
                  },
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
      },

      // Cambia visibility (private | finca | public).
      setVisibility: (id, visibility) => {
        if (!VISIBILITY_VALID.includes(visibility)) {
          throw new Error(
            `setVisibility: inválida (${visibility}). Válidas: ${VISIBILITY_VALID.join(', ')}`
          );
        }
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id ? { ...c, visibility, updated_at: nowIso() } : c
          ),
        }));
      },

      // Agrega una recomendación accionable. Append-only.
      addRecommendation: (id, rec = {}) => {
        const { text, suggested_by } = rec;
        if (!text || !text.trim()) {
          throw new Error('addRecommendation: text obligatorio');
        }
        if (!suggested_by || !suggested_by.trim()) {
          throw new Error('addRecommendation: suggested_by obligatorio (autoría)');
        }
        const newRec = {
          id: rec.id || makeId(),
          text: text.trim(),
          suggested_by: suggested_by.trim(),
          validation_required:
            rec.validation_required !== undefined ? !!rec.validation_required : true,
          ...(rec.validated_by ? { validated_by: rec.validated_by } : {}),
          ...(rec.validated_at ? { validated_at: rec.validated_at } : {}),
        };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  recommendations: [...(c.recommendations || []), newRec],
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
        return newRec.id;
      },

      // Certifica una recomendación (agrónomo firma).
      validateRecommendation: (id, recId, validatorInfo = {}) => {
        const { validator_name } = validatorInfo;
        if (!validator_name || !validator_name.trim()) {
          throw new Error('validateRecommendation: validator_name obligatorio');
        }
        const validated_at = validatorInfo.validated_at || nowIso();
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  recommendations: (c.recommendations || []).map((r) =>
                    r.id === recId
                      ? {
                          ...r,
                          validated_by: validator_name.trim(),
                          validated_at,
                        }
                      : r
                  ),
                  updated_at: nowIso(),
                }
              : c
          ),
        }));
      },

      // Hidrata casos demo desde un payload externo (público demo seed).
      // Idempotente: solo agrega cases cuyo id NO existe ya.
      hydrateDemoCases: (demoCases = []) => {
        if (!Array.isArray(demoCases) || demoCases.length === 0) return 0;
        let added = 0;
        set((s) => {
          const existing = new Set(s.cases.map((c) => c.id));
          const toAdd = demoCases
            .filter((d) => d && d.id && !existing.has(d.id))
            .map((d) => withExtendedDefaults({
              // Defensivos: si el JSON demo tiene shape mínimo, completa.
              state_history: [{ state: d.state || 'open', at: d.created_at || nowIso(), notes: 'Caso demo' }],
              event_log_ids: [],
              photo_asset_ids: [],
              treatments_applied: [],
              outcome: { closed_at: null, final_count_affected: null, lessons_learned: '' },
              created_by_did: null,
              ...d,
            }));
          added = toAdd.length;
          if (added === 0) return s;
          return { cases: [...s.cases, ...toAdd] };
        });
        return added;
      },
    }),
    {
      name: 'chagra:case-study',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// Exporta también las constantes para validación UI.
export const CASE_STATES = STATES_VALID;
export const CASE_SEVERITIES = SEVERITY_VALID;
// 2026-05-18 — modo foro + validación profesional
export const CASE_VISIBILITIES = VISIBILITY_VALID;
export const CASE_VALIDATION_STATUSES = VALIDATION_STATUS_VALID;
export const CASE_TIMELINE_EVENT_TYPES = TIMELINE_EVENT_TYPES;

export default useCaseStudyStore;
