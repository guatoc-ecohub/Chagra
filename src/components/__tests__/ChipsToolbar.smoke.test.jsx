import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import ChipsToolbar from '../ChipsToolbar';
import { CHIP_DEFS } from '../../services/chipIntentRouter';
import * as deepResearchClient from '../../services/deepResearchClient';

/**
 * Smoke tests A4/B4 — la barra de CHIPS DE MODO sobre el input del chat.
 *   - renderiza los chips con su emoji + label,
 *   - clickear un chip llama onSelectIntent con el intent enum,
 *   - el chip activo se marca aria-pressed,
 *   - el chip 📷 foto solo aparece/activa si hay imagen adjunta,
 *   - retorna null si falta el handler (defensa contra mounts incompletos).
 *
 * Feature flag Deep Research (VITE_DEEP_RESEARCH_ENABLED):
 *   - flag OFF (default) → el chip 🔬 NO se renderiza (evita dead-end
 *     "no disponible en este plan").
 *   - flag ON → el chip 🔬 reaparece y queda pro-gated (deshabilitado para
 *     free, activo para pro) — tier gate A1.
 *
 * Grupo "Más" (grounding oscuro 2026-07-01): los chips con `moreGroup:true`
 * (toxicidad, saberes tradicionales, alerta páramo, variedades, polinización,
 * fenología) NO se pintan en la fila principal — viven detrás del toggle
 * `mode-chip-more`. Los conteos de abajo distinguen "núcleo visible sin
 * expandir" de "catálogo completo tras expandir Más" (ver
 * ChipsToolbar.groundingChips.test.jsx para la cobertura dedicada del grupo).
 *
 * Estos tests controlan la flag mockeando `isDeepResearchEnabled` para no
 * depender del entorno de build.
 */

// Cantidad de chips NO-deep (siembro, plaga, biopreparado, clima, precio, calendario, ...).
const NON_DEEP_CHIP_COUNT = CHIP_DEFS.filter((d) => d.intent !== 'deep').length;
// Núcleo visible SIN expandir "Más" (excluye los chips moreGroup + deep).
const CORE_NON_DEEP_CHIP_COUNT = CHIP_DEFS.filter(
  (d) => d.intent !== 'deep' && !d.moreGroup,
).length;

describe('ChipsToolbar — flag Deep Research OFF (chip 🔬 oculto)', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('el chip 🔬 Investigación profunda NO se renderiza con la flag OFF', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    expect(screen.queryByText(/investigación profunda/i)).not.toBeInTheDocument();
  });

  test('renderiza solo el núcleo no-deep con la flag OFF (grounding oscuro queda tras "Más")', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    const chips = screen.getAllByTestId('mode-chip');
    expect(chips).toHaveLength(CORE_NON_DEEP_CHIP_COUNT);
    expect(screen.getByText('¿Qué siembro?')).toBeInTheDocument();
    expect(screen.getByText('Plaga')).toBeInTheDocument();
  });

  test('el chip 🔬 tampoco aparece para usuario pro con la flag OFF', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro />);
    expect(screen.queryByText(/investigación profunda/i)).not.toBeInTheDocument();
  });

  test('clickear un chip llama onSelectIntent con el intent enum', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} />);
    fireEvent.click(screen.getByText('Plaga'));
    expect(onSelectIntent).toHaveBeenCalledTimes(1);
    expect(onSelectIntent).toHaveBeenCalledWith('plaga');
  });

  test('el chip activo se marca aria-pressed=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} activeIntent="clima" />);
    const climaChip = screen.getByRole('button', { name: /clima/i });
    expect(climaChip).toHaveAttribute('aria-pressed', 'true');
    const siembroChip = screen.getByRole('button', { name: /siembro/i });
    expect(siembroChip).toHaveAttribute('aria-pressed', 'false');
  });

  test('cada chip no-deep expone un accessible name no vacío (incluido el grupo "Más")', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    // Expandir "Más" para que los chips de grounding puntual también estén
    // en el DOM (viven detrás del toggle, no en la fila principal).
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    for (const def of CHIP_DEFS) {
      if (def.intent === 'deep') continue;
      // Match EXACTO (no substring): el aria-label del botón es def.label tal
      // cual, y algunas etiquetas comparten palabras (ej. "Páramo" vs "Alerta
      // normativa páramo") — un regex suelto encuentra ambas.
      const chip = screen.getByRole('button', { name: def.label });
      expect(chip).toBeInTheDocument();
    }
  });

  test('el chip 📷 foto NO aparece sin imagen adjunta', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} hasAttachment={false} />);
    expect(screen.queryByTestId('mode-chip-foto')).not.toBeInTheDocument();
  });

  test('el chip 📷 foto aparece y es clickable cuando hay imagen adjunta', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} hasAttachment />);
    const fotoChip = screen.getByTestId('mode-chip-foto');
    expect(fotoChip).toBeInTheDocument();
    expect(fotoChip).not.toBeDisabled();
    fireEvent.click(fotoChip);
    expect(onSelectIntent).toHaveBeenCalledWith('foto');
  });

  test('retorna null si no hay handler onSelectIntent (defensa)', () => {
    const { container } = render(<ChipsToolbar />);
    expect(container.firstChild).toBeNull();
  });

  test('ningún label de chip usa voseo argentino', () => {
    const { container } = render(<ChipsToolbar onSelectIntent={() => {}} hasAttachment />);
    const VOSEO = /\b(escrib[íi]|tom[áa]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|sab[ée]s)\b/i;
    expect(container.textContent).not.toMatch(VOSEO);
  });

  test('chips no-Pro (siembro, plaga, etc.) siguen activos para usuario free', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} isPro={false} />);
    fireEvent.click(screen.getByText('¿Qué siembro?'));
    expect(onSelectIntent).toHaveBeenCalledWith('siembro');
    onSelectIntent.mockClear();
    fireEvent.click(screen.getByText('Plaga'));
    expect(onSelectIntent).toHaveBeenCalledWith('plaga');
  });
});

