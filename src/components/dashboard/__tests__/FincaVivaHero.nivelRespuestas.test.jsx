import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Toggle de NIVEL DE RESPUESTA del agente en el home F2 (audit 2026-06-26 §5).
// Antes vivía SOLO en AgentHero (portada flag OFF) y NO existía en F2. Ahora vive
// JUNTO al compositor del agente del hero F2, renombrado de "Campesino/Experto"
// (que clasifica a la persona) a "Claro y corto / Con detalle" (describe la
// RESPUESTA, de-estigmatiza). Cableado al MISMO motor real: persiste
// `nivel_respuestas` en el perfil (simple/detallado), el campo del system-prompt.

const saveProfile = vi.fn();
let mockProfile = { rol: 'campesino' };
vi.mock('../../../services/userProfileService', () => ({
  getProfile: () => mockProfile,
  saveProfile: (...a) => saveProfile(...a),
}));
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));

import FincaVivaHero from '../FincaVivaHero';

beforeEach(() => {
  vi.clearAllMocks();
  mockProfile = { rol: 'campesino' };
});
afterEach(() => cleanup());

const renderHero = () =>
  render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);

const getToggle = () => screen.getByTestId('finca-viva-nivel-respuestas');

describe('FincaVivaHero — toggle "Claro y corto / Con detalle"', () => {
  test('el toggle EXISTE en el home F2, junto al compositor del agente', () => {
    renderHero();
    const toggle = getToggle();
    expect(toggle).toBeInTheDocument();
    // El compositor del agente está en el mismo aside.
    expect(screen.getByTestId('finca-viva-agent-fab')).toBeInTheDocument();
    // Etiquetas sobre la RESPUESTA, no sobre la persona (de-estigmatizado).
    expect(within(toggle).getByRole('radio', { name: 'Claro y corto' })).toBeInTheDocument();
    expect(within(toggle).getByRole('radio', { name: 'Con detalle' })).toBeInTheDocument();
    // NO conserva el viejo nombre estigmatizante.
    expect(toggle).not.toHaveTextContent('Campesino');
    expect(toggle).not.toHaveTextContent('Experto');
  });

  test('refleja el nivel del perfil (detallado → "Con detalle" activo)', () => {
    mockProfile = { rol: 'campesino', nivel_respuestas: 'detallado' };
    renderHero();
    const toggle = getToggle();
    expect(within(toggle).getByRole('radio', { name: 'Con detalle' })).toHaveAttribute('aria-checked', 'true');
    expect(within(toggle).getByRole('radio', { name: 'Claro y corto' })).toHaveAttribute('aria-checked', 'false');
  });

  test('por defecto (sin preferencia) arranca en "Claro y corto" (simple)', () => {
    renderHero();
    const toggle = getToggle();
    expect(within(toggle).getByRole('radio', { name: 'Claro y corto' })).toHaveAttribute('aria-checked', 'true');
  });

  test('tocar "Con detalle" persiste nivel_respuestas=detallado (el MISMO motor)', () => {
    renderHero();
    fireEvent.click(within(getToggle()).getByRole('radio', { name: 'Con detalle' }));
    expect(saveProfile).toHaveBeenCalledWith({ nivel_respuestas: 'detallado' });
    // Y el control refleja el cambio en la sesión.
    expect(within(getToggle()).getByRole('radio', { name: 'Con detalle' })).toHaveAttribute('aria-checked', 'true');
  });

  test('tocar "Claro y corto" persiste nivel_respuestas=simple', () => {
    mockProfile = { rol: 'campesino', nivel_respuestas: 'detallado' };
    renderHero();
    fireEvent.click(within(getToggle()).getByRole('radio', { name: 'Claro y corto' }));
    expect(saveProfile).toHaveBeenCalledWith({ nivel_respuestas: 'simple' });
  });

  test('no re-persiste si ya está en ese nivel (idempotente)', () => {
    renderHero(); // arranca simple
    fireEvent.click(within(getToggle()).getByRole('radio', { name: 'Claro y corto' }));
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
