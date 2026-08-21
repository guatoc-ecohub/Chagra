// ── criaturas/luciernaga.js — LUCIÉRNAGA · Familia Lampyridae ───────────────
//
// Mide menos de 2 cm. Como la angelita, el modelo se construye en MILÍMETROS
// (1 unidad = 1 mm) y declara su escala real: la regla del piso dice la verdad
// aunque el bicho se vea del porte de un zapato. ESA era la trampa de esta
// tarea («bicho chico — ojo con la escala»): ni modelarla invisible a tamaño
// real, ni inflarla hasta que deje de ser luciérnaga. La resuelve el atlas,
// que normaliza a su tamaño de escena y deja que la regla cuente los mm.
//
// LA LUZ ES EL PERSONAJE, NO EL CUERPO. Nadie reconoce una luciérnaga por su
// anatomía: la reconoce por el pulso intermitente en la penumbra. Por eso:
//   · la criatura declara `penumbra: true` en el registro y el visor baja el
//     rig a crepúsculo — a un bicho cuya seña es luz propia no se lo juzga a
//     mediodía;
//   · la LINTERNA es una malla aparte con material emisivo, un halo aditivo
//     y una PointLight que alumbra la ramita y el suelo en cada destello: la
//     luciérnaga se ilumina a sí misma, que es como uno la ve en el monte;
//   · el PULSO es la firma: dos latidos de subida rápida y caída lenta, y una
//     pausa larga a oscuras. Un LED que titila parejo no es una luciérnaga.
//     Mismo idioma (color y destello en potencia) que los cocuyos lejanos del
//     valle nocturno (`noche.js` · makeLuciernagas): el mismo ser a dos
//     distancias, no un segundo sistema.
//
// Lo que hace a este bicho ESTE bicho, y está modelado:
//   · ES UN ESCARABAJO, no una mosca: ÉLITROS de cuero blando con margen
//     pálido y costura dorsal, tapando las alas de volar.
//   · PRONOTO en alero: el escudo del tórax cubre la cabeza desde arriba;
//     los OJOS GRANDES apenas asoman por debajo del borde.
//   · LINTERNA VENTRAL: los últimos segmentos del abdomen, pálidos y como de
//     cera cuando está apagada.
//   · ANTENAS filiformes, hacia adelante y algo caídas.
//   · posada en una RAMITA de rastrojo — su sitio real es el borde de monte.
//
// Mira a +X. y=0 es el suelo.

import * as THREE from 'three';
import {
  rng, poner, hueso, pintarPlano, pintarPorVertice, pintarMancha, fusionar,
  hornearPelaje, cuerpoOrganico, tuboCurva, mechon, orejaPetalo, materialPelaje,
  crearAnclas, ruidoFbm, clamp01, suave, suavePaso,
} from '../anatomia.js';
import { crearSer } from '../../../lib3d/creatures/generarSer.js';

const ELITRO   = '#5e4930';   // cuero pardo de las tapas
const ELITRO_2 = '#332615';   // estrías y sombra de la costura
const MARGEN   = '#c09a5e';   // borde pálido del élitro
const PRONOTO  = '#bd7f47';   // el escudo, ocre rosado
const PRONOTO_B = '#dcae6d';  // su borde translúcido
const VIENTRE  = '#4b3623';
const BANDA    = '#2f2115';   // junta de cada segmento
const CERA     = '#efe6c0';   // la linterna APAGADA: pálida, como de cera
const LUZ_FRIA = '#d9f273';   // el mismo verde-amarillo de los cocuyos del valle
const QUITINA  = '#241a10';
const OJO      = '#161009';
const RAMA     = '#4a3a28';
const HOJA     = '#31502a';

const ALT = 10.35;            // la espina del cuerpo, parada sobre la ramita

/* El destello: subida en ~100 ms, caída lenta. Elevado a potencia NO — la
   asimetría ya hace el «latido»; el apagón largo lo pone el período. */
