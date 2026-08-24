/**
 * marketplaceService.vivo.test.js — precio de referencia del marketplace desde
 * el FEED VIVO SIPSA con FALLBACK HONESTO a la foto estática.
 *
 * Contrato crítico (anti-alucinación / regla dura del operador):
 *   - Con dato VIVO real (get_precio_sipsa available:true) → se muestra ese dato
 *     con su FECHA, su plaza y el deep-link SIPSA/DANE, sellando frescura si el
 *     sidecar marca el dato desactualizado.
 *   - Sin feed vivo (null / available:false) → se cae a la FOTO estática CITADA
 *     del boletín (con su fecha), nunca a un número inventado.
 *   - Si NINGUNA fuente tiene el producto → no disponible. Jamás se fabrica una
 *     banda.
 */
import { describe, it, expect } from 'vitest';
import { resolverPrecioReferenciaVivo } from '../marketplaceService';

/** Respuesta VIVA típica del sidecar (get_precio_sipsa, available:true). */
function vivo({ prom = 4600, min = 4400, max = 4800, desactualizado = false, dias = 0, producto = 'Papa criolla', plaza = 'Bucaramanga, Centroabastos', fecha = '2026-08-21' } = {}) {
  return {
    available: true,
    especie: 'papa',
    price: {
      producto,
      plaza,
      fecha,
      precio_promedio_cop_kg: prom,
      precio_min_cop_kg: min,
      precio_max_cop_kg: max,
    },
    central_abastos: plaza,
    frescura: { fecha_dato: fecha, desactualizado, dias_desde_dato: dias },
  };
}

describe('resolverPrecioReferenciaVivo — feed vivo', () => {
  it('usa el dato VIVO cuando el sidecar canta un precio real (banda del día + plaza + fecha + deep-link)', () => {
    const r = resolverPrecioReferenciaVivo('papa', vivo());
    expect(r.disponible).toBe(true);
    expect(r.origen).toBe('vivo');
    expect(r.banda).toBe('$4.400–$4.800 / kg');
    expect(r.mercado).toContain('Bucaramanga');
    expect(r.fecha).toBe('2026-08-21');
    expect(r.desactualizado).toBe(false);
    // Deep-link al DANE/SIPSA, no un homepage inventado.
    expect(r.fuente).toBe('SIPSA');
    expect(r.fuenteUrl).toMatch(/dane\.gov\.co/i);
    expect(r.fuenteUrl).toMatch(/sipsa/i);
  });

  it('cae al promedio cuando el feed no trae min/max distintos', () => {
    const r = resolverPrecioReferenciaVivo('papa', vivo({ min: null, max: null }));
    expect(r.origen).toBe('vivo');
    expect(r.banda).toBe('$4.600 / kg');
  });

  it('sella la frescura honesta cuando el dato vivo está desactualizado (no lo vende como el de hoy)', () => {
    const r = resolverPrecioReferenciaVivo('papa', vivo({ desactualizado: true, dias: 3 }));
    expect(r.origen).toBe('vivo');
    expect(r.desactualizado).toBe(true);
    expect(r.diasDesdeDato).toBe(3);
  });
});

describe('resolverPrecioReferenciaVivo — fallback honesto a la foto estática', () => {
  it('cae a la foto estática CITADA del boletín cuando el sidecar no responde (null)', () => {
    // 'tomate' sí está en precioReferencia.js (boletín 2026-06-09).
    const r = resolverPrecioReferenciaVivo('tomate', null);
    expect(r.disponible).toBe(true);
    expect(r.origen).toBe('estatico');
    expect(r.boletinFecha).toBe('2026-06-09');
    expect(r.fecha).toBe('2026-06-09');
    expect(r.fuente).toBe('SIPSA');
    expect(r.banda).toMatch(/^\$[\d.]+–\$[\d.]+ \/ kg$/);
  });

  it('cae a la foto estática cuando el sidecar devuelve available:false', () => {
    const r = resolverPrecioReferenciaVivo('tomate', { available: false });
    expect(r.origen).toBe('estatico');
    expect(r.boletinFecha).toBe('2026-06-09');
  });

  it('ignora un resultado vivo sin precio numérico (guard) y usa el fallback', () => {
    const r = resolverPrecioReferenciaVivo('tomate', { available: true, price: { producto: 'Tomate' } });
    expect(r.origen).toBe('estatico');
  });
});

describe('resolverPrecioReferenciaVivo — anti-fabricación', () => {
  it('NO inventa un precio cuando ninguna fuente tiene el producto (sin feed vivo)', () => {
    // 'quinua' no está en precioReferencia.js ni llega dato vivo.
    const r = resolverPrecioReferenciaVivo('quinua', null);
    expect(r.disponible).toBe(false);
    expect(r.origen).toBe('ninguno');
    expect(r.banda).toBeUndefined();
  });

  it('NO inventa un precio para producto vacío', () => {
    expect(resolverPrecioReferenciaVivo('', null).disponible).toBe(false);
    expect(resolverPrecioReferenciaVivo(null, null).disponible).toBe(false);
  });

  it('un feed vivo desactualizado con available:true pero sin precio NO fabrica banda vía la foto si el producto no existe', () => {
    const r = resolverPrecioReferenciaVivo('quinua', { available: true, price: {} });
    expect(r.disponible).toBe(false);
    expect(r.banda).toBeUndefined();
  });
});
