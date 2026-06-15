import { describe, it, expect } from 'vitest';
import { preFiltroSocial } from '../socialPrefiltro.js';

describe('preFiltroSocial', () => {
  it('retorna pasar:true para texto inocuo', () => {
    expect(preFiltroSocial('como preparo un biopreparado de ajo').pasar).toBe(true);
  });

  it('bloquea texto que menciona glifosato', () => {
    const r = preFiltroSocial('el glifosato es malo');
    expect(r.pasar).toBe(false);
    expect(r.razon).toContain('bloqueado');
    expect(r.severidad).toBe('alta');
  });

  it('bloquea texto que menciona paraquat', () => {
    const r = preFiltroSocial('usar paraquat');
    expect(r.pasar).toBe(false);
  });

  it('bloquea mitos reconocibles (luna.*sembrar)', () => {
    const r = preFiltroSocial('la luna sirve para sembrar mejor');
    expect(r.pasar).toBe(false);
    expect(r.severidad).toBe('media');
  });

  it('retorna pasar:false para texto vacio', () => {
    const r = preFiltroSocial('');
    expect(r.pasar).toBe(false);
  });

  it('retorna pasar:false para null/undefined', () => {
    expect(preFiltroSocial(null).pasar).toBe(false);
    expect(preFiltroSocial(undefined).pasar).toBe(false);
  });
});
