/*
 * frutalesAndinos.geom — LAS SIETE DEL CLIMA FRÍO, cada una con su porte real.
 *
 * El elenco de frutales andinos que el catálogo respalda: MORA de Castilla,
 * LULO, TOMATE DE ÁRBOL, GRANADILLA, UCHUVA, GULUPA y CURUBA. Ni una más: si no
 * está en esta lista, no se dibuja acá. (El mango y los cítricos son de piso
 * cálido y no pertenecen a este vergel; dibujarlos "a ojo" junto a estos siete
 * sería enseñar mal una cosa fácil de verificar en el campo.)
 *
 * POR QUÉ ESTE MÓDULO EXISTE — el riesgo real de dibujar frutales es que todos
 * salgan "arbolito con bolitas". Estas siete se diferencian ANTES por la HOJA y
 * el TUTORADO que por el fruto, y eso es lo que decide si el campesino las
 * reconoce:
 *
 *   · MORA (Rubus glaucus) — no es un árbol: son CAÑAS arqueadas con espinas,
 *     conducidas en ESPALDERA. Hoja TRIFOLIADA con el envés claro. El fruto
 *     madura desgranado: verde, rojo y morado casi negro en la misma rama.
 *   · LULO (Solanum quitoense) — arbusto bajo de HOJA ENORME, ancha y lobulada,
 *     con la nervadura MORADA. Es su firma: ninguna otra del vergel tiene una
 *     hoja de ese tamaño. Fruto naranja redondo.
 *   · TOMATE DE ÁRBOL (Solanum betaceum) — el único con porte de ARBOLITO: un
 *     tronco que sube y se abre arriba. Hoja grande acorazonada; frutos
 *     OVOIDES colgando en racimo.
 *   · UCHUVA (Physalis peruviana) — mata baja tutorada, y el fruto va dentro de
 *     un CAPACHO de papel (el cáliz que la envuelve). El capacho es la firma:
 *     sin él, es una bolita naranja cualquiera.
 *   · Las TRES PASIFLORAS no son intercambiables, y es el error más fácil:
 *       – GRANADILLA (P. ligularis): hoja ENTERA acorazonada, fruto REDONDO
 *         naranja. Va en RAMADA (emparrado horizontal).
 *       – GULUPA (P. edulis f. edulis): hoja TRILOBULADA, fruto REDONDO MORADO.
 *       – CURUBA (P. tripartita): hoja trilobulada más angosta, FLOR ROSADA
 *         colgante de tubo largo y fruto ALARGADO amarillo. La flor y la forma
 *         del fruto la separan de las otras dos de una sola mirada.
 *
 * LEY DE LA CASA:
 *   - Color: SOLO de la paleta madre (`../paleta`), derivando con `mezclar`.
 *   - Fusión: SIEMPRE por `fusionarSeguro`. Acá se mezclan geometrías indexadas
 *     (cilindros, esferas, láminas de hoja) con no indexadas: exactamente el
 *     caso en que `mergeGeometries` devuelve null EN SILENCIO y la especie
 *     desaparece sin un solo error en consola. `fusionarSeguro` desindexa todo
 *     y truena con el nombre de la especie si algo no cuadra.
 *   - Una especie = UNA geometría con color por vértice = 1 draw call
 *     instanciable.
 *
 * Todas las matas nacen con la base en y=0 y miran a +Z, listas para instanciar.
 * three-core puro: cero react, cero @react-three.
 */
import * as THREE from 'three';
import { VERDES, TIERRAS, CORTEZAS, ACENTOS, PALETA, mezclar } from '../paleta/index.js';
import { fusionarSeguro, poner } from '../bosque/sombreadoVegetal.js';

