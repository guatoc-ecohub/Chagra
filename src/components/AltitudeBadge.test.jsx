import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AltitudeBadge from './AltitudeBadge';

// Mock de dependencias
vi.mock('../services/userProfileService.js', () => ({
  getProfile: vi.fn(),
}));

vi.mock('../services/altitudeService.js', () => ({
  getDeviceAltitude: vi.fn(),
}));

import { getProfile } from '../services/userProfileService.js';
import { getDeviceAltitude } from '../services/altitudeService.js';

describe('AltitudeBadge (#clima-altitud-piso-2469)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default localStorage
    globalThis.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prioridad: finca_altitud del perfil > GPS del dispositivo', () => {
    it('usa finca_altitud del perfil cuando está disponible (bug fix #clima-altitud-piso-2469)', async () => {
      // Setup: perfil con finca_altitud = 2469 (La Palma, Choachí)
      vi.mocked(getProfile).mockReturnValue({
        finca_altitud: 2469,
        municipio: 'Choachí',
        departamento: 'Cundinamarca',
      });

      render(<AltitudeBadge />);

      // Debe mostrar la altitud del perfil, NO llamar a getDeviceAltitude
      const badge = await screen.findByTestId('altitude-badge');
      expect(badge.textContent).toContain('2469 msnm');
      expect(getDeviceAltitude).not.toHaveBeenCalled();
    });

    it('hace fallback a getDeviceAltitude() si no hay finca_altitud en el perfil', async () => {
      // Setup: perfil sin finca_altitud
      vi.mocked(getProfile).mockReturnValue({
        municipio: 'Choachí',
        departamento: 'Cundinamarca',
      });
      vi.mocked(getDeviceAltitude).mockResolvedValue(1500);

      render(<AltitudeBadge />);

      // Debe llamar a getDeviceAltitude y mostrar ese valor
      const badge = await screen.findByTestId('altitude-badge');
      expect(badge.textContent).toContain('1500 msnm');
      expect(getDeviceAltitude).toHaveBeenCalled();
    });

    it('ignora finca_altitud inválida (NaN, null, undefined) y usa getDeviceAltitude', async () => {
      vi.mocked(getProfile).mockReturnValue({
        finca_altitud: NaN,
      });
      vi.mocked(getDeviceAltitude).mockResolvedValue(1800);

      render(<AltitudeBadge />);

      const badge = await screen.findByTestId('altitude-badge');
      expect(badge.textContent).toContain('1800 msnm');
      expect(getDeviceAltitude).toHaveBeenCalled();
    });
  });

  describe('caso La Palma, Choachí (coords 4.58789,-73.95139)', () => {
    it('muestra 2469 msnm y color verde (piso Frío) cuando el perfil tiene esa altitud', async () => {
      // Coordenadas reales de La Palma, Choachí: 4.58789,-73.95139
      // Altitud real: ~2469 msnm (piso Frío: 2000-2999 msnm)
      vi.mocked(getProfile).mockReturnValue({
        finca_altitud: 2469,
        municipio: 'Choachí',
        vereda: 'La Palma',
        departamento: 'Cundinamarca',
      });

      render(<AltitudeBadge />);

      const badge = await screen.findByTestId('altitude-badge');
      
      // Debe mostrar la altitud correcta
      expect(badge.textContent).toContain('2469 msnm');
      
      // Debe tener el color verde (piso Frío: 2000-2999 msnm)
      // Clases para piso Frío: text-green-400 bg-green-950/30 border-green-800/50
      expect(badge.className).toContain('text-green-400');
      expect(badge.className).toContain('bg-green-950/30');
    });

    it('color correcto para otros pisos térmicos', async () => {
      // Piso Cálido (0-999 msnm) → naranja
      vi.mocked(getProfile).mockReturnValue({ finca_altitud: 500 });
      const { unmount: unmountC } = render(<AltitudeBadge />);
      const badgeC = await screen.findByTestId('altitude-badge');
      expect(badgeC.className).toContain('text-orange-400');
      unmountC();

      // Piso Templado (1000-1999 msnm) → amber
      vi.clearAllMocks();
      vi.mocked(getProfile).mockReturnValue({ finca_altitud: 1500 });
      const { unmount: unmountT } = render(<AltitudeBadge />);
      const badgeT = await screen.findByTestId('altitude-badge');
      expect(badgeT.className).toContain('text-amber-400');
      unmountT();

      // Piso Páramo (3000-3599 msnm) → indigo
      vi.clearAllMocks();
      vi.mocked(getProfile).mockReturnValue({ finca_altitud: 3200 });
      const { unmount: unmountP } = render(<AltitudeBadge />);
      const badgeP = await screen.findByTestId('altitude-badge');
      expect(badgeP.className).toContain('text-indigo-400');
      unmountP();

      // Piso Glacial (3600+ msnm) → sky
      vi.clearAllMocks();
      vi.mocked(getProfile).mockReturnValue({ finca_altitud: 4000 });
      render(<AltitudeBadge />);
      const badgeG = await screen.findByTestId('altitude-badge');
      expect(badgeG.className).toContain('text-sky-400');
    });
  });

  describe('casos borde', () => {
    it('muestra "— msnm" cuando no hay altitud disponible', async () => {
      vi.mocked(getProfile).mockReturnValue({});
      vi.mocked(getDeviceAltitude).mockResolvedValue(null);

      render(<AltitudeBadge />);

      const badge = await screen.findByTestId('altitude-badge');
      expect(badge.textContent).toContain('— msnm');
    });

    it('maneja altitud 0 (nivel del mar) correctamente', async () => {
      vi.mocked(getProfile).mockReturnValue({ finca_altitud: 0 });

      render(<AltitudeBadge />);

      const badge = await screen.findByTestId('altitude-badge');
      expect(badge.textContent).toContain('0 msnm');
      expect(badge.className).toContain('text-orange-400'); // Cálido
    });
  });
});
