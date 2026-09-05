/*
 * PASO 5 — «la bóveda hereda el macizo». Regresión de los TRES defectos que el
 * gate del 2026-09-02 midió en la pantalla de clima, no de los que se supusieron.
 *
 * El paso anterior ya había cambiado la malla (fuera el zigurat heptagonal) y
 * los 7 pisos SEGUÍAN sin leerse. Medido con `_gate/descenso-20260902/
 * medir-pisos-boveda.mjs` (tres pasadas sobre el mismo fotograma: macizo solo /
 * canvas / página), el problema no era la malla:
 *
 *   1. LA LUZ NO OBEDECÍA LA HORA DE LA ESCENA. La bóveda declara `hora: 0.62`
 *      (media tarde: su cielo, su sol y su fondo salen de ahí) pero
 *      `EscenaBase3D` iluminaba con el reloj del APARATO. A las 21:30 la
 *      pantalla pintaba un cielo de tarde con luz de noche (intensidad 0.55,
 *      clave `#b9c6e6` entrando por DETRÁS desde [-6,7,-4]): el macizo se leía
 *      como una silueta. Misma malla, 7/7 pisos distinguibles de día contra
 *      5/7 de noche — la captura del gate dependía de la hora en que se tomara.
 *   2. LA NIEBLA DEL PÁRAMO NO ESTABA SOBRE EL PÁRAMO. Su cota se tanteaba con
 *      `cima - 0.6 - azar*0.7`, que con cima 3.5 la dejaba entre y 2,2 y 2,9 —
 *      superpáramo y nival — tapando de blanco justo las bandas altas.
 *   3. `MUNDO.clima.params.pisos` SEGUÍA TENIENDO CUATRO PISOS con paleta
 *      propia. Es el defecto §0 del diseño («Clima enseña 4, la Sierra 7»), y
 *      manda también sobre el GEMELO 2D de la bóveda (`FondoBoveda`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cotasMacizo, mallaMacizo, IDS_BANDA } from '../sierra/sierraRelieve.js';
import { franjaDeHoraDecimal } from '../cielosHoraData.js';
import { BOVEDA_PISOS_DEF, COLOR_BANDA_EXCEPCION, PISOS_TERMICOS_SIERRA } from '../pisosTermicos.js';
import { MUNDO } from '../mundoData.js';

const leer = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const ALTO_BOVEDA = 3.5; // la cima que arma `Montana` con los 7 pisos canónicos

describe('cotasMacizo: las cotas se leen de la tabla, no se tantean', () => {
  it('da EXACTAMENTE la misma escala que la malla que se pinta', () => {
    const malla = mallaMacizo({ alto: ALTO_BOVEDA, radio: 2.4 });
    const cotas = cotasMacizo({ alto: ALTO_BOVEDA });
    // si divergieran, la niebla caería en una banda y el color en otra
    expect(cotas.ky).toBeCloseTo(malla.ky, 10);
    expect(cotas.maxReal).toBeCloseTo(malla.maxReal, 10);
  });

  it('devuelve las 7 bandas canónicas, de mar a cima, sin huecos', () => {
    const { bandas } = cotasMacizo({ alto: ALTO_BOVEDA });
    expect(bandas.map((b) => b.id)).toEqual(IDS_BANDA);
    expect(bandas).toHaveLength(7);
    expect(bandas[0].yBase).toBe(0);
    expect(bandas[6].yTope).toBeCloseTo(ALTO_BOVEDA, 6);
    for (let i = 1; i < bandas.length; i++) {
      expect(bandas[i].yBase).toBeCloseTo(bandas[i - 1].yTope, 10);
      expect(bandas[i].yTope).toBeGreaterThan(bandas[i].yBase);
    }
  });
});

describe('la niebla del páramo cae sobre el PÁRAMO', () => {
  const { bandas } = cotasMacizo({ alto: ALTO_BOVEDA });
  const paramo = bandas.find((b) => b.id === 'paramo');

  it('CONTROL — la fórmula vieja se salía de la banda por arriba', () => {
    // `cima - 0.6 - r*0.7`, con r ∈ [0,1): el rango completo que producía.
    // El medidor miente antes que el sujeto: sin este control, «la niebla
    // está sobre el páramo» sería una afirmación sin contraste.
    const viejoMin = ALTO_BOVEDA - 0.6 - 0.7; // 2.20
    const viejoMax = ALTO_BOVEDA - 0.6; // 2.90
    const solape = Math.max(0, Math.min(viejoMax, paramo.yTope) - Math.max(viejoMin, paramo.yBase));
    const fuera = 1 - solape / (viejoMax - viejoMin);
    expect(fuera).toBeGreaterThan(0.75); // >3/4 del rango caía FUERA del páramo
    expect(viejoMax).toBeGreaterThan(paramo.yTope + 0.4); // llegaba hasta el nival
  });

  it('la cota nueva está DENTRO de la banda de páramo para todo azar', () => {
    const alturaBanda = paramo.yTope - paramo.yBase;
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const y = paramo.yBase + alturaBanda * (0.15 + r * 0.6);
      expect(y).toBeGreaterThanOrEqual(paramo.yBase);
      expect(y).toBeLessThanOrEqual(paramo.yTope);
    }
  });

  it('el fuente de la bóveda ya no tantea la cota con una resta a la cima', () => {
    const src = leer('../escenas/EscenaBoveda.jsx');
    const cuerpo = src.slice(src.indexOf('function NieblaParamo'), src.indexOf('function Montana'));
    expect(cuerpo).toContain('cotasMacizo');
    expect(cuerpo).not.toMatch(/cima\s*-\s*0\.6\s*-\s*r\(\)/);
  });
});

describe('la luz obedece la hora que la escena declara', () => {
  it('EscenaBase3D acepta una franja declarada y la prefiere al reloj', () => {
    const src = leer('../escenas/EscenaBase3D.jsx');
    expect(src).toMatch(/franja:\s*franjaDeclarada/);
    expect(src).toMatch(/const franja = franjaDeclarada \|\| franjaReloj/);
    // y sigue cayendo al reloj real cuando la escena no declara nada
    expect(src).toMatch(/franja = null/);
  });

  it('la bóveda declara su franja desde su propia `hora`', () => {
    const src = leer('../escenas/EscenaBoveda.jsx');
    expect(src).toMatch(/franja=\{franjaDeHoraDecimal\(6 \+ hora \* 12\)\}/);
  });

  it('el arco diurno 0..1 mapea al día andino (sale ~6, se esconde ~18)', () => {
    expect(franjaDeHoraDecimal(6 + 0 * 12)).toBe('amanecer');
    expect(franjaDeHoraDecimal(6 + 0.5 * 12)).toBe('mediodia');
    expect(franjaDeHoraDecimal(6 + 0.62 * 12)).toBe('mediodia'); // la hora de la bóveda
    expect(franjaDeHoraDecimal(6 + 0.8 * 12)).toBe('tarde');
    expect(franjaDeHoraDecimal(6 + 1 * 12)).toBe('atardecer');
  });
});

describe('el mundo del clima declara SIETE pisos, los de la tabla canónica', () => {
  const pisos = MUNDO.clima.params.pisos;

  it('son los 7 de `BOVEDA_PISOS_DEF`, no una lista aparte', () => {
    expect(pisos).toHaveLength(7);
    expect(pisos).toBe(BOVEDA_PISOS_DEF);
  });

  it('sus colores salen de PISOS_TERMICOS_SIERRA, uno por banda', () => {
    const canon = PISOS_TERMICOS_SIERRA.map((p) => p.color);
    for (const p of pisos) expect(canon).toContain(p.color);
    // y ninguno de los colores INVENTADOS de la lista de cuatro sobrevive.
    // 🔴 Ojo con `#9fb6bf`: estaba en aquella lista de cuatro, pero NO era
    // inventado — es el color canónico del páramo en `PISOS_TERMICOS`, que la
    // lista vieja había tomado prestado. Desde la unificación de paleta
    // (2026-09-02, «unifica») la bóveda lee la MISMA tabla que la Sierra; y
    // desde 2026-09-05 esa tabla declara para el páramo una excepción de render
    // (`COLOR_BANDA_EXCEPCION.paramo`: pajonal, no escala térmica — el `#9fb6bf`
    // distaba ΔE 7,5 del superpáramo y las dos bandas nacían indistinguibles).
    // La bóveda hereda la excepción por la tabla, no por una copia. Se vigilan
    // los tres que sí eran de cosecha propia.
    for (const viejo of ['#c7a24b', '#8fae55', '#6f9a72']) {
      expect(pisos.map((p) => p.color)).not.toContain(viejo);
    }
    // el páramo es el de la tabla (su excepción declarada), no el ocre `#94975a`
    // que traía la otra tabla ni el térmico que lo fundía con el superpáramo
    expect(pisos.map((p) => p.color)).toContain(COLOR_BANDA_EXCEPCION.paramo);
    expect(pisos.map((p) => p.color)).not.toContain('#9fb6bf');
    expect(pisos.map((p) => p.color)).not.toContain('#94975a');
  });

  it('la GEOMETRÍA del macizo no cambia (cima, base y cima del cono)', () => {
    // el cambio de canon no puede mover la montaña: se midió que los dos
    // juegos daban los mismos 3.5 / 2.4 / 0.42, y así tiene que seguir.
    const cima = pisos.reduce((acc, p) => acc + p.h, 0);
    expect(cima).toBeCloseTo(3.5, 6);
    expect(pisos[0].r0).toBeCloseTo(2.4, 6);
    expect(pisos[pisos.length - 1].r1).toBeCloseTo(0.42, 6);
  });
});