/* ── PALETA DEL VERGEL — todo derivado de la paleta madre ──────────────────── */
export const P_FRUTAL = {
  /* verdes por especie (piso frío/templado: el vergel andino no es selva) */
  hojaMora: mezclar(VERDES.templado, '#ffffff', 0.06),
  hojaMoraEnves: mezclar(VERDES.templado, '#e8efdc', 0.32), // el envés glauco
  hojaLulo: VERDES.trabajo,
  hojaLuloClara: mezclar(VERDES.brote, '#ffffff', 0.08),
  /* la nervadura MORADA del lulo: derivada del índigo de la paleta hacia el
     verde de la hoja (no un morado inventado suelto). */
  nervaduraLulo: mezclar(ACENTOS.indigo, ACENTOS.florDeMonte, 0.42),
  hojaTomate: mezclar(VERDES.templadoVivo, VERDES.monte, 0.2),
  hojaGranadilla: mezclar(VERDES.trabajo, VERDES.templado, 0.35),
  hojaGulupa: mezclar(VERDES.monte, VERDES.trabajo, 0.3),
  hojaCuruba: mezclar(VERDES.aliso, VERDES.brote, 0.22),
  hojaUchuva: mezclar(VERDES.brote, VERDES.trabajo, 0.4),

  /* tallos y estructura */
  canaMora: mezclar(CORTEZAS.roble, VERDES.monte, 0.3),
  espina: mezclar(TIERRAS.cacao, '#ffffff', 0.1),
  talloLulo: mezclar(VERDES.monte, TIERRAS.siembra, 0.28),
  troncoTomate: CORTEZAS.roble,
  guia: mezclar(VERDES.monte, CORTEZAS.roble, 0.35), // el bejuco de la pasiflora
  talloUchuva: mezclar(VERDES.trabajo, TIERRAS.siembra, 0.22),
  poste: PALETA.madera,
  posteSombra: PALETA.maderaOscura,
  alambre: mezclar('#9a8b74', '#ffffff', 0.15),

  /* frutos — su color ES el saber: van casi puros */
  moraVerde: '#8fa84a',
  moraRoja: '#b6303a',
  moraMadura: '#3a1330', // morado casi negro
  luloFruto: '#e8792a',
  luloPelusa: mezclar('#e8792a', '#f6e0b8', 0.4),
  tomateFruto: '#d94b28',
  tomateFrutoPinton: '#e0913a',
  uchuvaFruto: '#e8a326',
  capacho: '#c9b071', // el capacho de papel, seco y translúcido
  granadillaFruto: '#e39a34',
  gulupaFruto: '#54305e', // morado oscuro
  curubaFruto: '#dcc24a', // amarillo alargado
  curubaFlor: '#e07898', // la flor rosada colgante (la firma de la curuba)
  florPasiflora: '#f2ecdc',
};

/* ── AYUDAS ────────────────────────────────────────────────────────────────── */

