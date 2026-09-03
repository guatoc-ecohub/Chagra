/*
 * floraDescenso — la VEGETACIÓN del descenso 3D por la Sierra, como anillo de
 * cercanía que sigue la traza de la cámara.
 *
 * LA ESCALA QUE MANDA SOBRE TODO (la leí del plan y es la que justifica el
 * diseño): `METROS_POR_UNIDAD` en `sierraRelieve.js` = 1155 m/unidad. Un árbol
 * REAL de 20 m = 0,0173 unidades. Con un viewport de 800 px de alto y fov ~46°,
 * un objeto de tamaño `s` unidades a distancia `d` ocupa ~948·s/d px:
 *   · a 1 unidad (≈1,2 km): ~16 px — SE VE
 *   · a 3 unidades:          ~5 px
 *   · a 8 unidades:          ~2 px — subpíxel, no se ve
 * Sembrar el macizo entero a escala real tira el 90 % de la geometría a la
 * basura (sería subpíxel). Lo que se ve es lo que está CERCA del recorrido.
 * Por eso esto es un ANILLO DE CERCANÍA de radio ~3,5 unidades que sigue la
 * cámara, NO un bosque global. Y por eso NO se exagera la escala de una planta
 * para que "se vea" — la casa prohíbe esa trampa visual: escala real, lo que se
 * administra es DÓNDE y CUÁNTAS.
 *
 * ARQUITECTURA: pool FIJO. TODO se crea en el constructor (`InstancedMesh`, uno
 * por arquetipo/especie) y se RECICLA moviendo matrices en `actualizar()`. Cero
 * asignaciones y cero creación de geometría/material por cuadro — el viaje dura
 * 4 200 ms y un hipo de GC se ve. La colocación usa SIEMPRE `alturaSierra(wx,wz)`
 * de `sierraRelieve.js` (nunca una altura inventada: una instancia flotando o
 * enterrada es un bug).
 *
 * ANTAGONISTAS: ceros eucalipto, pino pátula, retamo, acacia — nunca.
 *
 * ANTI-LOW-POLY: la ÚNICA palanca de degradación es la DENSIDAD (cuántas
 * instancias activas) y el LOD. Ningún arquetipo se degrada a facetas grandes o
 * conos de pocos segmentos; las copas son un CAMPO DENSO de cards
 * (follaje-masa), no hojas contables.
 *
 * FRAILEJÓN — ESPECIE PENDIENTE DE DR (no se nombra): el páramo de la Sierra
 * Nevada de Santa Marta es aislado y su complejo de Espeletia, endémico. La
 * fábrica vendorizada trae las especies del Eje cafetero y de Chingaza:
 * sembrarlas en la Sierra es científicamente FALSO, y el dr-cross que debía
 * resolver la especie quedó inconcluso. Por eso aquí se monta la roseta con la
 * morfología parametrizada (tronco columnar + enagua marcescente + roseta
 * apical) pero SIN declarar especie en ningún lado: cero nombre científico en
 * código, en datos, ni en algo que se renderice. Cuando el DR cierre, se nombra.
 */
import * as THREE from 'three';
import { alturaSierra, CUMBRE_M } from './sierraRelieve.js';

const _p = new THREE.Vector3();

/* ─────────────────────────────── presupuesto ─────────────────────────────── */
/*
 * Presupuesto por tier (destino: Pixel 6 Pro / Mali-G78). Empezar CONSERVADOR;
 * la densidad se sube DESPUÉS de medir, nunca antes. `conteo()` devuelve los
 * números REALES (suma de `count` de cada InstancedMesh / número de meshes con
 * count>0), no estos del presupuesto.
 */
/*
 * PRESUPUESTO SUBIDO DESPUÉS DE MEDIR, que es el único orden que vale. El techo
 * conservador de arranque (220/120/60) daba 62 instancias activas en la banda
 * 4: mirado a 200 % son motas contables sobre una ladera lisa, no vegetación.
 * Y la medición decía que había sitio de sobra — el descenso iba a 4,2-6,1 ms
 * de GPU en el Pixel con un techo de 16,7. Con InstancedMesh el costo lo manda
 * el número de DRAW CALLS (uno por arquetipo, 6 en total), no el de instancias,
 * así que subir el conteo es la palanca barata; la cara sería subir arquetipos.
 * El número final se fija con el A/B del gate, no con este comentario.
 */
