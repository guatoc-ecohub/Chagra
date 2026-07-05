/**
 * FincaVivaHero — FOTO DE PERFIL en la píldora del topbar (hotfix P0 2026-07-04).
 *
 * REGRESIÓN: el TopBar legacy mostraba la foto fijada por el usuario
 * (getOperatorPhoto, feature 2026-06-15); con la flag F2 ON ese TopBar no se
 * monta y el home quedaba SIEMPRE con el ícono genérico de persona, aunque el
 * usuario tuviera foto. El hero debe: (1) pintar la foto si existe, (2) caer al
 * ícono genérico si no hay, (3) re-leer en vivo con 'chagra:operator-update'
 * (mismo contrato que TopBar).
 */
import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../services/userProfileService', () => ({ getProfile: () => ({ rol: 'campesino' }) }));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));
vi.mock('../../NotificationsBell', () => ({
  default: () => <button type="button" aria-label="Notificaciones" />,
}));
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'biopunk2', setTheme: vi.fn() }),
  resolveAutoTheme: (t) => t,
}));
vi.mock('../themeIcon', () => ({
  iconForTheme: () => <svg data-testid="brand-icon" />,
}));

// Foto controlable por test: el hero la lee con getOperatorPhoto (fuente única,
// la misma del TopBar legacy y ProfileScreen).
let fotoActual = '';
vi.mock('../../../services/operatorPhotoService', () => ({
  getOperatorPhoto: () => fotoActual,
}));

import FincaVivaHero from '../FincaVivaHero';

const FOTO = 'data:image/jpeg;base64,Zm90by1kZS1wcnVlYmE=';

beforeEach(() => {
  fotoActual = '';
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe('FincaVivaHero — foto de perfil en la píldora del topbar', () => {
  test('con foto fijada, la píldora de perfil muestra la FOTO (no el ícono genérico)', () => {
    fotoActual = FOTO;
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    const img = screen.getByTestId('fvh-perfil-foto');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', FOTO);
    // La foto vive DENTRO del botón de perfil (sigue navegando a 'perfil').
    expect(screen.getByTestId('finca-viva-perfil')).toContainElement(img);
  });

  test('sin foto, cae al ícono genérico de persona (sin <img>)', () => {
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    expect(screen.queryByTestId('fvh-perfil-foto')).not.toBeInTheDocument();
    expect(screen.getByTestId('finca-viva-perfil')).toBeInTheDocument();
  });

  test("re-lee EN VIVO cuando el usuario sube/cambia la foto ('chagra:operator-update')", () => {
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    expect(screen.queryByTestId('fvh-perfil-foto')).not.toBeInTheDocument();
    fotoActual = FOTO;
    act(() => {
      window.dispatchEvent(new Event('chagra:operator-update'));
    });
    expect(screen.getByTestId('fvh-perfil-foto')).toHaveAttribute('src', FOTO);
  });

  test("re-lee EN VIVO al quitar la foto (vuelve al ícono genérico)", () => {
    fotoActual = FOTO;
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    expect(screen.getByTestId('fvh-perfil-foto')).toBeInTheDocument();
    fotoActual = '';
    act(() => {
      window.dispatchEvent(new Event('chagra:operator-update'));
    });
    expect(screen.queryByTestId('fvh-perfil-foto')).not.toBeInTheDocument();
  });
});