/** Pinta una geometría entera de un color (atributo `color` por vértice). */
function pintar(geo, hex) {
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color(hex);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/**
 * Una LÁMINA DE HOJA a partir de un contorno 2D. La hoja se dibuja en el plano
 * XY con el pecíolo en el origen y la punta hacia +Y; después se coloca con
 * `poner`. Sale de `ShapeGeometry` (indexada, con normal y uv) — el material de
 * la escena la pinta a dos caras.
 *
 * Es lo que permite que la hoja de la granadilla (entera, acorazonada) y la de
 * la gulupa (trilobulada) se distingan de verdad, en vez de ser dos bolas
 * verdes con nombres distintos.
 */
function laminaHoja(contorno, segmentos = 8) {
  const g = new THREE.ShapeGeometry(contorno, segmentos);
  g.computeVertexNormals();
  return g;
}

/** Hoja ACORAZONADA entera (granadilla, tomate de árbol, uchuva). */
function hojaCorazon(largo, ancho) {
  const s = new THREE.Shape();
  const a = ancho / 2;
  s.moveTo(0, 0);
  s.bezierCurveTo(a * 0.9, largo * 0.06, a, largo * 0.42, a * 0.62, largo * 0.82);
  s.bezierCurveTo(a * 0.34, largo * 1.02, a * 0.12, largo, 0, largo);
  s.bezierCurveTo(-a * 0.12, largo, -a * 0.34, largo * 1.02, -a * 0.62, largo * 0.82);
  s.bezierCurveTo(-a, largo * 0.42, -a * 0.9, largo * 0.06, 0, 0);
  return s;
}

/** Hoja TRILOBULADA (gulupa, curuba): tres lóbulos francos, el central mayor. */
function hojaTrilobulada(largo, ancho, angostura = 1) {
  const s = new THREE.Shape();
  const a = (ancho / 2) * angostura;
  s.moveTo(0, 0);
  // lóbulo lateral derecho
  s.bezierCurveTo(a * 0.5, largo * 0.1, a * 1.05, largo * 0.28, a * 0.95, largo * 0.5);
  s.bezierCurveTo(a * 0.9, largo * 0.62, a * 0.5, largo * 0.5, a * 0.42, largo * 0.58);
  // lóbulo central
  s.bezierCurveTo(a * 0.5, largo * 0.78, a * 0.3, largo * 0.96, 0, largo);
  s.bezierCurveTo(-a * 0.3, largo * 0.96, -a * 0.5, largo * 0.78, -a * 0.42, largo * 0.58);
  // lóbulo lateral izquierdo
  s.bezierCurveTo(-a * 0.5, largo * 0.5, -a * 0.9, largo * 0.62, -a * 0.95, largo * 0.5);
  s.bezierCurveTo(-a * 1.05, largo * 0.28, -a * 0.5, largo * 0.1, 0, 0);
  return s;
}

/** Hoja GRANDE y ondulada del lulo: ancha, con el borde en lóbulos suaves. */
function hojaLuloGrande(largo, ancho) {
  const s = new THREE.Shape();
  const a = ancho / 2;
  s.moveTo(0, 0);
  s.bezierCurveTo(a * 0.7, largo * 0.02, a * 1.02, largo * 0.2, a * 0.86, largo * 0.36);
  s.bezierCurveTo(a * 1.06, largo * 0.44, a * 0.96, largo * 0.62, a * 0.72, largo * 0.68);
  s.bezierCurveTo(a * 0.86, largo * 0.82, a * 0.42, largo * 0.96, 0, largo);
  s.bezierCurveTo(-a * 0.42, largo * 0.96, -a * 0.86, largo * 0.82, -a * 0.72, largo * 0.68);
  s.bezierCurveTo(-a * 0.96, largo * 0.62, -a * 1.06, largo * 0.44, -a * 0.86, largo * 0.36);
  s.bezierCurveTo(-a * 1.02, largo * 0.2, -a * 0.7, largo * 0.02, 0, 0);
  return s;
}

/** Folíolo simple (cada una de las tres hojitas de la mora). */
function folioloMora(largo, ancho) {
  const s = new THREE.Shape();
  const a = ancho / 2;
  s.moveTo(0, 0);
  s.bezierCurveTo(a, largo * 0.22, a * 0.86, largo * 0.72, 0, largo);
  s.bezierCurveTo(-a * 0.86, largo * 0.72, -a, largo * 0.22, 0, 0);
  return s;
}

/** Esfera barata (fruto). `alarga` estira en Y (curuba, tomate de árbol). */
function fruto(r, alarga = 1, seg = 8) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.6)));
  if (alarga !== 1) g.scale(1, alarga, 1);
  return g;
}

/** Tallo/rama recta como cilindro, de `a` a `b`. */
function rama(a, b, r0, r1 = r0, seg = 5) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const largo = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, largo, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), dir.clone().normalize(),
  );
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(m);
  return g;
}