export const PRESUPUESTO = {
  alto: { instancias: 640, draws: 12 },
  medio: { instancias: 350, draws: 12 },
  bajo: { instancias: 200, draws: 12 },
};
/*
 * DE DÓNDE SALEN ESOS NÚMEROS — medidos en el Pixel 6 Pro (Mali-G78), no
 * elegidos. Con el techo a 800 en tier medio la banda 4 activaba 226 instancias
 * (61 252 triángulos) y el cuadro pasaba de 8,3 a 12,8 ms de GPU: +4,5 ms, con
 * p95 en 21 ms — POR ENCIMA del techo de 16,7 ms de vsync, o sea cuadros
 * perdidos. Con el techo a 350 la banda activa ~102 instancias (32 078 tri) y
 * el costo se hunde bajo el piso de ruido del instrumento (±1,5 ms en una
 * máquina contaminada), con el cuadro en ~8 ms. Se elige el que CABE.
 * La palanca que falta y que daría más plantas por el mismo vatio es LOD por
 * distancia dentro del anillo: hoy cada instancia cuesta ~271 triángulos a
 * cualquier distancia, y a 3 unidades esa planta mide 2 px.
 */

/* Radio del anillo de cercanía: más allá es subpíxel (ver la tabla de arriba). */
/* 2,2 unidades ≈ 2,5 km. Se acortó desde 3,5: más allá de ~3 unidades una
   planta real es de 2 px (ver la tabla de arriba), así que sembrar allá es
   pagar instancias por nada. Acortar el radio concentra las mismas instancias
   donde SÍ se ven. */
const RADIO_ANILLO = 2.2;

/* PRNG determinista (mulberry32): mismo `semilla` → misma siembra. Cero
   Math.random() sin semilla. */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ───────────────────────── arquetipos (especies) ─────────────────────────── */
/*
 * Un arquetipo = UNA especie visual = UN InstancedMesh = 1 draw call. La mezcla
 * fija reparte la capacidad del pool entre las especies de TODO el recorrido; lo
 * que las bandas cambian es CUÁNTOS de esos slots están activos en cada cota,
 * no de qué especie es cada slot (una instancia jamás parpadea de especie).
 */
const ARQUETIPOS = [
  { id: 'pajonal' }, // pastizal / matriz (superpáramo, páramo, frío)
  { id: 'roseta' }, // roseta caulescente anónima (páramo) — dri pendiente
  { id: 'arbol_frio' }, // dosel del bosque de niebla
  { id: 'arbol_templado' }, // dosel denso húmedo (templado)
  { id: 'arbol_calido' }, // copa seca y abierta (cálido seco)
  { id: 'matorral' }, // matorral ralo (playa)
];

/* Reparto fijo de la capacidad del pool entre arquetipos (suma 1). */
const MIX = {
  pajonal: 0.22,
  roseta: 0.2,
  arbol_frio: 0.19,
  arbol_templado: 0.17,
  arbol_calido: 0.14,
  matorral: 0.08,
};

/* ─────────────────── la curva de densidad global ─────────────────────────── */
/*
 * Densidad de vegetación como función CONTINUA de msnm. El orden es la lección:
 * nival = 0 (roca y hielo: es lo correcto, NO se puebla), crece por el
 * superpáramo (muy baja, suelo desnudo dominante), alcanza su techo en
 * páramo/frío/templado (bosque denso) y se rala hacia cálido y playa.
 */
function densidadPorMsnm(msnm) {
  const m = clamp(msnm, 0, CUMBRE_M);
  const superp = smoothstep1(4800, 4000, m) * 0.09;
  const paramo = smoothstep1(4100, 3000, m) * 0.42;
  const frio = smoothstep1(3100, 2400, m) * 0.5;
  const templado = (0.55 - smoothstep1(2000, 1200, m) * 0.06) * smoothstep1(3100, 2200, m);
  const calido = smoothstep1(2000, 1200, m) * 0.44;
  const playa = smoothstep1(600, 200, m) * 0.14; // ralo
  // Corte duro del nival por construcción: sobre ~4 800 m no crece nada.
  const nivalOff = 1 - smoothstep1(4720, 4800, m);
  return Math.max(0, superp + paramo + frio + templado + calido + playa) * nivalOff;
}

