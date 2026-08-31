/**
 * compaiOcupado — ¿el campesino está a mitad de algo?
 *
 * Contratos que cuidamos:
 *   - estaOcupado() es false cuando no hay nada (ni razón explícita, ni foco
 *     de escritura).
 *   - marcarOcupado(razon) / marcarOcupado(razon, false) reclama y suelta.
 *   - dos razones simultáneas: sólo queda libre cuando AMBAS se sueltan.
 *   - liberarOcupacion() limpia todo de una.
 *   - escribiendo(doc): true con foco en INPUT de texto / TEXTAREA / SELECT /
 *     contentEditable; false con checkbox/button/radio (tocar eso no es
 *     estar a mitad de una frase) y false sin foco.
 *
 * `doc` es inyectable — usamos objetos falsos en vez del DOM real: jsdom no
 * implementa `isContentEditable` (queda `undefined` siempre), así que un
 * elemento real no sirve para probar esa rama.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { estaOcupado, marcarOcupado, liberarOcupacion, escribiendo, razonesOcupado } from '../compaiOcupado';

/** Elemento falso mínimo, sólo con lo que `escribiendo` lee. */
function elemento({ tagName, tipo, editable = false }) {
  return {
    tagName,
    isContentEditable: editable,
    getAttribute: (nombre) => (nombre === 'type' ? (tipo ?? null) : null),
  };
}

const docCon = (activeElement) => ({ activeElement });

// El estado de ocupación es un módulo-singleton (Set en memoria): sin este
// afterEach, una razón olvidada de un test contamina el siguiente.
afterEach(() => {
  liberarOcupacion();
});

describe('estaOcupado', () => {
  it('es false cuando no hay nada', () => {
    expect(estaOcupado()).toBe(false);
  });

  it('marcarOcupado(razon) lo pone true; marcarOcupado(razon, false) lo libera', () => {
    marcarOcupado('voz');
    expect(estaOcupado()).toBe(true);
    marcarOcupado('voz', false);
    expect(estaOcupado()).toBe(false);
  });

  it('dos razones simultáneas: sólo libre cuando AMBAS se liberan', () => {
    marcarOcupado('voz');
    marcarOcupado('foto');
    expect(estaOcupado()).toBe(true);
    marcarOcupado('voz', false);
    expect(estaOcupado()).toBe(true); // 'foto' sigue activa
    marcarOcupado('foto', false);
    expect(estaOcupado()).toBe(false);
  });

  it('liberarOcupacion() limpia todo', () => {
    marcarOcupado('voz');
    marcarOcupado('form:mata');
    expect(razonesOcupado().length).toBeGreaterThan(0);
    liberarOcupacion();
    expect(razonesOcupado()).toEqual([]);
    expect(estaOcupado()).toBe(false);
  });

  it('marcarOcupado sin razón no lanza y no hace nada', () => {
    expect(() => marcarOcupado('')).not.toThrow();
    expect(() => marcarOcupado(null)).not.toThrow();
    expect(estaOcupado()).toBe(false);
  });

  it('estaOcupado(doc) también es true si el DOM dice que se está escribiendo', () => {
    const doc = docCon(elemento({ tagName: 'INPUT' }));
    expect(estaOcupado(doc)).toBe(true);
  });
});

describe('escribiendo', () => {
  it('true con foco en INPUT de texto', () => {
    expect(escribiendo(docCon(elemento({ tagName: 'INPUT' })))).toBe(true); // sin type → 'text' por default
    expect(escribiendo(docCon(elemento({ tagName: 'INPUT', tipo: 'text' })))).toBe(true);
  });

  it('true con foco en TEXTAREA', () => {
    expect(escribiendo(docCon(elemento({ tagName: 'TEXTAREA' })))).toBe(true);
  });

  it('true con foco en SELECT', () => {
    expect(escribiendo(docCon(elemento({ tagName: 'SELECT' })))).toBe(true);
  });

  it('true con contentEditable, sin importar el tag', () => {
    expect(escribiendo(docCon(elemento({ tagName: 'DIV', editable: true })))).toBe(true);
  });

  it('false con input type=checkbox/button/radio (no son escritura)', () => {
    expect(escribiendo(docCon(elemento({ tagName: 'INPUT', tipo: 'checkbox' })))).toBe(false);
    expect(escribiendo(docCon(elemento({ tagName: 'INPUT', tipo: 'button' })))).toBe(false);
    expect(escribiendo(docCon(elemento({ tagName: 'INPUT', tipo: 'radio' })))).toBe(false);
  });

  it('false sin elemento enfocado o con un tag no editable', () => {
    expect(escribiendo(docCon(null))).toBe(false);
    expect(escribiendo(docCon(elemento({ tagName: 'DIV' })))).toBe(false);
    expect(escribiendo(docCon(elemento({ tagName: 'BUTTON' })))).toBe(false);
  });

  it('sin doc inyectado, usa el document real (jsdom) — nada enfocado, no escribe', () => {
    expect(escribiendo()).toBe(false);
  });
});