/* Reparto determinista sin Math.random: la misma mata en cada visita. */
function az(i, s = 1) {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* ── 1. MORA DE CASTILLA (Rubus glaucus) ───────────────────────────────────
   No es un árbol: son CAÑAS que salen de la base, se arquean y se amarran a la
   espaldera. Hoja trifoliada (tres folíolos) con el envés más claro, espinas en
   la caña y el fruto DESGRANADO en tres estados a la vez — verde, rojo y morado
   casi negro. Ese "todo a la vez" es la verdad de la mora: se cosecha por pases,
   no de un tirón. */
export function construirMora() {
  const partes = [];
  const nCanas = 5;
  for (let k = 0; k < nCanas; k++) {
    const lado = k % 2 === 0 ? 1 : -1;
    const desv = (az(k, 3) - 0.5) * 0.5;
    const alto = 1.25 + az(k, 7) * 0.5;
    const pie = [desv * 0.4, 0, (az(k, 11) - 0.5) * 0.35];
    const codo = [desv + lado * 0.28, alto * 0.66, (az(k, 13) - 0.5) * 0.3];
    const punta = [desv + lado * (0.72 + az(k, 17) * 0.3), alto, (az(k, 19) - 0.5) * 0.5];
    partes.push(pintar(rama(pie, codo, 0.045, 0.036), P_FRUTAL.canaMora));
    partes.push(pintar(rama(codo, punta, 0.036, 0.022), P_FRUTAL.canaMora));

    // ESPINAS de la caña (chiquitas, pero son lo que uno recuerda de la mora)
    for (let e = 0; e < 4; e++) {
      const t = 0.2 + e * 0.2;
      const p = [
        pie[0] + (punta[0] - pie[0]) * t,
        pie[1] + (punta[1] - pie[1]) * t,
        pie[2] + (punta[2] - pie[2]) * t,
      ];
      const g = new THREE.ConeGeometry(0.018, 0.07, 4);
      partes.push(pintar(poner(g, p, [az(e, k) * 3, az(e, k + 2) * 3, 2.1]), P_FRUTAL.espina));
    }

    // HOJA TRIFOLIADA: tres folíolos por hoja, cuatro hojas por caña
    for (let h = 0; h < 4; h++) {
      const t = 0.34 + h * 0.19;
      const base = [
        pie[0] + (punta[0] - pie[0]) * t,
        pie[1] + (punta[1] - pie[1]) * t + 0.03,
        pie[2] + (punta[2] - pie[2]) * t,
      ];
      const giroY = az(h, k * 5) * Math.PI * 2;
      [-0.62, 0, 0.62].forEach((abre, j) => {
        const g = laminaHoja(folioloMora(0.3, 0.19), 6);
        const inclina = -0.5 - az(h + j, k) * 0.3;
        partes.push(pintar(
          poner(g, base, [inclina, giroY + abre, 0]),
          j === 1 ? P_FRUTAL.hojaMora : P_FRUTAL.hojaMoraEnves,
        ));
      });
    }

    // EL FRUTO en sus tres estados sobre la misma caña
    const estados = [P_FRUTAL.moraMadura, P_FRUTAL.moraRoja, P_FRUTAL.moraVerde];
    for (let f = 0; f < 3; f++) {
      const t = 0.55 + f * 0.14;
      const cx = pie[0] + (punta[0] - pie[0]) * t + (az(f, k) - 0.5) * 0.12;
      const cy = pie[1] + (punta[1] - pie[1]) * t - 0.1;
      const cz = pie[2] + (punta[2] - pie[2]) * t + (az(f, k + 3) - 0.5) * 0.12;
      // la mora es un fruto AGREGADO: cuatro drupeolitas, no una bolita lisa
      for (let d = 0; d < 4; d++) {
        const r = 0.028;
        const off = [
          Math.cos((d / 4) * Math.PI * 2) * 0.026,
          -Math.abs(Math.sin(d * 1.7)) * 0.02,
          Math.sin((d / 4) * Math.PI * 2) * 0.026,
        ];
        partes.push(pintar(
          poner(fruto(r, 1, 6), [cx + off[0], cy + off[1], cz + off[2]]),
          estados[f],
        ));
      }
      partes.push(pintar(poner(fruto(0.03, 1.1, 6), [cx, cy + 0.018, cz]), estados[f]));
    }
  }
  return fusionarSeguro(partes, 'mora-de-castilla');
}

/* ── 2. LULO (Solanum quitoense) ────────────────────────────────────────────
   Arbusto BAJO cuya firma no es el fruto sino la HOJA: enorme, ancha, lobulada,
   con la nervadura morada marcada. Al lado de las otras seis, el lulo es "el de
   la hoja grande". El fruto es naranja y va casi al pie del tallo. */
export function construirLulo() {
  const partes = [];
  const alto = 1.35;
  partes.push(pintar(rama([0, 0, 0], [0.04, alto, 0.02], 0.085, 0.055, 6), P_FRUTAL.talloLulo));

  // las hojas GRANDES, repartidas en espiral por el tallo
  const nHojas = 9;
  for (let i = 0; i < nHojas; i++) {
    const t = 0.25 + (i / nHojas) * 0.78;
    const y = alto * t;
    const giro = i * 2.4;
    const largo = 0.88 - t * 0.2;   // LA HOJA MÁS GRANDE DEL VERGEL: su firma
    const ancho = largo * 0.9;
    // se abre casi horizontal (antes colgaba vertical y la mata leía como palo)
    const caida = -0.55 - az(i, 2) * 0.3;
    const base = [Math.cos(giro) * 0.05, y, Math.sin(giro) * 0.05];
    const g = laminaHoja(hojaLuloGrande(largo, ancho), 10);
    partes.push(pintar(poner(g, base, [caida, giro, 0]), i % 3 === 0 ? P_FRUTAL.hojaLuloClara : P_FRUTAL.hojaLulo));
    // NERVADURA MORADA: la costilla central, que es lo que se ve de lejos
    const nerv = rama([0, 0, 0], [0, largo * 0.9, 0], 0.008, 0.004, 4);
    partes.push(pintar(poner(nerv, base, [caida, giro, 0]), P_FRUTAL.nervaduraLulo));
    // pecíolo
    partes.push(pintar(poner(rama([0, 0, 0], [0, 0.1, 0], 0.012, 0.009, 4), base, [caida, giro, 0]), P_FRUTAL.talloLulo));
  }

  // los frutos naranja, abajo y pegados al tallo
  [[0.16, 0.34, 0.9], [-0.13, 0.28, -0.6], [0.05, 0.52, 2.3]].forEach(([dx, y, giro], i) => {
    const p = [dx + Math.cos(giro) * 0.06, y, Math.sin(giro) * 0.09];
    partes.push(pintar(poner(fruto(0.088, 0.94, 8), p), i === 2 ? P_FRUTAL.luloPelusa : P_FRUTAL.luloFruto));
    partes.push(pintar(poner(rama([p[0], p[1] + 0.07, p[2]], [p[0] * 0.4, p[1] + 0.13, p[2] * 0.4], 0.01, 0.008, 4)), P_FRUTAL.talloLulo));
  });

  return fusionarSeguro(partes, 'lulo');
}

/* ── 3. TOMATE DE ÁRBOL (Solanum betaceum) ──────────────────────────────────
   El ÚNICO del vergel con porte de arbolito: un tronco que sube limpio y se
   abre arriba en pocas ramas gruesas. Hoja grande acorazonada y frutos OVOIDES
   colgando en racimos — nunca redondos, que es lo que lo confundiría con todo
   lo demás. */
export function construirTomateArbol() {
  const partes = [];
  const alto = 1.95;
  partes.push(pintar(rama([0, 0, 0], [0.03, alto * 0.62, 0], 0.09, 0.062, 7), P_FRUTAL.troncoTomate));

  // la horqueta: tres ramas madre que abren arriba
  const brazos = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    const punta = [Math.cos(a) * 0.56, alto, Math.sin(a) * 0.56];
    partes.push(pintar(rama([0.03, alto * 0.62, 0], punta, 0.055, 0.03, 6), P_FRUTAL.troncoTomate));
    brazos.push({ a, punta });
  }

  // hojas grandes acorazonadas en las puntas
  brazos.forEach((b, k) => {
    for (let i = 0; i < 5; i++) {
      const t = 0.4 + i * 0.15;
      const base = [
        0.03 + (b.punta[0] - 0.03) * t,
        alto * 0.62 + (alto - alto * 0.62) * t,
        b.punta[2] * t,
      ];
      const giro = b.a + (az(i, k) - 0.5) * 1.6;
      const g = laminaHoja(hojaCorazon(0.44, 0.3), 9);
      partes.push(pintar(poner(g, base, [-0.75 - az(i, k + 4) * 0.4, giro, 0]), P_FRUTAL.hojaTomate));
    }
    // RACIMO de frutos ovoides colgando de la horqueta
    for (let f = 0; f < 3; f++) {
      const cx = b.punta[0] * 0.62 + (az(f, k) - 0.5) * 0.14;
      const cz = b.punta[2] * 0.62 + (az(f, k + 6) - 0.5) * 0.14;
      const cy = alto * 0.78 - f * 0.09;
      partes.push(pintar(
        poner(fruto(0.062, 1.5, 7), [cx, cy, cz]),
        f === 1 ? P_FRUTAL.tomateFrutoPinton : P_FRUTAL.tomateFruto,
      ));
      partes.push(pintar(rama([cx, cy + 0.09, cz], [cx * 0.8, cy + 0.17, cz * 0.8], 0.008, 0.006, 4), P_FRUTAL.troncoTomate));
    }
  });

  return fusionarSeguro(partes, 'tomate-de-arbol');
}