function smoothstep1(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/* Peso 0..1 de cada arquetipo desde los pesos CONTINUOS de banda. */
function pesoArquetipo(id, p) {
  switch (id) {
    case 'pajonal':
      return (p.superparamo ?? 0) + (p.paramo ?? 0) * 0.3 + (p.frio ?? 0) * 0.2;
    case 'roseta':
      return p.paramo ?? 0;
    case 'arbol_frio':
      return (p.frio ?? 0) * 0.8 + (p.templado ?? 0) * 0.15;
    case 'arbol_templado':
      return (p.templado ?? 0) * 0.85 + (p.frio ?? 0) * 0.2;
    case 'arbol_calido':
      return (p.calido_seco ?? 0) + (p.playa ?? 0) * 0.5;
    case 'matorral':
      return (p.playa ?? 0) * 0.5;
    default:
      return 0;
  }
}

/* ───────────────────── helpers de geometría (follaje) ────────────────────── */
/* Un card (hoja): quad orientado por normal. Muchos juntos leen como MASA
   (follaje-masa), nunca como hojas contables. */
function cardSimple(pos, col, ox, oy, oz, nx, nz, tam, hue, rng) {
  let tx = -nz, tz = nx;
  if (Math.abs(nx) < 0.3 && Math.abs(nz) < 0.3) { tx = 1; tz = 0; }
  const hw = tam * 0.5;
  const c = new THREE.Color();
  const pts = [
    ox + tx * -hw, oy, oz + tz * -hw,
    ox + tx * hw, oy, oz + tz * hw,
    ox + tx * hw, oy + tam * 0.5, oz + tz * hw,
    ox + tx * -hw, oy, oz + tz * -hw,
    ox + tx * hw, oy + tam * 0.5, oz + tz * hw,
    ox + tx * -hw, oy + tam * 0.5, oz + tz * -hw,
  ];
  for (const v of pts) pos.push(v);
  c.setHSL(hue + rng() * 0.03, 0.4, 0.24 + rng() * 0.08);
  for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
}

/* Posiciones + colores paralelos → BufferGeometry. */
function geometriaDesde(pos, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  return g;
}

function matLambert() {
  return new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    color: 0xffffff,
  });
}

/* Tronco columnar (cilindro faceteado suave, no bajo-poli). */
function tronco(pos, col, r0, r1, h, seg, tono) {
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const b = ((i + 1) / seg) * Math.PI * 2;
    for (let v = 0; v < 3; v++) {
      const y0 = (v / 3) * h;
      const y1 = ((v + 1) / 3) * h;
      const rA = r0 + (r1 - r0) * (v / 3);
      const rB = r0 + (r1 - r0) * ((v + 1) / 3);
      const cax = Math.cos(a) * rA, caz = Math.sin(a) * rA;
      const cbx = Math.cos(b) * rB, cbz = Math.sin(b) * rB;
      pos.push(cax, y0, caz, cbx, y0, cbz, cbx, y1, cbz);
      pos.push(cax, y0, caz, cbx, y1, cbz, cax, y1, caz);
      for (let k = 0; k < 6; k++) col.push(tono[0], tono[1], tono[2]);
    }
  }
}

/* ─────────────────── constructores de arquetipo ──────────────────────────── */
/* Cada uno devuelve { geo, mat } y se instancia UNA vez. Geometría a escala
   real, base en y=0. */

