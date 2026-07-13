/**
 * redSharing.test.js — compuerta anti-extractiva de la red (opt-in 3 niveles).
 * Verifica el invariante duro: nada privado (nivel 1) cruza a la red, y la
 * proyección a pares recorta lo que no les corresponde.
 */
import { describe, it, expect } from 'vitest';
import { SHARE_LEVEL } from '../types.js';
import {
  normalizeShareLevel,
  withDefaultShareLevel,
  isShareable,
  filterShareable,
  redactForPeers,
} from '../redSharing.js';

const trato = (o = {}) => ({
  id: 't1',
  productorHash: 'p1',
  compradorHash: 'c1',
  ofertaId: 'of1',
  producto: 'Tomate',
  categoria: 'hortaliza',
  vereda: 'El Curí',
  municipio: 'Choachí',
  cantidad: 20,
  unidad: 'kg',
  entrega: 'entregado',
  calidad: 5,
  confirmadoPor: 'ambos',
  nota: 'texto libre privado',
  shareLevel: 2,
  createdAt: 1000,
  ...o,
});

describe('normalizeShareLevel', () => {
  it('acepta 2 (PARES) y 3 (CANONIZADO)', () => {
    expect(normalizeShareLevel(2)).toBe(SHARE_LEVEL.PARES);
    expect(normalizeShareLevel(3)).toBe(SHARE_LEVEL.CANONIZADO);
    expect(normalizeShareLevel('2')).toBe(2);
  });
  it('cae a PRIVADO (1) ante cualquier valor inválido/ausente', () => {
    expect(normalizeShareLevel(undefined)).toBe(SHARE_LEVEL.PRIVADO);
    expect(normalizeShareLevel(null)).toBe(1);
    expect(normalizeShareLevel(0)).toBe(1);
    expect(normalizeShareLevel(5)).toBe(1);
    expect(normalizeShareLevel('basura')).toBe(1);
  });
});

describe('withDefaultShareLevel', () => {
  it('estampa PRIVADO por default y no muta el original', () => {
    const original = { producto: 'Mora' };
    const out = withDefaultShareLevel(original);
    expect(out.shareLevel).toBe(1);
    expect(original.shareLevel).toBeUndefined();
  });
  it('preserva un nivel válido', () => {
    expect(withDefaultShareLevel({ shareLevel: 2 }).shareLevel).toBe(2);
  });
  it('tolera no-objeto', () => {
    expect(withDefaultShareLevel(null).shareLevel).toBe(1);
  });
});

describe('isShareable', () => {
  it('exige nivel PARES (2) por default', () => {
    expect(isShareable(trato({ shareLevel: 1 }))).toBe(false);
    expect(isShareable(trato({ shareLevel: 2 }))).toBe(true);
    expect(isShareable(trato({ shareLevel: 3 }))).toBe(true);
  });
  it('respeta un minLevel personalizado', () => {
    expect(isShareable(trato({ shareLevel: 2 }), { minLevel: 3 })).toBe(false);
    expect(isShareable(trato({ shareLevel: 3 }), { minLevel: 3 })).toBe(true);
  });
  it('rechaza input basura', () => {
    expect(isShareable(null)).toBe(false);
    expect(isShareable(42)).toBe(false);
  });
});

describe('filterShareable', () => {
  it('deja solo los tratos compartibles', () => {
    const lista = [
      trato({ id: 'a', shareLevel: 1 }),
      trato({ id: 'b', shareLevel: 2 }),
      trato({ id: 'c', shareLevel: 3 }),
    ];
    expect(filterShareable(lista).map((t) => t.id)).toEqual(['b', 'c']);
  });
  it('tolera no-array', () => {
    expect(filterShareable(undefined)).toEqual([]);
  });
});

describe('redactForPeers', () => {
  it('devuelve null para un trato privado (defensa en profundidad)', () => {
    expect(redactForPeers(trato({ shareLevel: 1 }))).toBeNull();
  });
  it('recorta comprador, oferta y texto libre; conserva lo de reputación', () => {
    const red = redactForPeers(trato({ shareLevel: 2 }));
    expect(red).not.toBeNull();
    // Se conserva lo necesario para reputación/matchmaking:
    expect(red.productorHash).toBe('p1');
    expect(red.producto).toBe('Tomate');
    expect(red.vereda).toBe('El Curí');
    expect(red.entrega).toBe('entregado');
    expect(red.calidad).toBe(5);
    // Se recorta lo que los pares NO necesitan:
    expect(red).not.toHaveProperty('compradorHash');
    expect(red).not.toHaveProperty('ofertaId');
    expect(red).not.toHaveProperty('nota');
  });
});
