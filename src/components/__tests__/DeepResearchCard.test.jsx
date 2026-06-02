/**
 * DeepResearchCard.test.jsx — TDD del card de progreso + informe Deep Research (A6/A7).
 *
 * Valida:
 *   A6 — Card de progreso: estado 'submitting'/'running' muestra spinner +
 *        steps visibles + ETA honesto + botón Cancelar.
 *   A7 — Informe citado: status='done' renderiza report + CitationBadge por
 *        citation. Si el informe está vacío, muestra texto útil (no pantalla en blanco).
 *   Gate: status='disabled' y status='offline' muestran mensajes honestos.
 *   Colapsable: el toggle abre/cierra el cuerpo.
 *   Microcopy colombiano: nunca voseo argentino.
 *   Accessibility: aria-expanded en el toggle, roles y data-testid presentes.
 *
 * Mocking: ninguno — el componente es presentacional puro (no hace fetch).
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import DeepResearchCard from '../DeepResearchCard';

// ── Helpers ────────────────────────────────────────────────────────────────

function renderCard(props) {
  return render(<DeepResearchCard {...props} />);
}

// ── Gate: disabled y offline ────────────────────────────────────────────────

describe('DeepResearchCard — gate: no disponible', () => {
  test('status=disabled muestra mensaje de plan no disponible', () => {
    renderCard({ status: 'disabled', steps: [], report: '', citations: [], query: '' });
    const card = screen.getByTestId('deep-research-card');
    expect(card).toHaveAttribute('data-status', 'disabled');
    expect(card).toHaveTextContent(/no está disponible en este plan/i);
  });

  test('status=offline muestra mensaje de sin conexión', () => {
    renderCard({ status: 'offline', steps: [], report: '', citations: [], query: '' });
    const card = screen.getByTestId('deep-research-card');
    expect(card).toHaveAttribute('data-status', 'offline');
    expect(card).toHaveTextContent(/sin conexión/i);
  });

  test('status=error muestra mensaje de error honesto', () => {
    renderCard({ status: 'error', steps: [], report: '', citations: [], query: '' });
    const card = screen.getByTestId('deep-research-card');
    expect(card).toHaveAttribute('data-status', 'error');
    expect(card).toHaveTextContent(/error/i);
  });

  test('sin status → no renderiza nada', () => {
    const { container } = renderCard({});
    expect(container.firstChild).toBeNull();
  });
});

// ── A6: estado de progreso ──────────────────────────────────────────────────

describe('DeepResearchCard — A6: progreso (running/submitting)', () => {
  test('status=submitting muestra spinner y header "Investigando a fondo…"', () => {
    renderCard({ status: 'submitting', steps: [], report: '', citations: [], query: 'cacao' });
    expect(screen.getByTestId('deep-research-card')).toHaveAttribute('data-status', 'submitting');
    expect(screen.getByRole('button', { name: /investigando a fondo/i })).toBeInTheDocument();
  });

  test('status=running muestra los steps visibles', () => {
    renderCard({
      status: 'running',
      steps: ['¿Qué es el cacao?', '¿Cuándo se siembra?'],
      report: '',
      citations: [],
      query: 'cacao agroforestal',
    });
    const stepsList = screen.getByTestId('deep-research-steps');
    expect(stepsList).toBeInTheDocument();
    expect(within(stepsList).getByText('¿Qué es el cacao?')).toBeInTheDocument();
    expect(within(stepsList).getByText('¿Cuándo se siembra?')).toBeInTheDocument();
  });

  test('ETA honesto visible mientras running con 0 steps', () => {
    renderCard({ status: 'running', steps: [], report: '', citations: [], query: 'achiote' });
    // El hint de ETA contiene "Iniciando"
    expect(screen.getByText(/iniciando investigación/i)).toBeInTheDocument();
  });

  test('ETA progresa con más steps', () => {
    renderCard({
      status: 'running',
      steps: ['Paso A', 'Paso B', 'Paso C'],
      report: '',
      citations: [],
      query: 'agroforestería',
    });
    expect(screen.getByText(/3 sub-preguntas/i)).toBeInTheDocument();
  });

  test('botón Cancelar visible mientras running + llama onCancel', () => {
    const onCancel = vi.fn();
    renderCard({
      status: 'running',
      steps: [],
      report: '',
      citations: [],
      query: 'cacao',
      onCancel,
    });
    const cancelBtn = screen.getByTestId('deep-research-cancel');
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test('botón Cancelar NO aparece si no hay onCancel', () => {
    renderCard({ status: 'running', steps: [], report: '', citations: [], query: 'cacao' });
    expect(screen.queryByTestId('deep-research-cancel')).not.toBeInTheDocument();
  });

  test('la query del usuario aparece como contexto', () => {
    renderCard({
      status: 'running',
      steps: [],
      report: '',
      citations: [],
      query: 'sistema agroforestal con cacao y plátano',
    });
    expect(screen.getByTestId('deep-research-query')).toHaveTextContent(
      'sistema agroforestal con cacao y plátano',
    );
  });
});

// ── A7: informe citado ──────────────────────────────────────────────────────

describe('DeepResearchCard — A7: informe citado (done)', () => {
  const DONE_PROPS = {
    status: 'done',
    steps: ['¿Qué es el achiote?', '¿Cuándo se cosecha?'],
    report: 'El achiote (Bixa orellana) es un arbusto nativo de América tropical.',
    citations: [
      { source_id: 'agrosavia-1', label: 'Agrosavia', url: 'https://agrosavia.co/doc' },
      { source_id: 'fao-2', label: 'FAO', url: 'https://fao.org/doc' },
      { source_id: 'sin-url-3', label: 'Catálogo Chagra' }, // sin URL
    ],
    query: 'achiote cultivo colombia',
  };

  test('renderiza el informe cuando status=done', () => {
    renderCard(DONE_PROPS);
    const report = screen.getByTestId('deep-research-report');
    expect(report).toBeInTheDocument();
    expect(report).toHaveTextContent('El achiote');
  });

  test('muestra un CitationBadge por cada citation', () => {
    renderCard(DONE_PROPS);
    const badges = screen.getAllByTestId('deep-research-citation-badge');
    expect(badges).toHaveLength(3);
  });

  test('citations con URL son links clickeables (CSP-safe: <a> nativo)', () => {
    renderCard(DONE_PROPS);
    const agrosaviaLink = screen.getByRole('link', { name: /agrosavia/i });
    expect(agrosaviaLink).toHaveAttribute('href', 'https://agrosavia.co/doc');
    expect(agrosaviaLink).toHaveAttribute('target', '_blank');
    expect(agrosaviaLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('citations sin URL son badges de solo texto (sin <a>)', () => {
    renderCard(DONE_PROPS);
    // "Catálogo Chagra" no tiene URL → span, no anchor
    const badges = screen.getAllByTestId('deep-research-citation-badge');
    const chagraBadge = badges.find((b) => b.textContent.includes('Catálogo Chagra'));
    expect(chagraBadge).toBeTruthy();
    expect(chagraBadge.tagName).toBe('SPAN');
  });

  test('data-source-id en badges refleja el source_id real', () => {
    renderCard(DONE_PROPS);
    const agrosaviaLink = screen.getByRole('link', { name: /agrosavia/i });
    expect(agrosaviaLink).toHaveAttribute('data-source-id', 'agrosavia-1');
  });

  test('sub-preguntas visibles en un <details> colapsable', () => {
    renderCard(DONE_PROPS);
    const summary = screen.getByTestId('deep-research-steps-summary');
    expect(summary).toHaveTextContent(/2 sub-preguntas/i);
  });

  test('cuando report está vacío muestra texto útil (no pantalla en blanco)', () => {
    renderCard({
      ...DONE_PROPS,
      report: '',
      citations: [],
    });
    // No debe haber un div de report vacío — debe mostrar un texto alternativo
    expect(screen.queryByTestId('deep-research-report')).not.toBeInTheDocument();
    expect(screen.getByText(/completó sin generar un informe/i)).toBeInTheDocument();
  });

  test('area de citations NO aparece si citations está vacía', () => {
    renderCard({ ...DONE_PROPS, citations: [] });
    expect(screen.queryByTestId('deep-research-citations')).not.toBeInTheDocument();
  });
});

// ── Colapsable ─────────────────────────────────────────────────────────────

describe('DeepResearchCard — colapsable', () => {
  test('el toggle abre y cierra el cuerpo con aria-expanded', () => {
    renderCard({
      status: 'done',
      steps: ['Paso A'],
      report: 'Informe completo.',
      citations: [],
      query: 'aguacate',
    });
    const toggle = screen.getByTestId('deep-research-card-toggle');
    // Empieza expandido
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('deep-research-report')).toBeInTheDocument();

    // Colapsar
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('deep-research-report')).not.toBeInTheDocument();

    // Expandir de nuevo
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('deep-research-report')).toBeInTheDocument();
  });
});

// ── Microcopy colombiano (sin voseo) ──────────────────────────────────────

describe('DeepResearchCard — microcopy colombiano', () => {
  const VOSEO = /\b(escrib[íi]|tom[áa]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|sab[ée]s|and[áa]|dale)\b/i;

  test('ningún texto del card usa voseo argentino (running)', () => {
    const { container } = renderCard({
      status: 'running',
      steps: ['Paso A'],
      report: '',
      citations: [],
      query: 'maíz',
      onCancel: vi.fn(),
    });
    expect(container.textContent).not.toMatch(VOSEO);
  });

  test('ningún texto del card usa voseo argentino (done)', () => {
    const { container } = renderCard({
      status: 'done',
      steps: ['Paso A'],
      report: 'Informe listo.',
      citations: [{ source_id: 'src', label: 'Fuente', url: 'https://ejemplo.co' }],
      query: 'frijol',
    });
    expect(container.textContent).not.toMatch(VOSEO);
  });

  test('ningún texto del card usa voseo argentino (offline)', () => {
    const { container } = renderCard({ status: 'offline', steps: [], report: '', citations: [], query: '' });
    expect(container.textContent).not.toMatch(VOSEO);
  });
});