// ──── Chip precio (stub) — no promete capacidades que no existen ────────────
describe('ChipsToolbar — chip precio stub no engaña', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('chip precio tiene placeholder honesto (sin prometer precio)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    const precioDef = CHIP_DEFS.find((d) => d.intent === 'precio');
    expect(precioDef.placeholder.toLowerCase()).toMatch(/producto|precio/i);
    expect(precioDef.placeholder.toLowerCase()).not.toMatch(/consulta\s+exitosa|resultado|dato/i);
  });

  test('chip precio es clickable (funciona, solo que el backend es stub)', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} />);
    fireEvent.click(screen.getByText('Precio'));
    expect(onSelectIntent).toHaveBeenCalledWith('precio');
  });

  test('todos los labels de chip omiten promesas de datos no verificables', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    const phantomPromises = /\b(resultado exacto|dato garantizado|100% preciso|siempre disponible)\b/i;
    for (const def of CHIP_DEFS) {
      expect(def.label).not.toMatch(phantomPromises);
      expect(def.placeholder).not.toMatch(phantomPromises);
    }
  });
});

// ──── Deshabilitado global (disabled prop) ──────────────────────────────────
describe('ChipsToolbar — estado disabled global (durante grabación, etc.)', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('todos los chips normales están visualmente deshabilitados con disabled=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} disabled />);
    const chips = screen.getAllByTestId('mode-chip');
    for (const chip of chips) {
      expect(chip).toBeDisabled();
    }
  });

  test('no se puede clickear un chip cuando disabled=true', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} disabled />);
    fireEvent.click(screen.getByText('¿Qué siembro?'));
    expect(onSelectIntent).not.toHaveBeenCalled();
  });

  test('chip foto también se deshabilita con disabled=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} disabled hasAttachment />);
    expect(screen.getByTestId('mode-chip-foto')).toBeDisabled();
    expect(screen.getByTestId('mode-chip-foto')).toHaveAttribute('disabled');
  });

  test('aria-pressed se preserva aunque todos estén disabled', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} disabled activeIntent="clima" />);
    const climaChip = screen.getByRole('button', { name: /clima/i });
    expect(climaChip).toHaveAttribute('aria-pressed', 'true');
    expect(climaChip).toBeDisabled();
  });
});

