/*
 * vinetasMundos.geom — los QUINCE DIORAMAS que viven dentro de los arcos de la
 * Vitrina Maestra.
 *
 * Cada viñeta es una MINIATURA REALISTA del mundo al que abre el arco (registro
 * visual: los mundos van realistas): el cafetal es una ladera con surcos y
 * matas con granos; el páramo son frailejones de verdad en su pajonal; la
 * sierra es una cresta nevada sobre su laguna. La persona SABE a dónde entra
 * antes de tocar — sin íconos, sin caricatura.
 *
 * TÉCNICA (DR realismo-3d-vegetacion): cada viñeta se HORNEA en UNA geometría
 * fusionada con vertexColors — fondo con gradiente de cielo propio, terreno con
 * parches de ruido, y el motivo con variación determinista de color/escala/giro
 * por elemento (nada de copias idénticas). 12 viñetas = 12 draw-calls estáticas:
 * cero useFrame por viñeta (la vida de la vitrina va en el paisaje, no en un
 * temblequeo de juguete).
 *
 * Contrato: la viñeta se ve desde +z, llena un círculo de radio ~0.72 en XY
 * y ocupa z ∈ [-0.38, 0.08]. Corre headless (testeable sin WebGL).
 */
import * as THREE from 'three';
import {
  fusionar,
  pintar,
  pintarPorVertice,
  poner,
  variar,
  ruido2D,
  fbm1D,
} from './miradorAndino.geom.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* Radio útil de la boca del arco. */
const RADIO = 0.72;

/* -------------------------------------------------------------------------- */
/*  Piezas compartidas                                                         */
/* -------------------------------------------------------------------------- */

/**
 * El lienzo del círculo: cielo con gradiente vertical + media luna de suelo
 * con parches de ruido + lomas de bruma opcionales. Devuelve PARTES (no
 * fusiona): la viñeta las junta con su motivo en una sola geometría.
 * @param {{cieloAlto:string, cieloBajo:string, suelo:string, sueloVar?:string, lomas?:string[]}} p
 * @param {number} seed
 */
/** Sube saturación y baja apenas la luz: los pasteles puros se lavaban. */
function conCuerpo(color, dS = 0.14, dL = -0.03) {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s + dS, 0, 1), THREE.MathUtils.clamp(hsl.l + dL, 0, 1));
  return c;
}

function fondo(p, seed = 1) {
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  const alto = conCuerpo(p.cieloAlto);
  const bajo = conCuerpo(p.cieloBajo, 0.12, -0.02);

  const cielo = new THREE.CircleGeometry(RADIO + 0.05, 28);
  pintarPorVertice(cielo, (_x, y) => {
    const t = THREE.MathUtils.clamp((y + RADIO) / (2 * RADIO), 0, 1);
    return bajo.clone().lerp(alto, Math.pow(t, 1.15));
  });
  poner(cielo, [0, 0, -0.37]);
  partes.push(cielo);

  // lomas lejanas fundidas al cielo (perspectiva atmosférica en miniatura)
  (p.lomas || []).forEach((colorLoma, i) => {
    const loma = new THREE.CircleGeometry(0.46 - i * 0.06, 16);
    const c = new THREE.Color(colorLoma).lerp(bajo, 0.35 + i * 0.2);
    pintar(loma, c);
    poner(loma, [(i % 2 ? -1 : 1) * (0.16 + i * 0.1), -0.02 - i * 0.03, -0.362 + i * 0.004], [0, 0, 0], [1.25, 0.4 - i * 0.06, 1]);
    partes.push(loma);
  });

  // media luna de suelo con parches (nunca un verde plano)
  const suelo = new THREE.CircleGeometry(RADIO + 0.02, 26, Math.PI, Math.PI);
  const base = conCuerpo(p.suelo, 0.12, -0.05);
  const varTono = conCuerpo(p.sueloVar || p.suelo, 0.1, -0.02);
  pintarPorVertice(suelo, (x, y) => {
    const c = base.clone();
    c.lerp(varTono, ruido2D(x * 7 + 3, y * 7, seed) * 0.55);
    // el borde alto del suelo (horizonte) se aclara contra el cielo
    c.lerp(bajo, THREE.MathUtils.clamp((y + 0.1) * 2.2, 0, 0.4));
    return c;
  });
  poner(suelo, [0, 0, -0.35]);
  partes.push(suelo);

  return partes;
}

/**
 * Arbolito realista en miniatura (DR: tronco cónico inclinado + copa de blobs
 * IRREGULARES con huecos + gradiente de altura + color variado por blob).
 * @param {ReturnType<typeof rng>} r
 * @param {{x:number,y:number,z:number, s?:number, tronco?:string, copa?:string, copaClara?:string}} o
 */
function arbolito(r, o) {
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  const s = o.s ?? 1;
  const tr = new THREE.CylinderGeometry(0.012 * s, 0.028 * s, 0.16 * s, 5);
  poner(tr, [o.x, o.y + 0.07 * s, o.z], [0, 0, (r() - 0.5) * 0.24]);
  pintar(tr, variar(o.tronco || '#6a5844', r, 0.1));
  partes.push(tr);
  const copa = new THREE.Color(o.copa || '#3f5a35');
  const copaClara = new THREE.Color(o.copaClara || '#5c7a46');
  const nBlobs = 4;
  for (let i = 0; i < nBlobs; i++) {
    const ang = r() * Math.PI * 2;
    const rad = (0.02 + r() * 0.045) * s;
    const alturaBlob = (0.15 + r() * 0.1) * s;
    const blob = new THREE.IcosahedronGeometry((0.045 + r() * 0.035) * s, 0);
    poner(
      blob,
      [o.x + Math.cos(ang) * rad, o.y + alturaBlob, o.z + Math.sin(ang) * rad * 0.5],
      [r(), r(), r()],
      [1, 0.75 + r() * 0.3, 1],
    );
    // gradiente de altura: blobs bajos más oscuros (AO fingido del DR)
    const t = (alturaBlob / s - 0.15) / 0.1;
    pintar(blob, copa.clone().lerp(copaClara, THREE.MathUtils.clamp(t, 0, 1) * (0.4 + r() * 0.4)));
    partes.push(blob);
  }
  return partes;
}

/** Mata baja de blobs (arbusto/cultivo) con variación. */
function mata(r, x, y, z, s, oscuro, claro, blobs = 3) {
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  const cOsc = new THREE.Color(oscuro);
  const cCla = new THREE.Color(claro);
  for (let i = 0; i < blobs; i++) {
    const b = new THREE.IcosahedronGeometry((0.045 + r() * 0.03) * s, 0);
    poner(
      b,
      [x + (r() - 0.5) * 0.09 * s, y + 0.03 * s + r() * 0.05 * s, z + (r() - 0.5) * 0.04],
      [r(), r(), r()],
      [1, 0.7 + r() * 0.35, 1],
    );
    pintar(b, cOsc.clone().lerp(cCla, r() * 0.55));
    partes.push(b);
  }
  return partes;
}

/* -------------------------------------------------------------------------- */
/*  LAS QUINCE VIÑETAS                                                         */
/* -------------------------------------------------------------------------- */

