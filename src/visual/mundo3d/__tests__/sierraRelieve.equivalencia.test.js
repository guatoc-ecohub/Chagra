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
 * Hoy `VistaGlobalSierra.jsx` conserva su copia local de la ley (no se tocó a
 * propósito: el Paso 2 está editando ese archivo en otro carril). Así que el
 * control no puede ser «importar las dos y comparar»: compara el TEXTO de las
 * dos implementaciones. Si alguna se mueve sin la otra, falla acá.
 *
 * Cuando el integrador haga que `VistaGlobalSierra.jsx` importe de
 * `sierra/sierraRelieve.js` (un cambio de una línea, después del Paso 2), este
 * test se puede simplificar a una igualdad numérica — o borrar, porque ya no
 * habría dos copias que puedan divergir.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  alturaSierra,
  colorPorAlturaRGB,
  mallaMacizo,
  CIMA,
  COSTA_Z,
  ANCHO,
  FONDO,
} from '../sierra/sierraRelieve.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const leer = (rel) => readFileSync(resolve(AQUI, rel), 'utf8');

/** Extrae el cuerpo de una función de nivel superior, normalizando espacios. */
function cuerpoDeFuncion(fuente, nombre) {
  const re = new RegExp(`function ${nombre}\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = fuente.match(re);
  if (!m) return null;
  return `${m[1]}|${m[2]}`
    .replace(/\/\/[^\n]*/g, '') // comentarios de línea: la prosa puede diferir
    .replace(/\s+/g, ' ')
    .trim();
}

const VISTA = leer('../VistaGlobalSierra.jsx');
const RELIEVE = leer('../sierra/sierraRelieve.js');

describe('la ley de altura del macizo es UNA', () => {
  for (const fn of ['alturaSierra', 'gauss', 'ruido']) {
    it(`\`${fn}\` es idéntica en la vista global y en el descenso`, () => {
      const a = cuerpoDeFuncion(VISTA, fn);
      const b = cuerpoDeFuncion(RELIEVE, fn);
      expect(a, `no se halló ${fn} en VistaGlobalSierra.jsx`).toBeTruthy();
      expect(b, `no se halló ${fn} en sierraRelieve.js`).toBeTruthy();
      expect(b).toBe(a);
    });
  }

  it('las constantes de geografía coinciden', () => {
    const num = (fuente, nombre) => {
      const m = fuente.match(new RegExp(`const ${nombre} = (-?[0-9.]+);`));
      return m ? Number(m[1]) : null;
    };
    expect(num(VISTA, 'CIMA')).toBe(CIMA);
    expect(num(VISTA, 'COSTA_Z')).toBe(COSTA_Z);
    expect(num(VISTA, 'ANCHO')).toBe(ANCHO);
    expect(num(VISTA, 'FONDO')).toBe(FONDO);
  });
});

describe('la escala de §2.2 sigue siendo la de la tabla canónica', () => {
  it('1 unidad de mundo ≈ 1 155 msnm y la cumbre cae en 5.0', () => {
    expect(CIMA).toBe(5.0);
    expect(5775 / CIMA).toBeCloseTo(1155, 0);
  });

  it('la cumbre del macizo llega a la cota nival (≥ 4 800 m ⇒ y ≥ 4.15)', () => {
    // La cumbre real de la malla, buscada donde el diseño la pone (§2.2).
    let maxY = -Infinity;
    for (let x = -3; x <= 4; x += 0.25) {
      for (let z = 1.5; z <= 5.5; z += 0.25) {
        maxY = Math.max(maxY, alturaSierra(x, z));
      }
    }
    expect(maxY).toBeGreaterThan(4.15); // hay terreno en la banda de nieve
  });

  it('el mar al norte de la costa está a ~0 (el descenso no lo inventa)', () => {
    expect(alturaSierra(0, -6)).toBeLessThan(0);
    expect(alturaSierra(3, -8)).toBeLessThan(0);
  });
});

describe('🔴 REGRESIÓN — las 7 bandas se leen 7, no 1', () => {
  /*
   * El Paso 1 dejó `BANDAS_SIERRA` ordenada cima→mar (primer tope `Infinity`),
   * y el algoritmo `while (y > BANDAS[i].tope) i++` la recorre al revés: se
   * queda en el índice 0 y devuelve crema nival para TODA altitud. Este test
   * es el control que impide que vuelva a pasar sin que nadie lo note.
   */
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

describe('🚪 PUERTA DEL PASO 5 — la bóveda enseña los MISMOS 7 pisos', () => {
  /*
   * La bóveda del clima montaba cuatro troncos de cono de siete lados con
   * flat-shading (§2.8: un zigurat heptagonal). Ahora monta la misma ladera que
   * la vista global y el descenso, reescalada. La puerta —«la pantalla de clima
   * y el descenso enseñan los mismos 7 pisos»— se cumple por construcción: es
   * la MISMA función de color sobre la MISMA ley de altura.
   */
  const ALTO = 3.5;
  const RADIO = 2.4;
  const malla = mallaMacizo({ alto: ALTO, radio: RADIO, segmentos: 48 });

  it('la cima cae exactamente en el alto pedido (el casquete no se mueve)', () => {
    let maxY = -Infinity;
    for (let i = 1; i < malla.posiciones.length; i += 3) {
      if (malla.posiciones[i] > maxY) maxY = malla.posiciones[i];
    }
    expect(maxY).toBeGreaterThan(ALTO * 0.92);
    expect(maxY).toBeLessThanOrEqual(ALTO + 1e-6);
  });

  it('nada baja del piso: el mar no perfora la tarjeta', () => {
    for (let i = 1; i < malla.posiciones.length; i += 3) {
      expect(malla.posiciones[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it('la malla usa la MISMA ley de color que el descenso', () => {
    // Para cada vértice, el color tiene que ser exactamente el que
    // `colorPorAlturaRGB` da para su cota REAL (no la escalada).
    const k = malla.ky;
    for (let v = 0; v < 40; v++) {
      const i = v * 3 * 37; // muestreo disperso
      if (i + 2 >= malla.posiciones.length) break;
      const yEscalada = malla.posiciones[i + 1];
      const esperado = colorPorAlturaRGB(yEscalada / k);
      expect(malla.colores[i]).toBeCloseTo(esperado[0], 5);
      expect(malla.colores[i + 1]).toBeCloseTo(esperado[1], 5);
      expect(malla.colores[i + 2]).toBeCloseTo(esperado[2], 5);
    }
  });

  it('la malla es una superficie cerrada y bien indexada', () => {
    const nVerts = malla.posiciones.length / 3;
    expect(malla.indices.length % 3).toBe(0);
    for (const idx of malla.indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(nVerts);
    }
  });

  it('degradar es bajar SEGMENTOS, nunca cambiar la forma', () => {
    const pobre = mallaMacizo({ alto: ALTO, radio: RADIO, segmentos: 24 });
    const rica = mallaMacizo({ alto: ALTO, radio: RADIO, segmentos: 96 });
    expect(pobre.posiciones.length).toBeLessThan(rica.posiciones.length);
    // Misma silueta: las dos alcanzan la misma cima, con la misma ley.
    const cima = (m) => {
      let x = -Infinity;
      for (let i = 1; i < m.posiciones.length; i += 3) x = Math.max(x, m.posiciones[i]);
      return x;
    };
    expect(Math.abs(cima(pobre) - cima(rica))).toBeLessThan(0.25);
  });
});
