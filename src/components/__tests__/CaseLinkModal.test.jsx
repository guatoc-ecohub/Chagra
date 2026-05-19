import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CaseLinkModal from '../CaseLinkModal';
import { useCaseStudyStore } from '../../store/useCaseStudyStore';

// Audit 070.6 — tests del bridge severity → case_study.
//
// Cubren:
//   1. Modal lista correctos (solo casos activos, filtra closed_*).
//   2. Filtrado por species_slug cuando la observación trae planta.
//   3. Caso nuevo pre-fill (species_slug, severity, created_at, timeline[0]).
//   4. CTA "Crear nuevo caso" como único path cuando no hay activos.
//   5. "Más tarde" solo cierra (no destructivo, no crea caso).

const resetStore = () => {
  useCaseStudyStore.setState({ cases: [] });
  if (typeof localStorage !== 'undefined') localStorage.removeItem('chagra:case-study');
};

describe('CaseLinkModal', () => {
  beforeEach(resetStore);

  it('lista solo casos activos (excluye closed_*)', () => {
    const store = useCaseStudyStore.getState();
    const activeId = store.createCase({
      title: 'Caso activo trozador',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'Trozador en tomate' },
    });
    const closedId = store.createCase({
      title: 'Caso cerrado mildiú',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'Mildiú resuelto' },
    });
    store.closeCase(closedId, { resolved: true });

    const onClose = vi.fn();
    render(
      <CaseLinkModal
        logId="log-test-1"
        severity="high"
        description="Daño en plántulas"
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Caso activo trozador/i)).toBeTruthy();
    expect(screen.queryByText(/Caso cerrado mildiú/i)).toBeNull();
    // Sin species_slug → muestra todos activos, no el filtrado.
    expect(screen.getByText(/Casos activos \(1\)/i)).toBeTruthy();
    expect(activeId).toBeTruthy();
  });

  it('filtra por species_slug cuando la observación trae planta', () => {
    const store = useCaseStudyStore.getState();
    store.createCase({
      title: 'Caso tomate',
      finca_slug: 'guatoc',
      subject: { species_ids: ['solanum_lycopersicum'] },
      problem: { name_freetext: 'Trozador en tomate' },
    });
    store.createCase({
      title: 'Caso lechuga',
      finca_slug: 'guatoc',
      subject: { species_ids: ['lactuca_sativa'] },
      problem: { name_freetext: 'Pulgón en lechuga' },
    });

    const onClose = vi.fn();
    render(
      <CaseLinkModal
        logId="log-test-2"
        severity="critical"
        description="Plántulas cortadas en la noche"
        speciesSlug="solanum_lycopersicum"
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Casos activos para esta especie \(1\)/i)).toBeTruthy();
    expect(screen.getByText(/Caso tomate/i)).toBeTruthy();
    expect(screen.queryByText(/Caso lechuga/i)).toBeNull();
  });

  it('si no hay matches por species, muestra lista completa de activos como fallback', () => {
    const store = useCaseStudyStore.getState();
    store.createCase({
      title: 'Caso tomate',
      finca_slug: 'guatoc',
      subject: { species_ids: ['solanum_lycopersicum'] },
      problem: { name_freetext: 'Trozador' },
    });

    render(
      <CaseLinkModal
        logId="log-test-fallback"
        severity="high"
        description="Algo raro en la fresa"
        speciesSlug="fragaria_ananassa"
        onClose={vi.fn()}
      />
    );

    // No hay caso para fragaria → fallback lista todos activos sin tag de especie.
    expect(screen.getByText(/Casos activos \(1\)/i)).toBeTruthy();
    expect(screen.getByText(/Caso tomate/i)).toBeTruthy();
  });

  it('linka el log al caso al hacer click en su card', () => {
    const store = useCaseStudyStore.getState();
    const caseId = store.createCase({
      title: 'Caso linkable',
      finca_slug: 'guatoc',
      problem: { name_freetext: 'Trozador' },
    });
    const onClose = vi.fn();

    render(
      <CaseLinkModal
        logId="log-link-1"
        severity="high"
        description="Daño severo"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText(/Caso linkable/i));

    const updated = useCaseStudyStore.getState().getById(caseId);
    expect(updated.event_log_ids).toContain('log-link-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('caso nuevo pre-fill: species_slug, severity, created_at, timeline[0] = observación', () => {
    const onClose = vi.fn();
    render(
      <CaseLinkModal
        logId="log-newcase-1"
        severity="critical"
        description="Plántulas cortadas, daño masivo overnight"
        speciesSlug="solanum_lycopersicum"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo caso de estudio/i }));

    const cases = useCaseStudyStore.getState().cases;
    expect(cases).toHaveLength(1);
    const c = cases[0];
    expect(c.subject.species_ids).toEqual(['solanum_lycopersicum']);
    expect(c.problem.severity).toBe('critical');
    expect(c.problem.name_freetext).toMatch(/Plántulas cortadas/);
    expect(c.created_at).toBeTruthy();
    expect(c.visibility).toBe('private');
    expect(c.validation.status).toBe('pending');
    // timeline[0] = evento observación
    expect(c.timeline).toHaveLength(1);
    expect(c.timeline[0].event_type).toBe('observation');
    expect(c.timeline[0].description).toMatch(/Plántulas cortadas/);
    // log queda linkado al caso recién creado
    expect(c.event_log_ids).toContain('log-newcase-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cuando no hay casos activos, expone solo el CTA "Crear nuevo caso"', () => {
    const onClose = vi.fn();
    render(
      <CaseLinkModal
        logId="log-empty-1"
        severity="high"
        description="Primer caso de la finca"
        onClose={onClose}
      />
    );

    // No hay lista (cuenta cero casos activos)
    expect(screen.queryByText(/Casos activos \(/i)).toBeNull();
    // Mensaje de empty state
    expect(screen.getByText(/No hay casos de estudio activos/i)).toBeTruthy();
    // CTA principal visible
    expect(screen.getByRole('button', { name: /Crear nuevo caso de estudio/i })).toBeTruthy();
  });

  it('"Más tarde" solo cierra y no crea caso ni linka log', () => {
    const onClose = vi.fn();
    render(
      <CaseLinkModal
        logId="log-dismiss-1"
        severity="high"
        description="No quiero crear caso aún"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Más tarde/i }));

    expect(useCaseStudyStore.getState().cases).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