/** 🏡 El valle: la casita campesina encalada en su loma, con su camino. */
export function vinetaValle({ q = 1 } = {}, seed = 101) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#9db8cc', cieloBajo: '#f0d8a4', suelo: '#5d7241', sueloVar: '#7d8c4e', lomas: ['#55704a', '#6a7d62'] },
    seed,
  );

  // la loma de la casa
  const loma = new THREE.SphereGeometry(0.34, 12, 8);
  pintarPorVertice(loma, (x, y) => {
    const c = new THREE.Color('#5d7241');
    c.lerp(new THREE.Color('#8a9155'), ruido2D(x * 8, y * 8, seed) * 0.5 + Math.max(0, y) * 0.4);
    return c;
  });
  poner(loma, [0.06, -0.32, -0.3], [0, 0, 0], [1.5, 0.62, 1]);
  partes.push(loma);

  // la casita: muros encalados, techo de teja a dos aguas, puerta y ventana
  const cx = 0.1;
  const cy = -0.1;
  const muro = new THREE.BoxGeometry(0.3, 0.18, 0.2);
  poner(muro, [cx, cy, -0.26]);
  pintarPorVertice(muro, (_x, y) => new THREE.Color('#efe6d4').multiplyScalar(0.86 + (y - cy + 0.09) * 0.9));
  partes.push(muro);
  for (const lado of [-1, 1]) {
    const agua = new THREE.BoxGeometry(0.2, 0.02, 0.24);
    poner(agua, [cx + lado * 0.083, cy + 0.14, -0.26], [0, 0, lado * 0.6]);
    pintar(agua, variar('#9a5a38', r, 0.08));
    partes.push(agua);
  }
  const caballete = new THREE.CylinderGeometry(0.014, 0.014, 0.24, 4);
  poner(caballete, [cx, cy + 0.185, -0.26], [Math.PI / 2, 0, 0]);
  pintar(caballete, '#7a4530');
  partes.push(caballete);
  const puerta = new THREE.PlaneGeometry(0.055, 0.1);
  poner(puerta, [cx - 0.05, cy - 0.04, -0.155]);
  pintar(puerta, '#4a3520');
  partes.push(puerta);
  const ventana = new THREE.PlaneGeometry(0.05, 0.05);
  poner(ventana, [cx + 0.07, cy - 0.01, -0.155]);
  pintar(ventana, '#35506a');
  partes.push(ventana);

  // el camino de tierra que baja serpenteando (menos tramos en tier frugal)
  for (let i = 0; i < Math.max(2, Math.round(4 * q)); i++) {
    const tramo = new THREE.PlaneGeometry(0.075, 0.16);
    poner(tramo, [cx - 0.1 - i * 0.07 + (i % 2) * 0.03, -0.26 - i * 0.09, -0.29 + i * 0.006], [0, 0, 0.5 + (i % 2) * 0.3]);
    pintar(tramo, variar('#9a8054', r, 0.08));
    partes.push(tramo);
  }

  // árboles que arropan la casa
  partes.push(...arbolito(r, { x: -0.32, y: -0.3, z: -0.24, s: 1.35 }));
  partes.push(...arbolito(r, { x: 0.44, y: -0.26, z: -0.26, s: 0.95, copa: '#4a6238' }));
  return fusionar(partes, 'vinetaValle');
}

/** ☕ El café: la ladera con surcos, matas con granos rojos y su sombrío. */
export function vinetaCafe({ q = 1 } = {}, seed = 102) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#b8c8c2', cieloBajo: '#f2d8a2', suelo: '#6b5638', sueloVar: '#84643e', lomas: ['#4f6844'] },
    seed,
  );

  // la ladera en diagonal con SURCOS horneados (bandas de tierra/verde)
  const ladera = new THREE.PlaneGeometry(1.5, 0.72, 10, 8);
  pintarPorVertice(ladera, (x, y) => {
    const banda = Math.sin(y * 26 + x * 3);
    const c = new THREE.Color('#7a5c38');
    c.lerp(new THREE.Color('#55703f'), THREE.MathUtils.smoothstep(banda, -0.1, 0.6) * 0.7);
    c.lerp(new THREE.Color('#8a6a42'), ruido2D(x * 6, y * 6, seed) * 0.3);
    return c;
  });
  poner(ladera, [0, -0.18, -0.32], [0, 0, 0.34]);
  partes.push(ladera);

  // matas de café en surco: blobs oscuros lustrosos + granos rojos
  const nMatas = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nMatas; i++) {
    const t = i / (nMatas - 1);
    const x = -0.44 + t * 0.9 + (r() - 0.5) * 0.06;
    const y = 0.08 - t * 0.44 + (r() - 0.5) * 0.04;
    const s = 0.9 + r() * 0.45;
    partes.push(...mata(r, x, y, -0.27, s, '#2c452a', '#446b36', 3));
    // granos: racimos rojos y uno pintón (verde-amarillo)
    const nG = 3;
    for (let g = 0; g < nG; g++) {
      const grano = new THREE.IcosahedronGeometry(0.014 + r() * 0.007, 0);
      poner(grano, [x + (r() - 0.5) * 0.1 * s, y + 0.04 + r() * 0.06 * s, -0.22]);
      pintar(grano, g === 2 && r() > 0.5 ? '#b8a03a' : variar('#a52c22', r, 0.15));
      partes.push(grano);
    }
  }

  // el guamo de sombrío: alto, copa ancha y rala
  const tronco = new THREE.CylinderGeometry(0.016, 0.03, 0.42, 5);
  poner(tronco, [-0.4, -0.02, -0.3], [0, 0, 0.12]);
  pintar(tronco, '#6a5844');
  partes.push(tronco);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.IcosahedronGeometry(0.06 + r() * 0.05, 0);
    poner(b, [-0.46 + i * 0.09 + (r() - 0.5) * 0.05, 0.22 + (r() - 0.5) * 0.08, -0.3], [r(), r(), r()], [1.25, 0.55, 1]);
    pintar(b, variar('#4a6238', r, 0.14));
    partes.push(b);
  }

  // el canasto recolector al pie
  const canasto = new THREE.CylinderGeometry(0.055, 0.04, 0.07, 8, 1, true);
  poner(canasto, [0.3, -0.5, -0.2]);
  pintar(canasto, '#a9825a');
  partes.push(canasto);
  return fusionar(partes, 'vinetaCafe');
}