/* ── 4. UCHUVA (Physalis peruviana) ─────────────────────────────────────────
   Mata baja y ramificada que se tutorea. Su firma NO es la bolita naranja: es el
   CAPACHO — el cáliz de papel que la envuelve y que se abre seco al madurar.
   Dibujar la uchuva sin capacho es dibujar otra cosa. */
export function construirUchuva() {
  const partes = [];
  const alto = 0.95;
  partes.push(pintar(rama([0, 0, 0], [0, alto * 0.5, 0], 0.04, 0.03, 5), P_FRUTAL.talloUchuva));

  const ramas = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    const punta = [Math.cos(a) * 0.42, alto, Math.sin(a) * 0.42];
    partes.push(pintar(rama([0, alto * 0.5, 0], punta, 0.028, 0.016, 5), P_FRUTAL.talloUchuva));
    ramas.push({ a, punta });
  }

  ramas.forEach((b, k) => {
    // hojas acorazonadas pequeñas
    for (let i = 0; i < 4; i++) {
      const t = 0.3 + i * 0.2;
      const base = [b.punta[0] * t, alto * 0.5 + (alto - alto * 0.5) * t, b.punta[2] * t];
      const g = laminaHoja(hojaCorazon(0.2, 0.15), 7);
      partes.push(pintar(poner(g, base, [-0.9 - az(i, k) * 0.4, b.a + (az(i, k + 2) - 0.5) * 1.4, 0]), P_FRUTAL.hojaUchuva));
    }
    // EL CAPACHO colgando: un farolito de papel (cono invertido de 5 caras) con
    // la baya naranja adentro, asomando apenas por la boca.
    const cx = b.punta[0] * 0.78;
    const cz = b.punta[2] * 0.78;
    const cy = alto * 0.78;
    const cap = new THREE.ConeGeometry(0.055, 0.13, 5);
    partes.push(pintar(poner(cap, [cx, cy - 0.07, cz], [Math.PI, 0, 0.12]), P_FRUTAL.capacho));
    partes.push(pintar(poner(fruto(0.036, 1, 6), [cx, cy - 0.085, cz]), P_FRUTAL.uchuvaFruto));
    partes.push(pintar(rama([cx, cy, cz], [b.punta[0], b.punta[1], b.punta[2]], 0.008, 0.006, 4), P_FRUTAL.talloUchuva));
  });

  return fusionarSeguro(partes, 'uchuva');
}

