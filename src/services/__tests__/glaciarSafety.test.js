/**
 * glaciarSafety.test.js — lógica pura del estado de seguridad de punto glaciar.
 * Casos 🟢 estable / 🟡 precaución / 🔴 peligro.
 */
import { describe, it, expect } from 'vitest';
import { evaluarSeguridadGlaciar } from '../glaciarSafety';

describe('evaluarSeguridadGlaciar', () => {
  it('🔴 peligro cuando la superficie es hielo podrido', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_podrido', dureza: 4, peligros: [] });
    expect(r.nivel).toBe('peligro');
    expect(r.emoji).toBe('🔴');
    expect(r.razones).toContain('Hielo podrido (derretido)');
  });

  it('🔴 peligro cuando hay agua de deshielo', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar', dureza: 4, peligros: ['agua_deshielo'] });
    expect(r.nivel).toBe('peligro');
  });

  it('🔴 peligro cuando hay grietas abiertas', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar', dureza: 5, peligros: ['grietas_abiertas'] });
    expect(r.nivel).toBe('peligro');
  });

  it('🔴 peligro cuando hay puente de nieve', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'firn', dureza: 2, peligros: ['puente_nieve'] });
    expect(r.nivel).toBe('peligro');
  });

  it('🟡 precaución: firn blando con un peligro no crítico (grietas cerradas)', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'firn', dureza: 2, peligros: ['grietas_cerradas'] });
    expect(r.nivel).toBe('precaucion');
    expect(r.emoji).toBe('🟡');
    expect(r.razones.some((x) => /blanda/i.test(x))).toBe(true);
  });

  it('🟡 precaución: hielo duro pero con peligro no crítico (penitentes)', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar', dureza: 4, peligros: ['penitentes'] });
    expect(r.nivel).toBe('precaucion');
  });

  it('🟡 precaución: nieve fresca muy blanda sin peligros', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'nieve_fresca', dureza: 1, peligros: [] });
    expect(r.nivel).toBe('precaucion');
  });

  it('🟢 estable: hielo compacto y duro (dureza 4) sin peligros', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar', dureza: 4, peligros: [] });
    expect(r.nivel).toBe('estable');
    expect(r.emoji).toBe('🟢');
  });

  it('🟢 estable: dureza media (3) sin peligros', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_cubierto', dureza: 3, peligros: [] });
    expect(r.nivel).toBe('estable');
  });

  it('🟡 precaución por falta de datos: sin dureza ni peligros', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar', peligros: [] });
    expect(r.nivel).toBe('precaucion');
  });

  it('es pura: mismo input → mismo output', () => {
    const input = { tipoSuperficie: 'hielo_glaciar', dureza: 4, peligros: ['penitentes'] };
    expect(evaluarSeguridadGlaciar(input)).toEqual(evaluarSeguridadGlaciar(input));
  });

  it('tolera input vacío sin lanzar', () => {
    expect(() => evaluarSeguridadGlaciar()).not.toThrow();
    expect(() => evaluarSeguridadGlaciar({})).not.toThrow();
  });

  it('prioriza peligro crítico sobre estabilidad de hielo duro', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar', dureza: 5, peligros: ['seracs', 'grietas_cerradas'] });
    expect(r.nivel).toBe('peligro');
  });
});
