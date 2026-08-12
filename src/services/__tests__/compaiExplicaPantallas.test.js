/**
 * compaiExplicaPantallas.test.js — el manifiesto de "el compAI explica la
 * pantalla al entrar" (Fase 2). Verifica el resolver puro y la SANIDAD del
 * copy: español de Colombia (usted), sin voseo argentino, sin em dashes, y
 * sin entradas vacías (un compAI no puede explicar con texto vacío).
 */
import { describe, it, expect } from 'vitest';
import {
  EXPLICA_PANTALLAS,
  explicacionDePantalla,
  tieneExplicacion,
} from '../compaiExplicaPantallas.js';

const VOSEO = /\b(vos|tenés|querés|podés|sabés|decís|hablás|vení|mirá)\b/i;
const EM_DASH = /\u2014/;

describe('explicacionDePantalla — resolver puro', () => {
  it('devuelve la entrada para una pantalla cubierta', () => {
    const exp = explicacionDePantalla('activos');
    expect(exp).not.toBeNull();
    expect(exp.titulo).toBeTruthy();
    expect(exp.texto).toBeTruthy();
    expect(exp.funciones.length).toBeGreaterThan(0);
  });

  it('normaliza mayúsculas y espacios', () => {
    expect(explicacionDePantalla('  ACTIVOS ')).toEqual(explicacionDePantalla('activos'));
  });

  it('devuelve null para una pantalla no mapeada (nunca describe lo que no conoce)', () => {
    expect(explicacionDePantalla('ruta-que-no-existe')).toBeNull();
    expect(explicacionDePantalla(null)).toBeNull();
    expect(explicacionDePantalla(undefined)).toBeNull();
    expect(explicacionDePantalla('')).toBeNull();
  });

  it('tieneExplicacion es el espejo del resolver', () => {
    expect(tieneExplicacion('suelo')).toBe(true);
    expect(tieneExplicacion('otra-cosa')).toBe(false);
  });
});

describe('manifiesto — sanidad del copy (reglas de la casa)', () => {
  it('toda entrada tiene titulo, texto y al menos una función', () => {
    const entradas = Object.values(EXPLICA_PANTALLAS);
    expect(entradas.length).toBeGreaterThan(15);
    for (const e of entradas) {
      expect(e.titulo, `titulo vacío`).toBeTruthy();
      expect(e.texto, `texto vacío en ${e.titulo}`).toBeTruthy();
      expect(e.funciones.length, `sin funciones en ${e.titulo}`).toBeGreaterThan(0);
      for (const f of e.funciones) {
        expect(f, `función vacía en ${e.titulo}`).toBeTruthy();
      }
    }
  });

  it('sin voseo argentino en ningún texto ni función', () => {
    for (const [id, e] of Object.entries(EXPLICA_PANTALLAS)) {
      expect(e.texto, `voseo en ${id}`).not.toMatch(VOSEO);
      for (const f of e.funciones) {
        expect(f, `voseo en función de ${id}`).not.toMatch(VOSEO);
      }
    }
  });

  it('sin em dashes (fingerprint de IA, regla UI de la casa)', () => {
    for (const [id, e] of Object.entries(EXPLICA_PANTALLAS)) {
      expect(e.texto, `em dash en ${id}`).not.toMatch(EM_DASH);
    }
  });
});