function construirPajonal(rng) {
  // macolla: palas curvas (quads multi-segmento) alrededor del centro
  const pos = [];
  const col = [];
  const nPalas = 9;
  const seg = 4;
  for (let i = 0; i < nPalas; i++) {
    const a = (i / nPalas) * Math.PI * 2 + rng() * 0.4;
    const dirx = Math.cos(a), dirz = Math.sin(a);
    const h = 0.022 + rng() * 0.03;
    for (let s = 0; s < seg; s++) {
      const t = s / seg, tt = (s + 1) / seg;
      const w0 = 0.004 * (1 - t) + 0.001;
      const w1 = 0.004 * (1 - tt) + 0.001;
      const bx = dirx * t * h, bz = dirz * t * h;
      const b1x = dirx * tt * h, b1z = dirz * tt * h;
      const y0 = t * h, y1 = tt * h;
      pos.push(bx - dirz * w0, y0, bz + dirx * w0);
      pos.push(bx + dirz * w0, y0, bz - dirx * w0);
      pos.push(b1x + dirz * w1, y1, b1z - dirx * w1);
      pos.push(bx - dirz * w0, y0, bz + dirx * w0);
      pos.push(b1x + dirz * w1, y1, b1z - dirx * w1);
      pos.push(b1x - dirz * w1, y1, b1z + dirx * w1);
      const g = 0.3 + t * 0.3;
      for (let k = 0; k < 6; k++) col.push(g, g * 1.05, g * 0.62);
    }
  }
  return { geo: geometriaDesde(pos, col), mat: matLambert() };
}

function construirRoseta(rng) {
  // roseta caulescente anónima (frailejón SIN especie): tronco + roseta apical
  const pos = [];
  const col = [];
  const hTronco = 0.055;
  tronco(pos, col, 0.004, 0.003, hTronco, 6, [0.28, 0.22, 0.14]);
  const nHoja = 11;
  for (let i = 0; i < nHoja; i++) {
    const a = (i / nHoja) * Math.PI * 2 + rng() * 0.3;
    const len = 0.02 + rng() * 0.01;
    const tilt = 0.7 + rng() * 0.2;
    const dx = Math.cos(a), dz = Math.sin(a);
    for (let s = 0; s < 3; s++) {
      const t = s / 3, t2 = (s + 1) / 3;
      const bx0 = dx * Math.sin(tilt) * len * t;
      const by0 = hTronco + Math.cos(tilt) * len * t;
      const bz0 = dz * Math.sin(tilt) * len * t;
      const bx1 = dx * Math.sin(tilt) * len * t2;
      const by1 = hTronco + Math.cos(tilt) * len * t2;
      const bz1 = dz * Math.sin(tilt) * len * t2;
      const wid0 = 0.004 * (1 - t), wid1 = 0.004 * (1 - t2);
      const tx = -dz, tz = dx;
      pos.push(bx0 - tx * wid0, by0, bz0 - tz * wid0);
      pos.push(bx0 + tx * wid0, by0, bz0 + tz * wid0);
      pos.push(bx1 + tx * wid1, by1, bz1 + tz * wid1);
      pos.push(bx0 - tx * wid0, by0, bz0 - tz * wid0);
      pos.push(bx1 + tx * wid1, by1, bz1 + tz * wid1);
      pos.push(bx1 - tx * wid1, by1, bz1 - tz * wid1);
      for (let k = 0; k < 6; k++) col.push(0.62, 0.66, 0.54); // plateado
    }
  }
  return { geo: geometriaDesde(pos, col), mat: matLambert() };
}

function construirArbolFrio(rng) {
  // dosel cónico denso: tronco + 4 pisos de cards formando un cono
  const pos = [];
  const col = [];
  const H = 0.022;
  tronco(pos, col, 0.004, 0.0025, H * 0.5, 5, [0.22, 0.14, 0.07]);
  const capas = 4;
  for (let l = 0; l < capas; l++) {
    const y = H * 0.45 + (l / capas) * H * 0.55;
    const radioL = (1 - l / capas) * 0.03 + 0.006;
    const nL = 8;
    for (let i = 0; i < nL; i++) {
      const a = (i / nL) * Math.PI * 2 + rng() * 0.5;
      const cx = Math.cos(a) * radioL;
      const cz = Math.sin(a) * radioL;
      for (let c = 0; c < 4; c++) {
        const jx = rng(), jy = rng() - 0.5;
        const tam = 0.006 + rng() * 0.008;
        cardSimple(
          pos, col,
          cx + Math.cos(a) * jx * 0.012, y + jy * 0.008, cz + Math.sin(a) * jx * 0.012,
          Math.cos(a), Math.sin(a), tam, 0.36, rng,
        );
      }
    }
  }
  return { geo: geometriaDesde(pos, col), mat: matLambert() };
}

