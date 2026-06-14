/**
 * glaciarSafety.test.js — lógica pura del estado de seguridad de punto glaciar.
 *
 * v2 "escala creíble": escala de dureza mano→piolet (F..H2), perfil por capas,
 * override jerárquico (el peor disparador gana), modo observación (borde).
 *
 * Casos: 🔵 observación / 🟢 estable / 🟡 precaución / 🔴 peligro.
 */
import { describe, it, expect } from 'vitest';
import { evaluarSeguridadGlaciar } from '../glaciarSafety';

describe('evaluarSeguridadGlaciar — modo observación (borde)', () => {
  it('🔵 observación cuando NO se pisó el hielo (pisoGlaciar=false)', () => {
    const r = evaluarSeguridadGlaciar({
      pisoGlaciar: false,
      tipoSuperficie: 'hielo_podrido', // aunque haya disparador 🔴, observación manda
      peligros: ['grietas_abiertas'],
    });
    expect(r.nivel).toBe('observacion');
    expect(r.emoji).toBe('🔵');
  });
});

describe('evaluarSeguridadGlaciar — 🔴 peligro', () => {
  it('🔴 hielo podrido SIEMPRE (como tipo de superficie)', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_podrido', dureza: 'H2', peligros: [] });
    expect(r.nivel).toBe('peligro');
    expect(r.emoji).toBe('🔴');
    expect(r.razones.some((x) => /podrido/i.test(x))).toBe(true);
  });

  it('🔴 hielo podrido en una capa profunda también dispara', () => {
    const r = evaluarSeguridadGlaciar({
      capas: [
        { tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1' },
        { tipoSuperficie: 'hielo_podrido', dureza: 'F' },
      ],
      peligros: [],
    });
    expect(r.nivel).toBe('peligro');
  });

  it('🔴 hielo podrido como peligro marcado', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1', peligros: ['hielo_podrido'] });
    expect(r.nivel).toBe('peligro');
  });

  it('🔴 séracs SOLO si la ruta pasa por debajo', () => {
    const bajo = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1', peligros: ['seracs'], rutaBajoSeracs: true });
    expect(bajo.nivel).toBe('peligro');
    // séracs presentes pero la ruta NO pasa debajo → no es 🔴 por esa causa
    const noBajo = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1', peligros: ['seracs'], rutaBajoSeracs: false });
    expect(noBajo.nivel).not.toBe('peligro');
  });

  it('🔴 grietas con puente de nieve + superficie blanda (≤4F)', () => {
    const r = evaluarSeguridadGlaciar({
      tipoSuperficie: 'firn_neve', dureza: '4F', peligros: ['grietas_con_puente_nieve'], horaLocal: 8,
    });
    expect(r.nivel).toBe('peligro');
  });

  it('🔴 grietas con puente de nieve pasado el mediodía', () => {
    const r = evaluarSeguridadGlaciar({
      tipoSuperficie: 'firn_neve', dureza: '1F', peligros: ['grietas_con_puente_nieve'], horaLocal: 14,
    });
    expect(r.nivel).toBe('peligro');
    expect(r.razones.some((x) => /mediodía/i.test(x))).toBe(true);
  });

  it('🔴 grietas con puente de nieve + nieve reciente 24h', () => {
    const r = evaluarSeguridadGlaciar({
      tipoSuperficie: 'firn_neve', dureza: 'P', peligros: ['grietas_con_puente_nieve'], horaLocal: 7, nieveReciente24h: true,
    });
    expect(r.nivel).toBe('peligro');
  });

  it('🔴 riesgo de avalancha con nieve fresca en pendiente', () => {
    const r = evaluarSeguridadGlaciar({
      tipoSuperficie: 'nieve_fresca', dureza: 'F', peligros: ['riesgo_avalancha'], pendientePronunciada: true,
    });
    expect(r.nivel).toBe('peligro');
  });

  it('🔴 penitentes densos', () => {
    const r = evaluarSeguridadGlaciar({
      tipoSuperficie: 'penitentes', dureza: 'P', peligros: ['penitentes'], penitentesDensos: true,
    });
    expect(r.nivel).toBe('peligro');
  });

  it('prioriza 🔴 sobre cualquier otra señal (override jerárquico)', () => {
    const r = evaluarSeguridadGlaciar({
      tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1',
      peligros: ['hielo_podrido', 'agua_deshielo_superficial'],
    });
    expect(r.nivel).toBe('peligro');
  });
});

