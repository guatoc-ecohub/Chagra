// @ts-nocheck
/**
 * HomeCampesinoB.compai.test.jsx — la SECCIÓN DE COMPAI aprobada por el operador.
 *
 * Contrato (referencia visual `aprobado-campesino-B.png`, confirmada por el
 * operador 2026-08-27):
 *  - La home B usa el CTA de voz "Toque y hable con Compai" (botón rojo) con el
 *    kicker "Compai, su compañero de finca" y la nota "No tiene que aprender
 *    botones. Cuéntele a Compai qué necesita.".
 *  - NO usa la tarjeta estática `estado="acompana"` ("SU COMPAÑERO / Chagra está
 *    aquí"): ese swap (commit 4ad6345c2) fue el error que esta home corrige.
 *  - La tercera microtarjeta de "SUS MUNDOS" es "Cosechar" (no "Vender"), como
 *    la referencia aprobada.
 *
 * Invariantes: NO dependen del reloj (el saludo por hora se ignora a propósito).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], iotAlerts: [] }),
}));

vi.mock('../../../store/useCosechaStore', () => {
  const store = (selector) => selector({ summary: null });
  store.getState = () => ({ loadHarvests: vi.fn() });
  return { default: store };
});

vi.mock('../../../services/climaService', () => ({
  CLIMA_UPDATED_EVENT: 'chagra:clima-updated',
  fetchClimaSnapshot: vi.fn(async () => null),
  getCachedClimaSnapshot: vi.fn(() => null),
}));

vi.mock('../../../services/userProfileService', () => ({
  getProfile: () => ({ nombre: '' }),
  getProfileMunicipio: () => '',
}));

import HomeCampesinoB from '../HomeCampesinoB';

afterEach(cleanup);

describe('HomeCampesinoB — sección de compai aprobada', () => {
  test('muestra el CTA de voz rojo, el kicker y la nota (no la tarjeta acompana)', () => {
    render(<HomeCampesinoB onNavigate={vi.fn()} />);

    // CTA de voz aprobado (A "Toque y hable" adaptado a B).
    expect(screen.getByRole('button', { name: /Toque y hable con Compai/i })).toBeInTheDocument();
    expect(screen.getByText(/Compai, su compañero de finca/i)).toBeInTheDocument();
    expect(screen.getByText(/No tiene que aprender botones\. Cuéntele a Compai qué necesita\./i)).toBeInTheDocument();

    // La tarjeta estática `acompana` (swap erróneo, commit 4ad6345c2) NO debe
    // estar: sus marcadores únicos son el título "Chagra está aquí" y el botón
    // "Hablar ahora". (No se usa "SU COMPAÑERO" porque colisiona con el kicker
    // "Compai, su compañero de finca".)
    expect(screen.queryByText('Chagra está aquí')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Hablar ahora$/i })).toBeNull();
  });

  test('la tercera microtarjeta de SUS MUNDOS es "Cosechar", no "Vender"', () => {
    render(<HomeCampesinoB onNavigate={vi.fn()} />);
    expect(screen.getByText('Cosechar')).toBeInTheDocument();
    expect(screen.queryByText('Vender')).toBeNull();
  });

  test('conserva las secciones clave del layout rico', () => {
    render(<HomeCampesinoB onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /¿Qué necesita hacer hoy\?/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Para trabajar con calma/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Entre por donde lo necesite/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Lo que ya está guardado/i })).toBeInTheDocument();
  });

  test('tocar el CTA de voz navega al agente', () => {
    const onNavigate = vi.fn();
    render(<HomeCampesinoB onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Toque y hable con Compai/i }));
    expect(onNavigate).toHaveBeenCalledWith('agente', undefined);
  });
});
