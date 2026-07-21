// @ts-nocheck
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Home F2 "Finca Viva" — ESTRUCTURA DE CUBIERTA declarada en el perfil (#34
// fase 1, fix del bug del operador): si el onboarding registró que la finca
// TIENE invernadero (invernadero_tiene='si' + forma), la escena de finca DEBE
// dibujarlo. Antes el dato se guardaba y la escena lo ignoraba.
//
// Cubre:
//   · con invernadero de túnel → la escena trae la estructura (data-forma).
//   · con invernadero cuadrado → nave a dos aguas.
//   · forma futura (malla_sombra, ya válida en INVERNADERO_FORMAS) → se dibuja.
//   · sin invernadero → NO se dibuja nada (perfil viejo no rompe).
//   · la estructura aparece TAMBIÉN con la finca vacía (es infraestructura
//     declarada, no depende de tener siembras).

// Escena determinista: finca sin procesos ni plantas (estado "recién empieza").
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));

// Perfil controlado por test: getProfile mockeado, getters tipados REALES
// (getInvernaderoEstructura / getComposicionFinca siguen siendo los de verdad).
let perfilMock = {};
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    getProfile: () => perfilMock,
    saveProfile: vi.fn(),
  };
});

import FincaVivaHero from '../FincaVivaHero';

afterEach(() => cleanup());
beforeEach(() => {
  vi.clearAllMocks();
  perfilMock = {};
});

const renderHero = () => render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} />);

describe('FincaVivaHero — estructura de cubierta declarada en el perfil (#34)', () => {
  test('perfil con invernadero de túnel → la escena dibuja la estructura', () => {
    perfilMock = {
      rol: 'campesino',
      finca_tipo: 'rural',
      invernadero_tiene: 'si',
      invernadero_forma: 'tunel',
    };
    renderHero();
    const estructura = screen.getByTestId('fvh-estructura');
    expect(estructura).toBeInTheDocument();
    expect(estructura).toHaveAttribute('data-forma', 'tunel');
  });

  test('perfil con invernadero cuadrado → nave a dos aguas', () => {
    perfilMock = {
      rol: 'campesino',
      finca_tipo: 'rural',
      invernadero_tiene: 'si',
      invernadero_forma: 'cuadrado',
      finca_hectareas: 'mas_20',
    };
    renderHero();
    expect(screen.getByTestId('fvh-estructura')).toHaveAttribute('data-forma', 'cuadrado');
  });

  test('forma futura ya válida (malla_sombra) → se dibuja con su render propio', () => {
    perfilMock = {
      rol: 'campesino',
      finca_tipo: 'rural',
      invernadero_tiene: 'si',
      invernadero_forma: 'malla_sombra',
    };
    renderHero();
    expect(screen.getByTestId('fvh-estructura')).toHaveAttribute('data-forma', 'malla_sombra');
  });

  test('tiene invernadero pero sin forma declarada → estructura genérica', () => {
    perfilMock = {
      rol: 'campesino',
      finca_tipo: 'rural',
      invernadero_tiene: 'si',
    };
    renderHero();
    expect(screen.getByTestId('fvh-estructura')).toHaveAttribute('data-forma', 'generica');
  });

  test('perfil SIN invernadero → la escena NO dibuja estructura', () => {
    perfilMock = { rol: 'campesino', finca_tipo: 'rural', invernadero_tiene: 'no' };
    renderHero();
    expect(screen.queryByTestId('fvh-estructura')).not.toBeInTheDocument();
  });

  test('perfil VIEJO sin los campos → migración suave, sin estructura y sin romper', () => {
    perfilMock = { rol: 'campesino' };
    renderHero();
    expect(screen.getByTestId('finca-viva-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('fvh-estructura')).not.toBeInTheDocument();
  });

  test('la estructura aparece aunque la finca esté vacía (0 siembras)', () => {
    // Los mocks de arriba dejan la finca en "recién empieza" (0 procesos y 0
    // plantas): la estructura declarada debe verse igual — existe físicamente.
    perfilMock = {
      rol: 'campesino',
      finca_tipo: 'rural',
      invernadero_tiene: 'si',
      invernadero_forma: 'tunel',
    };
    renderHero();
    expect(screen.getByTestId('fvh-estructura')).toBeInTheDocument();
  });
});
