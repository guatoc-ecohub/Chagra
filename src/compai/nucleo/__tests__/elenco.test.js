/**
 * elenco — quién acompaña al usuario.
 *
 * Contratos que cuidamos:
 *   - leerCompanero lee la llave CANÓNICA primero.
 *   - si la canónica está vacía, migra desde las dos llaves heredadas, en
 *     orden de precedencia: 'chagra:agent-avatar-type' → 'guatoc.guia'.
 *   - los slugs jubilados ('colibri', 'colibri_svg') migran a 'angelita'.
 *   - un slug desconocido cae al defecto ('angelita').
 *   - escribirCompanero escribe en las TRES llaves.
 *   - ninguna de las dos funciones lanza si el storage tira excepción
 *     (modo privado / cuota llena).
 */
import { describe, it, expect } from 'vitest';
import { LLAVE_COMPANERO, LLAVES_HEREDADAS, COMPANERO_DEFECTO, leerCompanero, escribirCompanero } from '../elenco';

/** Storage falso e inyectable: sólo lo que las funciones necesitan. */
class StorageFalso {
  constructor(inicial = {}) {
    this.datos = { ...inicial };
  }

  getItem(llave) {
    return Object.prototype.hasOwnProperty.call(this.datos, llave) ? this.datos[llave] : null;
  }

  setItem(llave, valor) {
    this.datos[llave] = String(valor);
  }
}

/** Storage que siempre lanza — simula modo privado / cuota llena. */
class StorageRoto {
  getItem() {
    throw new Error('modo privado');
  }

  setItem() {
    throw new Error('modo privado');
  }
}

describe('leerCompanero', () => {
  it('lee la llave canónica primero', () => {
    const st = new StorageFalso({ [LLAVE_COMPANERO]: 'jaguar' });
    expect(leerCompanero(st)).toBe('jaguar');
  });

  it('si la canónica está vacía, migra desde chagra:agent-avatar-type', () => {
    const st = new StorageFalso({ 'chagra:agent-avatar-type': 'maiz' });
    expect(leerCompanero(st)).toBe('maiz');
  });

  it('si sólo hay guatoc.guia, migra desde ahí', () => {
    const st = new StorageFalso({ 'guatoc.guia': 'oso' });
    expect(leerCompanero(st)).toBe('oso');
  });

  it('respeta el orden de precedencia entre las dos heredadas', () => {
    expect(LLAVES_HEREDADAS).toEqual(['chagra:agent-avatar-type', 'guatoc.guia']);
    const st = new StorageFalso({ 'chagra:agent-avatar-type': 'guacamaya', 'guatoc.guia': 'chivito' });
    expect(leerCompanero(st)).toBe('guacamaya');
  });

  it('los slugs jubilados colibri / colibri_svg migran a angelita', () => {
    expect(leerCompanero(new StorageFalso({ [LLAVE_COMPANERO]: 'colibri' }))).toBe('angelita');
    expect(leerCompanero(new StorageFalso({ [LLAVE_COMPANERO]: 'colibri_svg' }))).toBe('angelita');
  });

  it('un slug desconocido en cualquier llave cae al defecto', () => {
    const st = new StorageFalso({
      [LLAVE_COMPANERO]: 'dragon_inventado',
      'chagra:agent-avatar-type': 'otro_inventado',
      'guatoc.guia': 'tercero_inventado',
    });
    expect(leerCompanero(st)).toBe(COMPANERO_DEFECTO);
    expect(COMPANERO_DEFECTO).toBe('angelita');
  });

  it('sin storage disponible (SSR) devuelve el defecto', () => {
    expect(leerCompanero(null)).toBe(COMPANERO_DEFECTO);
  });

  it('zariguya es un slug válido (entró al elenco 2026-07-25, PR #2783)', () => {
    const st = new StorageFalso({ [LLAVE_COMPANERO]: 'zariguya' });
    expect(leerCompanero(st)).toBe('zariguya');
  });

  it('no lanza si el storage tira excepción (modo privado)', () => {
    expect(() => leerCompanero(new StorageRoto())).not.toThrow();
    expect(leerCompanero(new StorageRoto())).toBe(COMPANERO_DEFECTO);
  });
});

describe('escribirCompanero', () => {
  it('escribe en las TRES llaves', () => {
    const st = new StorageFalso();
    const r = escribirCompanero('jaguar', st);
    expect(r).toBe('jaguar');
    expect(st.getItem(LLAVE_COMPANERO)).toBe('jaguar');
    expect(st.getItem('chagra:agent-avatar-type')).toBe('jaguar');
    expect(st.getItem('guatoc.guia')).toBe('jaguar');
  });

  it('migra los slugs jubilados también al escribir', () => {
    const st = new StorageFalso();
    expect(escribirCompanero('colibri', st)).toBe('angelita');
    expect(st.getItem(LLAVE_COMPANERO)).toBe('angelita');
  });

  it('un slug inválido no escribe nada y devuelve null', () => {
    const st = new StorageFalso();
    expect(escribirCompanero('no_existe_en_el_elenco', st)).toBeNull();
    expect(st.getItem(LLAVE_COMPANERO)).toBeNull();
  });

  it('no lanza si el storage tira excepción (modo privado)', () => {
    const st = new StorageRoto();
    expect(() => escribirCompanero('jaguar', st)).not.toThrow();
    // el slug validado se devuelve igual: la sesión sigue con el valor en memoria.
    expect(escribirCompanero('jaguar', st)).toBe('jaguar');
  });
});