describe('evaluarSeguridadGlaciar — 🟡 precaución', () => {
  it('🟡 hielo azul con dureza H2 (muy duro, resbala)', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H2', peligros: [] });
    expect(r.nivel).toBe('precaucion');
    expect(r.emoji).toBe('🟡');
  });

  it('🟡 grietas con puente de nieve en mañana fría (<10:00) y superficie firme (≥1F)', () => {
    const r = evaluarSeguridadGlaciar({
      tipoSuperficie: 'firn_neve', dureza: '1F', peligros: ['grietas_con_puente_nieve'], horaLocal: 8,
    });
    expect(r.nivel).toBe('precaucion');
    expect(r.razones.some((x) => /mañana fría/i.test(x))).toBe(true);
  });

  it('🟡 hielo cubierto de detritos', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_cubierto_detritos', dureza: 'H1', peligros: [] });
    expect(r.nivel).toBe('precaucion');
  });

  it('🟡 agua de deshielo superficial', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1', peligros: ['agua_deshielo_superficial'] });
    expect(r.nivel).toBe('precaucion');
  });

  it('🟡 dureza F/4F sobre glaciar (superficie muy blanda)', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'firn_neve', dureza: 'F', peligros: [], horaLocal: 8 });
    expect(r.nivel).toBe('precaucion');
    expect(r.razones.some((x) => /blanda/i.test(x))).toBe(true);
  });

  it('🟡 cualquier otro peligro observado no crítico (rimaya)', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1', peligros: ['rimaya_bergschrund'] });
    expect(r.nivel).toBe('precaucion');
  });

  it('🟡 por falta de datos: superficie sin dureza ni peligros', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', peligros: [] });
    expect(r.nivel).toBe('precaucion');
    expect(r.razones.some((x) => /dureza/i.test(x))).toBe(true);
  });
});

describe('evaluarSeguridadGlaciar — 🟢 estable', () => {
  it('🟢 firn/névé con dureza 1F sin peligros, mañana fría', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'firn_neve', dureza: '1F', peligros: [], horaLocal: 7 });
    expect(r.nivel).toBe('estable');
    expect(r.emoji).toBe('🟢');
  });

  it('🟢 firn/névé con dureza P sin peligros, mañana fría', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'firn_neve', dureza: 'P', peligros: [], horaLocal: 6 });
    expect(r.nivel).toBe('estable');
  });

  it('🟢 hielo de glaciar azul con H1 sin grietas/séracs/agua', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1', peligros: [] });
    expect(r.nivel).toBe('estable');
  });
});

describe('evaluarSeguridadGlaciar — perfil por capas', () => {
  it('la capa SUPERIOR manda el tránsito (H2 arriba → precaución pese a H1 abajo)', () => {
    const r = evaluarSeguridadGlaciar({
      capas: [
        { tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H2' },
        { tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1' },
      ],
      peligros: [],
    });
    expect(r.nivel).toBe('precaucion');
  });

  it('capa superior H1 limpia → estable aunque haya firn debajo', () => {
    const r = evaluarSeguridadGlaciar({
      capas: [
        { tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1' },
        { tipoSuperficie: 'firn_neve', dureza: 'P' },
      ],
      peligros: [],
    });
    expect(r.nivel).toBe('estable');
  });
});

describe('evaluarSeguridadGlaciar — robustez', () => {
  it('es pura: mismo input → mismo output', () => {
    const input = { tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H2', peligros: ['rimaya_bergschrund'] };
    expect(evaluarSeguridadGlaciar(input)).toEqual(evaluarSeguridadGlaciar(input));
  });

  it('tolera input vacío sin lanzar', () => {
    expect(() => evaluarSeguridadGlaciar()).not.toThrow();
    expect(() => evaluarSeguridadGlaciar({})).not.toThrow();
  });

  it('"ninguno_evidente" no cuenta como peligro', () => {
    const r = evaluarSeguridadGlaciar({ tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1', peligros: ['ninguno_evidente'] });
    expect(r.nivel).toBe('estable');
  });
});
