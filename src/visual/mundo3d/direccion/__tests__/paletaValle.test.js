/*
 * La ley visual del valle, fijada en CI: si alguien agrega la muestra
 * número 17, inventa un hex fuera de la paleta madre, rompe las tres
 * bandas o cambia el borde sin decisión de dirección, este test truena.
 * Ref: AUDITORIA-VALLE.md hallazgo 1.1 + LEY-VISUAL-VALLE.md.
 */
import { describe, it, expect } from 'vitest';
import {
  COLORES_MADRE,
  MUESTRAS,
  MUESTRAS_MIN,
  MUESTRAS_MAX,
  EMISIVOS,
  RAMPA_BANDAS,
  FLAT_SHADING_PROHIBIDO,
  REGLA_BORDE,
  RELACION_LUZ,
  REPARTO_RELLENO,
  grosorContornoMundo,
} from '../paletaValle.js';

const HEX = /^#[0-9a-f]{6}$/;

describe('paletaValle — la ley del lenguaje visual', () => {
  it('tiene exactamente cuatro colores madre, hex válidos', () => {
    const nombres = Object.keys(COLORES_MADRE);
    expect(nombres).toHaveLength(4);
    expect(nombres.sort()).toEqual(['agua', 'cal', 'tierra', 'verde']);
    for (const hex of Object.values(COLORES_MADRE)) expect(hex).toMatch(HEX);
  });

  it('tiene entre 12 y 16 muestras, cada una con madre válida, hex y uso', () => {
    const entradas = Object.entries(MUESTRAS);
    expect(entradas.length).toBeGreaterThanOrEqual(MUESTRAS_MIN);
    expect(entradas.length).toBeLessThanOrEqual(MUESTRAS_MAX);
    for (const [nombre, m] of entradas) {
      expect(m.hex, nombre).toMatch(HEX);
      expect(Object.keys(COLORES_MADRE), nombre).toContain(m.madre);
      expect(m.uso, nombre).toBeTruthy();
    }
  });

  it('no repite hex entre muestras (cada muestra es una decisión)', () => {
    const hexes = Object.values(MUESTRAS).map((m) => m.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it('la rampa es de TRES bandas ascendentes, sombra con color (no negra)', () => {
    expect(RAMPA_BANDAS).toHaveLength(3);
    expect(RAMPA_BANDAS[0]).toBeGreaterThan(0.25); // la sombra conserva color
    expect(RAMPA_BANDAS[0]).toBeLessThan(RAMPA_BANDAS[1]);
    expect(RAMPA_BANDAS[1]).toBeLessThan(RAMPA_BANDAS[2]);
    expect(RAMPA_BANDAS[2]).toBe(1);
    expect(FLAT_SHADING_PROHIBIDO).toBe(true);
  });

  it('la regla de borde es binaria: paisaje sin contorno, habitante e interactivo tinta 1.5px', () => {
    expect(REGLA_BORDE.paisaje).toBeNull();
    for (const clase of ['habitante', 'interactivo']) {
      expect(REGLA_BORDE[clase].grosorPx).toBe(1.5);
      expect(REGLA_BORDE[clase].color).toMatch(HEX);
      expect(REGLA_BORDE[clase].color).not.toBe('#000000'); // tinta cálida, no negro puro
    }
  });

  it('los emisivos con permiso son pocos y nombrados', () => {
    const nombres = Object.keys(EMISIVOS);
    expect(nombres.length).toBeLessThanOrEqual(6);
    for (const hex of Object.values(EMISIVOS)) expect(hex).toMatch(HEX);
  });

  it('la relación relleno/clave cumple los objetivos de la auditoría 4.1', () => {
    // día 0.45-0.60, amanecer/atardecer 0.30-0.45, noche 0.30-0.40 — nunca 0.90
    for (const f of ['manana', 'mediodia', 'tarde']) {
      expect(RELACION_LUZ[f]).toBeGreaterThanOrEqual(0.45);
      expect(RELACION_LUZ[f]).toBeLessThanOrEqual(0.6);
    }
    for (const f of ['amanecer', 'atardecer']) {
      expect(RELACION_LUZ[f]).toBeGreaterThanOrEqual(0.3);
      expect(RELACION_LUZ[f]).toBeLessThanOrEqual(0.45);
    }
    expect(RELACION_LUZ.noche).toBeGreaterThanOrEqual(0.3);
    expect(RELACION_LUZ.noche).toBeLessThanOrEqual(0.4);
    const reparto =
      REPARTO_RELLENO.hemisferio + REPARTO_RELLENO.ambiente + REPARTO_RELLENO.contra;
    expect(reparto).toBeCloseTo(1, 5);
  });

  it('grosorContornoMundo da ~1.5px a la distancia del plano de autor', () => {
    // cámara fov 40, viewport 1248px de alto, objeto a 8 unidades
    const g = grosorContornoMundo(8, 40, 1248);
    const mundoPorPx = (2 * 8 * Math.tan((40 * Math.PI) / 360)) / 1248;
    expect(g).toBeCloseTo(1.5 * mundoPorPx, 10);
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(0.02); // sub-centímetro: un filo, no un marco
  });
});
