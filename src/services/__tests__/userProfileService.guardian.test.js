import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GUARDIAN_ESPECIE_IDS,
  DEFAULT_GUARDIAN_ESPECIE,
  getGuardianEspecie,
  setGuardianEspecie,
  getProfile,
  saveProfile,
} from '../userProfileService.js';

/**
 * userProfileService.guardian — el guardián (espíritu de la finca) elegido en el
 * selector del home vivo PERSISTE en el perfil (`guardian_especie`). Grounding:
 * el roster de ids corresponde a fauna nativa colombiana REAL (validado por id
 * en el servicio; la lista canónica con nombre científico vive en
 * GuardianEspiritu.jsx).
 */
describe('userProfileService — guardián / espíritu de la finca', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('define el roster grounded de ids y un default (abeja angelita)', () => {
    expect(GUARDIAN_ESPECIE_IDS).toEqual(['abeja', 'oso', 'chivito', 'danta', 'rana']);
    expect(DEFAULT_GUARDIAN_ESPECIE).toBe('abeja');
    expect(GUARDIAN_ESPECIE_IDS).toContain(DEFAULT_GUARDIAN_ESPECIE);
  });

  it('sin elección devuelve null (el home decide el fallback)', () => {
    expect(getGuardianEspecie()).toBeNull();
  });

  it('persiste el guardián elegido en el perfil (guardian_especie)', () => {
    setGuardianEspecie('chivito');
    expect(getGuardianEspecie()).toBe('chivito');
    expect(getProfile().guardian_especie).toBe('chivito');
  });

  it('sobreescribe una elección previa (cambiar de guardián)', () => {
    setGuardianEspecie('oso');
    setGuardianEspecie('rana');
    expect(getGuardianEspecie()).toBe('rana');
  });

  it('ignora ids desconocidos (no corrompe el perfil, no inventa fauna)', () => {
    setGuardianEspecie('abeja');
    const res = setGuardianEspecie('unicornio');
    expect(res).toBeNull();
    // El guardián válido previo se conserva.
    expect(getGuardianEspecie()).toBe('abeja');
  });

  it('emite chagra:guardian-changed y chagra:profile-changed al elegir', () => {
    const guardianSpy = vi.fn();
    const profileSpy = vi.fn();
    window.addEventListener('chagra:guardian-changed', guardianSpy);
    window.addEventListener('chagra:profile-changed', profileSpy);
    try {
      setGuardianEspecie('danta');
    } finally {
      window.removeEventListener('chagra:guardian-changed', guardianSpy);
      window.removeEventListener('chagra:profile-changed', profileSpy);
    }
    expect(guardianSpy).toHaveBeenCalledTimes(1);
    expect(guardianSpy.mock.calls[0][0].detail).toEqual({ id: 'danta' });
    expect(profileSpy).toHaveBeenCalledTimes(1);
  });

  it('no pisa otros campos del perfil al guardar el guardián', () => {
    saveProfile({ rol: 'campesino', finca_altitud: '2600', piso_confirmado: '1' });
    setGuardianEspecie('oso');
    const p = getProfile();
    expect(p.guardian_especie).toBe('oso');
    expect(p.finca_altitud).toBe('2600');
    expect(p.rol).toBe('campesino');
  });
});
