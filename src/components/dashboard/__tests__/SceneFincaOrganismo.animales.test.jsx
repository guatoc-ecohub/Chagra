import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Escena "Finca Organismo" — POTRERO (vaca + 3 gallinas) como ENTRADA VIVA al
// mundo de los animales (2026-07). Contrato:
//   · con `onAnimales` → el potrero es un BOTÓN accesible (tap + Enter/Espacio)
//     y el SVG raíz deja de ser role="img" (que volvería presentacionales a
//     sus hijos y borraría el botón del árbol de accesibilidad).
//   · sin `onAnimales` (gate por perfil del home) → arte decorativo: sin rol,
//     sin foco, aria-hidden.
//   · cableado en FincaVivaHero: tocar el potrero navega al MISMO destino que
//     la tarjeta del mundo en el home → onNavigate('mundo', { mundo: 'animales' }).

import SceneFincaOrganismo from '../../../visual/scenes/SceneFincaOrganismo';

afterEach(() => cleanup());

describe('SceneFincaOrganismo — potrero vaca + gallinas (entrada al mundo animales)', () => {
  test('con onAnimales: el potrero es un botón y el tap navega', () => {
    const onAnimales = vi.fn();
    render(<SceneFincaOrganismo onAnimales={onAnimales} />);

    const potrero = screen.getByTestId('fvo-animales');
    expect(potrero).toHaveAttribute('role', 'button');
    expect(potrero).toHaveAttribute('tabindex', '0');
    expect(potrero).toHaveAttribute('aria-label', expect.stringMatching(/mundo de los animales/i));

    fireEvent.click(potrero);
    expect(onAnimales).toHaveBeenCalledTimes(1);
  });

  test('con onAnimales: Enter y Espacio también entran (accesible por teclado)', () => {
    const onAnimales = vi.fn();
    render(<SceneFincaOrganismo onAnimales={onAnimales} />);

    const potrero = screen.getByTestId('fvo-animales');
    fireEvent.keyDown(potrero, { key: 'Enter' });
    fireEvent.keyDown(potrero, { key: ' ' });
    expect(onAnimales).toHaveBeenCalledTimes(2);
    // Teclas ajenas NO navegan.
    fireEvent.keyDown(potrero, { key: 'Escape' });
    expect(onAnimales).toHaveBeenCalledTimes(2);
  });

  test('con onAnimales: el SVG raíz NO es role="img" (los hijos de una imagen son presentacionales)', () => {
    render(<SceneFincaOrganismo onAnimales={vi.fn()} />);
    expect(screen.getByTestId('fvo-escena')).toHaveAttribute('role', 'group');
  });

  test('sin onAnimales (gate por perfil): el potrero queda decorativo y la escena sigue siendo imagen', () => {
    render(<SceneFincaOrganismo />);

    const potrero = screen.getByTestId('fvo-animales');
    expect(potrero).not.toHaveAttribute('role');
    expect(potrero).not.toHaveAttribute('tabindex');
    expect(potrero).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('fvo-escena')).toHaveAttribute('role', 'img');
  });

  test('la vaca y las 3 gallinas están dibujadas dentro del potrero', () => {
    const { container } = render(<SceneFincaOrganismo />);
    const potrero = container.querySelector('[data-testid="fvo-animales"]');
    expect(potrero.querySelector('.fvo-vaca')).not.toBeNull();
    expect(potrero.querySelectorAll('.fvo-gallina')).toHaveLength(3);
  });
});

// ── Cableado en el home (FincaVivaHero, tema default biopunk2) ──────────────

// Escena determinista: finca sin procesos ni plantas (patrón de
// FincaVivaHero.estructura.test.jsx).
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));

let perfilMock = {};
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const real = /** @type {typeof import('../../../services/userProfileService')} */ (await importOriginal());
  return {
    ...real,
    getProfile: () => perfilMock,
    saveProfile: vi.fn(),
  };
});

import FincaVivaHero from '../FincaVivaHero';

describe('FincaVivaHero — el potrero navega al mundo de los animales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    perfilMock = { rol: 'campesino', finca_tipo: 'rural' };
  });

  test('tocar la vaca + gallinas → onNavigate("mundo", { mundo: "animales" }) — el MISMO destino que la tarjeta del home', () => {
    const onNavigate = vi.fn();
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} />);

    const potrero = screen.getByTestId('fvo-animales');
    expect(potrero).toHaveAttribute('role', 'button');
    fireEvent.click(potrero);
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'animales' });
  });
});
