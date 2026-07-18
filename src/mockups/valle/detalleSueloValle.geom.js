/*
 * detalleSueloValle.geom — la LÓGICA PURA del suelo vivo del valle.
 *
 * Presupuestos por tier, lotes de surcos, geometrías unidad (vertex-color en
 * gris-gradiente para que el tinte por instancia pinte limpio) y las DOS
 * siembras deterministas (detalle con falloff AoE desde la casa-ancla +
 * hileras de cultivo en curva de nivel). Sin React: testeable en node y
 * afinable sin tocar el componente. El r3f vive en DetalleSueloValle.jsx.
 */
import * as THREE from 'three';
import { PISOS_TERMICOS, MUNDOS_VALLE } from './valleData.js';
import {
  CASA_VALLE,
  componerMundos,
  SENDEROS_VALLE,
  VECINOS_VALLE,
} from '../../visual/mundo3d/direccion/composicionValle.js';
import { fusionar, pintarPorVertice } from '../../visual/mundo3d/terreno/sueloRico.geom.js';

/* ── Presupuestos por tier (instancias, no draw calls) ─────────────────── */
export const PRESUPUESTO = {
  bajo: { detalle: 400, surcos: 60 },
  medio: { detalle: 2000, surcos: 200 },
  alto: { detalle: 8000, surcos: 500 },
};
/* Reparto de la capa 1: el pasto manda, las flores y piedras acentúan. */
const FRACCION = { matojo: 0.72, flor: 0.14, piedra: 0.14 };

/* Semilla fija: mismo valle en cada visita (y en el gemelo 2D si algún día
   quiere leer los mismos puntos). */
const SEMILLA = 20260718;

/* ── Lotes de surcos POR DEFECTO ─────────────────────────────────────────
   Cada lote respeta su piso térmico (PISOS_TERMICOS) y el aire de la
   composición (≥1u de los mundos de COMPOSICION_LUGARES y de las siluetas de
   vegetación). El host los reemplaza con `zonas.lotes`. */
export const LOTES_VALLE = [
  // La papa en clima frío (z -5.2..-0.6): el lote tierno de la ladera alta,
  // a la derecha de la vegetación de piso y con aire del mundo clima.
  { id: 'papa-fria', cultivo: 'papa', estado: 'brotando', x0: -5.0, x1: -2.2, z0: -4.6, z1: -3.0 },
  // La tierra RECIÉN LABRADA (camellones pelados): la promesa de la próxima
  // siembra — el valle también cuenta el trabajo que apenas empieza.
  { id: 'labranza', cultivo: 'papa', estado: 'labrado', x0: 0.6, x1: 2.4, z0: -4.9, z1: -3.5 },
  // La milpa hecha en clima medio, ladera arriba del mundo cultivos (que ya
  // dibuja su propia parcela): el lote grande del maíz.
  { id: 'milpa-alta', cultivo: 'milpa', estado: 'maduro', x0: -8.8, x1: -6.3, z0: 1.6, z1: 3.2 },
  // El cafetal en su piso (z -0.6..3.4), ladera derecha, con aire del mundo
  // cafe y del kiosco del saber.
  { id: 'cafetal', cultivo: 'cafe', estado: 'maduro', x0: 6.0, x1: 8.6, z0: -0.2, z1: 2.4 },
];

/* Separación entre hileras (u) y porte base (escala y) por cultivo. */
const CULTIVO = {
  papa: { sep: 0.42, alto: 0.34, tinte: ['#55803c', '#6d9a4a'] },
  milpa: { sep: 0.55, alto: 1.25, tinte: ['#7fa03b', '#a9b23c'] },
  cafe: { sep: 0.75, alto: 0.68, tinte: ['#2f5d33', '#3f7743'] },
};
/* Estados de crecimiento: factor de porte + tinte propio (labrado/brotando
   pisan el tinte del cultivo; maduro usa el del cultivo). */
const ESTADO = {
  labrado: { porte: [0.3, 0.45], tinte: ['#6b4a2f', '#7c5a3a'] },
  brotando: { porte: [0.38, 0.55], tinte: ['#86b558', '#9cc46a'] },
  maduro: { porte: [0.85, 1.15], tinte: null },
};

/* ── PRNG determinista (mulberry32) ──────────────────────────────────────── */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _lerpCol = new THREE.Color();
const _colA = new THREE.Color();
const _colB = new THREE.Color();
/** Tinte [r,g,b] interpolado entre dos hex con brillo aleatorio. */
function tinteEntre(hexA, hexB, r, brillo = 1) {
  _colA.set(hexA);
  _colB.set(hexB);
  _lerpCol.copy(_colA).lerp(_colB, r());
  const b = brillo * (0.9 + r() * 0.25);
  return [_lerpCol.r * b, _lerpCol.g * b, _lerpCol.b * b];
}

