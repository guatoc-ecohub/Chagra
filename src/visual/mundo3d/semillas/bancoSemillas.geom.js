/*
 * bancoSemillas.geom — la GEOMETRÍA del banco de semillas criollas, en
 * funciones PURAS y testeables (three-core, corre headless: cero contexto GL,
 * cero azar por frame, cero assets externos).
 *
 * ── LO QUE ESTE ARCHIVO CONSTRUYE ───────────────────────────────────────────
 * Un rincón de guardado campesino: la TROJA (estante de madera contra pared
 * encalada) con el MOSAICO de frascos —cada uno una variedad criolla—, los
 * calabazos colgados de la viga, el costal de fique, la vasija de chamba, el
 * frasco con su capa de CENIZA (y el gorgojo rondando por fuera), la MATA
 * MADRE marcada viva en su parche, y los FLUJOS de semilla que viajan: la
 * criolla que vuelve del surco al frasco, y el trueque entre canastos.
 *
 * Convenciones de la casa:
 *   - Perfiles lathe como pares [radio, y] normalizados (y ∈ 0..1), pocos
 *     puntos A PROPÓSITO: el facetado ES el estilo (artesaniaAndina).
 *   - PRNG determinista LCG (misma receta de micorrizas/artesanía): el banco
 *     se ve IGUAL en cada carga; nada de Math.random.
 *   - El componente r3f (`EscenaBancoSemillas.jsx`) consume esto y le pone
 *     luz de la casa (LuzMadre), materiales madre y vida.
 */
import * as THREE from 'three';
import { FORMAS_SEMILLA } from './semillasData.js';

/* PRNG determinista (mismo banco en cada carga). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* PRESUPUESTO por tier: el banco degrada SOLO (contrato deviceTier).  */
/* ------------------------------------------------------------------ */
export function paramsDeSemillas(tier) {
  if (tier === 'alto') {
    return {
      semillasPorFrasco: 26, // el copete visible del frasco
      pintas: true, // el moteado del cargamanto (mil pintas)
      gorgojo: true, // el bicho ronda animado
      particulasFlujo: 9, // semillas viajando por cada curva
      segLathe: 12, // facetado cálido (el look, no un bug)
      montonSuelto: 16, // semillas regadas junto al costal
    };
  }
  if (tier === 'medio') {
    return {
      semillasPorFrasco: 14,
      pintas: false,
      gorgojo: true,
      particulasFlujo: 6,
      segLathe: 10,
      montonSuelto: 10,
    };
  }
  return {
    semillasPorFrasco: 8,
    pintas: false,
    gorgojo: false, // quieto ni lo monta: fill-rate al mínimo
    particulasFlujo: 0, // los flujos no viajan en gama baja
    segLathe: 8,
    montonSuelto: 6,
  };
}

/* ------------------------------------------------------------------ */
/* LAYOUT — un solo lugar decide dónde vive cada cosa (los hotspots     */
/* de semillasData apuntan a ESTAS coordenadas).                        */
/* ------------------------------------------------------------------ */
export const BANCO = {
  /* la pared encalada del fondo y el piso de tierra pisada */
  pared: { z: -2.6, ancho: 7.2, alto: 3.3 },
  piso: { ancho: 9, fondo: 7 },
  /* la troja: dos parales y tres tablas */
  estante: {
    x: -0.8, // centro
    ancho: 3.1,
    z: -2.18,
    tablas: [0.78, 1.46, 2.14], // altura de la CARA superior de cada tabla
    grosorTabla: 0.06,
    fondoTabla: 0.5,
  },
  /* la viga de los calabazos */
  viga: { y: 2.86, z: -1.9, largo: 6.8 },
  calabazos: [
    { x: 1.55, alto: 0.52, cuelga: 0.5 },
    { x: 2.15, alto: 0.62, cuelga: 0.34 },
    { x: 2.72, alto: 0.45, cuelga: 0.62 },
  ],
  /* piezas de piso */
  costal: { pos: [1.9, 0, -1.35], alto: 0.78 },
  chamba: { pos: [-2.75, 0, -1.5], alto: 0.62 },
  frascoCeniza: { pos: [-0.5, 0, -0.55], alto: 0.5, radio: 0.19 },
  /* el ciclo de la criolla (frasco ↔ surco) y la bolsa certificada al lado */
  frascoCriollo: { pos: [-2.6, 0, 0.35], alto: 0.44, radio: 0.16 },
  surco: { pos: [-3.35, 0, 0.95], largo: 0.9, ancho: 0.42 },
  bolsa: { pos: [-2.05, 0, 0.95] },
  /* el trueque: dos canastos frente a frente */
  canastoA: { pos: [1.15, 0, 0.7] },
  canastoB: { pos: [2.05, 0, 1.1] },
  /* la mata madre, en su parche al sol (fuera de la troja) */
  parche: { pos: [3.5, 0, -0.55], radio: 0.85 },
};