/* ── 5-7. LAS TRES PASIFLORAS ───────────────────────────────────────────────
   Comparten el cuerpo (bejuco trepador con zarcillos) y se diferencian en HOJA,
   FRUTO y —la curuba— FLOR. Se construyen con la misma fábrica para que las
   diferencias sean EXPLÍCITAS y no accidentes de dos dibujos distintos.

   @param {object} o
   @param {'entera'|'trilobulada'} o.hoja  forma de la lámina.
   @param {number} o.angostura   qué tan angostos los lóbulos (curuba < gulupa).
   @param {string} o.colorHoja
   @param {string} o.colorFruto
   @param {number} o.alargaFruto 1 = redondo (granadilla, gulupa); >1 = oblongo
                                 (curuba).
   @param {number} o.rFruto
   @param {boolean} [o.florRosada] la flor colgante de tubo largo de la curuba.
   @param {string} o.etiqueta    nombre de la especie para el error de fusión.
*/
function construirPasiflora(o) {
  const partes = [];
  const alto = 1.9;   // sube hasta la ramada
  const largoGuia = 1.5; // y después corre horizontal por encima

  // el bejuco: sube en espiral por el tutor y se tiende sobre la ramada
  let prev = [0, 0, 0];
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const p = [Math.cos(t * 7) * 0.07, alto * t, Math.sin(t * 7) * 0.07];
    partes.push(pintar(rama(prev, p, 0.032 - t * 0.012, 0.03 - t * 0.012, 5), P_FRUTAL.guia));
    prev = p;
  }
  const corrida = [];
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const p = [prev[0] + largoGuia * t, alto + Math.sin(t * 3.1) * 0.06, prev[2] + largoGuia * 0.28 * t];
    partes.push(pintar(rama(corrida.length ? corrida[corrida.length - 1] : prev, p, 0.02, 0.016, 4), P_FRUTAL.guia));
    corrida.push(p);
  }

  // hojas colgando de la corrida (la ramada se ve desde abajo: la hoja manda)
  corrida.forEach((p, i) => {
    for (let j = 0; j < 2; j++) {
      const base = [p[0] + (az(i, j) - 0.5) * 0.2, p[1] - 0.03, p[2] + (az(i, j + 3) - 0.5) * 0.2];
      const forma = o.hoja === 'entera'
        ? hojaCorazon(0.34, 0.3)
        : hojaTrilobulada(0.32, 0.34, o.angostura);
      const g = laminaHoja(forma, 9);
      partes.push(pintar(poner(g, base, [-2.0 - az(i, j) * 0.5, az(i, j + 7) * 6.28, 0]), o.colorHoja));
      // ZARCILLO: el resorte con que la pasiflora se agarra. Sin él parece
      // una rama cualquiera amarrada a un palo.
      if (j === 0) {
        const z0 = [base[0] + 0.04, base[1], base[2]];
        partes.push(pintar(rama(z0, [z0[0] + 0.05, z0[1] - 0.13, z0[2] + 0.05], 0.006, 0.004, 4), P_FRUTAL.guia));
        partes.push(pintar(rama([z0[0] + 0.05, z0[1] - 0.13, z0[2] + 0.05], [z0[0] - 0.02, z0[1] - 0.2, z0[2] + 0.09], 0.005, 0.004, 4), P_FRUTAL.guia));
      }
    }
  });

  // LOS FRUTOS colgando de la ramada — el rasgo que decide la especie
  [1, 3, 5].forEach((i, k) => {
    const p = corrida[i];
    const cx = p[0] + (az(k, 2) - 0.5) * 0.16;
    const cz = p[2] + (az(k, 5) - 0.5) * 0.16;
    const cuelga = 0.2 + az(k, 9) * 0.12;
    partes.push(pintar(rama([cx, p[1], cz], [cx, p[1] - cuelga, cz], 0.008, 0.007, 4), P_FRUTAL.guia));
    partes.push(pintar(
      poner(fruto(o.rFruto, o.alargaFruto, 9), [cx, p[1] - cuelga - o.rFruto * o.alargaFruto, cz]),
      o.colorFruto,
    ));
  });

  // LA FLOR de la curuba: rosada, de tubo largo, colgando hacia abajo. Es la
  // seña más rápida para distinguirla de granadilla y gulupa.
  if (o.florRosada) {
    [2, 4].forEach((i, k) => {
      const p = corrida[i];
      const cx = p[0] - 0.1 + k * 0.08;
      const cz = p[2] + 0.12;
      partes.push(pintar(rama([cx, p[1], cz], [cx, p[1] - 0.26, cz], 0.011, 0.009, 5), P_FRUTAL.curubaFlor));
      const corola = new THREE.ConeGeometry(0.07, 0.06, 6);
      partes.push(pintar(poner(corola, [cx, p[1] - 0.3, cz], [Math.PI, 0, 0]), P_FRUTAL.curubaFlor));
    });
  }

  return fusionarSeguro(partes, o.etiqueta);
}