/** Distancia² de un punto (px,pz) al segmento (ax,az)-(bx,bz). */
function dist2ASegmento(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = THREE.MathUtils.clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  const qx = ax + t * dx;
  const qz = az + t * dz;
  return (px - qx) ** 2 + (pz - qz) ** 2;
}

/* ── Los despejes: dónde NO sembrar (la dirección manda) ─────────────────── */
function construirDespejes() {
  const circulos = [];
  // La casa-ancla con su patio.
  circulos.push({ x: CASA_VALLE.pos[0], z: CASA_VALLE.pos[1], r2: 2.0 ** 2 });
  // Cada mundo compuesto con su patio de tierra pisada.
  for (const m of componerMundos(MUNDOS_VALLE)) {
    const rr = 1.35 * (m.escala || 1);
    circulos.push({ x: m.pos[0], z: m.pos[2], r2: rr * rr });
  }
  // Las casitas de los vecinos.
  for (const v of VECINOS_VALLE) {
    circulos.push({ x: v.punto[0], z: v.punto[1], r2: 0.9 ** 2 });
  }
  // Los senderos: nada crece en la tierra pisada (franja de 0.42u).
  const segmentos = [];
  for (const s of SENDEROS_VALLE) {
    for (let i = 0; i < s.puntos.length - 1; i++) {
      segmentos.push([s.puntos[i][0], s.puntos[i][1], s.puntos[i + 1][0], s.puntos[i + 1][1]]);
    }
  }
  return { circulos, segmentos, r2Sendero: 0.42 ** 2 };
}

function despejado(x, z, despejes) {
  for (const c of despejes.circulos) {
    if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r2) return false;
  }
  // El cauce de la quebrada (corre en z alrededor de x≈1.2 en la parte baja).
  if (Math.abs(x - 1.2) < 0.55 && z > -5) return false;
  for (const s of despejes.segmentos) {
    if (dist2ASegmento(x, z, s[0], s[1], s[2], s[3]) < despejes.r2Sendero) return false;
  }
  return true;
}

/** Piso térmico que contiene a z (el pasto del páramo ES del páramo). */
function pisoDeZ(z) {
  for (const p of PISOS_TERMICOS) {
    if (z >= p.z0 && z <= p.z1) return p;
  }
  // Fuera de franja: el más cercano por su centro.
  let mejor = PISOS_TERMICOS[0];
  let dm = Infinity;
  for (const p of PISOS_TERMICOS) {
    const d = Math.abs(z - (p.z0 + p.z1) / 2);
    if (d < dm) {
      dm = d;
      mejor = p;
    }
  }
  return mejor;
}

/* ── Geometrías unidad (altura ~1, base en y=0; el porte lo da la instancia).
      Vertex color en GRIS-GRADIENTE (base en sombra → punta al sol) para que
      el TINTE por instancia pinte encima sin ensuciarse. ─────────────────── */

/** Matojo de pasto: 3 quads en abanico. El viento pesa por position.y. */
export function geomMatojo() {
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const hoja = new THREE.PlaneGeometry(0.16, 1, 1, 2);
    hoja.translate(0, 0.5, 0);
    hoja.rotateY((i * Math.PI) / 3);
    pintarPorVertice(hoja, (_x, y) => {
      const t = THREE.MathUtils.clamp(y, 0, 1);
      const v = 0.45 + t * 0.7; // base en sombra → punta clara
      return _lerpCol.setRGB(v, v, v * (1 - t * 0.12)); // punta apenas cálida
    });
    partes.push(hoja);
  }
  return fusionar(partes, 'geomMatojo');
}

/** Florecita: tallo oscuro (ignora el tinte) + cabezuela clara (toma el tinte). */
export function geomFlorMenuda() {
  const tallo = new THREE.PlaneGeometry(0.05, 0.9, 1, 1);
  tallo.translate(0, 0.45, 0);
  pintarPorVertice(tallo, () => _lerpCol.setRGB(0.2, 0.28, 0.16));
  const cruzado = tallo.clone().rotateY(Math.PI / 2);
  const cabeza = new THREE.OctahedronGeometry(0.11, 0);
  cabeza.translate(0, 0.92, 0);
  pintarPorVertice(cabeza, () => _lerpCol.setRGB(1.1, 1.1, 1.1));
  return fusionar([tallo, cruzado, cabeza], 'geomFlorMenuda');
}

