/*
 * particulasData — el QUÉ del kit de partículas ambientales.
 *
 * Los dioramas tienen fauna (FaunaEscena) y clima (atmosferaMadre), pero el AIRE
 * estaba vacío: sin polen a contraluz, sin motas en los rayos, sin luciérnagas al
 * caer la tarde. Este archivo define los CUATRO tipos del kit y sus presupuestos;
 * la math del movimiento vive en `ParticulasAmbientales.jsx` (mismo contrato que
 * faunaFuncional: el QUÉ en data, el CÓMO en el componente).
 *
 * FRUGALIDAD (DR-3D-PERF-GAMABAJA): cada nube es UN `THREE.Points` (1 draw call,
 * buffers mutados en sitio, cero GC por frame); las mariposas son 3 InstancedMesh
 * (alas izq/der + cuerpo, ≤4 instancias). Los conteos por tier son el presupuesto
 * DURO: `bajo` recibe una fracción y las mariposas ni montan (coherente con
 * `criaturas: 0` del perfil bajo de deviceTier).
 *
 * PALETA: hereda la hora dorada de `atmosferaMadre.js` (ATMOSFERA.luz #ffd79a,
 * niebla #f0c98d) — nada de blancos puros ni neones; hasta la luciérnaga es
 * cálida, como corresponde bajo un sol dorado de valle.
 */

/*
 * PRNG determinista (mulberry32): la misma `semilla` produce la misma nube en
 * cada montaje/test/SSR. Evita `Math.random()` para que los snapshots y los
 * remounts (StrictMode) no "salten".
 */
export function crearRng(semilla = 1) {
  let a = semilla >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * Cada tipo declara:
 *   conteo    → presupuesto por tier ANTES del multiplicador `densidad`.
 *   colores   → paleta (se sortea por partícula, vertex-colors).
 *   tam       → tamaño del sprite en unidades de mundo (sizeAttenuation).
 *   opacidad  → alfa del material (todas aditivas: brillan sin tapar).
 *   area      → caja por defecto [ancho, alto, fondo] donde vive la nube.
 *   gesto     → qué loop de movimiento corre el componente.
 *   rotacion  → inclinación por defecto del grupo (el haz de polvo va sesgado).
 *   parpadeo  → solo luciérnagas: [frecuencia base, brillo mínimo].
 *   mariposa  → ruta especial: mallas instanciadas, no puntos.
 */
export const PARTICULAS = {
  /* Polen dorado a contraluz: sube despacio, ondula, y al salir por arriba
     reaparece abajo. El alma de la hora dorada. */
  polen: {
    conteo: { alto: 90, medio: 48, bajo: 20 },
    colores: ['#ffd79a', '#f7c66b', '#ffeec0'],
    tam: 0.09,
    opacidad: 0.8,
    area: [9, 4, 9],
    gesto: 'flotar',
    deriva: { ascenso: 0.14, vaiven: 0.32 },
  },

  /* Luciérnagas del atardecer: pocas, grandes, erran despacio y DESTELLAN con
     desfase propio (flash corto de cocuyo, nunca en coro — ver gesto 'errar').
     `minimo` bajo: entre destellos la brasa casi muere y el flash REVIENTA.
     Con reduced-motion quedan quietas a brillo medio: presencia sin parpadeo. */
  luciernagas: {
    conteo: { alto: 22, medio: 12, bajo: 6 },
    colores: ['#fff3b0', '#ffe08a', '#d9f2a6'], // ámbar cálido + el verdoso frío del cocuyo
    tam: 0.17,
    opacidad: 0.9,
    area: [8, 2.6, 8],
    gesto: 'errar',
    deriva: { vaiven: 0.85 },
    parpadeo: { frecuencia: 0.9, minimo: 0.06, quieto: 0.55 },
  },

  /* Motas de polvo en un rayo de luz: nube angosta y alta, sesgada como haz que
     entra por un claro; casi inmóviles, apenas suspendidas. */
  polvo: {
    conteo: { alto: 80, medio: 40, bajo: 16 },
    colores: ['#f0c98d', '#eadfc4'],
    tam: 0.055,
    opacidad: 0.38,
    area: [1.7, 4.6, 1.7],
    gesto: 'suspension',
    deriva: { vaiven: 0.2 },
    rotacion: [0, 0, -0.32],
  },

  /* Mariposas que cruzan la escena: cada una con rumbo propio, aleteo con
     desfase y colores de ala sorteados. En `bajo` no montan (criaturas: 0) y
     con reduced-motion tampoco: una mariposa congelada en el aire lee como
     glitch, no como calma. */
  mariposas: {
    conteo: { alto: 4, medio: 2, bajo: 0 },
    colores: ['#e8a24a', '#f2c94c', '#c96f3a', '#e8e0c8'],
    colorCuerpo: '#5a4326',
    area: [10, 1.6, 10],
    ala: [0.3, 0.2],
    cuerpo: [0.045, 0.045, 0.22],
    vuelo: { velocidad: [0.5, 0.9], aleteo: [7, 10], altura: 1.6, bamboleo: 0.22 },
    mariposa: true,
  },
};

/*
 * El presupuesto final de una nube: conteo del tier × densidad, con densidad
 * acotada a [0, 2] (el kit es sutil por contrato: ni un `densidad={9}` de un
 * caller entusiasta puede convertirlo en tormenta).
 */
export function conteoParticulas(cfg, tier, densidad = 1) {
  if (!cfg || !cfg.conteo) return 0;
  const base = cfg.conteo[tier] ?? cfg.conteo.medio ?? 0;
  const factor = Math.min(2, Math.max(0, Number.isFinite(densidad) ? densidad : 1));
  return Math.round(base * factor);
}