/** 💧 El agua: la quebrada de montaña bajando entre piedras. */
export function vinetaAgua({ q = 1 } = {}, seed = 103) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#a9c4cc', cieloBajo: '#e2e0c2', suelo: '#4c6238', sueloVar: '#5f7a44', lomas: ['#48604a'] },
    seed,
  );

  // el cauce baja en S CONTINUA (una cinta, no esquirlas): franja construida
  // punto a punto con centro hondo y orillas claras
  {
    const curso = [
      [-0.34, 0.44], [-0.18, 0.24], [-0.02, 0.06], [0.14, -0.12], [0.18, -0.32], [0.1, -0.52], [-0.02, -0.66],
    ];
    const posiciones = [];
    const colores = [];
    const honda = new THREE.Color('#39616e');
    const clara = new THREE.Color('#7fa8b2');
    const colorOrilla = (t) => honda.clone().lerp(clara, Math.pow(Math.abs(t), 1.2));
    for (let s = 0; s < curso.length - 1; s++) {
      const [x0, y0] = curso[s];
      const [x1, y1] = curso[s + 1];
      // normal del tramo (perpendicular en el plano XY)
      const dx = x1 - x0;
      const dy = y1 - y0;
      const L = Math.hypot(dx, dy) || 1;
      const nx = (-dy / L) * 0.085;
      const ny = (dx / L) * 0.085;
      const z = -0.3;
      // dos triángulos entre las orillas de este tramo
      const v = [
        [x0 - nx, y0 - ny, -1], [x0 + nx, y0 + ny, 1], [x1 - nx, y1 - ny, -1],
        [x1 - nx, y1 - ny, -1], [x0 + nx, y0 + ny, 1], [x1 + nx, y1 + ny, 1],
      ];
      for (const [vx, vy, lado] of v) {
        posiciones.push(vx, vy, z);
        const c = colorOrilla(lado);
        if (ruido2D(vx * 20, vy * 9, seed) > 0.82) c.lerp(new THREE.Color('#e4efe9'), 0.5);
        colores.push(c.r, c.g, c.b);
      }
    }
    const cinta = new THREE.BufferGeometry();
    cinta.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posiciones), 3));
    cinta.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colores), 3));
    cinta.computeVertexNormals();
    partes.push(cinta);
  }

  // piedras a la ORILLA del cauce (siguen el curso, no regadas al azar)
  const orillaCurso = [
    [-0.28, 0.3], [-0.06, 0.1], [0.22, -0.18], [0.24, -0.4], [0.02, -0.58],
  ];
  for (let i = 0; i < Math.min(orillaCurso.length, Math.max(3, Math.round(5 * q))); i++) {
    const lado = i % 2 ? 1 : -1;
    const [cx, cy] = orillaCurso[i];
    const p = new THREE.DodecahedronGeometry(0.04 + r() * 0.04, 0);
    poner(p, [cx + lado * 0.11, cy, -0.27], [r(), r() * 3, r()], [1, 0.75, 1]);
    pintar(p, variar('#7d786c', r, 0.14));
    partes.push(p);
    const espuma = new THREE.IcosahedronGeometry(0.016, 0);
    poner(espuma, [cx + lado * 0.07, cy - 0.02, -0.26], [0, 0, 0], [1.5, 0.5, 1]);
    pintar(espuma, '#e4efe9');
    partes.push(espuma);
  }

  // juncos de orilla
  for (let i = 0; i < 5; i++) {
    const lado = i % 2 ? 1 : -1;
    const junco = new THREE.CylinderGeometry(0.005, 0.009, 0.2 + r() * 0.12, 4);
    poner(junco, [lado * (0.3 + r() * 0.14), -0.24 - r() * 0.18, -0.25], [0, 0, (r() - 0.5) * 0.3]);
    pintar(junco, variar('#5f7a44', r, 0.2));
    partes.push(junco);
  }
  partes.push(...arbolito(r, { x: 0.42, y: -0.2, z: -0.3, s: 0.9, copa: '#3c5836' }));
  return fusionar(partes, 'vinetaAgua');
}

/** 🐞 La sanidad: la hoja sana con su mariquita — control biológico. */
export function vinetaSanidad({ q = 1 } = {}, seed = 104) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#b4ccb2', cieloBajo: '#eee4b4', suelo: '#55703f', sueloVar: '#6d8448', lomas: [] },
    seed,
  );

  // la mata vigilada (cultivo sano con frutos)
  partes.push(...mata(r, -0.3, -0.3, -0.28, 1.8, '#375231', '#55793c', 4));
  for (let i = 0; i < 3; i++) {
    const fruto = new THREE.IcosahedronGeometry(0.022, 0);
    poner(fruto, [-0.34 + r() * 0.14, -0.24 + r() * 0.12, -0.23]);
    pintar(fruto, variar('#b03426', r, 0.1));
    partes.push(fruto);
  }

  // LA HOJA protagonista con su vena central
  const hoja = new THREE.CircleGeometry(0.3, 14);
  pintarPorVertice(hoja, (x, y) => {
    const c = new THREE.Color('#5c8a44');
    c.lerp(new THREE.Color('#3f6234'), Math.abs(y) * 2 + ruido2D(x * 9, y * 9, seed) * 0.3);
    if (Math.abs(y) < 0.016) c.set('#48703a');
    return c;
  });
  poner(hoja, [0.14, 0.02, -0.26], [0, 0, 0.35], [1, 0.55, 1]);
  partes.push(hoja);
  const tallo = new THREE.CylinderGeometry(0.008, 0.012, 0.34, 4);
  poner(tallo, [0.02, -0.26, -0.27], [0, 0, 0.45]);
  pintar(tallo, '#48703a');
  partes.push(tallo);

  // la mariquita: élitros rojos partidos, puntos y cabeza negra
  const mx = 0.18;
  const my = 0.07;
  const cuerpo = new THREE.SphereGeometry(0.05, 10, 7);
  poner(cuerpo, [mx, my, -0.24], [0.3, 0, 0.35], [1.15, 0.7, 1]);
  pintarPorVertice(cuerpo, (x) => (Math.abs(x - mx) < 0.004 ? new THREE.Color('#2a1c14') : new THREE.Color('#b8281c')));
  partes.push(cuerpo);
  const cabeza = new THREE.SphereGeometry(0.024, 8, 6);
  poner(cabeza, [mx + 0.05, my + 0.008, -0.24]);
  pintar(cabeza, '#241a12');
  partes.push(cabeza);
  for (const [px, py] of [[-0.022, 0.02], [0.012, -0.022], [-0.004, 0.035]]) {
    const punto = new THREE.IcosahedronGeometry(0.009, 0);
    poner(punto, [mx + px, my + py, -0.215]);
    pintar(punto, '#241a12');
    partes.push(punto);
  }

  // flores de acompañante (las que llaman a los benéficos)
  for (let i = 0; i < Math.max(2, Math.round(3 * q)); i++) {
    const fx = 0.4 + (r() - 0.5) * 0.14;
    const fy = -0.34 - r() * 0.14;
    const talloF = new THREE.CylinderGeometry(0.005, 0.007, 0.14, 4);
    poner(talloF, [fx, fy, -0.27], [0, 0, (r() - 0.5) * 0.3]);
    pintar(talloF, '#5f7a44');
    partes.push(talloF);
    const flor = new THREE.IcosahedronGeometry(0.022, 0);
    poner(flor, [fx, fy + 0.08, -0.26], [0, 0, 0], [1.3, 0.6, 1]);
    pintar(flor, i % 2 ? '#e8d968' : '#eeeadd');
    partes.push(flor);
  }
  return fusionar(partes, 'vinetaSanidad');
}

/** 🧺 El mercado: el puesto de plaza con toldo y la cosecha en canastos. */
export function vinetaMercado({ q = 1 } = {}, seed = 105) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#b6c4c8', cieloBajo: '#f2dcae', suelo: '#9a8054', sueloVar: '#b09468', lomas: [] },
    seed,
  );

  // postes de madera
  for (const x of [-0.3, 0.3]) {
    const poste = new THREE.CylinderGeometry(0.014, 0.018, 0.56, 5);
    poner(poste, [x, -0.1, -0.28], [0, 0, (r() - 0.5) * 0.06]);
    pintar(poste, variar('#7a5c3c', r, 0.12));
    partes.push(poste);
  }
  // el toldo de lona con RAYAS horneadas y caída real (dos aguas suaves)
  for (const lado of [-1, 1]) {
    const lona = new THREE.PlaneGeometry(0.76, 0.17, 8, 2);
    pintarPorVertice(lona, (x) => {
      const raya = Math.sin(x * 42) > 0.15;
      return new THREE.Color(raya ? '#c26136' : '#efe2c8');
    });
    poner(lona, [0, 0.245 + 0.02 * lado, -0.26 + lado * 0.055], [lado * 0.5 - 0.5, 0, 0]);
    partes.push(lona);
  }

  // el mesón con su mantel
  const meson = new THREE.BoxGeometry(0.62, 0.05, 0.2);
  poner(meson, [0, -0.2, -0.24]);
  pintar(meson, '#8a6a46');
  partes.push(meson);

  // canastos con la cosecha apilada (papa, tomate, aguacate)
  const productos = ['#c8a03c', '#b03426', '#4c6238'];
  for (let k = 0; k < 3; k++) {
    const cx = -0.2 + k * 0.2;
    const canasto = new THREE.CylinderGeometry(0.075, 0.055, 0.075, 9, 1, true);
    poner(canasto, [cx, -0.14, -0.22]);
    pintar(canasto, variar('#a9825a', r, 0.1));
    partes.push(canasto);
    for (let i = 0; i < Math.max(3, Math.round(4 * q)); i++) {
      const fruto = new THREE.IcosahedronGeometry(0.02 + r() * 0.008, 0);
      poner(fruto, [cx + (r() - 0.5) * 0.08, -0.1 + r() * 0.025, -0.21 + (r() - 0.5) * 0.03]);
      pintar(fruto, variar(productos[k], r, 0.12));
      partes.push(fruto);
    }
  }
  // bultos al pie del puesto
  for (const [bx, by] of [[-0.4, -0.42], [0.42, -0.44]]) {
    const bulto = new THREE.SphereGeometry(0.07, 8, 6);
    poner(bulto, [bx, by, -0.24], [0, 0, 0], [1, 1.15, 0.9]);
    pintar(bulto, variar('#cbb489', r, 0.1));
    partes.push(bulto);
  }
  return fusionar(partes, 'vinetaMercado');
}