/* ------------------------------------------------------------------ */
/* PERFILES lathe [radio, y] normalizados (y ∈ 0..1 de base a boca).    */
/* ------------------------------------------------------------------ */

/* El frasco de vidrio: panza, hombro alto (proporción andina) y labio. */
export const PERFIL_FRASCO = [
  [0, 0], [0.3, 0], [0.35, 0.06], [0.37, 0.32], [0.36, 0.6],
  [0.3, 0.74], [0.24, 0.8], [0.235, 0.92], [0.26, 0.97], [0.26, 1],
];

/* El calabazo curado (totumo de guardar): doble panza y cuello de amarre. */
export const PERFIL_CALABAZO = [
  [0, 0], [0.17, 0.01], [0.3, 0.12], [0.34, 0.3], [0.26, 0.48],
  [0.16, 0.58], [0.2, 0.72], [0.22, 0.84], [0.13, 0.94], [0.05, 1],
];

/* El costal de fique: panzudo, asentado, con la boca amarrada. */
export const PERFIL_COSTAL = [
  [0, 0], [0.4, 0.02], [0.48, 0.18], [0.47, 0.46], [0.42, 0.68],
  [0.3, 0.82], [0.13, 0.94], [0.1, 1],
];

/* La bolsa de semilla certificada: paralelepípedo digno (va como box). */

/**
 * Escala un perfil a THREE.Vector2[] listos para `latheGeometry`.
 * `radio` es el radio MÁXIMO real de la pieza (el perfil se normaliza a él),
 * para que BANCO hable en unidades de mundo y no en factores mágicos.
 */
export function puntosLathe(perfil, alto, radio) {
  const rmax = perfil.reduce((m, [r]) => Math.max(m, r), 0) || 1;
  const k = radio != null ? radio / rmax : alto;
  return perfil.map(([r, y]) => new THREE.Vector2(r * k, y * alto));
}

/* ------------------------------------------------------------------ */
/* EL MOSAICO — distribuir los frascos por las tablas de la troja.      */
/* ------------------------------------------------------------------ */

/**
 * Reparte las variedades en frascos sobre las tres tablas, con vaivén
 * determinista de tamaño y giro (ningún frasco es clon del vecino).
 * @param {Array} variedades  VARIEDADES de semillasData
 * @param {number} [seed]
 * @returns {Array<{ variedad, pos:[x,y,z], alto:number, radio:number, rotY:number }>}
 */
export function distribuirFrascos(variedades, seed = 17) {
  const r = rng(seed);
  const { estante } = BANCO;
  const porTabla = [5, 4, 4]; // 13 variedades: abajo lo pesado, arriba lo fino
  const frascos = [];
  let vi = 0;
  for (let t = 0; t < porTabla.length && vi < variedades.length; t += 1) {
    const n = Math.min(porTabla[t], variedades.length - vi);
    const paso = (estante.ancho - 0.36) / n;
    const x0 = estante.x - (estante.ancho - 0.36) / 2 + paso / 2;
    for (let i = 0; i < n; i += 1, vi += 1) {
      const alto = 0.3 + r() * 0.12;
      frascos.push({
        variedad: variedades[vi],
        pos: [
          x0 + paso * i + (r() - 0.5) * 0.06,
          estante.tablas[t],
          estante.z + (r() - 0.5) * 0.08,
        ],
        alto,
        radio: 0.125 + r() * 0.035,
        rotY: (r() - 0.5) * 0.9, // el labio facetado gira: vida, no grilla
      });
    }
  }
  return frascos;
}

/* ------------------------------------------------------------------ */
/* LAS SEMILLAS — el copete visible de cada frasco, TODO en un solo     */
/* InstancedMesh (posiciones, escalas y colores precalculados).         */
/* ------------------------------------------------------------------ */

