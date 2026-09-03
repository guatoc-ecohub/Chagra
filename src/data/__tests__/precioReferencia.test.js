/**
 * precioReferencia.test.js — cierra el hallazgo "Precio SIPSA = humo" del
 * audit triple (Chagra-strategy/audit/2026-06-28-triple-auditoria-mano-3ejes.md):
 * la tabla de precios de referencia del marketplace ya NO está vacía, y este
 * test es el guard mecánico anti-fabricación de esa población.
 *
 * Cubre: forma exacta del registro (contrato que consume marketplaceService),
 * que cada entrada trae `fuente` + `boletinFecha` no vacíos (política "dato
 * con fuente o no va"), tipos/coherencia numérica (precioMin <= precioMax,
 * ambos positivos), ausencia de claves de producto duplicadas, inmutabilidad
 * de la tabla, y el comportamiento documentado de normalizarProducto /
 * getPrecioReferencia (incluyendo casos sin dato → null, nunca inventado).
 */
import { describe, it, expect } from 'vitest';
import {
  PRECIOS_REFERENCIA,
  normalizarProducto,
  getPrecioReferencia,
} from '../precioReferencia.js';

const MIN_ENTRADAS_CON_FUENTE = 10;

describe('PRECIOS_REFERENCIA — estructura y anti-fabricación', () => {
  it('es un arreglo no vacío', () => {
    expect(Array.isArray(PRECIOS_REFERENCIA)).toBe(true);
    expect(PRECIOS_REFERENCIA.length).toBeGreaterThan(0);
  });

  it('está congelado (Object.freeze) — no se muta en runtime', () => {
    expect(Object.isFrozen(PRECIOS_REFERENCIA)).toBe(true);
  });

  it(`trae al menos ${MIN_ENTRADAS_CON_FUENTE} entradas con \`fuente\` no vacía`, () => {
    const conFuente = PRECIOS_REFERENCIA.filter(
      (r) => typeof r.fuente === 'string' && r.fuente.trim().length > 0
    );
    expect(conFuente.length).toBeGreaterThanOrEqual(MIN_ENTRADAS_CON_FUENTE);
  });

  it.each(PRECIOS_REFERENCIA.map((r) => [r.producto, r]))(
    '%s — registro completo con la forma exacta que consume marketplaceService',
    (_producto, r) => {
      expect(typeof r.producto).toBe('string');
      expect(r.producto.trim().length).toBeGreaterThan(0);

      expect(typeof r.unidad).toBe('string');
      expect(r.unidad.trim().length).toBeGreaterThan(0);

      expect(Number.isFinite(r.precioMin)).toBe(true);
      expect(Number.isFinite(r.precioMax)).toBe(true);
      expect(r.precioMin).toBeGreaterThan(0);
      expect(r.precioMax).toBeGreaterThanOrEqual(r.precioMin);

      expect(typeof r.mercado).toBe('string');
      expect(r.mercado.trim().length).toBeGreaterThan(0);

      // Anti-fabricación: cita + fecha de trazabilidad son OBLIGATORIAS.
      expect(typeof r.fuente).toBe('string');
      expect(r.fuente.trim().length).toBeGreaterThan(0);

      expect(typeof r.boletinFecha).toBe('string');
      expect(r.boletinFecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  );

  it('no tiene claves de producto duplicadas (normalizadas)', () => {
    const claves = PRECIOS_REFERENCIA.map((r) => normalizarProducto(r.producto));
    const unicas = new Set(claves);
    expect(unicas.size).toBe(claves.length);
  });

  it('todas las entradas citan SIPSA (fuente institucional declarada)', () => {
    for (const r of PRECIOS_REFERENCIA) {
      expect(r.fuente).toBe('SIPSA');
    }
  });
});

describe('normalizarProducto', () => {
  it('baja a minúsculas, quita tildes y colapsa espacios', () => {
    expect(normalizarProducto('  Fríjol   Verde ')).toBe('frijol verde');
    expect(normalizarProducto('Plátano Hartón Verde')).toBe('platano harton verde');
  });

  it('devuelve string vacío para entradas inválidas', () => {
    expect(normalizarProducto(null)).toBe('');
    expect(normalizarProducto(undefined)).toBe('');
    expect(normalizarProducto(/** @type {any} */ (42))).toBe('');
  });
});

describe('getPrecioReferencia', () => {
  it('encuentra un producto citado por coincidencia exacta', () => {
    const ref = getPrecioReferencia('papa criolla');
    expect(ref).not.toBeNull();
    expect(ref.mercado).toMatch(/Bogotá|Tunja/);
    expect(ref.fuente).toBe('SIPSA');
    expect(ref.boletinFecha).toBe('2026-06-09');
  });

  it('encuentra un producto citado por texto libre del usuario (con tildes/mayúsculas)', () => {
    const ref = getPrecioReferencia('Arracacha fresca de finca');
    expect(ref).not.toBeNull();
    expect(ref.producto).toBe('arracacha');
  });

  it('devuelve null (nunca inventa) si el producto no está en la tabla', () => {
    expect(getPrecioReferencia('quinua')).toBeNull();
    expect(getPrecioReferencia('mandarina')).toBeNull();
  });

  it('devuelve null para texto vacío o inválido', () => {
    expect(getPrecioReferencia('')).toBeNull();
    expect(getPrecioReferencia(null)).toBeNull();
    expect(getPrecioReferencia(undefined)).toBeNull();
  });

  it('match EXACTO gana sobre una clave más larga que también incluye la consulta', () => {
    // Regresión: 'tomate' (hortaliza) y 'tomate de árbol' (fruta) conviven en
    // la tabla. Sin prioridad de match exacto, 'tomate' desempataba hacia la
    // clave más larga 'tomate de árbol' — precio del producto equivocado.
    const ref = getPrecioReferencia('tomate');
    expect(ref).not.toBeNull();
    expect(ref.producto).toBe('tomate');
    expect(ref.mercado).toMatch(/Pereira|Manizales/);
  });

  it('sin match exacto, sigue funcionando la coincidencia por inclusión (texto libre)', () => {
    const ref = getPrecioReferencia('Tomate de árbol de finca');
    expect(ref).not.toBeNull();
    expect(ref.producto).toBe('tomate de árbol');
  });
});