/** 🐔 Los animales: la gallina campesina picoteando junto a su cerca. */
export function vinetaAnimales({ q = 1 } = {}, seed = 106) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#b3c6c0', cieloBajo: '#f0dcae', suelo: '#8a7248', sueloVar: '#a08a58', lomas: ['#55704a'] },
    seed,
  );

  // la cerca rústica (postes torcidos + dos largueros)
  for (const x of [-0.4, -0.02, 0.38]) {
    const poste = new THREE.CylinderGeometry(0.014, 0.02, 0.34, 5);
    poner(poste, [x + (r() - 0.5) * 0.03, 0.02, -0.3], [0, 0, (r() - 0.5) * 0.16]);
    pintar(poste, variar('#6a5238', r, 0.14));
    partes.push(poste);
  }
  for (const y of [0.1, -0.04]) {
    const larguero = new THREE.CylinderGeometry(0.011, 0.011, 0.92, 4);
    poner(larguero, [0, y, -0.29], [0, 0, Math.PI / 2 + (r() - 0.5) * 0.05]);
    pintar(larguero, variar('#7a5c3c', r, 0.1));
    partes.push(larguero);
  }

  // la gallina: cuerpo criollo pardo, cola, ala, cabeza con cresta
  const gx = -0.12;
  const gy = -0.26;
  const cuerpo = new THREE.SphereGeometry(0.1, 10, 8);
  poner(cuerpo, [gx, gy, -0.24], [0, 0, 0.14], [1.3, 0.92, 1]);
  pintarPorVertice(cuerpo, (x, y) => {
    const c = new THREE.Color('#8a5c38');
    c.lerp(new THREE.Color('#c8a888'), THREE.MathUtils.clamp((y - gy) * 6 + 0.3, 0, 0.7));
    c.lerp(new THREE.Color('#5a3c26'), ruido2D(x * 30, y * 30, seed) * 0.35);
    return c;
  });
  partes.push(cuerpo);
  const cola = new THREE.ConeGeometry(0.045, 0.12, 6);
  poner(cola, [gx - 0.12, gy + 0.07, -0.24], [0, 0, 2.2], [1, 1, 0.5]);
  pintar(cola, '#4a3020');
  partes.push(cola);
  const cabeza = new THREE.SphereGeometry(0.042, 8, 6);
  poner(cabeza, [gx + 0.12, gy + 0.1, -0.24]);
  pintar(cabeza, '#9a6a42');
  partes.push(cabeza);
  const cresta = new THREE.ConeGeometry(0.016, 0.035, 4);
  poner(cresta, [gx + 0.12, gy + 0.15, -0.24]);
  pintar(cresta, '#b8281c');
  partes.push(cresta);
  const pico = new THREE.ConeGeometry(0.012, 0.035, 4);
  poner(pico, [gx + 0.165, gy + 0.09, -0.24], [0, 0, -Math.PI / 2]);
  pintar(pico, '#d8a83c');
  partes.push(pico);

  // pollitos
  for (let i = 0; i < 2; i++) {
    const px = 0.16 + i * 0.14 + (r() - 0.5) * 0.04;
    const cuerpoP = new THREE.SphereGeometry(0.032, 7, 5);
    poner(cuerpoP, [px, -0.34, -0.22]);
    pintar(cuerpoP, variar('#d8bc5c', r, 0.1));
    partes.push(cuerpoP);
    const cabezaP = new THREE.SphereGeometry(0.02, 6, 5);
    poner(cabezaP, [px + 0.02, -0.3, -0.22]);
    pintar(cabezaP, variar('#e0c868', r, 0.1));
    partes.push(cabezaP);
  }
  // maíz regado
  for (let i = 0; i < Math.max(3, Math.round(5 * q)); i++) {
    const grano = new THREE.IcosahedronGeometry(0.008, 0);
    poner(grano, [(r() - 0.5) * 0.5, -0.42 - r() * 0.12, -0.22]);
    pintar(grano, '#d8b23c');
    partes.push(grano);
  }
  return fusionar(partes, 'vinetaAnimales');
}

/** 🌱 El semillero: camas de guadua con brotes en oleada y su túnel. */
export function vinetaSemillero({ q = 1 } = {}, seed = 107) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#b8ccb8', cieloBajo: '#eee6bc', suelo: '#6b5638', sueloVar: '#84643e', lomas: [] },
    seed,
  );

  const filas = [
    { y: -0.14, z: -0.3, ancho: 0.72 },
    { y: -0.36, z: -0.24, ancho: 0.92 },
  ];
  filas.forEach((f, fi) => {
    // marco de guadua
    const marco = new THREE.BoxGeometry(f.ancho, 0.05, 0.12);
    poner(marco, [0, f.y - 0.045, f.z]);
    pintar(marco, variar('#a09048', r, 0.08));
    partes.push(marco);
    // tierra oscura y húmeda
    const cama = new THREE.BoxGeometry(f.ancho - 0.05, 0.03, 0.1);
    poner(cama, [0, f.y - 0.02, f.z + 0.004]);
    pintarPorVertice(cama, (x, y) => new THREE.Color('#3f3222').lerp(new THREE.Color('#5a4830'), ruido2D(x * 20, y * 9, seed + fi) * 0.6));
    partes.push(cama);
    // brotes: cotiledones en tamaños escalonados (la oleada, horneada)
    const nB = Math.max(4, Math.round(7 * q));
    for (let i = 0; i < nB; i++) {
      const bx = -f.ancho / 2 + 0.08 + (i / (nB - 1)) * (f.ancho - 0.16);
      const s = 0.5 + ((i * 2.7 + fi) % 3) * 0.3 + r() * 0.2;
      const talloB = new THREE.CylinderGeometry(0.004, 0.005, 0.045 * s, 4);
      poner(talloB, [bx, f.y + 0.02 * s, f.z + 0.01]);
      pintar(talloB, '#7a9a4c');
      partes.push(talloB);
      for (const lado of [-1, 1]) {
        const cot = new THREE.IcosahedronGeometry(0.013 * s, 0);
        poner(cot, [bx + lado * 0.014 * s, f.y + 0.045 * s, f.z + 0.01], [0, 0, 0], [1.4, 0.5, 0.8]);
        pintar(cot, variar('#8ab04e', r, 0.12));
        partes.push(cot);
      }
    }
  });

  // los arcos del túnel de propagación
  for (const dz of [0, 0.05]) {
    const arco = new THREE.TorusGeometry(0.4 + dz * 1.6, 0.011, 4, 12, Math.PI);
    poner(arco, [0, -0.12, -0.32 + dz]);
    pintar(arco, '#d8d2be');
    partes.push(arco);
  }
  // la regadera de lata
  const cuerpoR = new THREE.CylinderGeometry(0.05, 0.055, 0.09, 8);
  poner(cuerpoR, [0.44, -0.5, -0.22]);
  pintar(cuerpoR, '#8a9498');
  partes.push(cuerpoR);
  const picoR = new THREE.CylinderGeometry(0.008, 0.012, 0.12, 4);
  poner(picoR, [0.36, -0.48, -0.22], [0, 0, 1.1]);
  pintar(picoR, '#7a8488');
  partes.push(picoR);
  return fusionar(partes, 'vinetaSemillero');
}