const PERIODO = 3.8;
function destello(u, t0) {
  const d = u - t0;
  if (d < 0) return 0;
  if (d < 0.10) return suave(d / 0.10);
  return Math.exp(-(d - 0.10) / 0.30);
}
function pulsoLuz(t) {
  const u = t % PERIODO;
  // dos latidos y una pausa larga a oscuras; brasa mínima para que la
  // linterna nunca desaparezca del todo del encuadre
  return Math.max(0.05, Math.max(destello(u, 0.35), destello(u, 1.30) * 0.9));
}

/* Halo radial en canvas: aditivo, sin textura descargada. */
function texturaHalo() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(238,255,190,0.95)');
  grad.addColorStop(0.25, 'rgba(217,242,115,0.55)');
  grad.addColorStop(0.60, 'rgba(180,220,90,0.16)');
  grad.addColorStop(1.0, 'rgba(160,200,80,0.0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function construirLuciernaga() {
  const r = rng(2407);
  const cuerpo = [];    // lo quitinoso del bicho, se fusiona
  const planta = [];    // ramita + hojas (se fusionan aparte: otra rugosidad)
  const A = crearAnclas();
  const G = new THREE.Group();
  G.name = 'luciernaga';

  /* Pivote de brisa en la base de la ramita: la ramita cabecea con el bicho
     encima; el montículo del suelo NO se mueve. */
  const BASE = [-9.5, 0, -3.2];
  const vaiven = new THREE.Group();
  vaiven.name = 'vaiven';
  vaiven.position.set(BASE[0], BASE[1], BASE[2]);
  const dentro = new THREE.Group();
  dentro.position.set(-BASE[0], -BASE[1], -BASE[2]);
  vaiven.add(dentro);
  G.add(vaiven);

  /* ── ABDOMEN: visible sobre todo desde abajo y los flancos ────────────── */
  const abdomen = cuerpoOrganico({
    largo: 6.4, nSeg: 56, nRad: 36, semilla: 7, ruido: 0.012,
    espina: () => ALT - 0.20,
    arriba: (t) => 0.30 + 0.45 * suavePaso(0.12, 0.55, t),          // escondido bajo los élitros
    // la cola va LLENA: la linterna es el vientre de los últimos segmentos,
    // no un apéndice colgado de una punta flaca
    abajo: (t) => 0.55 + 0.50 * suavePaso(0.04, 0.40, t) * (1 - 0.25 * suavePaso(0.78, 1, t)),
    lado: (t) => 0.55 + 0.80 * suavePaso(0.06, 0.5, t) * (1 - 0.20 * suavePaso(0.80, 1, t)),
  });
  abdomen.translate(-3.7, 0, 0);            // la punta cae en x≈−6.9
  {
    const cBase = new THREE.Color(VIENTRE), cBan = new THREE.Color(BANDA);
    const cCera = new THREE.Color('#e9dfb2');
    const bandas = [-1.4, -2.5, -3.6, -4.7, -5.8];
    pintarPorVertice(abdomen, (x, y, z, i, c) => {
      let d = 9;
      for (const b of bandas) d = Math.min(d, Math.abs(x - b));
      c.copy(cBase).lerp(cBan, (1 - suavePaso(0.05, 0.18, d)) * 0.7);
      // hacia la cola y por debajo, la piel se aclara hasta la cera de la linterna
      const haciaLinterna = suavePaso(3.5, 4.9, -x) * suavePaso(0.2, 0.9, ALT - y);
      return c.lerp(cCera, haciaLinterna * 0.85);
    });
  }
  cuerpo.push(abdomen);

  /* ── ÉLITROS: las tapas de cuero. Costura al centro, margen pálido ────── */
  let elitroDer = null;
  for (const s of [1, -1]) {
    const el = cuerpoOrganico({
      largo: 9.0, nSeg: 64, nRad: 26, semilla: 11 + s, ruido: 0.008,
      espina: (t) => ALT + 0.30 + 0.10 * Math.sin(Math.PI * t) - 0.22 * suavePaso(0.82, 1, t),
      arriba: (t) => 0.80 * suavePaso(0, 0.09, t) * (1 - 0.50 * suavePaso(0.82, 1, t)),
      abajo: (t) => 0.26 * suavePaso(0, 0.09, t),
      lado: (t) => 1.15 * suavePaso(0, 0.07, t) * (1 - 0.38 * suavePaso(0.86, 1, t)),
    });
    // nace centrado: correr a x −6.8..+2.2 y abrir a su costado con leve techo
    poner(el, [-2.3, 0.12, s * 1.12], [s * -0.09, 0, 0]);
    {
      const cEl = new THREE.Color(ELITRO), cOscuro = new THREE.Color(ELITRO_2);
      const cMar = new THREE.Color(MARGEN), cSeam = new THREE.Color('#1c140c');
      pintarPorVertice(el, (x, y, z, i, c) => {
        // estrías longitudinales: frecuencia alta a lo ancho, baja a lo largo
        const n = ruidoFbm(x * 0.55, y * 1.6, z * 7.5);
        c.copy(cEl).lerp(cOscuro, clamp01((n - 0.42) * 1.5));
        c.lerp(cMar, suavePaso(1.78, 2.22, s * z) * 0.85);       // margen externo
        return c.lerp(cSeam, 1 - suavePaso(0.10, 0.42, s * z));  // costura dorsal
      });
    }
    cuerpo.push(el);
    if (s === 1) elitroDer = el;
  }
  A.marca('elitros', elitroDer, { modo: 'extremo', dir: [0.05, 1, 0.35] });

  /* ── PRONOTO: el alero que tapa la cabeza ─────────────────────────────── */
  const pronoto = poner(new THREE.SphereGeometry(1, 42, 30),
    [3.7, ALT + 0.30, 0], [0, 0, -0.05], [2.30, 0.78, 2.10]);
  {
    const cP = new THREE.Color(PRONOTO), cB = new THREE.Color(PRONOTO_B);
    pintarPorVertice(pronoto, (x, y, z, i, c) => {
      const e = Math.hypot((x - 3.7) / 2.30, z / 2.10);
      const n = (ruidoFbm(x * 2.2, y * 2.2, z * 2.2) - 0.5) * 0.08;
      return c.copy(cP).lerp(cB, clamp01(suavePaso(0.74, 0.97, e) + n));
    });
  }
  pintarMancha(pronoto, [3.45, ALT + 1.05, 0], 1.15, '#33231a', {
    dureza: 0.5, ruido: 0.15, semilla: 6, fuerza: 0.9,
    donde: (x, y) => y > ALT + 0.45,
  });
  cuerpo.push(pronoto);

  /* ── CABEZA bajo el alero · OJOS GRANDES asomados ─────────────────────── */
  cuerpo.push(pintarPlano(
    poner(new THREE.SphereGeometry(1, 30, 22), [5.1, ALT - 0.25, 0], [0, 0, 0], [0.85, 0.72, 0.95]),
    QUITINA));
  let ojoDer = null;
  for (const s of [1, -1]) {
    const ojo = poner(new THREE.SphereGeometry(1, 26, 20),
      [5.45, ALT - 0.30, s * 0.62], [0, 0, 0.1], [0.62, 0.66, 0.58]);
    cuerpo.push(pintarPlano(ojo, OJO));
    if (s === 1) ojoDer = ojo;
    // la lumbrera: sin ese brillo un ojo oscuro desaparece en la penumbra
    cuerpo.push(pintarPlano(
      poner(new THREE.SphereGeometry(0.13, 10, 8), [5.72, ALT - 0.10, s * 0.72], [0, 0, 0.3], [1.3, 0.8, 0.9]),
      '#9aa6b4'));
  }
  A.marca('ojos', ojoDer, { modo: 'centro' });
  // mandíbulas mínimas
  cuerpo.push(pintarPlano(
    poner(new THREE.SphereGeometry(0.16, 10, 8), [5.85, ALT - 0.62, 0], [0, 0, -0.4], [1.3, 0.6, 0.9]),
    '#3a2a18'));

  /* ── ANTENAS filiformes, adelante y algo caídas ───────────────────────── */
  let antenaDer = null;
  for (const s of [1, -1]) {
    const ant = tuboCurva([
      [5.7, ALT - 0.50, s * 0.28],
      [6.6, ALT - 0.75, s * 0.75],
      [7.5, ALT - 1.05, s * 1.15],
      [8.3, ALT - 1.15, s * 1.50],
      [9.0, ALT - 1.35, s * 1.85],
    ], (t) => 0.075 - 0.042 * t, { segs: 26, radial: 8 });
    cuerpo.push(pintarPlano(ant, '#2a1e12'));
    if (s === 1) antenaDer = ant;
  }
  A.marca('antenas', antenaDer, { modo: 'extremo', dir: [1, -0.35, 0.55] });

  /* ── SEIS PATAS agarradas a la ramita ─────────────────────────────────── */
  for (const s of [1, -1]) {
    // delantera (bajo el pronoto)
    cuerpo.push(pintarPlano(hueso([3.4, ALT - 0.80, s * 0.75], [4.1, 9.1, s * 1.35], 0.17, 0.12, 8), '#4a3823'));
    cuerpo.push(pintarPlano(hueso([4.1, 9.1, s * 1.35], [4.4, 8.55, 0.75 + s * 0.48], 0.11, 0.07, 7), '#3a2c18'));
    cuerpo.push(pintarPlano(hueso([4.4, 8.55, 0.75 + s * 0.48], [4.8, 8.42, 0.75 + s * 0.60], 0.06, 0.035, 6), '#241a10'));
    // media
    cuerpo.push(pintarPlano(hueso([1.6, ALT - 0.82, s * 0.85], [1.8, 9.0, s * 1.50], 0.18, 0.12, 8), '#4a3823'));
    cuerpo.push(pintarPlano(hueso([1.8, 9.0, s * 1.50], [1.7, 8.60, 0.25 + s * 0.52], 0.11, 0.07, 7), '#3a2c18'));
    cuerpo.push(pintarPlano(hueso([1.7, 8.60, 0.25 + s * 0.52], [1.5, 8.48, 0.25 + s * 0.66], 0.06, 0.035, 6), '#241a10'));
    // trasera
    cuerpo.push(pintarPlano(hueso([-0.4, ALT - 0.80, s * 0.90], [-1.6, 8.95, s * 1.60], 0.18, 0.13, 8), '#4a3823'));
    cuerpo.push(pintarPlano(hueso([-1.6, 8.95, s * 1.60], [-2.6, 8.62, -0.15 + s * 0.50], 0.11, 0.07, 7), '#3a2c18'));
    cuerpo.push(pintarPlano(hueso([-2.6, 8.62, -0.15 + s * 0.50], [-3.0, 8.50, -0.15 + s * 0.62], 0.06, 0.035, 6), '#241a10'));
  }

  /* ── fusión del bicho + AO. Rim FRÍO de luna, no el cálido diurno ─────── */
  const quitina = hornearPelaje(fusionar(cuerpo, 'luciernaga-cuerpo'), {
    yBajo: 8.3, yAlto: 11.8, ao: 0.30, moteado: 0.05, semilla: 5, cielo: 0.22, freq: 1.5,
  });
  const mallaCuerpo = new THREE.Mesh(quitina, materialPelaje({
    roughness: 0.52, metalness: 0.05, rim: 0.30, filo: 3.2, calido: [0.72, 0.82, 1.0],
  }));
  mallaCuerpo.castShadow = true;
  dentro.add(mallaCuerpo);

  /* ── LA LINTERNA: malla aparte, con material propio que late ──────────── */
  const placas = [];
  placas.push(pintarPlano(
    poner(new THREE.SphereGeometry(1, 28, 20), [-4.3, ALT - 0.72, 0], [0, 0, 0.05], [1.05, 0.50, 1.18]),
    CERA));
  placas.push(pintarPlano(
    poner(new THREE.SphereGeometry(1, 24, 18), [-5.5, ALT - 0.66, 0], [0, 0, 0.10], [0.78, 0.44, 0.95]),
    CERA));
  const geoLinterna = fusionar(placas, 'luciernaga-linterna');
  const matLinterna = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.45, metalness: 0.0,
    emissive: new THREE.Color(LUZ_FRIA), emissiveIntensity: 0.3,
  });
  const mallaLinterna = new THREE.Mesh(geoLinterna, matLinterna);
  dentro.add(mallaLinterna);
  A.marca('linterna', geoLinterna, { modo: 'extremo', dir: [0, -1, 0] });

  /* halo doble: uno pegado a la linterna y otro grande de atmósfera */
  const texHalo = texturaHalo();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texHalo, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  halo.position.set(-4.9, ALT - 1.15, 0);
  halo.renderOrder = 4;
  dentro.add(halo);
  const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texHalo, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  halo2.position.copy(halo.position);
  halo2.renderOrder = 4;
  dentro.add(halo2);

  /* la luz de verdad: alumbra la ramita y el suelo en cada destello.
     three r160, luz física: intensidad en candelas, decay 2. */
  const luz = new THREE.PointLight(new THREE.Color(LUZ_FRIA), 0, 0, 2);
  luz.position.set(-4.9, ALT - 1.5, 0);
  dentro.add(luz);

  /* ── LA RAMITA con sus hojas ──────────────────────────────────────────── */
  const rama = tuboCurva([
    BASE,
    [-7.4, 4.0, -2.2],
    [-4.2, 7.4, -0.9],
    [-0.5, 8.28, 0.0],
    [3.8, 8.10, 0.6],
    [6.6, 7.35, 1.3],
    [8.6, 5.9, 2.1],
  ], (t) => 0.78 - 0.52 * t, { segs: 64, radial: 12 });
  pintarPorVertice(rama, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 1.6, y * 1.6, z * 1.6);
    return c.set(RAMA).lerp(new THREE.Color('#6b5a40'), clamp01((n - 0.42) * 1.6));
  });
  // liquen: parches pálidos que hacen de la ramita una ramita y no un tubo
  pintarMancha(rama, [-6.2, 5.4, -1.8], 1.3, '#8fa08a', { dureza: 0.4, ruido: 0.3, semilla: 21, fuerza: 0.55 });
  pintarMancha(rama, [1.8, 8.15, 0.3], 1.0, '#93a48c', { dureza: 0.4, ruido: 0.3, semilla: 27, fuerza: 0.45 });
  planta.push(rama);

  for (const [attach, dir, largo, ancho] of [
    [[-6.8, 4.4, -2.0], [-0.35, -0.8, -0.4], 3.2, 1.4],
    [[6.4, 7.15, 1.2], [0.8, -0.6, 0.6], 2.8, 1.25],
  ]) {
    const hoja = orejaPetalo(attach, dir, largo, ancho, 0.12);
    pintarPorVertice(hoja, (x, y, z, i, c) => {
      const n = ruidoFbm(x * 2.4, y * 2.4, z * 2.4);
      return c.set('#3d6132').lerp(new THREE.Color('#57854a'), clamp01((n - 0.4) * 1.5));
    });
    planta.push(hoja);
  }

  const geoPlanta = hornearPelaje(fusionar(planta, 'luciernaga-planta'), {
    yBajo: 0, yAlto: 8.8, ao: 0.35, moteado: 0.08, semilla: 12, cielo: 0.18, piso: 0.2, freq: 1.2,
  });
  const mallaPlanta = new THREE.Mesh(geoPlanta, materialPelaje({
    roughness: 0.86, rim: 0.10, filo: 4.0, calido: [0.72, 0.82, 1.0],
  }));
  mallaPlanta.castShadow = true;
  mallaPlanta.receiveShadow = true;
  dentro.add(mallaPlanta);

  /* ── EL SUELO de donde sale: montículo con pasto (fuera del vaivén) ───── */
  const suelo = [];
  const monticulo = poner(new THREE.SphereGeometry(1, 36, 24), [BASE[0], -0.9, BASE[2]], [0, 0, 0], [3.2, 1.1, 3.0]);
  pintarPorVertice(monticulo, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 1.4, y * 1.4, z * 1.4);
    return c.set('#241c12').lerp(new THREE.Color('#2f4022'), clamp01((n - 0.35) * 1.6));
  });
  suelo.push(monticulo);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    const px = BASE[0] + Math.cos(a) * (0.9 + r() * 1.4);
    const pz = BASE[2] + Math.sin(a) * (0.9 + r() * 1.3);
    suelo.push(pintarPlano(
      mechon([px, 0.05, pz], [Math.cos(a) * 0.25, 1, Math.sin(a) * 0.25], 1.5 + r() * 1.3, 0.24, 5),
      '#2c4420'));
  }
  const geoSuelo = hornearPelaje(fusionar(suelo, 'luciernaga-suelo'), {
    yBajo: -0.4, yAlto: 3.2, ao: 0.30, moteado: 0.1, semilla: 17, cielo: 0.15, piso: 0.15, freq: 1.3,
  });
  const mallaSuelo = new THREE.Mesh(geoSuelo, materialPelaje({ roughness: 0.9, rim: 0.08, filo: 4.2 }));
  mallaSuelo.receiveShadow = true;
  G.add(mallaSuelo);

  return crearSer({
    especie: 'luciernaga',
    reino: 'animal',
    estilo: 'naturalista',
    nivelDetalle: 2,
    grupo: G,
    // 1 unidad del modelo = 1 mm de bicho real
    metrosPorUnidad: 0.001,
    animar: (t) => {
      const k = pulsoLuz(t);
      matLinterna.emissiveIntensity = 0.35 + 5.0 * k;
      luz.intensity = 2.6 * k * k;                    // al cuadrado: destello, no lámpara
      halo.material.opacity = 0.95 * k;
      const s1 = 7.5 * (0.72 + 0.5 * k);
      halo.scale.set(s1, s1, 1);
      halo2.material.opacity = 0.34 * k;
      const s2 = 16.0 * (0.8 + 0.3 * k);
      halo2.scale.set(s2, s2, 1);
      // la brisa cabecea la ramita entera; el bicho va montado
      vaiven.rotation.z = Math.sin(t * 0.85) * 0.010 + Math.sin(t * 1.9) * 0.004;
      vaiven.rotation.x = Math.sin(t * 0.6 + 1.2) * 0.006;
    },
    puntos: [
      {
        id: 'linterna', etiqueta: 'La linterna del abdomen',
        descripcion: 'Los últimos segmentos del abdomen son una linterna: ahí adentro una reacción química hace luz fría, casi sin calor. Con ese destello se hablan — cada quien enciende y apaga a su ritmo, y así se encuentran en la oscuridad. Apagada se ve pálida, como de cera.',
        posicion: A.punto('linterna'),
      },
      {
        id: 'elitros', etiqueta: 'Élitros',
        descripcion: 'Es un escarabajo, no una mosca: el primer par de alas son estas tapas de cuero blando, con su margen claro y la costura por la mitad del lomo. Debajo van plegadas las alas de volar; para despegar levanta las tapas y el cuerpo queda colgando del zumbido.',
        posicion: A.punto('elitros'),
      },
      {
        id: 'ojos', etiqueta: 'Ojos grandes',
        descripcion: 'Ojos grandes para un mundo casi a oscuras: con ellos busca los destellos de las otras entre el pasto. La cabeza va escondida debajo del escudo del tórax, como bajo un alero — de arriba casi no se le ve cara.',
        posicion: A.punto('ojos'),
      },
      {
        id: 'antenas', etiqueta: 'Antenas',
        descripcion: 'Filiformes, hacia adelante y un poco caídas. Con ellas huele y tantea la noche: entre destello y destello son las que van leyendo el aire, el rastro de las otras y el borde de la hoja donde está parada.',
        posicion: A.punto('antenas'),
      },
    ],
    ficha: {
      nombreComun: 'Luciérnaga',
      nombreCientifico: 'Familia Lampyridae',
      rol: 'Se enciende cuando algo vale la pena mirar de cerca. Es un escarabajo, no una mosca: la luz la hace en el abdomen con una reacción química, casi sin calor, y con ella se habla con las otras. Donde hay luciérnaga hay poca luz artificial y poco veneno.',
      pisoTermico: '',
      riesgo: '',
    },
  });
}
