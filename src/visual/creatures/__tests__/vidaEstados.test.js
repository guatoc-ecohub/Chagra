/**
 * vidaEstados.test.js — la LÓGICA PURA del idle-cerebro de los 8 bichos
 * (la vara de Angelita v2 species-agnostic). Verifica:
 *   1. El repertorio cubre EXACTO a los 8 bichos rubber-hose del registro
 *      (ni especies fantasma ni bichos huérfanos de vida).
 *   2. elegirMomentoVida: pondera, NUNCA repite el gesto anterior, azar
 *      inyectable (determinista en test).
 *   3. duracionDeMomentoVida/duracionDeDescanso: duraciones del contrato
 *      (múltiplos del loop CSS) y jitter dentro del rango del temperamento.
 *   4. crearRitmoPropio: vars CSS de parpadeo/dardeo con fase propia.
 */
import { describe, it, expect } from 'vitest';
import {
  VIDA_REPERTORIO,
  elegirMomentoVida,
  duracionDeMomentoVida,
  duracionDeDescanso,
  crearRitmoPropio,
} from '../vidaEstados.js';
import { CREATURES } from '../index.js';

/* Los 8 con vida propia: todos los personajes del registro menos la abeja
   (su cerebro v2 vive en el agente — es la vara), la microfauna decorativa
   y el Ent (árbol-maestro, otro compás). */
const CON_VIDA = Object.keys(CREATURES).filter(
  (s) => !['abeja-angelita', 'lombriz', 'mariposa', 'escarabajo', 'ent-frailejon'].includes(s),
);

describe('1. El repertorio cubre exacto a los 8 bichos', () => {
  it('cada bicho del registro (menos abeja/microfauna/Ent) tiene repertorio', () => {
    expect(Object.keys(VIDA_REPERTORIO).sort()).toEqual(CON_VIDA.sort());
    expect(CON_VIDA).toHaveLength(8);
  });

  it('cada repertorio trae descanso [min,max] y ≥2 gestos con peso > 0', () => {
    for (const [slug, r] of Object.entries(VIDA_REPERTORIO)) {
      expect(r.descanso[0], slug).toBeGreaterThan(0);
      expect(r.descanso[1], slug).toBeGreaterThan(r.descanso[0]);
      const conPeso = Object.values(r.momentos).filter((m) => m.peso > 0);
      expect(conPeso.length, slug).toBeGreaterThanOrEqual(2);
      for (const m of Object.values(r.momentos)) expect(m.dur, slug).toBeGreaterThan(0);
    }
  });
});

describe('2. elegirMomentoVida — azar ponderado sin repetir', () => {
  it('nunca repite el gesto anterior (criatura viva, no GIF)', () => {
    for (const slug of Object.keys(VIDA_REPERTORIO)) {
      let previo = null;
      for (let i = 0; i < 60; i += 1) {
        const m = elegirMomentoVida(slug, previo);
        expect(m, slug).not.toBe(previo);
        expect(VIDA_REPERTORIO[slug].momentos[m], `${slug}:${m}`).toBeTruthy();
        previo = m;
      }
    }
  });

  it('el azar se inyecta: rand=0 da siempre el primer candidato (determinista)', () => {
    const a = elegirMomentoVida('oso-andino', null, () => 0);
    const b = elegirMomentoVida('oso-andino', null, () => 0);
    expect(a).toBe(b);
  });

  it('especie sin repertorio → null (identidad para siempre, sin romper)', () => {
    expect(elegirMomentoVida('lombriz')).toBeNull();
    expect(elegirMomentoVida('no-existe')).toBeNull();
  });
});

describe('3. Duraciones — el contrato con el CSS', () => {
  it('duracionDeMomentoVida devuelve el dur del repertorio (0 si no existe)', () => {
    expect(duracionDeMomentoVida('oso-andino', 'resopla')).toBe(4500);
    expect(duracionDeMomentoVida('oso-andino', 'nada')).toBe(0);
    expect(duracionDeMomentoVida('nadie', 'resopla')).toBe(0);
  });

  it('la REGLA DURA anotada: durs múltiplos limpios de décimas de segundo', () => {
    // El empalme en identidad exige durs múltiplos exactos del loop CSS; como
    // mínimo, ninguno puede ser un número "raro" que delate un cálculo roto.
    for (const [slug, r] of Object.entries(VIDA_REPERTORIO)) {
      for (const [nombre, m] of Object.entries(r.momentos)) {
        expect(m.dur % 10, `${slug}:${nombre}`).toBe(0);
      }
    }
  });

  it('duracionDeDescanso respeta el rango del temperamento (jitter inyectable)', () => {
    for (const [slug, r] of Object.entries(VIDA_REPERTORIO)) {
      expect(duracionDeDescanso(slug, () => 0)).toBe(r.descanso[0]);
      expect(duracionDeDescanso(slug, () => 1)).toBe(r.descanso[1]);
      const d = duracionDeDescanso(slug);
      expect(d).toBeGreaterThanOrEqual(r.descanso[0]);
      expect(d).toBeLessThanOrEqual(r.descanso[1]);
    }
    expect(duracionDeDescanso('nadie')).toBe(6000); // fallback digno
  });
});

describe('4. crearRitmoPropio — el fix del metrónomo', () => {
  it('devuelve las 3 vars CSS con unidades y rangos del contrato', () => {
    const r = crearRitmoPropio(() => 0.5);
    expect(r['--rh-blink-dur']).toMatch(/^\d+\.\d{2}s$/);
    expect(r['--rh-blink-delay']).toMatch(/^-\d+\.\d{2}s$/);
    expect(r['--rh-mirada-delay']).toMatch(/^-\d+\.\d{2}s$/);
    const dur = parseFloat(r['--rh-blink-dur']);
    expect(dur).toBeGreaterThanOrEqual(4.9);
    expect(dur).toBeLessThanOrEqual(6.6);
  });

  it('dos instancias con azar real casi nunca comparten fase (anti-metrónomo)', () => {
    const a = crearRitmoPropio();
    const b = crearRitmoPropio();
    // Con 2 decimales de resolución la colisión total es despreciable; si este
    // test parpadea, el azar está roto de verdad.
    expect(`${a['--rh-blink-dur']}${a['--rh-blink-delay']}`)
      .not.toBe(`${b['--rh-blink-dur']}${b['--rh-blink-delay']}`);
  });
});