/** 🪱 El suelo vivo: el perfil con sus horizontes, raíces y la lombriz. */
export function vinetaSuelo({ q = 1 } = {}, seed = 108) {
  const r = rng(seed);
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  // cielo apenas visible arriba
  const cielo = new THREE.CircleGeometry(RADIO + 0.05, 26);
  pintarPorVertice(cielo, (_x, y) => new THREE.Color('#e0d5ac').lerp(new THREE.Color('#b0c4c0'), THREE.MathUtils.clamp((y + 0.2) * 2, 0, 1)));
  poner(cielo, [0, 0, -0.37]);
  partes.push(cielo);

  // EL PERFIL: horizontes horneados (humus → tierra parda → arcilla → roca)
  const perfil = new THREE.PlaneGeometry(1.5, 1.1, 12, 16);
  pintarPorVertice(perfil, (x, y) => {
    const nivel = y + (ruido2D(x * 4, 7, seed) - 0.5) * 0.08; // horizontes ondulados
    let c;
    if (nivel > 0.28) c = new THREE.Color('#2e2418'); // humus negro
    else if (nivel > 0.02) c = new THREE.Color('#4a3826');
    else if (nivel > -0.3) c = new THREE.Color('#6b4c2e');
    else c = new THREE.Color('#7d6a52'); // saprolito
    c.lerp(new THREE.Color('#8a6a42'), ruido2D(x * 14, y * 14, seed + 3) * 0.25);
    return c;
  });
  poner(perfil, [0, -0.22, -0.34]);
  partes.push(perfil);

  // la franja de pasto vivo arriba, con sus macollas
  const franja = new THREE.PlaneGeometry(1.5, 0.09, 8, 1);
  pintarPorVertice(franja, (x) => new THREE.Color('#55703f').lerp(new THREE.Color('#7d8c4e'), ruido2D(x * 12, 3, seed) * 0.6));
  poner(franja, [0, 0.155, -0.33]);
  partes.push(franja);
  for (let i = 0; i < Math.max(5, Math.round(8 * q)); i++) {
    const x = -0.55 + (i / 7) * 1.1 + (r() - 0.5) * 0.05;
    const macolla = new THREE.ConeGeometry(0.02, 0.09 + r() * 0.05, 4);
    poner(macolla, [x, 0.23, -0.32], [0, 0, (r() - 0.5) * 0.4]);
    pintar(macolla, variar('#6d8448', r, 0.18));
    partes.push(macolla);
  }

  // raíces que bajan ramificándose
  for (const rx of [-0.3, 0.04, 0.36]) {
    const raiz = new THREE.CylinderGeometry(0.006, 0.016, 0.34, 4);
    poner(raiz, [rx, 0.0, -0.3], [0, 0, (r() - 0.5) * 0.3]);
    pintar(raiz, '#c8b48e');
    partes.push(raiz);
    for (const lado of [-1, 1]) {
      const pelo = new THREE.CylinderGeometry(0.003, 0.007, 0.16, 3);
      poner(pelo, [rx + lado * 0.05, -0.2 - r() * 0.06, -0.3], [0, 0, lado * (0.5 + r() * 0.3)]);
      pintar(pelo, '#b8a480');
      partes.push(pelo);
    }
  }

  // LA LOMBRIZ: segmentos en arco con clitelo más claro
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const seg = new THREE.SphereGeometry(i === 4 ? 0.024 : 0.03, 7, 5);
    poner(seg, [-0.14 + t * 0.32, -0.3 + Math.sin(t * Math.PI) * 0.05, -0.26]);
    pintar(seg, i === 2 ? '#d8a090' : variar('#b06a6a', r, 0.08));
    partes.push(seg);
  }
  // piedras y poros
  for (let i = 0; i < 4; i++) {
    const p = new THREE.DodecahedronGeometry(0.02 + r() * 0.025, 0);
    poner(p, [(r() - 0.5) * 1.0, -0.16 - r() * 0.4, -0.28], [r(), r(), r()]);
    pintar(p, variar('#7d786c', r, 0.15));
    partes.push(p);
  }
  return fusionar(partes, 'vinetaSuelo');
}

/** 🏔️ La Sierra: crestas nevadas de verdad sobre su laguna sagrada. */
export function vinetaSierra({ q = 1 } = {}, seed = 109) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#8fb0c8', cieloBajo: '#e8ddba', suelo: '#5c7048', sueloVar: '#748452', lomas: [] },
    seed,
  );

  // DOS crestas fractales (la técnica de las cordilleras, en miniatura)
  const capas = [
    { y0: -0.12, hMax: 0.5, color: '#46545e', nieve: 0.55, z: -0.34, seedC: 1 },
    { y0: -0.16, hMax: 0.34, color: '#39493c', nieve: 0.82, z: -0.32, seedC: 2 },
  ];
  for (const capa of capas) {
    const N = 22;
    const posiciones = [];
    const colores = [];
    const base = new THREE.Color(capa.color);
    const nieve = new THREE.Color('#f2f1e8');
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const h = (t) => capa.y0 + Math.pow(fbm1D(t * 5.5, seed + capa.seedC * 13), 1.5) * capa.hMax;
      const X = (t) => -0.66 + t * 1.32;
      const h0 = h(t0);
      const h1 = h(t1);
      posiciones.push(X(t0), capa.y0 - 0.3, capa.z, X(t1), capa.y0 - 0.3, capa.z, X(t0), h0, capa.z);
      posiciones.push(X(t0), h0, capa.z, X(t1), capa.y0 - 0.3, capa.z, X(t1), h1, capa.z);
      const colorEn = (y) => {
        const c = base.clone();
        const sn = capa.y0 + capa.hMax * capa.nieve;
        if (y > sn) c.lerp(nieve, THREE.MathUtils.clamp((y - sn) / 0.1, 0, 1));
        return c;
      };
      [capa.y0 - 0.3, capa.y0 - 0.3, h0, h0, capa.y0 - 0.3, h1].forEach((y) => {
        const c = colorEn(y);
        colores.push(c.r, c.g, c.b);
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posiciones), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colores), 3));
    g.computeVertexNormals();
    partes.push(g);
  }

  // la laguna: espejo del cielo con orilla clara
  const laguna = new THREE.CircleGeometry(0.4, 18);
  pintarPorVertice(laguna, (_x, y) => new THREE.Color('#7fb0bd').lerp(new THREE.Color('#cfe0da'), THREE.MathUtils.clamp(-y * 2.4, 0, 0.8)));
  poner(laguna, [0, -0.44, -0.3], [0, 0, 0], [1.15, 0.4, 1]);
  partes.push(laguna);

  // frailejones chiquitos de orilla + piedras (uno solo en tier frugal)
  for (const [fx, fy] of (q < 0.8 ? [[-0.42, -0.3]] : [[-0.42, -0.3], [0.44, -0.34]])) {
    const talloF = new THREE.CylinderGeometry(0.014, 0.018, 0.07, 5);
    poner(talloF, [fx, fy, -0.27]);
    pintar(talloF, '#6f5c40');
    partes.push(talloF);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const hoja = new THREE.ConeGeometry(0.012, 0.06, 4);
      poner(hoja, [fx + Math.cos(ang) * 0.016, fy + 0.05, -0.27 + Math.sin(ang) * 0.008], [Math.PI / 3.2 * Math.sin(ang), 0, -Math.PI / 3.2 * Math.cos(ang)]);
      pintar(hoja, variar('#b9c39c', r, 0.08));
      partes.push(hoja);
    }
  }
  for (let i = 0; i < 3; i++) {
    const p = new THREE.DodecahedronGeometry(0.03 + r() * 0.03, 0);
    poner(p, [(r() - 0.5) * 0.7, -0.5 - r() * 0.08, -0.26], [r(), r(), r()]);
    pintar(p, variar('#7d786c', r, 0.12));
    partes.push(p);
  }
  return fusionar(partes, 'vinetaSierra');
}