/** GRANADILLA (Passiflora ligularis): hoja ENTERA acorazonada, fruto REDONDO naranja. */
export function construirGranadilla() {
  return construirPasiflora({
    hoja: 'entera', angostura: 1,
    colorHoja: P_FRUTAL.hojaGranadilla,
    colorFruto: P_FRUTAL.granadillaFruto,
    alargaFruto: 1, rFruto: 0.075,
    etiqueta: 'granadilla',
  });
}

/** GULUPA (Passiflora edulis f. edulis): hoja TRILOBULADA, fruto REDONDO MORADO. */
export function construirGulupa() {
  return construirPasiflora({
    hoja: 'trilobulada', angostura: 1,
    colorHoja: P_FRUTAL.hojaGulupa,
    colorFruto: P_FRUTAL.gulupaFruto,
    alargaFruto: 1, rFruto: 0.062,
    etiqueta: 'gulupa',
  });
}

/** CURUBA (Passiflora tripartita): hoja trilobulada angosta, FLOR ROSADA colgante
    y fruto ALARGADO amarillo. */
export function construirCuruba() {
  return construirPasiflora({
    hoja: 'trilobulada', angostura: 0.8,
    colorHoja: P_FRUTAL.hojaCuruba,
    colorFruto: P_FRUTAL.curubaFruto,
    alargaFruto: 1.75, rFruto: 0.05,
    florRosada: true,
    etiqueta: 'curuba',
  });
}

/* ── ESTRUCTURAS DE CONDUCCIÓN ──────────────────────────────────────────────
   La mora y la gulupa van en ESPALDERA (postes + alambres); la granadilla y la
   curuba, en RAMADA (emparrado horizontal, que es como se ven de verdad en la
   finca: uno camina por debajo y la fruta cuelga sobre la cabeza). Sin la
   estructura, un frutal trepador se lee como una mata suelta. */

/** Un tramo de ESPALDERA: dos postes y tres alambres. */
export function construirEspaldera(largo = 3.2, alto = 1.7) {
  const partes = [];
  [-largo / 2, largo / 2].forEach((x) => {
    partes.push(pintar(rama([x, 0, 0], [x, alto, 0], 0.055, 0.045, 5), P_FRUTAL.poste));
    partes.push(pintar(poner(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 5), [x, 0.05, 0]), P_FRUTAL.posteSombra));
  });
  [0.6, 1.1, 1.55].forEach((y) => {
    partes.push(pintar(rama([-largo / 2, y, 0], [largo / 2, y, 0], 0.009, 0.009, 4), P_FRUTAL.alambre));
  });
  return fusionarSeguro(partes, 'espaldera');
}

