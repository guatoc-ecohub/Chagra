/**
 * useCaseStudyStore.tenant.test.js — ADR-036 MVP multi-finca scoping de
 * Casos de Estudio.
 *
 * Verifica que createCase stampe `_tenant_id` y que todos los selectors
 * filtren cases de otros tenants, dejando los legacy (sin _tenant_id)
 * visibles al activo. Aísla cada test con reset del store y de
 * localStorage para que el zustand persist no contamine las assertions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setActiveTenantId,
  clearActiveTenantId,
  _resetForTests,
} from '../../services/tenantContext';
import { useCaseStudyStore } from '../useCaseStudyStore';
import { makeCase as makeCaseData } from '../../../tests/fixtures/index.js';

const resetStore = () => {
  useCaseStudyStore.setState({ cases: [] });
  if (typeof localStorage !== 'undefined') localStorage.removeItem('chagra:case-study');
  _resetForTests();
};

// Helper local — crea caso y retorna ID usando factory compartido
const makeCase = (title, opts = {}) => {
  const caseData = makeCaseData(title, opts);
  return useCaseStudyStore.getState().createCase(caseData);
};

describe('useCaseStudyStore tenant scoping (ADR-036 MVP)', () => {
  beforeEach(resetStore);

  it('createCase stamps _tenant_id from the active tenant', () => {
    setActiveTenantId('alice');
    const id = makeCase('Caso alice');
    const raw = useCaseStudyStore.getState().cases.find((c) => c.id === id);
    expect(raw._tenant_id).toBe('alice');
  });

  it('createCase leaves _tenant_id null when no tenant is active', () => {
    clearActiveTenantId();
    const id = makeCase('Caso sin login');
    const raw = useCaseStudyStore.getState().cases.find((c) => c.id === id);
    expect(raw._tenant_id).toBeNull();
  });

  it('getById returns only cases of the active tenant', () => {
    setActiveTenantId('alice');
    const aliceId = makeCase('Caso alice');
    setActiveTenantId('bob');
    const bobId = makeCase('Caso bob');

    setActiveTenantId('alice');
    expect(useCaseStudyStore.getState().getById(aliceId)?.title).toBe('Caso alice');
    expect(useCaseStudyStore.getState().getById(bobId)).toBeUndefined();

    setActiveTenantId('bob');
    expect(useCaseStudyStore.getState().getById(bobId)?.title).toBe('Caso bob');
    expect(useCaseStudyStore.getState().getById(aliceId)).toBeUndefined();
  });

  it('getActive / getByFinca / getByVisibility filter out cross-tenant cases', () => {
    setActiveTenantId('alice');
    makeCase('Caso alice 1');
    makeCase('Caso alice 2');
    setActiveTenantId('bob');
    makeCase('Caso bob 1', { finca_slug: 'restrepo' });

    setActiveTenantId('alice');
    const active = useCaseStudyStore.getState().getActive();
    expect(active.map((c) => c.title).sort()).toEqual(['Caso alice 1', 'Caso alice 2']);

    const aliceFinca = useCaseStudyStore.getState().getByFinca('guatoc');
    expect(aliceFinca.map((c) => c.title).sort()).toEqual(['Caso alice 1', 'Caso alice 2']);

    const aliceRestrepo = useCaseStudyStore.getState().getByFinca('restrepo');
    expect(aliceRestrepo).toEqual([]);

    // Visibility default es 'private' — alice solo ve los suyos.
    const alicePrivate = useCaseStudyStore.getState().getByVisibility('private');
    expect(alicePrivate.map((c) => c.title).sort()).toEqual(['Caso alice 1', 'Caso alice 2']);
  });

  it('getPendingValidation respects tenant boundary', () => {
    setActiveTenantId('alice');
    makeCase('alice 1');
    setActiveTenantId('bob');
    makeCase('bob 1');

    // Ambos arrancan con validation.status === 'pending' por defecto.
    setActiveTenantId('alice');
    const alicePending = useCaseStudyStore.getState().getPendingValidation();
    expect(alicePending.map((c) => c.title)).toEqual(['alice 1']);

    setActiveTenantId('bob');
    const bobPending = useCaseStudyStore.getState().getPendingValidation();
    expect(bobPending.map((c) => c.title)).toEqual(['bob 1']);
  });

  it('getTopActiveProblems excludes cases from other tenants', () => {
    setActiveTenantId('alice');
    makeCase('alice trozador', { severity: 'critical' });
    setActiveTenantId('bob');
    makeCase('bob mildiu', { severity: 'critical' });
    makeCase('bob roya', { severity: 'high' });

    setActiveTenantId('alice');
    const aliceTop = useCaseStudyStore.getState().getTopActiveProblems(10);
    expect(aliceTop.map((c) => c.title)).toEqual(['alice trozador']);

    setActiveTenantId('bob');
    const bobTop = useCaseStudyStore.getState().getTopActiveProblems(10);
    expect(bobTop.map((c) => c.title).sort()).toEqual(['bob mildiu', 'bob roya']);
  });

  it('legacy cases without _tenant_id stay visible to the active tenant', () => {
    // Inject a legacy case directly into the store (simulando localStorage
    // de antes del MVP multifinca).
    useCaseStudyStore.setState({
      cases: [
        {
          id: 'LEGACY',
          title: 'caso legacy',
          finca_slug: 'guatoc',
          subject: { species_ids: [], count_total: null, count_affected: null },
          problem: { name_freetext: 'x', severity: 'low', detected_at: new Date().toISOString() },
          treatments_applied: [],
          event_log_ids: [],
          photo_asset_ids: [],
          state: 'open',
          state_history: [],
          outcome: { closed_at: null, final_count_affected: null, lessons_learned: '' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // SIN _tenant_id intencionalmente.
        },
      ],
    });

    setActiveTenantId('alice');
    expect(useCaseStudyStore.getState().getById('LEGACY')?.title).toBe('caso legacy');

    setActiveTenantId('bob');
    // Mismo case legacy: también visible para bob — legacy se hereda al activo.
    expect(useCaseStudyStore.getState().getById('LEGACY')?.title).toBe('caso legacy');
  });

  it('without active tenant, all cases are visible (single-tenant fallback)', () => {
    setActiveTenantId('alice');
    makeCase('alice 1');
    setActiveTenantId('bob');
    makeCase('bob 1');

    clearActiveTenantId();
    const all = useCaseStudyStore.getState().getActive();
    expect(all.map((c) => c.title).sort()).toEqual(['alice 1', 'bob 1']);
  });

  it('hydrateDemoCases stamps _tenant_id when no seed owner is provided', () => {
    setActiveTenantId('alice');
    const added = useCaseStudyStore.getState().hydrateDemoCases([
      {
        id: 'DEMO-1',
        title: 'demo case',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'demo', severity: 'low' },
      },
    ]);
    expect(added).toBe(1);
    const raw = useCaseStudyStore.getState().cases.find((c) => c.id === 'DEMO-1');
    expect(raw._tenant_id).toBe('alice');

    // Bob no ve el demo case sembrado por alice.
    setActiveTenantId('bob');
    expect(useCaseStudyStore.getState().getById('DEMO-1')).toBeUndefined();
  });

  it('hydrateDemoCases preserves _tenant_id from the seed if present', () => {
    setActiveTenantId('alice');
    useCaseStudyStore.getState().hydrateDemoCases([
      {
        id: 'DEMO-2',
        title: 'demo case con owner',
        finca_slug: 'guatoc',
        problem: { name_freetext: 'demo', severity: 'low' },
        _tenant_id: 'bob',
      },
    ]);
    const raw = useCaseStudyStore.getState().cases.find((c) => c.id === 'DEMO-2');
    expect(raw._tenant_id).toBe('bob');
    // Alice no debe verlo aunque ella hizo el hydrate.
    expect(useCaseStudyStore.getState().getById('DEMO-2')).toBeUndefined();
  });

  it('tenantChanged listener notifies subscribers without purging data', () => {
    setActiveTenantId('alice');
    const aliceId = makeCase('alice 1');
    setActiveTenantId('bob');
    const bobId = makeCase('bob 1');

    // Disparar el evento simula el switch de login → tenantContext.setActive*.
    setActiveTenantId('alice');
    window.dispatchEvent(
      new CustomEvent('tenantChanged', { detail: { previous: 'bob', current: 'alice' } })
    );

    // Ambos casos siguen en cases[] (no se borra nada en localStorage).
    const raw = useCaseStudyStore.getState().cases.map((c) => c.id).sort();
    expect(raw).toEqual([aliceId, bobId].sort());

    // Pero el selector solo retorna alice.
    expect(useCaseStudyStore.getState().getActive().map((c) => c.title)).toEqual(['alice 1']);
  });
});
