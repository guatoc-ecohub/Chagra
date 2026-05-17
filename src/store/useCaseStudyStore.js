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
 *   created_at: ISO_8601,
 *   created_by_did: string | null,  // ADR-036 multi-finca did:key
 *   updated_at: ISO_8601,
 * }
 * ```
 *
 * Storage MVP: localStorage via zustand persist. Sin sync FarmOS aún
 * (DR-044 sub-i decide entity model formal, luego sync layer).
 *
 * ADR-019 compliance: cada update es append-only en `state_history`
 * y `treatments_applied`. NUNCA se borran eventos pasados.
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
      getById: (id) => get().cases.find((c) => c.id === id),

      getByFinca: (slug) => get().cases.filter((c) => c.finca_slug === slug),

      getActive: () =>
        get().cases.filter(
          (c) => !['closed_resolved', 'closed_failed'].includes(c.state)
        ),

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
            return { ...c, _score: score };
          })
          .sort((a, b) => b._score - a._score)
          .slice(0, limit);
      },

      // ─── Mutations (append-only spirit ADR-019) ───

      createCase: ({ title, finca_slug, zone_freetext, subject, problem }) => {
        if (!title || !finca_slug || !problem?.name_freetext) {
          throw new Error('createCase: title/finca_slug/problem.name_freetext son obligatorios');
        }
        if (problem.severity && !SEVERITY_VALID.includes(problem.severity)) {
          throw new Error(`createCase: severity inválida (${problem.severity})`);
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

export default useCaseStudyStore;