/** Una RAMADA (emparrado): cuatro postes y la parrilla de varas arriba. */
export function construirRamada(ancho = 3.4, fondo = 2.6, alto = 2.0) {
  const partes = [];
  const ax = ancho / 2;
  const az_ = fondo / 2;
  [[-ax, -az_], [ax, -az_], [-ax, az_], [ax, az_]].forEach(([x, z]) => {
    partes.push(pintar(rama([x, 0, z], [x, alto, z], 0.06, 0.05, 5), P_FRUTAL.poste));
  });
  // vigas
  [-az_, az_].forEach((z) => {
    partes.push(pintar(rama([-ax, alto, z], [ax, alto, z], 0.04, 0.04, 4), P_FRUTAL.poste));
  });
  // la parrilla de varas
  for (let i = 0; i <= 5; i++) {
    const x = -ax + (ancho * i) / 5;
    partes.push(pintar(rama([x, alto + 0.04, -az_], [x, alto + 0.04, az_], 0.022, 0.022, 4), P_FRUTAL.posteSombra));
  }
  return fusionarSeguro(partes, 'ramada');
}

/* ── EL LINDERO DE MONTE ────────────────────────────────────────────────────
   Ningún vergel de finca está solo en medio de la nada: atrás hay monte, o el
   cercado vivo del vecino. Además de ser verdad, cierra la composición — sin
   lindero la escena es media pantalla de cielo vacío y el vergel se lee como
   una maqueta flotando. Un árbol genérico de monte, sin especie declarada: no
   pretende ser ninguna de las siete ni dice ser nada en particular. */
export function construirArbolLindero(semilla = 1) {
  const partes = [];
  const alto = 1.9 + az(semilla, 3) * 0.8;
  partes.push(pintar(rama([0, 0, 0], [az(semilla, 5) * 0.2 - 0.1, alto, 0], 0.17, 0.11, 6),
    mezclar(CORTEZAS.roble, TIERRAS.cacao, 0.3)));
  /* copa ANCHA en varias masas: un monte de verdad, no una paleta de bombón */
  const masas = [
    { p: [0, alto + 0.8, 0], r: 1.5, c: mezclar(VERDES.monte, VERDES.templado, 0.3) },
    { p: [-1.15, alto + 0.35, 0.4], r: 1.05, c: VERDES.monte },
    { p: [1.1, alto + 0.45, -0.42], r: 1.0, c: mezclar(VERDES.monte, TIERRAS.cacao, 0.12) },
    { p: [0.25, alto + 1.35, 0.35], r: 0.82, c: mezclar(VERDES.templado, VERDES.monte, 0.35) },
    { p: [-0.5, alto + 0.9, -0.75], r: 0.78, c: VERDES.monte },
  ];
  masas.forEach((m, i) => {
    const g = new THREE.IcosahedronGeometry(m.r * (0.9 + az(semilla, i + 7) * 0.3), 0);
    g.scale(1, 0.86, 1);
    partes.push(pintar(poner(g, m.p), m.c));
  });
  return fusionarSeguro(partes, 'arbol-del-lindero');
}

/* El elenco, como dato: lo que la escena siembra y lo que la ficha explica.
   Si una especie no está acá, no se dibuja en este vergel. */
export const ELENCO_FRUTALES = [
  { id: 'mora', nombre: 'Mora de Castilla', cientifico: 'Rubus glaucus', porte: 'cañas en espaldera' },
  { id: 'lulo', nombre: 'Lulo', cientifico: 'Solanum quitoense', porte: 'arbusto de hoja grande' },
  { id: 'tomate', nombre: 'Tomate de árbol', cientifico: 'Solanum betaceum', porte: 'arbolito' },
  { id: 'uchuva', nombre: 'Uchuva', cientifico: 'Physalis peruviana', porte: 'mata tutorada' },
  { id: 'granadilla', nombre: 'Granadilla', cientifico: 'Passiflora ligularis', porte: 'bejuco en ramada' },
  { id: 'gulupa', nombre: 'Gulupa', cientifico: 'Passiflora edulis f. edulis', porte: 'bejuco en espaldera' },
  { id: 'curuba', nombre: 'Curuba', cientifico: 'Passiflora tripartita', porte: 'bejuco en ramada' },
];