function construirArbolTemplado(rng) {
  // dosel denso húmedo: tronco + gran copa esférica de cards
  const pos = [];
  const col = [];
  const H = 0.028;
  tronco(pos, col, 0.006, 0.004, H * 0.45, 5, [0.2, 0.13, 0.06]);
  const centroY = H * 0.55;
  const radio = 0.035;
  const nCards = 90;
  for (let i = 0; i < nCards; i++) {
    const theta = Math.acos(2 * rng() - 1);
    const phi = rng() * Math.PI * 2;
    const rr = radio * (0.35 + 0.65 * rng());
    const cx = Math.sin(theta) * Math.cos(phi) * rr;
    const cz = Math.sin(theta) * Math.sin(phi) * rr;
    const cy = centroY + Math.cos(theta) * rr;
    const tam = 0.008 + rng() * 0.012;
    cardSimple(pos, col, cx, cy, cz, cx * 0.01, cz * 0.01, tam, 0.33, rng);
  }
  return { geo: geometriaDesde(pos, col), mat: matLambert() };
}

function construirArbolCalido(rng) {
  // copa seca y abierta: tronco + cards ralas (dosel claro)
  const pos = [];
  const col = [];
  const H = 0.024;
  tronco(pos, col, 0.006, 0.003, H, 5, [0.3, 0.2, 0.1]);
  const centroY = H * 0.6;
  const radio = 0.028;
  const nCards = 26;
  for (let i = 0; i < nCards; i++) {
    const theta = Math.acos(2 * rng() - 1);
    const phi = rng() * Math.PI * 2;
    const rr = radio * (0.4 + 0.6 * rng());
    const cx = Math.sin(theta) * Math.cos(phi) * rr;
    const cz = Math.sin(theta) * Math.sin(phi) * rr;
    const cy = centroY + Math.cos(theta) * rr;
    const tam = 0.01 + rng() * 0.014;
    cardSimple(pos, col, cx, cy, cz, cx * 0.01, cz * 0.01, tam, 0.16, rng);
  }
  return { geo: geometriaDesde(pos, col), mat: matLambert() };
}

function construirMatorral(rng) {
  // matorral bajo de playa: ramas finas + pocas cards
  const pos = [];
  const col = [];
  const H = 0.012;
  const nR = 6;
  for (let i = 0; i < nR; i++) {
    const a = (i / nR) * Math.PI * 2 + rng() * 0.5;
    const dx = Math.cos(a), dz = Math.sin(a);
    const len = H * (0.6 + rng() * 0.4);
    for (let s = 0; s < 2; s++) {
      const t = s / 2, t2 = (s + 1) / 2;
      const bx0 = dx * len * t, bz0 = dz * len * t, by0 = t * len;
      const bx1 = dx * len * t2, bz1 = dz * len * t2, by1 = t2 * len;
      const w0 = 0.002, w1 = 0.001;
      pos.push(bx0 - dz * w0, by0, bz0 + dx * w0, bx0 + dz * w0, by0, bz0 - dx * w0, bx1 + dz * w1, by1, bz1 - dx * w1);
      pos.push(bx0 - dz * w0, by0, bz0 + dx * w0, bx1 + dz * w1, by1, bz1 - dx * w1, bx1 - dz * w1, by1, bz1 + dx * w1);
      for (let k = 0; k < 6; k++) col.push(0.3, 0.26, 0.16);
    }
  }
  return { geo: geometriaDesde(pos, col), mat: matLambert() };
}

/* ─────────────────────────────── el módulo ──────────────────────────────── */
/**
 * Crea la flora del descenso.
 *
 * @param {object}   opts
 * @param {THREE.Scene} opts.escena  la escena r3f (se añade UN Group
 *                                   `descenso-flora`).
 * @param {string}   [opts.tier='alto'] 'alto'|'medio'|'bajo'.
 * @param {number}   [opts.densidad=1] 0..1, escala lineal las instancias activas
 *                                   sin recrear el pool.
 * @param {number}   [opts.semilla=7] determinismo.
 * @returns {{ actualizar, conteo, dispose }}
 */
