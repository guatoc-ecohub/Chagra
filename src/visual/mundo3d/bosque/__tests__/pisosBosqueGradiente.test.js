/*
 * pisosBosqueGradiente — el mapeo piso térmico → Ent protagonista.
 *
 * Fija el contrato de la regla dura del operador (2026-07-22): cada finca ve
 * de protagonista el Ent de SU piso, con máximo UN vecino a la vez (nunca los
 * tres/cuatro juntos), y sin piso utilizable cae al default concreto
 * (templado/roble) — nunca a "mostrar todo".
 */
import { describe, test, expect } from 'vitest';
import {
  MAPA_PISO_ENT,
  PISOS_CON_ENT,
  vecinoDePiso,
  protagonistaDePiso,
  pisosVisiblesParaVista,
} from '../pisosBosqueGradiente.js';

describe('protagonistaDePiso — el Ent que decide el perfil', () => {
  test('frío → protagonista frío (el aliso)', () => {
    expect(protagonistaDePiso('frio')).toBe('frio');
    expect(MAPA_PISO_ENT.frio).toBe('aliso');
  });

  test('páramo → protagonista páramo (la queñua)', () => {
    expect(protagonistaDePiso('paramo')).toBe('paramo');
    expect(MAPA_PISO_ENT.paramo).toBe('quenua');
  });

  test('templado → protagonista templado (el roble)', () => {
    expect(protagonistaDePiso('templado')).toBe('templado');
    expect(MAPA_PISO_ENT.templado).toBe('roble');
  });

  test('sin piso térmico (undefined/null) cae al default templado — NUNCA a "mostrar todo"', () => {
    expect(protagonistaDePiso(undefined)).toBe('templado');
    expect(protagonistaDePiso(null)).toBe('templado');
  });

  test('tierra caliente → protagonista calido (la ceiba)', () => {
    // Entró el 2026-07-22 y con ella el mapa quedó completo: ya no hay ningún
    // piso térmico sin guardián, así que ninguno cae al default por falta de
    // Ent (el default sigue vivo para perfil ausente, de demo o corrupto).
    expect(MAPA_PISO_ENT.calido).toBe('ceiba');
    expect(protagonistaDePiso('calido')).toBe('calido');
  });

  test('un valor de perfil desconocido/corrupto también cae al default (nunca revienta)', () => {
    expect(protagonistaDePiso('basura')).toBe('templado');
    expect(protagonistaDePiso(42)).toBe('templado');
  });
});

describe('vecinoDePiso — el de arriba, salvo el tope que es el de abajo', () => {
  test('calido (el más bajo con Ent) → vecino templado, el de arriba', () => {
    expect(vecinoDePiso('calido')).toBe('templado');
  });

  test('templado → vecino frío, el de arriba', () => {
    expect(vecinoDePiso('templado')).toBe('frio');
  });

  test('frío → vecino páramo, el de arriba', () => {
    expect(vecinoDePiso('frio')).toBe('paramo');
  });

  test('páramo (el tope) → vecino frío, el de abajo (no tiene piso arriba)', () => {
    expect(vecinoDePiso('paramo')).toBe('frio');
  });

  test('un piso que no existe no es vecino de nadie', () => {
    expect(vecinoDePiso('superparamo')).toBeNull();
    expect(vecinoDePiso(undefined)).toBeNull();
  });
});

describe('pisosVisiblesParaVista — nunca más de dos bosques a la vez', () => {
  test('cada vista trae como máximo dos pisos', () => {
    for (const piso of PISOS_CON_ENT) {
      const visibles = pisosVisiblesParaVista(piso);
      expect(visibles.length).toBeLessThanOrEqual(2);
      expect(visibles).toContain(piso);
    }
  });

  test('calido trae [calido, templado]; templado trae [templado, frio]; páramo trae [paramo, frio]', () => {
    expect(pisosVisiblesParaVista('calido')).toEqual(['calido', 'templado']);
    expect(pisosVisiblesParaVista('templado')).toEqual(['templado', 'frio']);
    expect(pisosVisiblesParaVista('paramo')).toEqual(['paramo', 'frio']);
    expect(pisosVisiblesParaVista('frio')).toEqual(['frio', 'paramo']);
  });

  test('una vista inválida cae a null (mostrar todo) como red de seguridad, no a un mundo vacío', () => {
    expect(pisosVisiblesParaVista('juntos')).toBeNull();
    expect(pisosVisiblesParaVista('superparamo')).toBeNull();
    expect(pisosVisiblesParaVista(undefined)).toBeNull();
  });
});

describe('el cuarto Ent fue una línea de datos, no un refactor', () => {
  test('la ceiba entró sin tocar la lógica: los cuatro pisos tienen Ent', () => {
    // Así estaba escrito el contrato antes de que llegara, y así se cumplió:
    // bastó con que MAPA_PISO_ENT.calido dejara de ser null para que
    // PISOS_CON_ENT, vecinoDePiso y protagonistaDePiso lo tomaran solos.
    expect(PISOS_CON_ENT).toEqual(['calido', 'templado', 'frio', 'paramo']);
    expect(Object.keys(MAPA_PISO_ENT)).toEqual(['calido', 'templado', 'frio', 'paramo']);
    expect(Object.values(MAPA_PISO_ENT).every(Boolean)).toBe(true);
  });

  test('el máximo-dos sigue siendo dura con cuatro pisos tallados', () => {
    for (const piso of PISOS_CON_ENT) {
      expect(pisosVisiblesParaVista(piso).length).toBeLessThanOrEqual(2);
    }
  });
});
