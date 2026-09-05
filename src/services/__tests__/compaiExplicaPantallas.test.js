/**
 * compaiExplicaPantallas.test.js — el manifiesto FUENTE ÚNICA de qué dice el
 * compai al entrar a cada pantalla.
 *
 * CABLEADO 2026-09-03 (decisión del operador: el texto de explicación de la
 * pantalla SALE EN LA PIZARRA SIEMPRE; regla dura, commit 3233f7f06): este
 * manifiesto alimenta la pizarra (peek del toque + panel "Ver" del AgentFab,
 * y la pizarra del CompaiOverlay en la portada B) vía getHintForRuta. Ya NO
 * alimenta burbujas auto-pop (prohibidas).
 *
 * Estos tests fijan: (a) la estructura de cada entrada, (b) el tono de la
 * casa (es-CO, usted, sin em dashes), (c) la ALINEACIÓN con el segundo
 * catálogo (RUTA_HINTS en compaiHints.js: toda clave con hint tiene
 * explicación, y en las pantallas compartidas manda el manifiesto).
 *
 * Español de Colombia (usted), sin voseo.
 */
import { describe, expect, it } from 'vitest';
import {
  EXPLICA_PANTALLAS,
  explicacionDePantalla,
  tieneExplicacion,
} from '../compaiExplicaPantallas.js';
import { RUTA_HINTS } from '../../config/compaiHints.js';

describe('compaiExplicaPantallas — estructura del manifiesto', () => {
  it('cada entrada trae titulo, texto y funciones no vacíos', () => {
    const claves = Object.keys(EXPLICA_PANTALLAS);
    expect(claves.length).toBeGreaterThanOrEqual(37);
    for (const clave of claves) {
      const e = EXPLICA_PANTALLAS[clave];
      expect(e, `sin entrada para ${clave}`).toBeTruthy();
      expect(typeof e.titulo, `titulo de ${clave}`).toBe('string');
      expect(e.titulo.length).toBeGreaterThan(0);
      expect(typeof e.texto, `texto de ${clave}`).toBe('string');
      expect(e.texto.length).toBeGreaterThan(0);
      expect(Array.isArray(e.funciones), `funciones de ${clave}`).toBe(true);
      expect(e.funciones.length, `funciones de ${clave} no vacías`).toBeGreaterThan(0);
      for (const f of e.funciones) {
        expect(typeof f).toBe('string');
        expect(f.length).toBeGreaterThan(0);
      }
    }
  });

  it('el manifiesto está congelado (no admite mutaciones)', () => {
    expect(Object.isFrozen(EXPLICA_PANTALLAS)).toBe(true);
  });
});

describe('compaiExplicaPantallas — tono de la casa (es-CO, usted, sin em dashes)', () => {
  const VOSEO = /\b(vos|ten[eé]s|quer[eé]s|pod[eé]s|sos|che|dale)\b/i;

  it('ninguna explicación usa voseo argentino ni em dashes', () => {
    for (const [clave, e] of Object.entries(EXPLICA_PANTALLAS)) {
      const todo = `${e.titulo} ${e.texto} ${e.funciones.join(' ')}`;
      expect(VOSEO.test(todo), `voseo en ${clave}: "${todo}"`).toBe(false);
      expect(todo.includes('—'), `em dash en ${clave}`).toBe(false);
    }
  });
});

describe('compaiExplicaPantallas — alineación con compaiHints (2026-09-03)', () => {
  it('toda ruta con hint (salvo default) tiene su explicación en el manifiesto', () => {
    const sinExplicacion = Object.keys(RUTA_HINTS)
      .filter((k) => k !== 'default')
      .filter((k) => !tieneExplicacion(k));
    expect(sinExplicacion).toEqual([]);
  });

  it('las pantallas compartidas quedan con UNA voz: la del manifiesto (getHintForRuta)', async () => {
    const { getHintForRuta } = await import('../../config/compaiHints.js');
    // Pantallas cubiertas por los DOS catálogos: manda el manifiesto.
    for (const pantalla of ['hoy_finca', 'evolucion', 'informes', 'calendario_finca', 'germinacion', 'suelo', 'agua', 'animales', 'biopreparados', 'perfil', 'mapa']) {
      const aviso = getHintForRuta(pantalla, 'Angelita');
      expect(aviso.titulo, `titulo de ${pantalla}`).toBe(EXPLICA_PANTALLAS[pantalla].titulo);
      expect(aviso.descripcion).toBe(EXPLICA_PANTALLAS[pantalla].texto);
      expect(aviso.funciones).toEqual(EXPLICA_PANTALLAS[pantalla].funciones);
    }
  });

  it('getHintForRuta devuelve funciones para pantallas del manifiesto y no para reservas', async () => {
    const { getHintForRuta } = await import('../../config/compaiHints.js');
    expect(getHintForRuta('bodega', 'Angelita').funciones.length).toBeGreaterThan(0);
    // 'cafe' (familia de cultivos 3D, aún sin explicación propia) cae al
    // default de reserva: sin funciones.
    expect(getHintForRuta('cafe', 'Angelita').funciones).toBeUndefined();
  });
});

describe('explicacionDePantalla', () => {
  it('resuelve pantallas cubiertas sin importar mayúsculas ni espacios', () => {
    expect(explicacionDePantalla('Bodega')).toEqual(EXPLICA_PANTALLAS.bodega);
    expect(explicacionDePantalla('  TASK_LOG ')).toEqual(EXPLICA_PANTALLAS.task_log);
  });

  it('devuelve null para pantallas no cubiertas o inválidas (mejor callado que inventado)', () => {
    expect(explicacionDePantalla('cafe')).toBeNull();
    expect(explicacionDePantalla('ruta-inexistente')).toBeNull();
    expect(explicacionDePantalla(null)).toBeNull();
    expect(explicacionDePantalla(undefined)).toBeNull();
    expect(explicacionDePantalla(42)).toBeNull();
  });

  it('tieneExplicacion refleja la cobertura', () => {
    expect(tieneExplicacion('activos')).toBe(true);
    expect(tieneExplicacion('doom_finca')).toBe(false);
  });
});
