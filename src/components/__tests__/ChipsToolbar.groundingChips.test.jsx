import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import ChipsToolbar from '../ChipsToolbar';
import { CHIP_DEFS, planForcedIntent } from '../../services/chipIntentRouter';
import * as deepResearchClient from '../../services/deepResearchClient';

/**
 * ChipsToolbar.groundingChips.test.jsx — cobertura dedicada de los chips de
 * "grounding oscuro" (2026-07-01): tools que YA vivían en el grafo/catálogo
 * (ver ALLOWED_TOOLS en sidecarClient.js) pero SOLO eran alcanzables por
 * texto libre en el chat — ningún chip las disparaba.
 *
 * Se agrupan bajo el toggle "Más" (`data-testid="mode-chip-more"`) para no
 * saturar la barra principal con 6 chips nuevos de golpe (ver docstring de
 * ChipsToolbar.jsx). Este archivo cubre:
 *   1. Los 6 chips EXISTEN en el manifiesto (CHIP_DEFS) con label/emoji.
 *   2. Por defecto están OCULTOS (agrupados, no saturan la barra principal).
 *   3. El toggle "Más" los revela (segundo nivel/second-level UI).
 *   4. Cada uno, al tocarlo, dispara `onSelectIntent(intent)` — MISMO
 *      mecanismo que los chips existentes (ninguno nuevo).
 *   5. `planForcedIntent` mapea cada intent al tool correcto (grounding real,
 *      no solo un botón decorativo).
 */

const GROUNDING_CHIPS = [
  { intent: 'toxicidad', label: 'Toxicidad', tool: 'get_toxicidad' },
  { intent: 'saberes_tradicionales', label: 'Saberes tradicionales', tool: 'get_saberes_tradicionales' },
  { intent: 'alerta_paramo', label: 'Alerta normativa páramo', tool: 'get_alerta_normativa_paramo' },
  { intent: 'variedades', label: 'Variedades', tool: 'get_variedades_cultivo' },
  { intent: 'polinizacion', label: 'Polinización', tool: 'get_polinizacion' },
  { intent: 'fenologia', label: 'Fenología', tool: 'get_fenologia' },
];

describe('ChipsToolbar — grounding oscuro: los chips existen en el manifiesto', () => {
  test('CHIP_DEFS incluye los 6 chips nuevos, marcados moreGroup:true', () => {
    for (const { intent, label } of GROUNDING_CHIPS) {
      const def = CHIP_DEFS.find((d) => d.intent === intent);
      expect(def, `falta el chip ${intent} en CHIP_DEFS`).toBeTruthy();
      expect(def.label).toBe(label);
      expect(def.kind).toBe('tool');
      expect(def.moreGroup).toBe(true);
      expect(typeof def.emoji).toBe('string');
      expect(def.emoji.length).toBeGreaterThan(0);
      expect(typeof def.placeholder).toBe('string');
      expect(def.placeholder.length).toBeGreaterThan(0);
    }
  });

  test('ningún chip nuevo usa voseo argentino', () => {
    const VOSEO = /\b(escrib[íi]|tom[áa]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|dale|sab[ée]s|and[áa]|fij[áa]te)\b/i;
    for (const { intent } of GROUNDING_CHIPS) {
      const def = CHIP_DEFS.find((d) => d.intent === intent);
      expect(def.label).not.toMatch(VOSEO);
      expect(def.placeholder).not.toMatch(VOSEO);
    }
  });
});

describe('ChipsToolbar — grupo "Más": oculto por defecto, no satura la barra', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('el toggle "Más" aparece cuando hay chips agrupados', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    expect(screen.getByTestId('mode-chip-more')).toBeInTheDocument();
  });

  test('sin expandir "Más", ningún chip de grounding oscuro está en el DOM', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    for (const { label } of GROUNDING_CHIPS) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  test('el toggle "Más" arranca con aria-expanded=false', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    expect(screen.getByTestId('mode-chip-more')).toHaveAttribute('aria-expanded', 'false');
  });

  test('clickear "Más" revela los 6 chips de grounding oscuro (segundo nivel)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    expect(screen.getByTestId('mode-chip-more')).toHaveAttribute('aria-expanded', 'true');
    for (const { label } of GROUNDING_CHIPS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test('el panel expandido tiene role="toolbar" propio (segundo nivel accesible)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    const panel = document.getElementById('chips-toolbar-more');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('role', 'toolbar');
    expect(screen.getByTestId('mode-chip-more')).toHaveAttribute('aria-controls', 'chips-toolbar-more');
  });

  test('clickear "Más" de nuevo la vuelve a ocultar (toggle)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    const toggle = screen.getByTestId('mode-chip-more');
    fireEvent.click(toggle);
    expect(screen.getByText('Toxicidad')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('Toxicidad')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('los chips agrupados NO afectan los chips existentes (siembro/plaga/clima siguen igual)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    expect(screen.getByText('¿Qué siembro?')).toBeInTheDocument();
    expect(screen.getByText('Plaga')).toBeInTheDocument();
    expect(screen.getByText('Clima')).toBeInTheDocument();
  });
});

describe('ChipsToolbar — grupo "Más": cada chip dispara su intención (mismo mecanismo)', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each(GROUNDING_CHIPS)(
    'clickear "$label" llama onSelectIntent("$intent") — reutiliza onSelectIntent, no un mecanismo nuevo',
    ({ intent, label }) => {
      const onSelectIntent = vi.fn();
      render(<ChipsToolbar onSelectIntent={onSelectIntent} />);
      fireEvent.click(screen.getByTestId('mode-chip-more'));
      fireEvent.click(screen.getByText(label));
      expect(onSelectIntent).toHaveBeenCalledTimes(1);
      expect(onSelectIntent).toHaveBeenCalledWith(intent);
    },
  );

  test('cada chip agrupado usa el testid compartido mode-chip + data-intent (mismo patrón de registro)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    const panel = document.getElementById('chips-toolbar-more');
    const chipsInPanel = within(panel).getAllByTestId('mode-chip');
    const intentsInPanel = chipsInPanel.map((el) => el.getAttribute('data-intent'));
    for (const { intent } of GROUNDING_CHIPS) {
      expect(intentsInPanel).toContain(intent);
    }
  });

  test('el chip activo dentro del grupo "Más" se marca aria-pressed=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} activeIntent="toxicidad" />);
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    const chip = screen.getByRole('button', { name: 'Toxicidad' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  test('disabled=true deshabilita también los chips del grupo "Más" y el propio toggle', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} disabled />);
    expect(screen.getByTestId('mode-chip-more')).toBeDisabled();
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    // El toggle está disabled: el click no debería expandir el panel.
    expect(document.getElementById('chips-toolbar-more')).not.toBeInTheDocument();
  });
});

describe('ChipsToolbar — grupo "Más": el router dispara la tool correcta (grounding real, no decorativo)', () => {
  test.each(GROUNDING_CHIPS)(
    'planForcedIntent("$intent", texto) → tool "$tool" + skipNlu',
    ({ intent, tool }) => {
      const plan = planForcedIntent(intent, 'consulta de prueba');
      expect(plan).not.toBeNull();
      expect(plan.tool).toBe(tool);
      expect(plan.stub).toBe(false);
      expect(plan.skipNlu).toBe(true);
    },
  );
});