const BASE_SEMILLA = 0.03; // radio base de la esfera low-poly compartida

/* Jitter de color determinista: el grano vivo no es plano. */
function colorGrano(hex, r) {
  const c = new THREE.Color(hex);
  c.offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.09);
  return c;
}

/**
 * El copete de semillas de UN recipiente: puntos sobre un domo suave.
 * @param {[number,number,number]} pos    base del recipiente (piso o tabla)
 * @param {number} radioInterno           radio útil de la boca
 * @param {number} yLleno                 altura del llenado (donde arranca el domo)
 * @param {object} variedad               entrada de VARIEDADES
 * @param {number} n                      cuántas semillas visibles
 * @param {Function} r                    rng ya sembrado
 * @param {Array} destino                 array de instancias a llenar
 */
export function copeteDeSemillas(pos, radioInterno, yLleno, variedad, n, r, destino) {
  const esc = FORMAS_SEMILLA[variedad.forma] || FORMAS_SEMILLA.redonda;
  for (let i = 0; i < n; i += 1) {
    const rr = Math.sqrt(r()) * radioInterno;
    const th = r() * Math.PI * 2;
    const domo = (1 - (rr / radioInterno) ** 2) * radioInterno * 0.4;
    destino.push({
      pos: new THREE.Vector3(
        pos[0] + Math.cos(th) * rr,
        pos[1] + yLleno + domo + BASE_SEMILLA * esc[1] * 0.6,
        pos[2] + Math.sin(th) * rr,
      ),
      escala: new THREE.Vector3(
        BASE_SEMILLA * esc[0] * (0.85 + r() * 0.3),
        BASE_SEMILLA * esc[1] * (0.85 + r() * 0.3),
        BASE_SEMILLA * esc[2] * (0.85 + r() * 0.3),
      ),
      rotY: r() * Math.PI * 2,
      color: colorGrano(variedad.color, r),
      pinta: variedad.pinta || null,
    });
  }
}

/**
 * TODAS las semillas visibles del banco: los copetes de los frascos de la
 * troja + el frasco de ceniza + el frasco criollo + los dos canastos del
 * trueque + el montoncito regado del costal. Una pasada, un InstancedMesh.
 *
 * @returns {{ semillas: Array, pintas: Array }} instancias + motas de pinta
 */
export function semillasDelBanco(frascos, variedades, P, seed = 29) {
  const r = rng(seed);
  const semillas = [];

  /* los frascos de la troja (el mosaico) */
  for (const f of frascos) {
    copeteDeSemillas(f.pos, f.radio * 0.62, f.alto * 0.55, f.variedad, P.semillasPorFrasco, r, semillas);
  }

  /* el frasco criollo del ciclo (maíz amarillo: el que vuelve) */
  const criollo = variedades[0];
  const fc = BANCO.frascoCriollo;
  copeteDeSemillas(fc.pos, fc.radio * 0.6, fc.alto * 0.52, criollo, Math.ceil(P.semillasPorFrasco * 0.7), r, semillas);

  /* los canastos del trueque: cada uno trae SU variedad (circula diversidad) */
  const a = variedades[4] || criollo; // cargamanto
  const b = variedades[8] || criollo; // papa morada
  copeteDeSemillas(BANCO.canastoA.pos, 0.13, 0.17, a, Math.ceil(P.semillasPorFrasco * 0.6), r, semillas);
  copeteDeSemillas(BANCO.canastoB.pos, 0.13, 0.17, b, Math.ceil(P.semillasPorFrasco * 0.6), r, semillas);

  /* el montoncito regado frente al costal (quinua: se riega, es menuda) */
  const quinua = variedades[9] || criollo;
  const [cx, , cz] = BANCO.costal.pos;
  copeteDeSemillas([cx - 0.25, 0, cz + 0.55], 0.2, 0.005, quinua, P.montonSuelto, r, semillas);

  /* las PINTAS del cargamanto (solo tier alto): motas sobre granos moteados */
  const pintas = [];
  if (P.pintas) {
    for (const s of semillas) {
      if (!s.pinta) continue;
      const nP = 1 + Math.floor(r() * 2);
      for (let k = 0; k < nP; k += 1) {
        const th = r() * Math.PI * 2;
        pintas.push({
          pos: new THREE.Vector3(
            s.pos.x + Math.cos(th) * s.escala.x * 0.55,
            s.pos.y + s.escala.y * 0.55,
            s.pos.z + Math.sin(th) * s.escala.z * 0.55,
          ),
          escala: s.escala.x * 0.34,
          color: new THREE.Color(s.pinta),
        });
      }
    }
  }
  return { semillas, pintas };
}

