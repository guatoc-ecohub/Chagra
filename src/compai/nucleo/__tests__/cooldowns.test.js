/**
 * cooldowns — tests del núcleo portable de cooldowns.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LLAVE_COOLDOWNS, LLAVE_HEREDADA_ANGELITA, leerCooldowns, escribirCooldowns } from '../cooldowns.js';

/** Storage falso para tests (sin localStorage real). */
class StorageFalso {
  constructor(items = {}) {
    this._items = items;
  }

  getItem(key) {
    return this._items[key] ?? null;
  }

  setItem(key, value) {
    this._items[key] = value;
  }

  removeItem(key) {
    delete this._items[key];
  }

  key(index) {
    return Object.keys(this._items)[index] ?? null;
  }

  get length() {
    return Object.keys(this._items).length;
  }

  clear() {
    this._items = {};
  }
}

describe('cooldowns — núcleo portable', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
  });

  it('lee cooldowns vacíos si no hay nada guardado', () => {
    const st = new StorageFalso();
    expect(leerCooldowns(st)).toEqual({});
  });

  it('escribe y lee cooldowns en la llave canónica', () => {
    const st = new StorageFalso();
    const cooldowns = { 'husmea:mis_matas': Date.now(), 'aviso_alta': Date.now() - 1000 };

    escribirCooldowns(cooldowns, st);

    expect(st.getItem(LLAVE_COOLDOWNS)).toBe(JSON.stringify(cooldowns));
    expect(leerCooldowns(st)).toEqual(cooldowns);
  });

  it('migra cooldowns desde la llave heredada de Angelita', () => {
    const st = new StorageFalso({
      [LLAVE_HEREDADA_ANGELITA]: JSON.stringify({
        state: {
          ultimaHablaPorLlave: { 'husmea:clima': 1234567890 },
          silenciado: false,
          molestia: 3,
        },
      }),
    });

    const cooldowns = leerCooldowns(st);
    expect(cooldowns).toEqual({ 'husmea:clima': 1234567890 });
  });

  it('da prioridad a la llave canónica sobre la heredada', () => {
    const st = new StorageFalso({
      [LLAVE_COOLDOWNS]: JSON.stringify({ 'husmea:nuevo': 9999999999 }),
      [LLAVE_HEREDADA_ANGELITA]: JSON.stringify({
        state: {
          ultimaHablaPorLlave: { 'husmea:viejo': 1111111111 },
        },
      }),
    });

    const cooldowns = leerCooldowns(st);
    expect(cooldowns).toEqual({ 'husmea:nuevo': 9999999999 });
  });

  it('escribe en ambas llaves por compatibilidad hacia atrás', () => {
    const st = new StorageFalso();
    const cooldowns = { 'husmea:mis_animales': Date.now() };

    escribirCooldowns(cooldowns, st);

    // Verificar que ambas llaves tienen los datos
    expect(JSON.parse(st.getItem(LLAVE_COOLDOWNS))).toEqual(cooldowns);

    const heredado = JSON.parse(st.getItem(LLAVE_HEREDADA_ANGELITA));
    expect(heredado.state.ultimaHablaPorLlave).toEqual(cooldowns);
    expect(heredado.state.silenciado).toBe(false);
    expect(heredado.state.molestia).toBe(0);
  });

  it('falla silenciosamente en modo privado (storage lanza excepción)', () => {
    const stMalvado = {
      length: 0,
      getItem: () => { throw new Error('modo privado'); },
      setItem: () => { throw new Error('modo privado'); },
      removeItem: () => { throw new Error('modo privado'); },
      key: () => null,
      clear: () => { throw new Error('modo privado'); },
    };

    expect(() => leerCooldowns(stMalvado)).not.toThrow();
    expect(() => escribirCooldowns({}, stMalvado)).not.toThrow();
  });

  it('retorna objeto vacío si el JSON está corrupto', () => {
    const st = new StorageFalso({
      [LLAVE_COOLDOWNS]: 'json-invalido',
    });

    expect(leerCooldowns(st)).toEqual({});
  });
});
