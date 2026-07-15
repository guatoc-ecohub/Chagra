/**
 * rutasProdChagraApp.test.js — guarda contra rutas duplicadas que se pisan en silencio.
 *
 * Bug real (integración 3D, 2026-07): 'restauracion' existía DOS veces en el
 * manifiesto — una vez como el mundo 3D nuevo (NUCLEO_3D, RestauracionEnElTiempo)
 * y otra como la pantalla 2D vieja (NUCLEO_APP, RestauracionScreen). Como
 * ProdChagraApp.jsx arma el router con un `Map` (`RUTAS.set(path, ...)`), el
 * registro que corre DESPUÉS pisa al primero SIN error ni warning: el usuario
 * navegaba a '#restauracion' y nunca veía el módulo 3D. Costó caro encontrarlo
 * a ojo — de ahí este test: reproduce el MISMO algoritmo de registro que usa
 * ProdChagraApp.jsx y falla si dos componentes DISTINTOS terminan ocupando la
 * misma key (sea por `path` o por `alias`).
 */
import { describe, it, expect } from 'vitest';
import { NUCLEO_3D, NUCLEO_APP, PENDIENTE_DECISION, EXCLUIDO } from '../rutasProdChagraApp.js';

/** Mismo orden y misma regla de exclusión que ProdChagraApp.jsx. */
/** @typedef {{ path: string, alias?: string[], componente: string }} EntradaRuta */
/** @type {Array<[string, EntradaRuta[]]>} */
const BLOQUES = [
  ['NUCLEO_3D', NUCLEO_3D],
  ['NUCLEO_APP', NUCLEO_APP],
  ['PENDIENTE_DECISION', /** @type {any} */ (PENDIENTE_DECISION)],
];

function registrarTodo() {
  /** @type {Map<string, {path: string, componente: string, bloque: string, viaAlias: boolean}>} */
  const registrados = new Map();
  const colisiones = [];

  for (const [bloque, entradas] of BLOQUES) {
    for (const e of entradas) {
      if (EXCLUIDO.some((x) => x.path === e.path)) continue;

      const registrar = (key, viaAlias) => {
        const previo = registrados.get(key);
        if (previo && previo.componente !== e.componente) {
          colisiones.push(
            `'${key}'${viaAlias ? ' (alias)' : ''}: '${previo.componente}' (${previo.bloque}${previo.viaAlias ? ' alias' : ''}) ` +
            `pisado por '${e.componente}' (${bloque}${viaAlias ? ' alias' : ''})`,
          );
        }
        registrados.set(key, { path: e.path, componente: e.componente, bloque, viaAlias });
      };

      registrar(e.path, false);
      for (const a of e.alias || []) registrar(a, true);
    }
  }

  return colisiones;
}

describe('rutasProdChagraApp — el manifiesto no se pisa a sí mismo', () => {
  it('ningún path o alias registra dos componentes DISTINTOS (el último pisaría al primero en silencio)', () => {
    const colisiones = registrarTodo();
    if (colisiones.length > 0) {
      throw new Error(
        `Rutas duplicadas detectadas (ver bug 'restauracion' 2026-07):\n  ${colisiones.join('\n  ')}`,
      );
    }
    expect(colisiones).toEqual([]);
  });

  it('no hay paths repetidos LITERALMENTE dentro de un mismo bloque (typo/copy-paste)', () => {
    for (const [bloque, entradas] of BLOQUES) {
      const vistos = new Map();
      for (const e of entradas) {
        vistos.set(e.path, (vistos.get(e.path) || 0) + 1);
      }
      const repetidos = [...vistos.entries()].filter(([, n]) => n > 1).map(([p]) => p);
      expect(repetidos, `paths repetidos dentro de ${bloque}: ${repetidos.join(', ')}`).toEqual([]);
    }
  });
});
