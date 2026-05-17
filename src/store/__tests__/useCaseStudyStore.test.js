import { describe, it, expect, beforeEach } from 'vitest';
import { useCaseStudyStore, CASE_STATES } from '../useCaseStudyStore';

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
});