/** Piedrita: icosaedro medio enterrado, facetas al flatShading. */
export function geomPiedrita() {
  const p = new THREE.IcosahedronGeometry(0.5, 0);
  p.translate(0, 0.3, 0);
  pintarPorVertice(p, (_x, y) => {
    const v = 0.8 + THREE.MathUtils.clamp(y, 0, 0.8) * 0.35;
    return _lerpCol.setRGB(v, v, v);
  });
  return fusionar([p], 'geomPiedrita');
}

/** Montículo de surco (camellón labrado / mata de papa según el tinte). */
export function geomMonticulo() {
  const m = new THREE.SphereGeometry(0.5, 6, 4);
  m.translate(0, 0.42, 0);
  pintarPorVertice(m, (_x, y) => {
    const v = 0.62 + THREE.MathUtils.clamp(y, 0, 1) * 0.5;
    return _lerpCol.setRGB(v, v, v);
  });
  return fusionar([m], 'geomMonticulo');
}

/** Mata de milpa: hojas cruzadas altas + espiga cálida en la punta. */
export function geomMilpa() {
  const partes = [];
  for (let i = 0; i < 2; i++) {
    const hoja = new THREE.PlaneGeometry(0.26, 1, 1, 2);
    hoja.translate(0, 0.5, 0);
    hoja.rotateY((i * Math.PI) / 2 + 0.4);
    pintarPorVertice(hoja, (_x, y) => {
      const v = 0.5 + THREE.MathUtils.clamp(y, 0, 1) * 0.62;
      return _lerpCol.setRGB(v, v, v * 0.92);
    });
    partes.push(hoja);
  }
  const espiga = new THREE.ConeGeometry(0.05, 0.22, 4);
  espiga.translate(0, 1.05, 0);
  pintarPorVertice(espiga, () => _lerpCol.setRGB(1.35, 1.2, 0.65)); // la flor del maíz
  partes.push(espiga);
  return fusionar(partes, 'geomMilpa');
}

/** Mata de café: cono tupido, base en sombra de cafetal. */
export function geomCafeMata() {
  const copa = new THREE.ConeGeometry(0.5, 1, 6);
  copa.translate(0, 0.5, 0);
  pintarPorVertice(copa, (_x, y) => {
    const v = 0.55 + THREE.MathUtils.clamp(y, 0, 1) * 0.6;
    return _lerpCol.setRGB(v, v, v);
  });
  return fusionar([copa], 'geomCafeMata');
}