/** 🌫️ El páramo: frailejones en su pajonal, bruma horneada en el fondo. */
export function vinetaParamo({ q = 1 } = {}, seed = 110) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#b9c6c4', cieloBajo: '#dfe2d2', suelo: '#6d7a4c', sueloVar: '#8a915c', lomas: ['#7d8a74', '#95a08e'] },
    seed,
  );

  // pajonal: macollas de paja amarillo-verde por todo el suelo
  for (let i = 0; i < Math.max(6, Math.round(10 * q)); i++) {
    const x = (r() - 0.5) * 1.1;
    const y = -0.2 - r() * 0.34;
    const macolla = new THREE.ConeGeometry(0.022, 0.1 + r() * 0.07, 4);
    poner(macolla, [x, y, -0.29], [0, 0, (r() - 0.5) * 0.5]);
    pintar(macolla, variar('#a3a35c', r, 0.2));
    partes.push(macolla);
  }

  // TRES frailejones con enagua y roseta plateada (el ícono, de verdad)
  const puestos = [
    { x: -0.26, y: -0.18, s: 1.25 },
    { x: 0.22, y: -0.32, s: 1.0 },
    { x: 0.44, y: -0.1, s: 0.7 },
  ];
  for (const pu of puestos) {
    const s = pu.s;
    const tallo = new THREE.CylinderGeometry(0.02 * s, 0.026 * s, 0.16 * s, 6);
    poner(tallo, [pu.x, pu.y, -0.27]);
    pintar(tallo, '#6f5c40');
    partes.push(tallo);
    // enagua de hojas muertas colgando
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const hoja = new THREE.ConeGeometry(0.012 * s, 0.07 * s, 4);
      poner(
        hoja,
        [pu.x + Math.cos(ang) * 0.024 * s, pu.y - 0.01, -0.27 + Math.sin(ang) * 0.012 * s],
        [2.4 * Math.sin(ang), 0, -2.4 * Math.cos(ang)],
      );
      pintar(hoja, variar('#8a7350', r, 0.14));
      partes.push(hoja);
    }
    // roseta plateada en espiral
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < 9; i++) {
      const ang = i * GOLDEN;
      const tilt = 0.7 + (i / 9) * 0.5;
      const hoja = new THREE.ConeGeometry(0.013 * s, 0.09 * s, 4);
      poner(
        hoja,
        [pu.x, pu.y + 0.09 * s, -0.27],
        [Math.sin(tilt) * Math.sin(ang), 0, -Math.sin(tilt) * Math.cos(ang)],
      );
      pintar(hoja, variar('#bcc6ac', r, 0.08));
      partes.push(hoja);
    }
    const corazon = new THREE.IcosahedronGeometry(0.022 * s, 0);
    poner(corazon, [pu.x, pu.y + 0.1 * s, -0.27], [0, 0, 0], [1, 0.7, 1]);
    pintar(corazon, '#cfd7c6');
    partes.push(corazon);
  }

  // rocas con líquen
  for (let i = 0; i < 3; i++) {
    const roca = new THREE.DodecahedronGeometry(0.035 + r() * 0.03, 0);
    poner(roca, [(r() - 0.5) * 0.9, -0.44 - r() * 0.1, -0.26], [r(), r(), r()], [1, 0.7, 1]);
    pintarPorVertice(roca, (x, y) => {
      const c = variar('#7d786c', r, 0.06);
      if (ruido2D(x * 30, y * 30, seed + i) > 0.75) c.lerp(new THREE.Color('#9aa86a'), 0.5);
      return c;
    });
    partes.push(roca);
  }
  return fusionar(partes, 'vinetaParamo');
}

/** 🌧️ La lluvia: el aguacero de tarde con su nube madre y la cortina. */
export function vinetaLluvia({ q = 1 } = {}, seed = 111) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#8a97a2', cieloBajo: '#b8bfba', suelo: '#465f35', sueloVar: '#587244', lomas: ['#5f6d64'] },
    seed,
  );

  // la nube madre: cúmulos grises con panza oscura (gradiente horneado)
  const blobs = [
    [-0.26, 0.3, 0.16], [-0.04, 0.36, 0.19], [0.2, 0.31, 0.16], [0.4, 0.28, 0.11], [-0.42, 0.27, 0.1],
  ];
  for (const [bx, by, br] of blobs) {
    const nube = new THREE.SphereGeometry(br, 9, 7);
    poner(nube, [bx, by, -0.3], [r(), r(), r()], [1.2, 0.72, 1]);
    pintarPorVertice(nube, (_x, y) => new THREE.Color('#6d7880').lerp(new THREE.Color('#c8cfd2'), THREE.MathUtils.clamp((y - by + br) / (br * 1.6), 0, 1)));
    partes.push(nube);
  }

  // la CORTINA de agua: hilos finos ladeados por el viento
  const nGotas = Math.max(9, Math.round(15 * q));
  for (let i = 0; i < nGotas; i++) {
    const x = -0.5 + (i / (nGotas - 1)) * 1.0 + (r() - 0.5) * 0.05;
    const y = 0.12 - r() * 0.5;
    const hilo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.1 + r() * 0.08, 3);
    poner(hilo, [x, y, -0.26], [0, 0, 0.16 + (r() - 0.5) * 0.05]);
    pintar(hilo, variar('#b8cdd6', r, 0.1));
    partes.push(hilo);
  }

  // el charco que recibe (espejo del cielo gris) y su mata agradecida
  const charco = new THREE.CircleGeometry(0.24, 14);
  pintarPorVertice(charco, (_x, y) => new THREE.Color('#98acb2').lerp(new THREE.Color('#c8d4d6'), THREE.MathUtils.clamp(-y * 3, 0, 0.8)));
  poner(charco, [0.12, -0.48, -0.3], [0, 0, 0], [1.3, 0.4, 1]);
  partes.push(charco);
  partes.push(...mata(r, -0.3, -0.44, -0.26, 1.5, '#375231', '#55793c', 3));
  return fusionar(partes, 'vinetaLluvia');
}

