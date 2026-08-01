/**
 * marketplaceService.test.js — lógica pura del marketplace agroecológico.
 *
 * Cubre los contratos críticos (incluido el ANTI-ALUCINACIÓN del precio de
 * referencia: sin fuente verificable → no disponible, NUNCA un número inventado).
 */
import { describe, it, expect } from 'vitest';
import {
  formatearCOP, normalizarTelefono, construirContacto,
  resolverPrecioReferencia, buildPriceReferenceAnswer, validarOferta, filtrarOfertas,
} from '../marketplaceService';

describe('formatearCOP', () => {
  it('formatea pesos con separador de miles', () => {
    expect(formatearCOP(2400)).toBe('$2.400');
    expect(formatearCOP(130000)).toBe('$130.000');
  });
  it('devuelve null para no-precio (vacío, 0, NaN, negativo)', () => {
    expect(formatearCOP(null)).toBeNull();
    expect(formatearCOP(0)).toBeNull();
    expect(formatearCOP(-5)).toBeNull();
    expect(formatearCOP(/** @type {any} */ ('abc'))).toBeNull();
    expect(formatearCOP(undefined)).toBeNull();
  });
});

describe('normalizarTelefono', () => {
  it('quita espacios/guiones y antepone 57 a celular nacional', () => {
    expect(normalizarTelefono('300 123 4567')).toBe('573001234567');
    expect(normalizarTelefono('300-123-4567')).toBe('573001234567');
  });
  it('respeta números que ya traen indicativo', () => {
    expect(normalizarTelefono('+57 300 123 4567')).toBe('573001234567');
  });
  it('devuelve vacío si no hay dígitos', () => {
    expect(normalizarTelefono('')).toBe('');
    expect(normalizarTelefono('sin numero')).toBe('');
    expect(normalizarTelefono(null)).toBe('');
  });
});

describe('construirContacto', () => {
  it('construye un link wa.me con mensaje pre-llenado citando el producto', () => {
    const c = construirContacto({ contactoTel: '3001234567', producto: 'Tomate chonto' });
    expect(c).not.toBeNull();
    expect(c.href).toContain('https://wa.me/573001234567');
    expect(decodeURIComponent(c.href)).toContain('Tomate chonto');
  });
  it('devuelve null si no hay teléfono utilizable (deflección honesta)', () => {
    expect(construirContacto({ contactoTel: '', producto: 'Mora' })).toBeNull();
    expect(construirContacto({ producto: 'Mora' })).toBeNull();
  });
});

describe('resolverPrecioReferencia (anti-alucinación)', () => {
  it('devuelve no disponible cuando no hay dato citado — NO inventa precios', () => {
    // 'quinua' no aparece en el boletín SIPSA citado en precioReferencia.js:
    // sin dato verificable, debe deflectar, nunca fabricar una banda.
    const r = resolverPrecioReferencia('quinua');
    expect(r.disponible).toBe(false);
    expect(r.banda).toBeUndefined();
  });
  it('no disponible para producto vacío', () => {
    expect(resolverPrecioReferencia('').disponible).toBe(false);
    expect(resolverPrecioReferencia(null).disponible).toBe(false);
  });
  it('devuelve la banda citada (SIPSA) cuando el producto SÍ tiene dato', () => {
    // 'tomate' está en precioReferencia.js con fuente SIPSA/boletín fechado.
    const r = resolverPrecioReferencia('tomate');
    expect(r.disponible).toBe(true);
    expect(r.banda).toMatch(/^\$[\d.]+–\$[\d.]+ \/ kg$/);
    expect(r.mercado).toContain('Pereira');
    expect(r.fuente).toBe('SIPSA');
    expect(r.boletinFecha).toBe('2026-06-09');
  });
});

describe('buildPriceReferenceAnswer', () => {
  it('devuelve una referencia de mercado legible cuando hay dato', () => {
    const msg = buildPriceReferenceAnswer('tomate');
    expect(msg).toContain('tomate');
    expect(msg).toContain('SIPSA');
    expect(msg).toContain('central de abastos');
    expect(msg).toMatch(/\$\d[\d.]*–\$\d[\d.]* \/ kg/);
  });

  it('declina honestamente cuando no hay dato verificable', () => {
    const msg = buildPriceReferenceAnswer('quinua');
    expect(msg).toContain('No encontré una referencia SIPSA');
    expect(msg).toContain('quinua');
  });

  it('retorna null para entrada vacia', () => {
    expect(buildPriceReferenceAnswer('')).toBeNull();
    expect(buildPriceReferenceAnswer(null)).toBeNull();
  });
});

describe('validarOferta', () => {
  it('acepta una oferta mínima válida (producto + cantidad + unidad)', () => {
    const { ok, errors } = validarOferta({ producto: 'Papa', cantidad: 3, unidad: 'bulto' });
    expect(ok).toBe(true);
    expect(errors).toEqual({});
  });
  it('precio es OPCIONAL (a convenir) — no exige número', () => {
    const { ok } = validarOferta({ producto: 'Papa', cantidad: 3, unidad: 'kg', precio: '' });
    expect(ok).toBe(true);
  });
  it('rechaza producto vacío, cantidad <= 0 y unidad faltante', () => {
    const { ok, errors } = validarOferta({ producto: '  ', cantidad: 0, unidad: '' });
    expect(ok).toBe(false);
    expect(errors.producto).toBeTruthy();
    expect(errors.cantidad).toBeTruthy();
    expect(errors.unidad).toBeTruthy();
  });
  it('rechaza precio negativo si se escribe', () => {
    const { ok, errors } = validarOferta({ producto: 'X', cantidad: 1, unidad: 'kg', precio: -10 });
    expect(ok).toBe(false);
    expect(errors.precio).toBeTruthy();
  });
});

describe('filtrarOfertas', () => {
  const ofertas = [
    { id: '1', producto: 'Tomate chonto', categoria: 'hortaliza', vereda: 'El Roble', municipio: 'Cundinamarca' },
    { id: '2', producto: 'Mora de Castilla', categoria: 'fruta', vereda: 'Aguas Claras', municipio: 'Boyacá' },
    { id: '3', producto: 'Miel multifloral', categoria: 'miel', vereda: 'La Cumbre', municipio: 'Santander' },
  ];
  it('sin filtros devuelve todo', () => {
    expect(filtrarOfertas(ofertas)).toHaveLength(3);
  });
  it('filtra por categoría', () => {
    expect(filtrarOfertas(ofertas, { categoria: 'fruta' }).map((o) => o.id)).toEqual(['2']);
  });
  it('filtra por texto en producto o ubicación (case-insensitive)', () => {
    expect(filtrarOfertas(ofertas, { texto: 'boyac' }).map((o) => o.id)).toEqual(['2']);
    expect(filtrarOfertas(ofertas, { texto: 'MIEL' }).map((o) => o.id)).toEqual(['3']);
    expect(filtrarOfertas(ofertas, { texto: 'roble' }).map((o) => o.id)).toEqual(['1']);
  });
  it('combina categoría + texto', () => {
    expect(filtrarOfertas(ofertas, { categoria: 'hortaliza', texto: 'mora' })).toHaveLength(0);
  });
  it('es robusto ante entrada no-array', () => {
    expect(filtrarOfertas(null)).toEqual([]);
    expect(filtrarOfertas(undefined)).toEqual([]);
  });
});