/* ── SIEMBRA capa 1: rechazo con falloff AoE desde la casa-ancla ─────────── */
export function sembrarDetalle(presupuesto, alturaDe, parches) {
  const r = rng(SEMILLA);
  const despejes = construirDespejes();
  const cx = CASA_VALLE.pos[0];
  const cz = CASA_VALLE.pos[1];
  const items = { matojo: [], flor: [], piedra: [] };
  const objetivo = {
    matojo: Math.round(presupuesto * FRACCION.matojo),
    flor: Math.round(presupuesto * FRACCION.flor),
    piedra: Math.round(presupuesto * FRACCION.piedra),
  };
  // Parches con peso acumulado (si el host acota dónde poblar).
  let acumulados = null;
  if (parches && parches.length) {
    let total = 0;
    acumulados = parches.map((p) => {
      total += Math.abs((p.x1 - p.x0) * (p.z1 - p.z0)) * (p.peso || 1);
      return { p, hasta: total };
    });
    acumulados.total = total;
  }
  let puestos = 0;
  const tope = presupuesto * 8; // el rechazo no puede colgar el hilo
  for (let i = 0; i < tope && puestos < presupuesto; i++) {
    let x;
    let z;
    if (acumulados) {
      const tiro = r() * acumulados.total;
      const gana = acumulados.find((a) => tiro <= a.hasta) || acumulados[acumulados.length - 1];
      x = THREE.MathUtils.lerp(gana.p.x0, gana.p.x1, r());
      z = THREE.MathUtils.lerp(gana.p.z0, gana.p.z1, r());
    } else {
      x = -16 + r() * 32;
      z = -16 + r() * 32;
      // Falloff AoE: tupido cerca de la casa, ralo al borde del cuadro.
      const d2 = (x - cx) ** 2 + (z - cz) ** 2;
      let p = 0.18 + 0.82 * Math.exp(-d2 / (2 * 7.0 ** 2));
      if (z < -8) p *= 0.35; // el páramo queda en pajonal ralo
      if (r() > p) continue;
    }
    if (!despejado(x, z, despejes)) continue;
    // Tipo: rellena los cupos en proporción; flores no suben al páramo.
    let tipo;
    if (items.matojo.length < objetivo.matojo) tipo = 'matojo';
    else if (items.flor.length < objetivo.flor) tipo = z < -6.5 ? 'matojo' : 'flor';
    else if (items.piedra.length < objetivo.piedra) tipo = 'piedra';
    else break;
    const piso = pisoDeZ(z);
    const y = alturaDe(x, z);
    if (tipo === 'matojo') {
      items.matojo.push({
        pos: [x, y, z],
        rot: [(r() - 0.5) * 0.16, r() * Math.PI * 2, (r() - 0.5) * 0.16],
        esc: [0.55 + r() * 1.0, 0.5 + r() * 1.1, 0.55 + r() * 1.0],
        tint: tinteEntre(piso.color, piso.cresta, r, 1.02),
        fase: r() * Math.PI * 2,
        amp: 0.05 + r() * 0.06,
      });
    } else if (tipo === 'flor') {
      const FLORES = ['#f2d54c', '#eceff0', '#b48ee0', '#e0705a', '#f0a34c'];
      items.flor.push({
        pos: [x, y, z],
        rot: [(r() - 0.5) * 0.1, r() * Math.PI * 2, (r() - 0.5) * 0.1],
        esc: [0.5 + r() * 0.5, 0.4 + r() * 0.5, 0.5 + r() * 0.5],
        tint: tinteEntre(FLORES[(r() * FLORES.length) | 0], '#ffffff', r, 1),
        fase: r() * Math.PI * 2,
        amp: 0.03 + r() * 0.04,
      });
    } else {
      items.piedra.push({
        pos: [x, y - 0.02, z],
        rot: [r() * Math.PI, r() * Math.PI * 2, r() * Math.PI],
        esc: [0.12 + r() * 0.16, 0.1 + r() * 0.12, 0.12 + r() * 0.16],
        tint: tinteEntre('#8d867c', '#a9a294', r, 1),
        fase: 0,
        amp: 0, // la piedra no se mece
      });
    }
    puestos++;
  }
  return items;
}

/* ── SIEMBRA capa 2: hileras en curva de nivel, reparto por área de lote ── */
export function sembrarSurcos(presupuesto, alturaDe, lotes) {
  const r = rng(SEMILLA ^ 0x5f3759df);
  const areas = lotes.map((l) => Math.abs((l.x1 - l.x0) * (l.z1 - l.z0)));
  const areaTotal = areas.reduce((a, b) => a + b, 0) || 1;
  const items = { monticulo: [], milpa: [], cafe: [] };
  for (let li = 0; li < lotes.length; li++) {
    const lote = lotes[li];
    const cult = CULTIVO[lote.cultivo] || CULTIVO.papa;
    const est = ESTADO[lote.estado] || ESTADO.maduro;
    const objetivo = Math.max(4, Math.round(presupuesto * (areas[li] / areaTotal)));
    // Hileras a lo largo de x (curva de nivel: la pendiente corre en z).
    const nFilas = Math.max(2, Math.round(Math.abs(lote.z1 - lote.z0) / cult.sep));
    const porFila = Math.max(2, Math.round(objetivo / nFilas));
    const banco =
      lote.estado === 'labrado' || lote.cultivo === 'papa'
        ? items.monticulo
        : lote.cultivo === 'milpa'
          ? items.milpa
          : items.cafe;
    for (let f = 0; f < nFilas; f++) {
      const zf = THREE.MathUtils.lerp(lote.z0, lote.z1, (f + 0.5) / nFilas);
      for (let i = 0; i < porFila; i++) {
        const x = THREE.MathUtils.lerp(lote.x0, lote.x1, (i + 0.5) / porFila) + (r() - 0.5) * 0.08;
        const z = zf + (r() - 0.5) * 0.06;
        const porte = THREE.MathUtils.lerp(est.porte[0], est.porte[1], r());
        const alto = cult.alto * porte;
        const tintes = est.tinte || cult.tinte;
        banco.push({
          pos: [x, alturaDe(x, z), z],
          rot: [0, r() * Math.PI * 2, 0],
          esc: [
            lote.estado === 'labrado' ? 0.8 + r() * 0.3 : 0.55 + r() * 0.35,
            alto,
            lote.estado === 'labrado' ? 0.8 + r() * 0.3 : 0.55 + r() * 0.35,
          ],
          tint: tinteEntre(tintes[0], tintes[1], r, 1),
          fase: 0,
          amp: 0,
        });
      }
    }
  }
  return items;
}

