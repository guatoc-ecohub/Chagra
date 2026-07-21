/**
 * extensionistaService.test.js — TDD del servicio del modo extensionista
 * (panel supervisor multi-finca, ADR-048 MVP).
 *
 * El servicio NO toca red ni backend: lee la lista de fincas delegadas de un
 * MOCK estático (src/data/extensionista-fincas.json) y la transforma en un
 * modelo de tablero ordenado y resumido. Es scaffold cliente; la delegación
 * real (UCAN) es follow-up backend (ver extensionistaAccess.js / ADR-048).
 *
 * Cobertura:
 *  - getFincasDelegadas: devuelve las fincas del extensionista dado.
 *  - getFincasDelegadas: usuario sin delegaciones → [] (no inventa).
 *  - getFincasDelegadas: normaliza el username (trim + lowercase).
 *  - getFincasDelegadas: null/undefined/no-string → [].
 *  - clasificarEstadoFinca: mapea cada estado conocido a {label, severidad}.
 *  - clasificarEstadoFinca: estado desconocido → severidad neutra, sin tirar.
 *  - construirTableroExtensionista: orden por severidad (alertas primero) +
 *    contadores agregados (total, con_alertas, con_pendientes).
 */
import { describe, it, expect } from 'vitest';
import {
  getFincasDelegadas,
  clasificarEstadoFinca,
  construirTableroExtensionista,
  ESTADO_SEVERIDAD,
} from '../extensionistaService.js';

describe('extensionistaService — getFincasDelegadas', () => {
  it('devuelve las fincas delegadas al extensionista del seed', () => {
    const fincas = getFincasDelegadas('demo-extensionista');
    expect(Array.isArray(fincas)).toBe(true);
    expect(fincas.length).toBeGreaterThan(0);
    // Cada finca trae los campos mínimos que el tablero consume.
    for (const f of fincas) {
      expect(f).toHaveProperty('slug');
      expect(f).toHaveProperty('nombre');
      expect(f).toHaveProperty('operador');
      expect(f).toHaveProperty('estado');
    }
  });

  it('normaliza el username (trim + case-insensitive)', () => {
    expect(getFincasDelegadas('  DEMO-EXTENSIONISTA  ').length).toBe(
      getFincasDelegadas('demo-extensionista').length
    );
  });

  it('devuelve [] para un extensionista sin delegaciones (no inventa)', () => {
    expect(getFincasDelegadas('desconocido_xyz')).toEqual([]);
  });

  it('devuelve [] para null / undefined / no-string', () => {
    expect(getFincasDelegadas(/** @type {any} */ (null))).toEqual([]);
    expect(getFincasDelegadas(/** @type {any} */ (undefined))).toEqual([]);
    expect(getFincasDelegadas(/** @type {any} */ (123))).toEqual([]);
    expect(getFincasDelegadas('')).toEqual([]);
  });

  it('devuelve copias, no referencias al mock (no se puede mutar el seed)', () => {
    const a = getFincasDelegadas('demo-extensionista');
    a[0].nombre = 'MUTADO';
    const b = getFincasDelegadas('demo-extensionista');
    expect(b[0].nombre).not.toBe('MUTADO');
  });
});

describe('extensionistaService — clasificarEstadoFinca', () => {
  it('mapea cada estado conocido a label + severidad', () => {
    for (const estado of Object.keys(ESTADO_SEVERIDAD)) {
      const c = clasificarEstadoFinca(estado);
      expect(typeof c.label).toBe('string');
      expect(c.label.length).toBeGreaterThan(0);
      expect(typeof c.severidad).toBe('number');
    }
  });

  it('al_dia tiene menor severidad que con_pendientes y sin_sync_reciente', () => {
    expect(clasificarEstadoFinca('al_dia').severidad).toBeLessThan(
      clasificarEstadoFinca('con_pendientes').severidad
    );
    expect(clasificarEstadoFinca('al_dia').severidad).toBeLessThan(
      clasificarEstadoFinca('sin_sync_reciente').severidad
    );
  });

  it('estado desconocido → severidad neutra y label no vacío (no tira)', () => {
    const c = clasificarEstadoFinca('estado_inexistente');
    expect(c.label.length).toBeGreaterThan(0);
    expect(typeof c.severidad).toBe('number');
  });

  it('estado null/undefined no tira', () => {
    expect(() => clasificarEstadoFinca(null)).not.toThrow();
    expect(() => clasificarEstadoFinca(undefined)).not.toThrow();
  });
});

describe('extensionistaService — construirTableroExtensionista', () => {
  it('ordena las fincas por severidad descendente (lo urgente arriba)', () => {
    const tablero = construirTableroExtensionista('demo-extensionista');
    const sevs = tablero.fincas.map((f) => f._clasificacion.severidad);
    const ordenado = [...sevs].sort((a, b) => b - a);
    expect(sevs).toEqual(ordenado);
  });

  it('agrega contadores: total, con_alertas, con_pendientes', () => {
    const tablero = construirTableroExtensionista('demo-extensionista');
    expect(tablero.resumen.total).toBe(tablero.fincas.length);
    expect(tablero.resumen.con_alertas).toBe(
      tablero.fincas.filter((f) => (f.alertas || 0) > 0).length
    );
    expect(tablero.resumen.con_pendientes).toBe(
      tablero.fincas.filter((f) => (f.pendientes || 0) > 0).length
    );
  });

  it('extensionista sin fincas → tablero vacío coherente (no inventa)', () => {
    const tablero = construirTableroExtensionista('desconocido_xyz');
    expect(tablero.fincas).toEqual([]);
    expect(tablero.resumen.total).toBe(0);
    expect(tablero.resumen.con_alertas).toBe(0);
    expect(tablero.resumen.con_pendientes).toBe(0);
  });

  it('cada finca del tablero trae su clasificación adjunta', () => {
    const tablero = construirTableroExtensionista('demo-extensionista');
    for (const f of tablero.fincas) {
      expect(f._clasificacion).toBeTruthy();
      expect(typeof f._clasificacion.label).toBe('string');
    }
  });
});
