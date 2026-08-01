/**
 * compaiParadasPorPantalla — el registro de qué es comentable en cada
 * pantalla (#27), y que lo que toca es lo que comenta (#26: cada parada
 * trae SU PROPIO texto, nunca un pool suelto).
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  registrarParadas,
  desregistrarParadas,
  paradasDe,
  paradasCercaDe,
  paradasPantallaDe,
  tieneParadas,
  limpiarRegistro,
} from '../compaiParadasPorPantalla.js';

afterEach(() => {
  limpiarRegistro();
});

const ref = () => ({ current: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 10, bottom: 10 }) } });

describe('registrarParadas / paradasDe', () => {
  it('sin registro, devuelve lista vacía', () => {
    expect(paradasDe('nunca-registrada')).toEqual([]);
    expect(tieneParadas('nunca-registrada')).toBe(false);
  });

  it('registra y recupera exactamente lo declarado (texto propio, #26)', () => {
    registrarParadas('hoy-en-finca', [
      { id: 'alertas', ref: ref(), texto: 'Aquí le aviso de heladas.', gesto: 'senala' },
    ]);
    const paradas = paradasDe('hoy-en-finca');
    expect(paradas).toHaveLength(1);
    expect(paradas[0].texto).toBe('Aquí le aviso de heladas.');
    expect(tieneParadas('hoy-en-finca')).toBe(true);
  });

  it('reemplaza el registro anterior si se llama de nuevo (no acumula)', () => {
    registrarParadas('x', [{ id: 'a', ref: ref(), texto: 'A' }]);
    registrarParadas('x', [{ id: 'b', ref: ref(), texto: 'B' }]);
    expect(paradasDe('x').map((p) => p.id)).toEqual(['b']);
  });

  it('filtra paradas sin id o sin ref', () => {
    registrarParadas('y', [
      { id: 'ok', ref: ref(), texto: 'ok' },
      { id: '', ref: ref(), texto: 'sin id' },
      { id: 'sin-ref', texto: 'sin ref' },
    ]);
    expect(paradasDe('y').map((p) => p.id)).toEqual(['ok']);
  });

  it('pantalla sin `paradas` array (undefined/null) no lanza, queda vacía', () => {
    expect(() => registrarParadas('z', null)).not.toThrow();
    expect(paradasDe('z')).toEqual([]);
  });

  it('registrarParadas sin pantallaId no hace nada', () => {
    expect(() => registrarParadas('', [{ id: 'a', ref: ref(), texto: 'a' }])).not.toThrow();
  });
});

describe('anillos (#31)', () => {
  it('paradas sin anillo declarado caen en "pantalla" (default seguro)', () => {
    registrarParadas('p', [{ id: 'a', ref: ref(), texto: 'a' }]);
    expect(paradasDe('p')[0].anillo).toBe('pantalla');
    expect(paradasPantallaDe('p')).toHaveLength(1);
    expect(paradasCercaDe('p')).toHaveLength(0);
  });

  it('respeta anillo:"cerca" declarado explícitamente', () => {
    registrarParadas('p', [
      { id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' },
      { id: 'b', ref: ref(), texto: 'b', anillo: 'pantalla' },
      { id: 'c', ref: ref(), texto: 'c' },
    ]);
    expect(paradasCercaDe('p').map((x) => x.id)).toEqual(['a']);
    expect(paradasPantallaDe('p').map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('un anillo inválido cae también a "pantalla"', () => {
    registrarParadas('p', [{ id: 'a', ref: ref(), texto: 'a', anillo: 'lejos' }]);
    expect(paradasDe('p')[0].anillo).toBe('pantalla');
  });
});

describe('desregistrarParadas / limpiarRegistro', () => {
  it('desregistrarParadas suelta solo esa pantalla', () => {
    registrarParadas('uno', [{ id: 'a', ref: ref(), texto: 'a' }]);
    registrarParadas('dos', [{ id: 'b', ref: ref(), texto: 'b' }]);
    desregistrarParadas('uno');
    expect(paradasDe('uno')).toEqual([]);
    expect(paradasDe('dos')).toHaveLength(1);
  });

  it('limpiarRegistro vacía todo', () => {
    registrarParadas('uno', [{ id: 'a', ref: ref(), texto: 'a' }]);
    limpiarRegistro();
    expect(paradasDe('uno')).toEqual([]);
  });
});