// ──── chipDefs (selección POR PERFIL) — la barra pinta lo que recibe ────────
describe('ChipsToolbar — prop chipDefs (chips adaptativos por perfil)', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('con chipDefs pinta SOLO los chips de esa lista (filtrado por perfil)', () => {
    // Perfil "guía de glaciar": clima + páramo + restauración (sin biopreparado).
    const guiaGlaciarDefs = CHIP_DEFS.filter((d) =>
      ['clima', 'paramo', 'restauracion'].includes(d.intent),
    );
    render(<ChipsToolbar onSelectIntent={() => {}} chipDefs={guiaGlaciarDefs} />);
    const chips = screen.getAllByTestId('mode-chip');
    expect(chips).toHaveLength(guiaGlaciarDefs.length);
    // No debe aparecer un chip ausente del perfil (biopreparado).
    expect(screen.queryByText(/biopreparado/i)).not.toBeInTheDocument();
    // Sí los del perfil.
    expect(screen.getByText(/clima/i)).toBeInTheDocument();
  });

  test('chipDefs respeta el ORDEN recibido (el perfil decide la prioridad)', () => {
    const ordered = CHIP_DEFS.filter((d) =>
      ['clima', 'siembro', 'plaga'].includes(d.intent),
    ).sort((a, b) => ['clima', 'siembro', 'plaga'].indexOf(a.intent) - ['clima', 'siembro', 'plaga'].indexOf(b.intent));
    render(<ChipsToolbar onSelectIntent={() => {}} chipDefs={ordered} />);
    const rendered = screen.getAllByTestId('mode-chip').map((el) => el.getAttribute('data-intent'));
    expect(rendered).toEqual(['clima', 'siembro', 'plaga']);
  });

  test('sin chipDefs (null) cae al catálogo completo — sin breaking change', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} chipDefs={null} />);
    // Núcleo visible sin expandir "Más" (el grounding oscuro queda agrupado).
    const chips = screen.getAllByTestId('mode-chip');
    expect(chips).toHaveLength(CORE_NON_DEEP_CHIP_COUNT);
    // Tras expandir "Más" aparece el catálogo COMPLETO.
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    expect(screen.getAllByTestId('mode-chip')).toHaveLength(NON_DEEP_CHIP_COUNT);
  });

  test('chipDefs vacío [] cae al catálogo completo (defensa, nunca barra vacía)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} chipDefs={[]} />);
    const chips = screen.getAllByTestId('mode-chip');
    expect(chips).toHaveLength(CORE_NON_DEEP_CHIP_COUNT);
  });
});

// ──── Flag Deep Research ON → chip 🔬 visible + tier gate A1 ─────────────────
describe('ChipsToolbar — flag Deep Research ON (chip 🔬 visible, pro-gated)', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renderiza todos los chips (incluido 🔬) con la flag ON, sumando el grupo "Más"', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    // Núcleo (sin expandir "Más"): manifiesto completo MENOS el grupo agrupado.
    const coreCount = CHIP_DEFS.filter((d) => !d.moreGroup).length;
    expect(screen.getAllByTestId('mode-chip')).toHaveLength(coreCount);
    // Al expandir "Más" se ve el catálogo COMPLETO (deep incluido, pro-locked
    // para free) — el manifiesto entero queda alcanzable.
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    expect(screen.getAllByTestId('mode-chip')).toHaveLength(CHIP_DEFS.length);
  });

  test('usuario free ve el chip 🔬 con sufijo "(Pro)" y deshabilitado', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    expect(screen.getByText('Investigación profunda (Pro)')).toBeInTheDocument();
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).toBeDisabled();
    expect(deepChip).toHaveAttribute('data-pro-locked', 'true');
  });

  test('chip 🔬 tiene title explicativo de función Pro cuando free', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).toHaveAttribute('title', expect.stringContaining('Pro'));
  });

  test('renderiza el chip 🔬 sin sufijo y habilitado cuando isPro=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro />);
    expect(screen.getByText('Investigación profunda')).toBeInTheDocument();
    expect(screen.queryByText('Investigación profunda (Pro)')).not.toBeInTheDocument();
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).not.toBeDisabled();
    expect(deepChip).not.toHaveAttribute('data-pro-locked');
  });

  test('click en chip 🔬 llama onSelectIntent("deep") para usuario pro', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} isPro />);
    fireEvent.click(screen.getByRole('button', { name: /investigación profunda/i }));
    expect(onSelectIntent).toHaveBeenCalledWith('deep');
  });

  test('click en chip 🔬 NO llama onSelectIntent("deep") para usuario free', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} isPro={false} />);
    fireEvent.click(screen.getByRole('button', { name: /investigación profunda/i }));
    expect(onSelectIntent).not.toHaveBeenCalledWith('deep');
  });
});