/* ------------------------------------------------------------------ */
/* LOS FLUJOS — la semilla que viaja (ciclo criollo y trueque).         */
/* ------------------------------------------------------------------ */

/** Curva de vuelo entre dos puntos con arco `alza` (Bezier cuadrática). */
export function curvaFlujo(a, b, alza = 0.7) {
  const pa = new THREE.Vector3(...a);
  const pb = new THREE.Vector3(...b);
  const medio = pa.clone().lerp(pb, 0.5);
  medio.y = Math.max(pa.y, pb.y) + alza;
  return new THREE.QuadraticBezierCurve3(pa, medio, pb);
}

/**
 * Los flujos del banco, ya curvados y con su color:
 *  - ciclo: frasco criollo → surco (siembra) y surco → frasco (la cosecha
 *    que VUELVE: eso es poder guardar semilla).
 *  - trueque: canasto A → B y B → A (variedades distintas se cruzan).
 * @param {Array} variedades VARIEDADES
 */
export function flujosDelBanco(variedades) {
  const fc = BANCO.frascoCriollo;
  const su = BANCO.surco;
  const bocaFrasco = [fc.pos[0], fc.alto + 0.05, fc.pos[2]];
  const tierra = [su.pos[0], 0.1, su.pos[2]];
  const bordeA = [BANCO.canastoA.pos[0], 0.24, BANCO.canastoA.pos[2]];
  const bordeB = [BANCO.canastoB.pos[0], 0.24, BANCO.canastoB.pos[2]];
  const criollo = variedades[0];
  const varA = variedades[4] || criollo;
  const varB = variedades[8] || criollo;
  return [
    { id: 'siembra', curva: curvaFlujo(bocaFrasco, tierra, 0.55), color: criollo.color },
    { id: 'vuelve', curva: curvaFlujo(tierra, bocaFrasco, 0.95), color: criollo.color },
    { id: 'trueque-ida', curva: curvaFlujo(bordeA, bordeB, 0.5), color: varA.color },
    { id: 'trueque-vuelta', curva: curvaFlujo(bordeB, bordeA, 0.8), color: varB.color },
  ];
}

/** Las partículas de un flujo (fases y tamaños deterministas). */
export function particulasDeFlujo(n, seed = 41) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push({
      t0: i / n + r() * 0.04, // repartidas a lo largo, con respiro
      vel: 0.085 + r() * 0.035, // lento: semilla que viaja, no bala
      tam: 0.8 + r() * 0.5,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* LA MATA MADRE — el parche de maíz con UNA mata marcada viva.         */
/* ------------------------------------------------------------------ */

/**
 * Las matas del parche: tres del montón y LA madre (más alta, más pareja,
 * con su mazorca y su cinta). Deterministas.
 * @returns {Array<{ x:number, z:number, alto:number, lean:number, madre:boolean }>}
 */
export function matasDelParche(seed = 53) {
  const r = rng(seed);
  const { pos, radio } = BANCO.parche;
  const puestos = [
    [-0.55, 0.3], [0.5, 0.42], [0.42, -0.5], [-0.12, -0.1], // la madre, al centro-frente
  ];
  return puestos.map(([dx, dz], i) => {
    const madre = i === 3;
    return {
      x: pos[0] + dx * radio,
      z: pos[2] + dz * radio,
      alto: madre ? 1.2 : 0.62 + r() * 0.18,
      lean: madre ? 0.04 : (r() - 0.5) * 0.3, // las del montón se ladean; la madre, derecha
      madre,
    };
  });
}

/** Los brotecitos del surco (la criolla sembrada, naciendo). */
export function brotesDelSurco(seed = 61) {
  const r = rng(seed);
  const { pos, largo } = BANCO.surco;
  const brotes = [];
  for (let i = 0; i < 3; i += 1) {
    brotes.push({
      x: pos[0] - largo / 2 + (largo / 3) * (i + 0.5),
      z: pos[2] + (r() - 0.5) * 0.1,
      alto: 0.12 + r() * 0.08,
      rot: r() * Math.PI,
    });
  }
  return brotes;
}