/** 🍂 El compost: la pila caliente por capas con su horqueta clavada. */
export function vinetaCompost({ q = 1 } = {}, seed = 112) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#b6c2b8', cieloBajo: '#eadfb6', suelo: '#6b5638', sueloVar: '#84643e', lomas: [] },
    seed,
  );

  // la pila por capas (tierra madura → verde fresco → hojarasca)
  const capas = [
    { y: -0.4, rad: 0.4, alto: 0.18, color: '#3f3222', varC: '#54462e' },
    { y: -0.28, rad: 0.3, alto: 0.15, color: '#4c5c2c', varC: '#65783a' },
    { y: -0.17, rad: 0.2, alto: 0.13, color: '#7a5c34', varC: '#9a7a44' },
  ];
  for (const capa of capas) {
    const cono = new THREE.ConeGeometry(capa.rad, capa.alto, 12);
    pintarPorVertice(cono, (x, y) => new THREE.Color(capa.color).lerp(new THREE.Color(capa.varC), ruido2D(x * 16, y * 16, seed) * 0.7));
    poner(cono, [0, capa.y, -0.28]);
    partes.push(cono);
  }
  // hojarasca y tamo regados en la pila
  for (let i = 0; i < Math.max(6, Math.round(10 * q)); i++) {
    const hoja = new THREE.PlaneGeometry(0.03 + r() * 0.02, 0.016);
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.32;
    poner(hoja, [Math.cos(ang) * rad, -0.38 + r() * 0.3 - rad * 0.3, -0.25], [r() * 2, r() * 2, r() * 2]);
    pintar(hoja, variar(r() > 0.5 ? '#a3763a' : '#b8a04c', r, 0.15));
    partes.push(hoja);
  }

  // la horqueta clavada
  const mango = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 5);
  poner(mango, [-0.36, -0.22, -0.26], [0, 0, 0.35]);
  pintar(mango, '#8a6a46');
  partes.push(mango);
  for (let i = 0; i < 3; i++) {
    const diente = new THREE.CylinderGeometry(0.004, 0.006, 0.1, 3);
    poner(diente, [-0.44 - i * 0.018 + 0.02, -0.4 - i * 0.004, -0.26], [0, 0, 0.5]);
    pintar(diente, '#6d7880');
    partes.push(diente);
  }
  // la carretilla de tierra lista al lado
  const balde = new THREE.BoxGeometry(0.14, 0.06, 0.1);
  poner(balde, [0.42, -0.46, -0.24], [0, 0.3, 0]);
  pintar(balde, '#7a4530');
  partes.push(balde);
  const tierraLista = new THREE.SphereGeometry(0.05, 7, 5);
  poner(tierraLista, [0.42, -0.42, -0.24], [0, 0, 0], [1.3, 0.5, 1]);
  pintar(tierraLista, '#3f3222');
  partes.push(tierraLista);
  return fusionar(partes, 'vinetaCompost');
}

/** 🍫 El cacao: mazorcas sobre el tronco (caulifloria) bajo la sombra alta. */
export function vinetaCacao({ q = 1 } = {}, seed = 113) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#93ab8e', cieloBajo: '#efd6a0', suelo: '#4f3d28', sueloVar: '#6a5138', lomas: ['#42563c'] },
    seed,
  );

  // plátanos de sombra a los flancos: tallo + hojas alargadas que cuelgan
  for (const [px, py, ps] of [[-0.44, -0.12, 0.95], [0.46, -0.18, 0.75]]) {
    const tallo = new THREE.CylinderGeometry(0.014 * ps, 0.022 * ps, 0.34 * ps, 5);
    poner(tallo, [px, py + 0.14 * ps, -0.33], [0, 0, (r() - 0.5) * 0.2]);
    pintar(tallo, variar('#7a8a4e', r, 0.08));
    partes.push(tallo);
    for (let i = 0; i < 4; i++) {
      const ang = -1.1 + i * 0.72 + (r() - 0.5) * 0.25;
      const hoja = new THREE.CircleGeometry(0.15 * ps, 6);
      poner(
        hoja,
        [px + Math.cos(ang) * 0.09 * ps, py + 0.3 * ps + Math.sin(ang) * 0.05, -0.325 + i * 0.003],
        [0, 0, ang],
        [1.6, 0.3, 1],
      );
      pintar(hoja, variar(i % 2 ? '#5c7a40' : '#4c6a38', r, 0.1));
      partes.push(hoja);
    }
  }

  // el cacaotero protagonista: tronco bajo con su horqueta
  const tronco = new THREE.CylinderGeometry(0.034, 0.055, 0.52, 6);
  poner(tronco, [-0.04, -0.2, -0.27], [0, 0, 0.08]);
  pintar(tronco, variar('#5a4432', r, 0.08));
  partes.push(tronco);
  for (const [rx, ry, ra] of [[0.1, 0.12, -0.72], [-0.16, 0.1, 0.66]]) {
    const rama = new THREE.CylinderGeometry(0.015, 0.026, 0.3, 5);
    poner(rama, [rx, ry, -0.27], [0, 0, ra]);
    pintar(rama, variar('#5a4432', r, 0.08));
    partes.push(rama);
  }
  // copa de hojas grandes (blobs anchos, verde profundo con luz arriba)
  const nCopa = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nCopa; i++) {
    const ang = (i / nCopa) * Math.PI * 2 + r() * 0.5;
    const blob = new THREE.IcosahedronGeometry(0.09 + r() * 0.05, 0);
    poner(
      blob,
      [-0.03 + Math.cos(ang) * (0.12 + r() * 0.1), 0.26 + Math.sin(ang) * 0.07 + r() * 0.06, -0.29],
      [r(), r(), r()],
      [1.35, 0.6 + r() * 0.25, 1],
    );
    pintar(blob, new THREE.Color('#3d5233').lerp(new THREE.Color('#5c7a46'), 0.25 + r() * 0.5));
    partes.push(blob);
  }
  // LAS MAZORCAS pegadas al tronco (caulifloria: la firma del cacao)
  const coloresMazorca = ['#d9a33c', '#c97e2e', '#a8542a', '#8a9b3a', '#c9702e'];
  const puestos = [[-0.1, -0.12], [0.04, -0.26], [0.02, 0.0], [0.16, 0.18], [-0.14, -0.32], [-0.2, 0.16]];
  const nMaz = Math.max(4, Math.round(puestos.length * q));
  for (let i = 0; i < nMaz; i++) {
    const [mx, my] = puestos[i];
    const maz = new THREE.IcosahedronGeometry(0.05 + r() * 0.018, 0);
    poner(maz, [mx, my, -0.23], [0, 0, (r() - 0.5) * 0.5], [0.72, 1.2, 0.72]);
    pintar(maz, variar(coloresMazorca[i % coloresMazorca.length], r, 0.08));
    partes.push(maz);
  }
  // la mazorca cosechada al pie
  const caida = new THREE.IcosahedronGeometry(0.055, 0);
  poner(caida, [0.3, -0.52, -0.22], [0, 0, 1.35], [0.72, 1.15, 0.72]);
  pintar(caida, variar('#c97e2e', r, 0.06));
  partes.push(caida);
  return fusionar(partes, 'vinetaCacao');
}

