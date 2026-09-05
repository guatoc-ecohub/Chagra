/*
 * CONTROL DE DIVERGENCIA — la vista global y el descenso tienen que pintar la
 * MISMA montaña.
 *
 * El bug que este test existe para impedir está diagnosticado en el steal
 * `TheLongSilence` y citado en §5.3 del diseño: el suelo del recorrido acaba
 * siendo una escena aparte con su propia ley de generación, y a los dos días
 * el mapa orbital y el paseo muestran montañas distintas. Nadie lo nota hasta
 * que es caro.
 *
 * ✅ 2026-09-05 (FABLE-SIERRA-COSTERO): `VistaGlobalSierra.jsx` ya IMPORTA la
 * ley de `sierra/sierraRelieve.js`. Antes este test comparaba el TEXTO de dos
 * copias; ahora exige que no haya dos copias: la vista no puede declarar su
 * propia `alturaSierra`/`gauss`/`ruido` ni sus propias constantes de geografía.
 * Y fija lo que el costero trajo a la ley: la costa con forma que pasa EXACTO
 * por COSTA_Z en x = 0 (el descenso aterriza donde siempre), el lecho marino
 * negativo y las lagunas de páramo dentro de su banda.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  alturaSierra,
  colorPorAlturaRGB,
  costaZ,
  distCosta,
  exposicionMar,
  LAGUNAS_PARAMO,
  wzDeAltura,
  msnmDeY,
  CIMA,
  COSTA_Z,
  ANCHO,
  FONDO,
} from '../sierra/sierraRelieve.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const leer = (rel) => readFileSync(resolve(AQUI, rel), 'utf8');
const VISTA = leer('../VistaGlobalSierra.jsx');

describe('la ley de altura del macizo es UNA', () => {
  for (const fn of ['alturaSierra', 'gauss', 'ruido']) {
    it(`la vista global NO declara su propia \`${fn}\``, () => {
      expect(new RegExp(`function ${fn}\\s*\\(`).test(VISTA)).toBe(false);
    });
  }

  it('la vista global importa la ley y las constantes de sierraRelieve.js', () => {
    expect(VISTA).toMatch(/import\s*\{[^}]*\balturaSierra\b[^}]*\}\s*from\s*'\.\/sierra\/sierraRelieve\.js'/);
    for (const k of ['CIMA', 'COSTA_Z', 'ANCHO', 'FONDO']) {
      expect(new RegExp(`const ${k} = `).test(VISTA), `${k} redeclarada en la vista`).toBe(false);
    }
  });
});

describe('la escala de §2.2 sigue siendo la de la tabla canónica', () => {
  it('1 unidad de mundo ≈ 1 155 msnm y la cumbre cae en 5.0', () => {
    expect(CIMA).toBe(5.0);
    expect(5775 / CIMA).toBeCloseTo(1155, 0);
    expect(ANCHO).toBe(22);
    expect(FONDO).toBe(20);
  });

  it('la cumbre del macizo llega a la cota nival (≥ 4 800 m ⇒ y ≥ 4.15) y no se dispara', () => {
    let maxY = -Infinity;
    for (let x = -3; x <= 4; x += 0.25) {
      for (let z = 1.5; z <= 5.5; z += 0.25) {
        maxY = Math.max(maxY, alturaSierra(x, z));
      }
    }
    expect(maxY).toBeGreaterThan(4.15); // hay terreno en la banda de nieve
    expect(maxY).toBeLessThan(CIMA + 0.25); // las crestas no mueven la cumbre
  });

  it('el mar al norte de la costa está bajo cero (el descenso no lo inventa)', () => {
    expect(alturaSierra(0, -6)).toBeLessThan(0);
    expect(alturaSierra(3, -8)).toBeLessThan(0);
  });
});

describe('la costa que trajo el costero', () => {
  it('pasa EXACTO por COSTA_Z en x = 0: el descenso por x = 0 aterriza donde siempre', () => {
    expect(costaZ(0)).toBeCloseTo(COSTA_Z, 9);
    expect(distCosta(0, COSTA_Z)).toBeCloseTo(0, 9);
  });

  it('NO es una regla: la orilla varía más de 1 u a lo ancho y el promontorio sale al mar', () => {
    const zs = [];
    for (let x = -11; x <= 11; x += 0.25) zs.push(costaZ(x));
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(1.0);
    expect(costaZ(-6.2)).toBeLessThan(COSTA_Z - 0.8);
  });

  it('el lecho cae desde la orilla: somero junto a la costa, hondo mar adentro, nunca más hondo que el talud', () => {
    for (const x of [-8, -3, 0, 4, 9]) {
      const z0 = costaZ(x);
      const somero = alturaSierra(x, z0 - 0.1);
      const hondo = alturaSierra(x, z0 - 3);
      expect(somero).toBeLessThan(0);
      expect(somero).toBeGreaterThan(-0.03);
      expect(hondo).toBeLessThan(somero);
      expect(hondo).toBeGreaterThanOrEqual(-0.17);
    }
  });

  it('la exposición al oleaje es 1 en mar abierto y baja al abrigo del promontorio', () => {
    expect(exposicionMar(6, -8)).toBeCloseTo(1, 5);
    expect(exposicionMar(-5, costaZ(-5) - 0.3)).toBeLessThan(0.7);
  });

  it('el descenso por x = 0 sigue encontrando todas sus cotas', () => {
    for (const y of [0.5, 1, 2, 3, 4, 4.5]) expect(wzDeAltura(y, 0)).not.toBeNull();
  });
});

describe('las lagunas de páramo', () => {
  it('viven en la banda de páramo (3 000–4 000 m) y lejos del descenso (|x| > 1.4)', () => {
    expect(LAGUNAS_PARAMO.length).toBeGreaterThanOrEqual(2);
    for (const L of LAGUNAS_PARAMO) {
      const m = msnmDeY(L.nivel);
      expect(m).toBeGreaterThan(3000);
      expect(m).toBeLessThan(4000);
      expect(Math.abs(L.x)).toBeGreaterThan(1.4);
    }
  });

  it('el cuenco está bajo el nivel y TODO el borde del espejo por encima (circo sin dique)', () => {
    for (const L of LAGUNAS_PARAMO) {
      expect(alturaSierra(L.x, L.z)).toBeLessThan(L.nivel);
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        expect(alturaSierra(L.x + Math.cos(ang) * L.radio, L.z + Math.sin(ang) * L.radio)).toBeGreaterThan(L.nivel);
      }
    }
  });
});

describe('🔴 REGRESIÓN — las 7 bandas se leen 7, no 1', () => {
  const COTAS = [0.1, 0.6, 1.3, 2.2, 3.0, 3.8, 4.9];

  it('siete cotas distintas dan siete colores distintos', () => {
    const vistos = COTAS.map((y) => colorPorAlturaRGB(y).map((v) => Math.round(v * 255)).join(','));
    expect(new Set(vistos).size).toBe(COTAS.length);
  });

  it('ninguna cota por debajo de la línea de nieve sale crema nival', () => {
    const NIVAL = [242, 234, 214];
    for (const y of COTAS.filter((c) => c < 4.15)) {
      const c = colorPorAlturaRGB(y).map((v) => Math.round(v * 255));
      const dist = Math.hypot(c[0] - NIVAL[0], c[1] - NIVAL[1], c[2] - NIVAL[2]);
      expect({ y, esNival: dist < 30 }).toEqual({ y, esNival: false });
    }
  });

  it('las bandas de bosque SÍ son verdes (croma real, no un gris tibio)', () => {
    for (const y of [1.3, 2.2]) {
      const [r, g, b] = colorPorAlturaRGB(y).map((v) => v * 255);
      expect(g).toBeGreaterThan(r + 15); // verde dominante
      expect(g).toBeGreaterThan(b + 15);
    }
  });

  it('sobre la línea de nieve SÍ es nieve', () => {
    const c = colorPorAlturaRGB(4.9).map((v) => Math.round(v * 255));
    expect(Math.min(...c)).toBeGreaterThan(200);
  });
});
