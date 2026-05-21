import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCaseStudyStore,
  CASE_STATES,
  CASE_VISIBILITIES,
  CASE_VALIDATION_STATUSES,
  CASE_TIMELINE_EVENT_TYPES,
} from '../useCaseStudyStore';

// Reset entre tests: setState clean + drop persist storage local.
const resetStore = () => {
  useCaseStudyStore.setState({ cases: [] });
  if (typeof localStorage !== 'undefined') localStorage.removeItem('chagra:case-study');
};

describe('useCaseStudyStore', () => {
  beforeEach(resetStore);

  it('createCase produce un caso con state=open + history inicial', () => {
    const id = useCaseStudyStore.getState().createCase({
      title: 'Trozador invernadero David 2026-05-17',
      finca_slug: 'guatoc',
      zone_freetext: 'invernadero-david',
      subject: { species_ids: ['solanum_lycopersicum_cerasiforme'], count_total: 1000, count_affected: 10 },
      problem: { name_freetext: 'Trozador (Agrotis ipsilon)', severity: 'high', detected_at: '2026-05-17T08:00:00Z' },
    });
    const c = useCaseStudyStore.getState().getById(id);
    expect(c).toBeTruthy();
    expect(c.state).toBe('open');
    expect(c.state_history).toHaveLength(1);
    expect(c.subject.count_affected).toBe(10);
    expect(c.problem.severity).toBe('high');
  });

  it('createCase rechaza title vacío', () => {
    expect(() =>
      useCaseStudyStore.getState().createCase({ title: '', finca_slug: 'guatoc', problem: { name_freetext: 'x' } })
    ).toThrow(/obligatorios/i);
  });

  it('createCase rechaza severidad inválida', () => {
    expect(() =>
      useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'p', severity: 'apocaliptica' },
      })
    ).toThrow(/severity/i);
  });

  it('addTreatment auto-transitiona open → in_treatment', () => {
    const id = useCaseStudyStore.getState().createCase({
      title: 't',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'Trozador' },
    });
    useCaseStudyStore.getState().addTreatment(id, { biopreparado_id: 'bacillus_thuringiensis', dose: '1g/L' });
    const c = useCaseStudyStore.getState().getById(id);
    expect(c.state).toBe('in_treatment');
    expect(c.treatments_applied).toHaveLength(1);
    expect(c.treatments_applied[0].biopreparado_id).toBe('bacillus_thuringiensis');
    // history apenddea entrada de tratamiento
    expect(c.state_history.some((h) => h.state === 'in_treatment')).toBe(true);
  });

  it('addTreatment no muta state si ya está in_treatment', () => {
    const id = useCaseStudyStore.getState().createCase({
      title: 't',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'Trozador' },
    });
    useCaseStudyStore.getState().addTreatment(id, { biopreparado_id: 'bacillus_thuringiensis' });
    const histLenBefore = useCaseStudyStore.getState().getById(id).state_history.length;
    useCaseStudyStore.getState().addTreatment(id, { biopreparado_id: 'trichogramma_spp' });
    const c = useCaseStudyStore.getState().getById(id);
    expect(c.state).toBe('in_treatment');
    expect(c.treatments_applied).toHaveLength(2);
    expect(c.state_history.length).toBe(histLenBefore); // no agrega state change
  });

  it('transitionState valida estados permitidos', () => {
    const id = useCaseStudyStore.getState().createCase({
      title: 't',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'x' },
    });
    expect(() => useCaseStudyStore.getState().transitionState(id, 'XYZ_invalid')).toThrow(/inválido/);
    useCaseStudyStore.getState().transitionState(id, 'monitoring', 'observación 7d');
    expect(useCaseStudyStore.getState().getById(id).state).toBe('monitoring');
  });

  it('closeCase establece outcome y closed_at', () => {
    const id = useCaseStudyStore.getState().createCase({
      title: 't',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'Trozador' },
    });
    useCaseStudyStore.getState().closeCase(id, {
      resolved: true,
      final_count_affected: 0,
      lessons_learned: 'BT funcionó. Siguiente vez prevenir con Trichogramma temprano.',
    });
    const c = useCaseStudyStore.getState().getById(id);
    expect(c.state).toBe('closed_resolved');
    expect(c.outcome.closed_at).toBeTruthy();
    expect(c.outcome.lessons_learned).toMatch(/BT/);
  });

  it('linkLog y linkPhoto append-only sin duplicar', () => {
    const id = useCaseStudyStore.getState().createCase({
      title: 't',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'x' },
    });
    useCaseStudyStore.getState().linkLog(id, 'log-1');
    useCaseStudyStore.getState().linkLog(id, 'log-1'); // duplicate ignored
    useCaseStudyStore.getState().linkLog(id, 'log-2');
    useCaseStudyStore.getState().linkPhoto(id, 'media-foto-1');
    const c = useCaseStudyStore.getState().getById(id);
    expect(c.event_log_ids).toEqual(['log-1', 'log-2']);
    expect(c.photo_asset_ids).toEqual(['media-foto-1']);
  });

  it('getActive excluye casos cerrados', () => {
    const a = useCaseStudyStore.getState().createCase({
      title: 'a',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'x' },
    });
    const b = useCaseStudyStore.getState().createCase({
      title: 'b',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'y' },
    });
    useCaseStudyStore.getState().closeCase(a, { resolved: true });
    const active = useCaseStudyStore.getState().getActive();
    expect(active.map((c) => c.id)).toEqual([b]);
  });

  it('getTopActiveProblems ordena por severidad × afectados × tiempo', () => {
    const idLow = useCaseStudyStore.getState().createCase({
      title: 'low',
      finca_slug: 'guatoc',
      subject: { count_total: 100, count_affected: 2 },
      problem: { name_freetext: 'oídio', severity: 'low', detected_at: '2026-05-17T00:00:00Z' },
    });
    const idHigh = useCaseStudyStore.getState().createCase({
      title: 'high',
      finca_slug: 'guatoc',
      subject: { count_total: 1000, count_affected: 100 },
      problem: { name_freetext: 'trozador', severity: 'critical', detected_at: '2026-05-10T00:00:00Z' },
    });
    const top = useCaseStudyStore.getState().getTopActiveProblems(5);
    expect(top[0].id).toBe(idHigh);
    expect(top[1].id).toBe(idLow);
  });

  it('CASE_STATES exporta lista canónica', () => {
    expect(CASE_STATES).toContain('open');
    expect(CASE_STATES).toContain('in_treatment');
    expect(CASE_STATES).toContain('closed_resolved');
  });

  // ─── 2026-05-18 — extensión foro + validación + timeline ───

  describe('extensión foro + validación + timeline', () => {
    it('createCase popula defaults extendidos (visibility, validation, timeline, recommendations)', () => {
      const id = useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'x' },
      });
      const c = useCaseStudyStore.getState().getById(id);
      expect(c.visibility).toBe('private');
      expect(c.validation.status).toBe('pending');
      expect(c.validation.validator_name).toBeNull();
      expect(c.timeline).toEqual([]);
      expect(c.recommendations).toEqual([]);
    });

    it('createCase acepta visibility explícita y la valida', () => {
      const id = useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'x' },
        visibility: 'public',
      });
      expect(useCaseStudyStore.getState().getById(id).visibility).toBe('public');
      expect(() =>
        useCaseStudyStore.getState().createCase({
          title: 't',
          finca_slug: 'guatoc',
          problem: { name_freetext: 'x' },
          visibility: 'meta-galaxia',
        })
      ).toThrow(/visibility/);
    });

    it('linkTimelineEvent append-only con validación de event_type', () => {
      const id = useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'x' },
      });
      const evtId = useCaseStudyStore.getState().linkTimelineEvent(id, {
        event_type: 'observation',
        description: 'Manchas en hojas viejas',
        actor: 'Operador',
      });
      const c = useCaseStudyStore.getState().getById(id);
      expect(c.timeline).toHaveLength(1);
      expect(c.timeline[0].id).toBe(evtId);
      expect(c.timeline[0].event_type).toBe('observation');
      expect(c.timeline[0].actor).toBe('Operador');
      expect(c.timeline[0].date).toBeTruthy();
      // Segundo evento se appendea sin pisar
      useCaseStudyStore.getState().linkTimelineEvent(id, {
        event_type: 'intervention',
        description: 'Caldo bordelés',
      });
      expect(useCaseStudyStore.getState().getById(id).timeline).toHaveLength(2);
      // event_type inválido rechaza
      expect(() =>
        useCaseStudyStore.getState().linkTimelineEvent(id, {
          event_type: 'epifanía',
          description: 'x',
        })
      ).toThrow(/event_type/);
      // description vacía rechaza
      expect(() =>
        useCaseStudyStore.getState().linkTimelineEvent(id, {
          event_type: 'note',
          description: '   ',
        })
      ).toThrow(/description/);
    });

    it('setValidation actualiza bloque + estampa validated_at automático en certified', () => {
      const id = useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'x' },
      });
      useCaseStudyStore.getState().setValidation(id, {
        status: 'certified',
        validator_name: 'Ing. Ana Pérez',
        validator_credentials: 'Ing. Agrónoma UNAL',
        notes: 'Diagnóstico correcto',
      });
      const c = useCaseStudyStore.getState().getById(id);
      expect(c.validation.status).toBe('certified');
      expect(c.validation.validator_name).toBe('Ing. Ana Pérez');
      expect(c.validation.validated_at).toBeTruthy();
      // Status inválido rechaza
      expect(() =>
        useCaseStudyStore.getState().setValidation(id, { status: 'epifania' })
      ).toThrow(/status/);
    });

    it('setVisibility valida valor', () => {
      const id = useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'x' },
      });
      useCaseStudyStore.getState().setVisibility(id, 'finca');
      expect(useCaseStudyStore.getState().getById(id).visibility).toBe('finca');
      useCaseStudyStore.getState().setVisibility(id, 'public');
      expect(useCaseStudyStore.getState().getById(id).visibility).toBe('public');
      expect(() =>
        useCaseStudyStore.getState().setVisibility(id, 'cosmica')
      ).toThrow(/inválida|visibility/);
    });

    it('addRecommendation + validateRecommendation flow', () => {
      const id = useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'x' },
      });
      const recId = useCaseStudyStore.getState().addRecommendation(id, {
        text: 'Aplicar caldo bordelés 0.5%',
        suggested_by: 'Agente Chagra (RAG)',
        validation_required: true,
      });
      const c1 = useCaseStudyStore.getState().getById(id);
      expect(c1.recommendations).toHaveLength(1);
      expect(c1.recommendations[0].validation_required).toBe(true);
      expect(c1.recommendations[0].validated_by).toBeUndefined();

      // Validador certifica
      useCaseStudyStore.getState().validateRecommendation(id, recId, {
        validator_name: 'Ing. Ana Pérez',
      });
      const c2 = useCaseStudyStore.getState().getById(id);
      expect(c2.recommendations[0].validated_by).toBe('Ing. Ana Pérez');
      expect(c2.recommendations[0].validated_at).toBeTruthy();

      // Rechazo si falta validator_name
      expect(() =>
        useCaseStudyStore.getState().validateRecommendation(id, recId, {})
      ).toThrow(/validator_name/);

      // addRecommendation con autoría/texto faltante rechaza
      expect(() =>
        useCaseStudyStore.getState().addRecommendation(id, { text: ' ', suggested_by: 'X' })
      ).toThrow(/text/);
      expect(() =>
        useCaseStudyStore.getState().addRecommendation(id, { text: 'algo', suggested_by: ' ' })
      ).toThrow(/suggested_by/);
    });

    it('addRecommendation default validation_required=true (gate por defecto)', () => {
      const id = useCaseStudyStore.getState().createCase({
        title: 't',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'x' },
      });
      useCaseStudyStore.getState().addRecommendation(id, {
        text: 'Algo',
        suggested_by: 'Operador',
      });
      const c = useCaseStudyStore.getState().getById(id);
      expect(c.recommendations[0].validation_required).toBe(true);
    });

    it('getByVisibility filtra correctamente', () => {
      const a = useCaseStudyStore.getState().createCase({
        title: 'a', finca_slug: 'guatoc', problem: { name_freetext: 'x' },
      });
      const b = useCaseStudyStore.getState().createCase({
        title: 'b', finca_slug: 'guatoc', problem: { name_freetext: 'y' },
      });
      useCaseStudyStore.getState().setVisibility(b, 'public');
      const pubs = useCaseStudyStore.getState().getByVisibility('public');
      expect(pubs.map((c) => c.id)).toEqual([b]);
      const privs = useCaseStudyStore.getState().getByVisibility('private');
      expect(privs.map((c) => c.id)).toEqual([a]);
    });

    it('getPendingValidation captura casos pending o con recs sin validar', () => {
      const a = useCaseStudyStore.getState().createCase({
        title: 'a', finca_slug: 'guatoc', problem: { name_freetext: 'x' },
      });
      const b = useCaseStudyStore.getState().createCase({
        title: 'b', finca_slug: 'guatoc', problem: { name_freetext: 'y' },
      });
      // Certifica b → ya no es pending por validation.status
      useCaseStudyStore.getState().setValidation(b, {
        status: 'certified', validator_name: 'Ing. X',
      });
      // Pero le agregas una rec sin validar → vuelve a aparecer
      useCaseStudyStore.getState().addRecommendation(b, {
        text: 'foo', suggested_by: 'op', validation_required: true,
      });
      const pending = useCaseStudyStore.getState().getPendingValidation();
      const ids = pending.map((c) => c.id);
      expect(ids).toContain(a); // pending por status
      expect(ids).toContain(b); // pending por rec
    });

    it('getById hidrata defaults extendidos para cases legacy', () => {
      // Inserta a mano un case legacy (sin campos extendidos) directo al state.
      useCaseStudyStore.setState({
        cases: [
          {
            id: 'legacy-1',
            title: 'legacy',
            finca_slug: 'guatoc',
            zone_freetext: '',
            subject: { species_ids: [], count_total: null, count_affected: null },
            problem: { name_freetext: 'x', pest_id: null, severity: 'medium', detected_at: null },
            treatments_applied: [],
            event_log_ids: [],
            photo_asset_ids: [],
            state: 'open',
            state_history: [],
            outcome: { closed_at: null, final_count_affected: null, lessons_learned: '' },
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
          },
        ],
      });
      const c = useCaseStudyStore.getState().getById('legacy-1');
      expect(c.visibility).toBe('private');
      expect(c.validation.status).toBe('pending');
      expect(c.timeline).toEqual([]);
      expect(c.recommendations).toEqual([]);
    });

    it('hydrateDemoCases es idempotente (no duplica por id)', () => {
      const demo = {
        id: 'demo-fresa-2026-05',
        title: 'Demo mancha foliar',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'mancha foliar', severity: 'medium' },
        subject: { species_ids: ['fragaria_ananassa_monterrey'], count_total: 100, count_affected: 3 },
        state: 'monitoring',
        visibility: 'public',
        validation: { status: 'certified', validator_name: 'Ing. Ana Pérez', validator_credentials: 'UNAL', validated_at: '2026-05-17T14:00:00Z', notes: 'ok' },
        timeline: [
          { id: 'tl-1', event_type: 'observation', date: '2026-05-15T08:00:00Z', description: 'Manchas circulares', actor: 'Operador' },
        ],
        recommendations: [
          { id: 'rec-1', text: 'Caldo bordelés', suggested_by: 'RAG', validation_required: true, validated_by: 'Ing. Ana Pérez', validated_at: '2026-05-17T14:00:00Z' },
        ],
        created_at: '2026-05-15T08:00:00Z',
        updated_at: '2026-05-17T14:00:00Z',
      };
      const added1 = useCaseStudyStore.getState().hydrateDemoCases([demo]);
      expect(added1).toBe(1);
      // Segundo run: no duplica.
      const added2 = useCaseStudyStore.getState().hydrateDemoCases([demo]);
      expect(added2).toBe(0);
      expect(useCaseStudyStore.getState().cases.filter((c) => c.id === demo.id)).toHaveLength(1);
      // Defensivos: timeline y recommendations cargan.
      const got = useCaseStudyStore.getState().getById(demo.id);
      expect(got.timeline).toHaveLength(1);
      expect(got.recommendations[0].validated_by).toBe('Ing. Ana Pérez');
      expect(got.validation.status).toBe('certified');
    });

    it('CASE_VISIBILITIES / CASE_VALIDATION_STATUSES / CASE_TIMELINE_EVENT_TYPES exportan lista canónica', () => {
      expect(CASE_VISIBILITIES).toEqual(['private', 'finca', 'public']);
      expect(CASE_VALIDATION_STATUSES).toContain('certified');
      expect(CASE_VALIDATION_STATUSES).toContain('pending');
      expect(CASE_TIMELINE_EVENT_TYPES).toEqual(['observation', 'intervention', 'result', 'note']);
    });
  });
});