/** 🥔 La papa: surcos de la tierra fría en diagonal, matas en flor. */
export function vinetaPapa({ q = 1 } = {}, seed = 114) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#8ea6ba', cieloBajo: '#ddd6b6', suelo: '#4a3a28', sueloVar: '#61503a', lomas: ['#5a6a52', '#7d8b96'] },
    seed,
  );

  // los surcos: lomos de tierra en diagonal que llenan la media luna
  const angSurco = 0.32; // caída de la ladera
  const ux = -Math.cos(angSurco);
  const uy = -Math.sin(angSurco);
  for (let s = 0; s < 3; s++) {
    const largo = 1.0 - s * 0.16;
    const cx = -0.04 + s * 0.12;
    const cy = -0.14 - s * 0.17;
    const surco = new THREE.CylinderGeometry(0.042, 0.06, largo, 7);
    pintarPorVertice(surco, (x, y) =>
      new THREE.Color('#54422c').lerp(new THREE.Color('#6f5a3c'), ruido2D(x * 14, y * 5 + s * 3, seed) * 0.6),
    );
    poner(surco, [cx, cy, -0.3 + s * 0.02], [0, 0, Math.PI / 2 + angSurco]);
    partes.push(surco);
    // matas de papa sobre el lomo, con sus flores moradas y blancas
    const nM = Math.max(2, Math.round(3 * q));
    for (let i = 0; i < nM; i++) {
      const t = (i / Math.max(1, nM - 1) - 0.5) * (largo - 0.22);
      const mx = cx + ux * t;
      const my = cy + uy * t + 0.05;
      partes.push(...mata(r, mx, my, -0.26 + s * 0.02, 0.8, '#35523a', '#57744a', 3));
      if (r() > 0.3) {
        const flor = new THREE.IcosahedronGeometry(0.014, 0);
        poner(flor, [mx + (r() - 0.5) * 0.05, my + 0.09, -0.235 + s * 0.02]);
        pintar(flor, r() > 0.5 ? '#b9a3cc' : '#e8e4da');
        partes.push(flor);
      }
    }
  }
  // la cosecha desenterrada al pie del surco
  for (let i = 0; i < 3; i++) {
    const papa = new THREE.IcosahedronGeometry(0.032 + r() * 0.012, 0);
    poner(papa, [-0.26 + i * 0.11 + r() * 0.03, -0.55 + r() * 0.03, -0.22], [r(), r(), r()], [1.25, 0.85, 1]);
    pintar(papa, variar('#b28a52', r, 0.1));
    partes.push(papa);
  }
  // el azadón descansando contra el surco
  const palo = new THREE.CylinderGeometry(0.009, 0.009, 0.4, 5);
  poner(palo, [0.4, -0.34, -0.24], [0, 0, -0.5]);
  pintar(palo, '#8a6a46');
  partes.push(palo);
  const lamina = new THREE.BoxGeometry(0.07, 0.05, 0.012);
  poner(lamina, [0.31, -0.5, -0.24], [0, 0, 0.4]);
  pintar(lamina, '#6d7880');
  partes.push(lamina);
  return fusionar(partes, 'vinetaPapa');
}

/** 🐝 Las abejas: la colmena blanca en su pradera florida, nube dorada. */
export function vinetaAbejas({ q = 1 } = {}, seed = 115) {
  const r = rng(seed);
  const partes = fondo(
    { cieloAlto: '#a3bdd0', cieloBajo: '#f2dfae', suelo: '#5d7241', sueloVar: '#7d8c4e', lomas: ['#55704a'] },
    seed,
  );

  // la colmena Langstroth sobre su banquito de madera
  const bx = -0.16;
  for (const px of [-0.08, 0.08]) {
    const pata = new THREE.BoxGeometry(0.03, 0.07, 0.03);
    poner(pata, [bx + px, -0.46, -0.28]);
    pintar(pata, variar('#6a5844', r, 0.08));
    partes.push(pata);
  }
  const alzas = [
    { w: 0.3, h: 0.13, y: -0.36, c: '#e8e2d2' },
    { w: 0.3, h: 0.12, y: -0.235, c: '#d9d0ba' },
    { w: 0.26, h: 0.1, y: -0.125, c: '#e8e2d2' },
  ];
  for (const a of alzas) {
    const caja = new THREE.BoxGeometry(a.w, a.h, 0.2);
    pintarPorVertice(caja, (x, y) =>
      new THREE.Color(a.c).lerp(new THREE.Color('#b8ae96'), Math.max(0, -y) * 3 * ruido2D(x * 9, y * 9, seed) + 0.08),
    );
    poner(caja, [bx, a.y, -0.28], [0, 0, (r() - 0.5) * 0.04]);
    partes.push(caja);
  }
  // la tapa de lámina y la piquera oscura con su tabla de vuelo
  const tapa = new THREE.BoxGeometry(0.32, 0.035, 0.23);
  poner(tapa, [bx, -0.055, -0.28], [0, 0, 0.02]);
  pintar(tapa, variar('#8a8579', r, 0.06));
  partes.push(tapa);
  const piquera = new THREE.BoxGeometry(0.16, 0.022, 0.02);
  poner(piquera, [bx, -0.415, -0.175]);
  pintar(piquera, '#3a3026');
  partes.push(piquera);
  const tabla = new THREE.BoxGeometry(0.18, 0.014, 0.05);
  poner(tabla, [bx, -0.435, -0.15], [0.35, 0, 0]);
  pintar(tabla, variar('#a09048', r, 0.08));
  partes.push(tabla);

  // la nube dorada: abejas saliendo de la piquera en arco hacia las flores
  const nAbejas = Math.max(5, Math.round(9 * q));
  for (let i = 0; i < nAbejas; i++) {
    const t = i / (nAbejas - 1);
    const ax = bx + 0.1 + t * 0.42 + (r() - 0.5) * 0.07;
    const ay = -0.38 + Math.sin(t * Math.PI) * (0.3 + r() * 0.1);
    const abeja = new THREE.IcosahedronGeometry(0.013 + r() * 0.005, 0);
    poner(abeja, [ax, ay, -0.2], [r(), r(), r()], [1.35, 0.9, 1]);
    pintar(abeja, variar(i % 3 === 2 ? '#3a3026' : '#e0a83c', r, 0.08));
    partes.push(abeja);
  }

  // la pradera florida que las llama (tallos + cabezas de color)
  const coloresFlor = ['#e8e4da', '#e8c04a', '#b9a3cc', '#cc7a5a'];
  const nFlores = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nFlores; i++) {
    const fx = 0.18 + (i / nFlores) * 0.4 + (r() - 0.5) * 0.05;
    const fy = -0.52 + r() * 0.1;
    const alto = 0.08 + r() * 0.08;
    const talloF = new THREE.CylinderGeometry(0.004, 0.005, alto, 4);
    poner(talloF, [fx, fy + alto / 2, -0.24], [0, 0, (r() - 0.5) * 0.3]);
    pintar(talloF, variar('#57744a', r, 0.1));
    partes.push(talloF);
    const cabeza = new THREE.IcosahedronGeometry(0.02 + r() * 0.008, 0);
    poner(cabeza, [fx, fy + alto + 0.015, -0.24]);
    pintar(cabeza, variar(coloresFlor[i % coloresFlor.length], r, 0.08));
    partes.push(cabeza);
  }
  // una mata de sombra al fondo, del lado de la colmena
  partes.push(...mata(r, -0.5, -0.3, -0.3, 1.15, '#3f5a35', '#5c7a46', 4));
  return fusionar(partes, 'vinetaAbejas');
}

/* -------------------------------------------------------------------------- */
/*  Registro                                                                   */
/* -------------------------------------------------------------------------- */

/** Viñeta por id de mundo (data-driven, mismo espíritu del route-registry). */
export const VINETAS_GEOM = {
  valle: vinetaValle,
  cafe: vinetaCafe,
  agua: vinetaAgua,
  sanidad: vinetaSanidad,
  mercado: vinetaMercado,
  animales: vinetaAnimales,
  semillero: vinetaSemillero,
  suelo: vinetaSuelo,
  sierra: vinetaSierra,
  paramo: vinetaParamo,
  lluvia: vinetaLluvia,
  compost: vinetaCompost,
  cacao: vinetaCacao,
  papa: vinetaPapa,
  abejas: vinetaAbejas,
  bosque: (opts) => vinetaValle(opts, 116),
};

/**
 * Construye la geometría de la viñeta de un mundo. Truena si el id no existe:
 * un portal sin viñeta es un bug de datos, no un caso silencioso.
 * @param {string} id
 * @param {{q?: number}} [opts]
 */
export function geomVineta(id, opts = {}) {
  const fn = VINETAS_GEOM[id];
  if (!fn) throw new Error(`vinetasMundos: no hay viñeta para el mundo "${id}"`);
  return fn(opts);
}