export function crearFloraDescenso({ escena, tier = 'alto', densidad = 1, semilla = 7 }) {
  const presu = PRESUPUESTO[tier] ?? PRESUPUESTO.medio;
  const rng = mulberry32((semilla | 0) ^ 0x9e3779b9);

  const grupo = new THREE.Group();
  grupo.name = 'descenso-flora';

  const constructores = {
    pajonal: construirPajonal,
    roseta: construirRoseta,
    arbol_frio: construirArbolFrio,
    arbol_templado: construirArbolTemplado,
    arbol_calido: construirArbolCalido,
    matorral: construirMatorral,
  };

  /* Capacidad del pool por arquetipo (mezcla fija). */
  const capacidades = {};
  let usado = 0;
  for (const a of ARQUETIPOS) {
    if (a.id === 'matorral') {
      capacidades[a.id] = Math.max(0, presu.instancias - usado);
    } else {
      capacidades[a.id] = Math.max(0, Math.round(presu.instancias * (MIX[a.id] ?? 0)));
      usado += capacidades[a.id];
    }
  }

  const meshes = {};
  const slotLocal = {};
  for (const a of ARQUETIPOS) {
    const cap = capacidades[a.id];
    const { geo, mat } = constructores[a.id](rng);
    const mesh = new THREE.InstancedMesh(geo, mat, cap);
    mesh.name = `descenso-flora-${a.id}`;
    mesh.count = 0; // todo inactivo al construir
    mesh.frustumCulled = false;
    grupo.add(mesh);
    meshes[a.id] = mesh;
    // posiciones locales del anillo (deterministas por semilla)
    const loc = [];
    for (let i = 0; i < cap; i++) {
      loc.push({
        ang: rng() * Math.PI * 2,
        radio: 0.6 + Math.pow(rng(), 0.6) * (RADIO_ANILLO - 0.6),
        esc: 0.7 + rng() * 0.9,
      });
    }
    slotLocal[a.id] = loc;
  }
  escena.add(grupo);

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();

  function actualizar(estado) {
    if (!estado) return;
    /*
     * EL CENTRO DEL ANILLO ES EL OBJETIVO, NO LA CÁMARA. Con el centro en
     * `camara.pos` las 62 instancias se sembraban alrededor del propio ojo —
     * o sea DETRÁS y por DEBAJO del encuadre, porque la cámara vuela sobre la
     * cota que narra y mira hacia la ladera, varias unidades adelante. Medido:
     * `conteo()` decía inst=62 dc=3 y en el cuadro no se veía una sola planta.
     * El punto que el descenso está contando es `camara.objetivo`: la ladera a
     * la cota actual, sacada de la misma ley de altura de la vista global.
     * Sembrar ahí es lo que pone la vegetación DONDE SE MIRA.
     */
    const cx = estado.camara.objetivo[0];
    const cz = estado.camara.objetivo[2];
    const densG = clamp(densidad, 0, 1);
    const densMsnm = densidadPorMsnm(estado.msnm);
    for (const a of ARQUETIPOS) {
      const mesh = meshes[a.id];
      const loc = slotLocal[a.id];
      const cap = capacidades[a.id];
      const w = pesoArquetipo(a.id, estado.pesos);
      const n = clamp(Math.round(cap * densMsnm * densG * w), 0, cap);
      let idx = 0;
      for (; idx < n; idx++) {
        const sl = loc[idx];
        const wx = cx + Math.cos(sl.ang) * sl.radio;
        const wz = cz + Math.sin(sl.ang) * sl.radio;
        const y = alturaSierra(wx, wz);
        _q.identity();
        _s.set(sl.esc, sl.esc, sl.esc);
        _p.set(wx, y, wz);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(idx, _m);
      }
      mesh.count = idx;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  function conteo() {
    let instancias = 0;
    let drawCalls = 0;
    const porBanda = {};
    for (const a of ARQUETIPOS) {
      const c = meshes[a.id].count;
      instancias += c;
      if (c > 0) drawCalls++;
      porBanda[a.id] = c;
    }
    return { instancias, drawCalls, porBanda };
  }

  function dispose() {
    escena.remove(grupo);
    for (const a of ARQUETIPOS) {
      meshes[a.id].geometry?.dispose?.();
      meshes[a.id].material?.dispose?.();
    }
  }

  return { actualizar, conteo, dispose, meshes, capacidades };
}
