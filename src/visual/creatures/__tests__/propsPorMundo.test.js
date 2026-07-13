/**
 * propsPorMundo.test.js — resolución del prop-por-mundo + integridad del
 * registro de dibujos (biblia de personajes).
 */
import { describe, it, expect } from 'vitest';
import {
  propDeMundo,
  mundoTieneProp,
  PROP_POR_MUNDO,
  PROPS_CONOCIDOS,
} from '../propsPorMundo.js';
import { DIBUJO_PROP } from '../PropEnMano.jsx';

describe('propDeMundo — mapa del spec', () => {
  it('mundos con prop nombrado en la ficha', () => {
    expect(propDeMundo('agua')).toBe('manguera');
    expect(propDeMundo('suelo')).toBe('lupa');
    expect(propDeMundo('animales')).toBe('lazo');
    expect(propDeMundo('semillero')).toBe('canasto');
    expect(propDeMundo('cafe')).toBe('rama-cafe');
    expect(propDeMundo('abono')).toBe('horqueta'); // compost
  });

  it('mundo sin prop mapeado → null (manos libres)', () => {
    expect(propDeMundo('mundo-inexistente')).toBeNull();
  });

  it('entrada no-string → null (defensivo)', () => {
    expect(propDeMundo(undefined)).toBeNull();
    expect(propDeMundo(/** @type {any} */ (42))).toBeNull();
    expect(propDeMundo(null)).toBeNull();
  });

  it('mundoTieneProp coincide con propDeMundo', () => {
    expect(mundoTieneProp('agua')).toBe(true);
    expect(mundoTieneProp('mundo-inexistente')).toBe(false);
  });
});

describe('integridad del registro', () => {
  it('todo prop mapeado tiene un dibujo en DIBUJO_PROP', () => {
    for (const propId of PROPS_CONOCIDOS) {
      expect(DIBUJO_PROP[propId], `falta dibujo para prop "${propId}"`).toBeTypeOf('function');
    }
  });

  it('PROPS_CONOCIDOS no tiene duplicados y cubre el mapa', () => {
    const valores = new Set(Object.values(PROP_POR_MUNDO));
    expect(new Set(PROPS_CONOCIDOS).size).toBe(PROPS_CONOCIDOS.length);
    expect(new Set(PROPS_CONOCIDOS)).toEqual(valores);
  });
});
