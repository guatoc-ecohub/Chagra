/*
 * floraCana.geom — la GEOMETRÍA del CAÑAVERAL panelero (tierra caliente andina).
 *
 * La caña es una GRAMÍNEA GIGANTE, y ese es el dato que manda todo el dibujo:
 * una caña madura de trapiche le pasa MUY por encima a una persona. Aquí la mata
 * mide entre 3,4 y 4,7 m — dos veces y media un adulto — para que entrar a un
 * pasillo entre surcos se sienta como entrar a un corredor con techo de hojas.
 * Si esta escala se rompe, el mundo entero deja de ser un cañaveral.
 *
 * Cada pieza con su identidad inequívoca:
 *
 *   · Mata (cepa) de caña   — la caña NO nace de a un tallo: macolla. Cada mata
 *     (Saccharum officinarum)  es un manojo de 6–9 tallos que salen del mismo
 *                              pie y se abren en abanico. Por eso el cañaveral
 *                              se lee como MASA y no como fila de palos.
 *   · Tallo con NUDOS        — la firma de la caña: el tallo viene segmentado en
 *     y ENTRENUDOS             entrenudos (~20 cm) separados por un nudo que se
 *                              ENGRUESA un poco y se ve MÁS PÁLIDO (el anillo
 *                              nodal ceroso, con su yema). Va horneado en la
 *                              geometría: bulto de radio + anillo claro.
 *   · Hoja larga acintada    — cinta de más de un metro, con la NERVADURA
 *                              CENTRAL pálida marcada, doblada en V a lo largo
 *                              de esa nervadura, que se arquea y se cae de punta.
 *                              Nacen alternas en DOS filas opuestas (dístico),
 *                              como toda gramínea.
 *   · Chala (hoja seca)      — el tercio bajo/medio de la caña va vestido de
 *                              hoja SECA colgando pegada al tallo. Sin esto un
 *                              cañaveral parece bambú; con esto, parece caña.
 *   · Penacho o güin         — la panícula plumosa, plateada, cuando la caña
 *                              espiga. Rompe la silueta por arriba y es lo que
 *                              atrapa la luz de la tarde.
 *
 * TÉCNICA tier-safe (mismo contrato que floraCafetal.geom): cada pieza se FUSIONA
 * en UNA geometría con el color horneado en vertexColors, y se dibuja con UN
 * InstancedMesh. Los TALLOS se pintan en escala CLARA casi neutra a propósito:
 * el color por instancia (setColorAt) es el que decide la VARIEDAD — caña verde,
 * caña morada o caña rayada conviven en el mismo lote, como en la finca. Las
 * hojas van en su propio mesh (siempre verdes) para que el morado del tallo no
 * les manche el follaje.
 *
 * Hay DOS variantes de mata (una alta y delgada, otra más baja y tupida) para
 * que el lote no se lea como una plantilla repetida: variante + giro + escala +
 * variedad dan un cañaveral que no se repite a ojo.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO al mezclar geometrías indexadas
 * con no-indexadas: TODO pasa por `fusionarSeguro`, que desindexa, valida los
 * atributos y TRUENA con el nombre de la pieza si falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import {
  rng,
  ruidoFbm,
  fusionarSeguro,
  poner,
  pintarPorVertice,
  pintarPlano,
  tuboOrganico,
  matojoHoja,
} from '../bosque/sombreadoVegetal.js';

/* -------------------------------------------------------------------------- */
/*  La vega cañera (la geografía del mundo, determinista)                      */
/* -------------------------------------------------------------------------- */

export const ANCHO = 48; // x: -24 … 24
export const FONDO = 44; // z: -22 (la loma del fondo) … 22 (el frente, la llegada)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma vega siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.7 + wz * 0.55) * 0.5 +
    Math.sin(wx * 1.7 - wz * 1.3 + 1.7) * 0.3 +
    Math.sin(wx * 2.9 + wz * 2.4 + 4.4) * 0.2
  );
}

/* El sitio de la enramada del trapiche: aplanado a pala, como en la finca real
   (el trapiche se para en PLANO — con la hornilla en desnivel no se trabaja). */
export const SITIO_TRAPICHE = /** @type {[number, number]} */ ([10.5, 2.0]);
const PLANO_TRAPICHE = { cx: 10.5, cz: 2.0, rx: 8.4, rz: 7.0, y: 0.34 };

/**
 * La altura de la vega en un punto. La caña de trapiche se siembra en tierra
 * caliente de vega y falda baja: casi plana adelante, con la loma subiendo al
 * fondo. Bajo la enramada se aplana del todo (la era del trapiche).
 */
export function alturaVega(wx, wz) {
  const sube = smoothstep(2, -20, wz); // 0 al frente, 1 contra la loma del fondo
  let h = 0.1;
  h += sube * 3.6;
  h += ruido(wx * 0.42, wz * 0.42) * 0.34 * (0.35 + sube);
  // la era aplanada del trapiche: una meseta suave, no un escalón
  const d = Math.max(
    Math.abs(wx - PLANO_TRAPICHE.cx) / PLANO_TRAPICHE.rx,
    Math.abs(wz - PLANO_TRAPICHE.cz) / PLANO_TRAPICHE.rz,
  );
  const era = smoothstep(1.25, 0.72, d);
  return h * (1 - era) + PLANO_TRAPICHE.y * era;
}

/** ¿Este punto cae dentro de la era del trapiche? (ahí no se siembra caña). */
export function enLaEra(wx, wz, margen = 1.06) {
  const d = Math.max(
    Math.abs(wx - PLANO_TRAPICHE.cx) / (PLANO_TRAPICHE.rx * margen),
    Math.abs(wz - PLANO_TRAPICHE.cz) / (PLANO_TRAPICHE.rz * margen),
  );
  return d < 1;
}

/* El camino de llegada: entra por el frente y sube hasta la era del trapiche. */
export const caminoX = (wz) => 10.5 + Math.sin(wz * 0.19) * 2.1 - smoothstep(6, 20, wz) * 1.4;

/** La altura del piso de la era (todo el trapiche se para en este plano). */
export const Y_ERA = PLANO_TRAPICHE.y;

/**
 * Pasa un punto en coordenadas LOCALES del trapiche a coordenadas del mundo.
 * La enramada se arma alrededor de su propio origen (ver trapiche.geom) y se
 * planta en `SITIO_TRAPICHE`; esta es la única conversión, para que la lección,
 * el fuego y la cámara no tengan que repetir la cuenta y desalinearse.
 */
export const enTrapiche = (lx, ly, lz) =>
  /** @type {[number,number,number]} */ ([
    SITIO_TRAPICHE[0] + lx,
    PLANO_TRAPICHE.y + ly,
    SITIO_TRAPICHE[1] + lz,
  ]);

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Las CEPAS del lote (cada una ya trae 7–8 tallos, así que la cuenta real de
 * tallos es ~7×). Van repartidas en dos calidades, y ese reparto es lo que hace
 * viable el mundo:
 *
 *   · CERCA — las que la cámara pisa de verdad: el pasillo por donde entra la
 *     lección y el frente del lote que mira al plano general. Van con todo el
 *     detalle, porque a ochenta centímetros se le ven los nudos al tallo.
 *   · LEJOS — el resto del lote. A quince metros nadie le cuenta los nudos a
 *     una caña: bastan un tubo de dieciséis anillos y la mitad de las hojas.
 *
 * Sin este reparto había que elegir entre un cañaveral RALO con detalle o uno
 * denso que no corre. Con él caben más del doble de cepas por MENOS triángulos
 * que antes — y el pasillo del paso 1, que era lo que importaba, queda tupido.
 */
export const FLORA_CANA = {
  alto: { mataCerca: 140, mataLejos: 76, penacho: 46, hojarasca: 22, piedra: 8, matojo: 26 },
  medio: { mataCerca: 68, mataLejos: 36, penacho: 24, hojarasca: 12, piedra: 5, matojo: 14 },
  bajo: { mataCerca: 24, mataLejos: 14, penacho: 9, hojarasca: 6, piedra: 3, matojo: 6 },
};

/* El detalle geométrico de cada calidad de cepa. `tubular` es lo caro y lo que
   decide si el NUDO se ve: con ~20 nudos en 4 m hacen falta 2+ anillos por nudo
   o la banda nodal se aliasea. Alrededor, 4 lados sobran en un tallo de 3 cm. */
export const DETALLE = {
  cerca: { tubular: 44, radial: 4, hojas: 1, chala: 1, filasHoja: 8, filasChala: 6 },
  lejos: { tubular: 16, radial: 4, hojas: 0.5, chala: 0.42, filasHoja: 5, filasChala: 4 },
};

/*
 * LA ZONA CERCANA: dónde vale la pena gastar triángulos. Es el pasillo que
 * recorre el paso 1 más el frente del lote que entra en el plano general, y la
 * manchita de la derecha junto al camino de llegada. Todo lo demás es fondo.
 */
export const enZonaCerca = (x, z) =>
  (x > -15.5 && x < 1 && z > -9.5 && z < 13.5) || (x > 15.8 && z > -3 && z < 12.5);

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const canaDeTier = (tier) => FLORA_CANA[tier] || FLORA_CANA.medio;

/** Factor de detalle geométrico por tier (menos tallos y hojas por mata). */
export const CALIDAD_CANA = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadCana = (tier) => CALIDAD_CANA[tier] ?? CALIDAD_CANA.medio;

/*
 * Las MALLAS de cepa que se construyen por tier: una por (variante × calidad).
 * Dos variantes de mata (una alta y delgada, otra más baja y tupida) por dos
 * calidades. La variante es lo que evita que el lote se lea como plantilla; la
 * calidad es lo que lo hace correr. En gama frugal se cae a una sola variante, y
 * en gama baja a una sola malla.
 *
 * @param {string} tier
 * @returns {{v: number, detalle: 'cerca'|'lejos'}[]}
 */
export function mallasDeTier(tier) {
  if (tier === 'alto') {
    return [
      { v: 0, detalle: 'cerca' },
      { v: 1, detalle: 'cerca' },
      { v: 0, detalle: 'lejos' },
      { v: 1, detalle: 'lejos' },
    ];
  }
  if (tier === 'bajo') return [{ v: 0, detalle: 'lejos' }];
  return [
    { v: 0, detalle: 'cerca' },
    { v: 0, detalle: 'lejos' },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Paleta del cañaveral (colores horneados en vertexColors)                   */
/* -------------------------------------------------------------------------- */

export const PAL = {
  /* EL TALLO va casi NEUTRO a propósito: el color real lo pone la VARIEDAD por
     instancia. Lo que sí se hornea es la ESTRUCTURA — el entrenudo un punto más
     oscuro que el nudo, para que el anillo nodal se lea siempre. */
  tallo: '#d8d2c2', // cuerpo del entrenudo (base neutra que la variedad tiñe)
  talloNudo: '#f4efe2', // el anillo del nudo: ceroso, SIEMPRE más pálido
  talloRaya: '#bfb7a4', // la veta longitudinal (la que hace la caña "rayada")
  talloPie: '#8f8877', // el pie sucio de la mata, entre hoja seca y tierra

  /* LA HOJA verde: cinta con la nervadura pálida marcada. */
  hoja: '#4f8a34', // verde de trabajo de la hoja de caña
  hojaSol: '#84ac3e', // la cara que da al sol
  hojaSombra: '#2f5c2a', // el fondo del manojo, donde no entra luz
  nervadura: '#c3d489', // la nervadura central pálida — la firma de la gramínea
  hojaPunta: '#9a9a4a', // la punta que ya se está secando

  /* LA CHALA: la hoja seca que viste el tallo. Paja, no café. */
  chala: '#b9964f',
  chalaClara: '#d8bd7c',
  chalaOscura: '#8a6a34',

  /* EL PENACHO (güin): panícula plumosa, plateada contra la luz. */
  penachoEje: '#c9b98e',
  penacho: '#e5ddc6',
  penachoLuz: '#f6f0dd',

  /* El suelo del cañaveral: hoja caída y terrones. */
  hojarasca: '#9a7c42',
  hojarascaSeca: '#c0a165',
  piedra: '#9a8b74',
  matojo: '#6f8c3c', // la arvense que vive en la calle del surco
};

/*
 * LAS VARIEDADES que conviven en un lote panelero campesino. El campesino no
 * siembra un monocultivo clonal: mezcla la que le rinde con la criolla que
 * heredó. Cada tinte MULTIPLICA el tallo neutro horneado arriba.
 *
 * (Los nombres son los de finca — verde, morada, rayada, amarilla —, no nombres
 * de variedad registrada: no vamos a afirmar un cultivar que no verificamos.)
 */
export const VARIEDADES = [
  { id: 'verde', tinte: [0.60, 0.74, 0.38], peso: 0.34 },
  { id: 'amarilla', tinte: [0.86, 0.78, 0.40], peso: 0.24 },
  { id: 'morada', tinte: [0.55, 0.30, 0.42], peso: 0.22 },
  { id: 'rayada', tinte: [0.78, 0.56, 0.40], peso: 0.20 },
];

/** Elige una variedad con el peso declarado, de forma determinista. */
export function variedadPara(u) {
  let acc = 0;
  for (let i = 0; i < VARIEDADES.length; i++) {
    acc += VARIEDADES[i].peso;
    if (u <= acc) return VARIEDADES[i];
  }
  return VARIEDADES[0];
}

/* -------------------------------------------------------------------------- */
/*  Piezas: la HOJA ACINTADA                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Una hoja de caña: cinta larga, doblada en V sobre su nervadura central, que
 * sale hacia arriba, se arquea y se CAE de punta. Se construye como una malla
 * de 3 columnas (borde · nervadura · borde) × N filas a lo largo — así la
 * nervadura puede pintarse pálida y el doblez existe de verdad en la geometría.
 *
 * La hoja sale sobre el eje +X, con la nervadura hacia arriba en +Y.
 *
 * @param {object} o
 * @param {number} o.largo    largo de la cinta (m). Una hoja madura pasa de 1 m.
 * @param {number} o.ancho    semiancho máximo (m).
 * @param {number} [o.caida]  cuánto se desploma la punta (0 recta … 1 colgando).
 * @param {number} [o.doblez] profundidad de la V sobre la nervadura.
 * @param {number} [o.torsion] giro acumulado de la sección hacia la punta (rad).
 * @param {number} [o.lateral] curvatura fuera del plano (la hoja no es plana).
 * @param {number} [o.filas]  segmentos a lo largo (detalle por tier).
 * @param {boolean} [o.seca]  paleta de CHALA en vez de hoja verde.
 * @param {number} [o.semilla]
 */
export function geomHojaCana(o) {
  const largo = o.largo;
  const ancho = o.ancho;
  const caida = o.caida ?? 1;
  const doblez = o.doblez ?? 0.34;
  const torsion = o.torsion ?? 0.9;
  const lateral = o.lateral ?? 0.16;
  const filas = Math.max(5, Math.round(o.filas ?? 11));
  const seca = !!o.seca;
  const r = rng((o.semilla ?? 1) * 7 + 3);

  const cBase = new THREE.Color(seca ? PAL.chalaOscura : PAL.hoja);
  const cSol = new THREE.Color(seca ? PAL.chalaClara : PAL.hojaSol);
  const cNerv = new THREE.Color(seca ? PAL.chala : PAL.nervadura);
  const cPunta = new THREE.Color(seca ? PAL.chalaOscura : PAL.hojaPunta);
  const tmp = new THREE.Color();

  const pos = new Float32Array((filas + 1) * 3 * 3);
  const uvs = new Float32Array((filas + 1) * 3 * 2);
  const cols = new Float32Array((filas + 1) * 3 * 3);
  const idx = [];

  // Un pequeño desorden por hoja: ninguna sale igual a la de al lado.
  const jitter = 0.86 + r() * 0.3;

  for (let i = 0; i <= filas; i++) {
    const t = i / filas;
    // Centro de la cinta: sube, se arquea y se desploma. La caña "cae de punta".
    const px = largo * t * (0.98 + 0.04 * Math.sin(t * 5));
    const py = largo * (0.52 * t - 0.92 * caida * t * t * t) * jitter;
    const pz = largo * lateral * Math.sin(t * 2.4) * (0.4 + t);

    // Ancho: angosto en la vaina, máximo al 25 %, y punta de aguja.
    const w =
      ancho *
      Math.pow(1 - t, 0.55) *
      (0.42 + 0.58 * Math.min(1, t * 5.5)) *
      (0.9 + 0.2 * ruidoFbm(t * 6 + (o.semilla ?? 1), 0.5, 0.5));

    // La V se abre en la base y casi se plancha en la punta, con torsión.
    const fold = doblez * w * (1 - 0.55 * t);
    const giro = torsion * t * t;
    const cg = Math.cos(giro);
    const sg = Math.sin(giro);

    for (let j = 0; j < 3; j++) {
      const s = j - 1; // -1 borde, 0 nervadura, +1 borde
      // Offset de la sección: hacia el lado (z) y hundido bajo la nervadura (y).
      const oy = s === 0 ? 0 : -fold;
      const oz = s * w;
      // Torsión: la sección gira alrededor del eje de la hoja.
      const ry = oy * cg - oz * sg;
      const rz = oy * sg + oz * cg;

      const k = (i * 3 + j) * 3;
      pos[k] = px;
      pos[k + 1] = py + ry;
      pos[k + 2] = pz + rz;

      const ku = (i * 3 + j) * 2;
      uvs[ku] = t;
      uvs[ku + 1] = (s + 1) * 0.5;

      /* EL COLOR de la hoja, horneado:
         · la nervadura central va PÁLIDA (la firma de la gramínea);
         · el borde queda más oscuro que el centro (sombra propia del doblez);
         · sube el verde de sol hacia la mitad alta, y la punta amarillea;
         · un ruido suave rompe el plano uniforme. */
      const borde = Math.abs(s);
      tmp.copy(cBase).lerp(cSol, clamp(0.18 + t * 0.55, 0, 1));
      if (borde === 0) tmp.lerp(cNerv, seca ? 0.35 : 0.62);
      else tmp.multiplyScalar(0.82);
      tmp.lerp(cPunta, smoothstep(0.62, 1, t) * (seca ? 0.5 : 0.68));
      const n = ruidoFbm(px * 2.2 + 13, py * 2.2, pz * 2.2);
      tmp.multiplyScalar(0.92 + n * 0.18);

      const kc = (i * 3 + j) * 3;
      cols[kc] = tmp.r;
      cols[kc + 1] = tmp.g;
      cols[kc + 2] = tmp.b;
    }
  }

  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      const b = a + 1;
      const c = a + 3;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* -------------------------------------------------------------------------- */
/*  Piezas: el TALLO con nudos y entrenudos                                    */
/* -------------------------------------------------------------------------- */

/* Largo del entrenudo (m). En caña de trapiche madura anda por ahí; lo que
   importa para el dibujo es que se VEAN unos 18–22 segmentos en 4 m de caña. */
const ENTRENUDO = 0.205;

/**
 * Un tallo de caña: tubo casi vertical, con el radio que ENGRUESA en cada nudo
 * y el color que se ACLARA en el anillo nodal. Se devuelve en el origen (base en
 * y=0, creciendo en +Y) para que el llamador lo coloque dentro de la mata.
 *
 * @param {object} o
 * @param {number} o.altura
 * @param {number} o.radio    radio en la base.
 * @param {number} o.inclina  cuánto se abre respecto a la vertical (rad).
 * @param {number} o.rumbo    hacia dónde se abre (rad, en XZ).
 * @param {number} [o.q]      calidad (detalle) 0..1.
 * @param {{tubular:number, radial:number}} [o.det]  el detalle de la CALIDAD de
 *   cepa (cerca o lejos): cuántos anillos lleva el tubo a lo largo y cuántos
 *   lados alrededor. Es lo que decide si el nudo se ve o se aliasea.
 * @param {number} [o.semilla]
 */
export function geomTalloCana(o) {
  const { altura, radio, inclina, rumbo } = o;
  const q = o.q ?? 1;
  const det = o.det ?? DETALLE.cerca;
  const semilla = o.semilla ?? 1;
  const r = rng(semilla * 11 + 5);

  // La curva del tallo: se abre del pie con la altura y serpentea apenas. Una
  // caña real pelea con el viento y con sus hermanas: no es una vara de metal.
  const n = 6;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const abre = Math.sin(inclina) * altura * t * t * 0.92;
    const serp = 0.045 * altura * Math.sin(t * 3.1 + semilla) * (0.25 + t);
    pts.push(
      new THREE.Vector3(
        Math.cos(rumbo) * abre + Math.cos(rumbo + 1.9) * serp,
        altura * t,
        Math.sin(rumbo) * abre + Math.sin(rumbo + 1.9) * serp,
      ),
    );
  }
  const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);

  /* EL TAPER CON NUDOS — el corazón del dibujo de la caña. El radio decrece
     hacia arriba, pero en cada nudo hay un ANILLO que engorda: por eso la caña
     se ve segmentada aunque no tenga textura. */
  const taper = (t) => {
    const y = t * altura;
    const f = y / ENTRENUDO;
    // 0 justo en el nudo, 1 a mitad del entrenudo.
    const medio = Math.abs(Math.sin(Math.PI * f));
    const bulto = Math.pow(1 - medio, 3); // pico angosto EN el nudo
    const base = radio * (1 - 0.30 * t);
    return Math.max(0.012, base * (1 + 0.17 * bulto));
  };

  /* El tallo necesita anillos a lo largo (y muy pocos alrededor: la caña es
     delgada). Cuántos, lo decide la CALIDAD de la cepa: la de primer plano se
     gana sus 44 anillos porque a ochenta centímetros se le ven los nudos; la
     del fondo se conforma con 16, que a quince metros nadie los cuenta. */
  const tubular = Math.max(8, Math.round(det.tubular * q));
  const radial = det.radial;
  const geo = tuboOrganico(curva, {
    tubular,
    radial,
    taper,
    arruga: 0.035, // la caña es LISA (nada de corteza rugosa de árbol)
    semilla: semilla * 3,
    minRadio: 0.012,
  });

  /* EL COLOR del tallo: neutro claro (la variedad lo tiñe por instancia), con
     el ANILLO NODAL pálido, la veta longitudinal de la caña rayada y el pie
     ensuciado. Se pinta ANTES de colocar el tallo: aquí `y` es altura local. */
  const cCuerpo = new THREE.Color(PAL.tallo);
  const cNudo = new THREE.Color(PAL.talloNudo);
  const cRaya = new THREE.Color(PAL.talloRaya);
  const cPie = new THREE.Color(PAL.talloPie);
  const tmp = new THREE.Color();
  const gruesoAnillo = 0.16 + r() * 0.06;

  pintarPorVertice(geo, (x, y, z) => {
    const f = y / ENTRENUDO;
    const medio = Math.abs(Math.sin(Math.PI * f));
    // El anillo del nudo: banda angosta y clara justo donde engorda el tallo.
    const anillo = smoothstep(gruesoAnillo, 0, medio);
    tmp.copy(cCuerpo).lerp(cNudo, anillo * 0.95);
    // Veta longitudinal: corre A LO LARGO del tallo (mucha frecuencia alrededor,
    // poca en Y). Es lo que en la caña rayada se ve como franjas de color.
    const ang = Math.atan2(z, x);
    const veta = 0.5 + 0.5 * Math.sin(ang * 5 + semilla * 2.1);
    tmp.lerp(cRaya, veta * 0.22 * (1 - anillo));
    // Sombra propia: el lado que mira al corazón de la mata queda en penumbra.
    const lado = 0.5 + 0.5 * Math.cos(ang - rumbo);
    tmp.multiplyScalar(0.72 + 0.28 * lado);
    // El pie de la mata vive entre hoja seca, tierra y sombra.
    tmp.lerp(cPie, smoothstep(0.85, 0.02, y) * 0.6);
    // Un poco de suciedad de campo, para que no se vea plástico.
    const nn = ruidoFbm(x * 5 + 3, y * 1.4, z * 5);
    tmp.multiplyScalar(0.93 + nn * 0.16);
    return tmp;
  });

  return geo;
}

/* -------------------------------------------------------------------------- */
/*  Piezas: el PENACHO (güin)                                                  */
/* -------------------------------------------------------------------------- */

/**
 * La panícula plumosa de la caña espigada: un eje delgado del que salen muchas
 * ramitas finas, abiertas y colgantes, plateadas. No es una espiga compacta: es
 * una PLUMA, y a contraluz es lo más bonito del cañaveral.
 */
export function geomPenachoCana(q = 1, semilla = 41) {
  const r = rng(semilla);
  const partes = [];
  const largo = 0.62 + r() * 0.24;

  // El eje (raquis) que continúa el tallo.
  const eje = new THREE.CylinderGeometry(0.010, 0.016, largo, 5, 1);
  poner(eje, [0, largo * 0.5, 0]);
  partes.push(pintarPlano(eje, PAL.penachoEje));

  // Las ramitas de la pluma: finas, hacia arriba y afuera, cayendo de punta.
  const nRamas = Math.max(10, Math.round(30 * q));
  const cPluma = new THREE.Color(PAL.penacho);
  const cLuz = new THREE.Color(PAL.penachoLuz);
  const tmp = new THREE.Color();

  for (let i = 0; i < nRamas; i++) {
    const t = i / nRamas;
    // Suben en espiral por el eje; las de abajo salen más largas y más abiertas.
    const y0 = largo * (0.16 + 0.84 * t);
    const ang = t * Math.PI * 2 * 3.6 + r() * 0.5;
    const abre = 0.55 + (1 - t) * 0.75;
    const lr = largo * (0.30 + (1 - t) * 0.42) * (0.75 + r() * 0.5);

    const rama = geomHojaCana({
      largo: lr,
      ancho: 0.008 + r() * 0.005,
      caida: 1.25,
      doblez: 0.1,
      torsion: 0.3,
      lateral: 0.22,
      filas: q > 0.8 ? 6 : 4,
      semilla: semilla + i,
    });
    // Pintarla de pluma (no de hoja): plateada, más clara en la punta.
    pintarPorVertice(rama, (x) => {
      const u = clamp(x / Math.max(0.01, lr), 0, 1);
      return tmp.copy(cPluma).lerp(cLuz, u * 0.8);
    });
    poner(rama, [0, y0, 0], [0, -ang, abre * 0.7], [1, 1, 1]);
    partes.push(rama);
  }

  return fusionarSeguro(partes, 'penacho-cana');
}

/* -------------------------------------------------------------------------- */
/*  La MATA: el manojo de tallos con sus hojas y su chala                      */
/* -------------------------------------------------------------------------- */

/*
 * Las dos variantes del lote. La caña no crece pareja: hay cepas que se
 * dispararon y cepas rezagadas, y esa desigualdad es lo que hace que un
 * cañaveral se vea vivo y no estampado.
 */
const VARIANTES_MATA = [
  // 0 — la cepa ALTA: pocos tallos, muy derechos, la que ya se puede cortar.
  { tallos: 7, hMin: 3.9, hMax: 4.7, radio: 0.031, abre: 0.16, hojas: 6, chala: 5 },
  // 1 — la cepa TUPIDA: más tallos, más abiertos y algo más bajos.
  { tallos: 8, hMin: 3.3, hMax: 4.1, radio: 0.029, abre: 0.26, hojas: 5, chala: 6 },
];

export const N_VARIANTES = VARIANTES_MATA.length;

/**
 * Construye UNA variante de mata de caña.
 *
 * Devuelve las tres piezas por separado porque cada una va a su propio
 * InstancedMesh: el TALLO se tiñe con la variedad, la HOJA siempre verde y la
 * CHALA siempre paja. Además devuelve `topes`: dónde quedaron las puntas de los
 * tallos, para que el penacho se pueda sembrar EN una punta y no en el aire.
 *
 * @param {number} v  índice de variante (0…N_VARIANTES-1).
 * @param {{q: number, detalle?: 'cerca'|'lejos'}} o  `detalle` decide cuánta
 *   geometría se gasta: la cepa del pasillo se gana sus 44 anillos por tallo
 *   porque a ochenta centímetros se le ven los nudos; la del fondo, 16.
 * @param {number} semilla
 * @returns {{tallos: THREE.BufferGeometry, hojas: THREE.BufferGeometry,
 *            chala: THREE.BufferGeometry, topes: [number,number,number][],
 *            alto: number}}
 */
export function geomMataCana(v, { q, detalle = 'cerca' }, semilla = 101) {
  const cfg = VARIANTES_MATA[v % VARIANTES_MATA.length];
  const det = DETALLE[detalle] || DETALLE.cerca;
  const r = rng(semilla + v * 37);

  /* El recorte por tier va al CUADRADO de la calidad: la mata es la pieza más
     cara del mundo y en gama frugal hay que bajar de 7–8 tallos a 3 sin
     pensarlo. Con 3 tallos, giro y escala la cepa todavía se lee como macolla.
     El número de TALLOS no baja con la distancia (es la silueta de la cepa: sin
     tallos deja de ser macolla), pero sí bajan las hojas y la chala. */
  const nTallos = Math.max(3, Math.round(cfg.tallos * q * q));
  const nHojas = Math.max(2, Math.round(cfg.hojas * q * det.hojas));
  const nChala = Math.max(1, Math.round(cfg.chala * q * det.chala));

  const partesTallo = [];
  const partesHoja = [];
  const partesChala = [];
  const topes = /** @type {[number,number,number][]} */ ([]);
  let alto = 0;

  for (let i = 0; i < nTallos; i++) {
    // El pie de cada tallo dentro de la cepa: un manojo apretado, no una fila.
    const ang = (i / nTallos) * Math.PI * 2 + r() * 0.9;
    const rad = 0.05 + r() * 0.15;
    const bx = Math.cos(ang) * rad;
    const bz = Math.sin(ang) * rad;

    const altura = cfg.hMin + r() * (cfg.hMax - cfg.hMin);
    const inclina = cfg.abre * (0.35 + r() * 0.85);
    const rumbo = ang + (r() - 0.5) * 0.8;
    const radio = cfg.radio * (0.86 + r() * 0.3);

    const tallo = geomTalloCana({ altura, radio, inclina, rumbo, q, det, semilla: semilla + i * 13 });
    poner(tallo, [bx, 0, bz]);
    partesTallo.push(tallo);

    // Dónde quedó la punta (para colgar hoja, chala y penacho de verdad).
    const abre = Math.sin(inclina) * altura * 0.92;
    const tx = bx + Math.cos(rumbo) * abre;
    const tz = bz + Math.sin(rumbo) * abre;
    topes.push([tx, altura, tz]);
    if (altura > alto) alto = altura;

    /* LAS HOJAS VERDES viven en el tercio de arriba, alternas en DOS filas
       opuestas (dístico, como toda gramínea) y saliendo de los nudos. */
    for (let h = 0; h < nHojas; h++) {
      const u = h / Math.max(1, nHojas - 1);
      const y = altura * (0.60 + 0.38 * u);
      const k = y / altura;
      const hx = bx + Math.cos(rumbo) * (abre * k * k);
      const hz = bz + Math.sin(rumbo) * (abre * k * k);
      // dístico: dos filas opuestas, con el giro del tallo encima
      const lado = h % 2 === 0 ? 0 : Math.PI;
      const giro = rumbo + lado + (r() - 0.5) * 0.55;
      // las de arriba salen más erguidas (el cogollo apunta al cielo)
      const alza = 0.42 + u * 0.55 + (r() - 0.5) * 0.28;

      const hoja = geomHojaCana({
        largo: 1.05 + r() * 0.55,
        ancho: 0.030 + r() * 0.012,
        caida: 1.15 - u * 0.55,
        doblez: 0.34,
        torsion: 0.85 + r() * 0.6,
        lateral: 0.14 + r() * 0.12,
        filas: Math.max(4, Math.round(det.filasHoja * (q > 0.8 ? 1 : 0.75))),
        semilla: semilla + i * 31 + h,
      });
      poner(hoja, [hx, y, hz], [0, -giro, alza]);
      partesHoja.push(hoja);
    }

    /* LA CHALA: hoja SECA colgando pegada al tallo en la mitad baja. Sin esto
       el cañaveral parece un guadual; con esto, parece caña de verdad. */
    for (let c = 0; c < nChala; c++) {
      const u = c / Math.max(1, nChala - 1);
      const y = altura * (0.20 + 0.42 * u);
      const k = y / altura;
      const cx = bx + Math.cos(rumbo) * (abre * k * k);
      const cz = bz + Math.sin(rumbo) * (abre * k * k);
      const giro = rumbo + (c % 2 === 0 ? 0 : Math.PI) + (r() - 0.5) * 0.9;

      const seca = geomHojaCana({
        largo: 0.70 + r() * 0.45,
        ancho: 0.024 + r() * 0.010,
        caida: 1.65, // la hoja seca CUELGA: se desploma casi vertical
        doblez: 0.46, // y se enrolla sobre sí misma al secarse
        torsion: 1.5 + r() * 0.9,
        lateral: 0.10,
        filas: Math.max(3, Math.round(det.filasChala * (q > 0.8 ? 1 : 0.75))),
        seca: true,
        semilla: semilla + i * 17 + c + 400,
      });
      poner(seca, [cx, y, cz], [0, -giro, -0.55 - r() * 0.5]);
      partesChala.push(seca);
    }
  }

  return {
    tallos: fusionarSeguro(partesTallo, `mata-cana-tallos-v${v}`),
    hojas: fusionarSeguro(partesHoja, `mata-cana-hojas-v${v}`),
    chala: fusionarSeguro(partesChala, `mata-cana-chala-v${v}`),
    topes,
    alto,
  };
}

/* -------------------------------------------------------------------------- */
/*  Piezas del suelo                                                           */
/* -------------------------------------------------------------------------- */

/** Hojarasca: la hoja de caña caída que tapiza la calle entre surcos. */
export function geomHojarascaCana(semilla = 61) {
  const r = rng(semilla);
  const partes = [];
  for (let i = 0; i < 5; i++) {
    const h = geomHojaCana({
      largo: 0.55 + r() * 0.4,
      ancho: 0.026,
      caida: 0.15,
      doblez: 0.5,
      torsion: 1.8,
      lateral: 0.3,
      filas: 6,
      seca: true,
      semilla: semilla + i,
    });
    poner(h, [(r() - 0.5) * 0.7, 0.015 + r() * 0.02, (r() - 0.5) * 0.7], [0, r() * Math.PI * 2, 0]);
    partes.push(h);
  }
  return fusionarSeguro(partes, 'hojarasca-cana');
}

/** Piedra de vega: terrón/canto rodado suelto. */
export function geomPiedraCana(semilla = 62) {
  const g = matojoHoja(0.17, semilla, 0.5);
  poner(g, [0, 0.08, 0], [0, 0, 0], [1.25, 0.6, 1.05]);
  return fusionarSeguro([pintarPlano(g, PAL.piedra)], 'piedra-cana');
}

/** Matojo de arvense: la yerba que vive en la calle del surco (y da refugio). */
export function geomMatojoCana(semilla = 63) {
  const r = rng(semilla);
  const partes = [];
  for (let i = 0; i < 7; i++) {
    const h = geomHojaCana({
      largo: 0.26 + r() * 0.2,
      ancho: 0.012,
      caida: 0.9,
      doblez: 0.3,
      torsion: 0.8,
      lateral: 0.2,
      filas: 5,
      semilla: semilla + i * 3,
    });
    poner(h, [(r() - 0.5) * 0.1, 0.02, (r() - 0.5) * 0.1], [0, r() * Math.PI * 2, 0.6 + r() * 0.5]);
    partes.push(h);
  }
  const g = fusionarSeguro(partes, 'matojo-cana');
  return pintarPorVertice(g, (x, y, z, i, c) => c.set(PAL.matojo).multiplyScalar(0.8 + y * 0.9));
}

/* -------------------------------------------------------------------------- */
/*  La SIEMBRA: el lote en surcos                                              */
/* -------------------------------------------------------------------------- */

/* Los surcos de caña SÍ son regulares en la vida real — es un cultivo sembrado
   a chorrillo en surco. Lo que no puede pasar es que la ESCENA se vea de
   plantilla: por eso el surco tiene su ondulación, la distancia entre cepas
   respira, hay claros donde ya cortaron y las variedades se mezclan. */
const SURCO = 1.52; // distancia entre surcos (m) — se camina apretado entre caña
const PASO_CEPA = 1.05; // distancia entre cepas dentro del surco

/* Los tres tablones sembrados del lote. La era del trapiche los parte al medio:
   el cañaveral rodea al trapiche, que es exactamente como se ve en la finca. */
/*
 * Los tablones SEMBRADOS A MANO (instanciados). Son deliberadamente más chicos
 * que el cañaveral que se ve: de ahí para atrás toma el relevo el MURO de fondo,
 * que cuesta mil triángulos y llena el horizonte. Repartir el presupuesto en un
 * lote enorme daba un cañaveral RALO — con la cámara metida en el surco se veían
 * dos matas y el pasillo pelado. Sembrar tupido un área más chica y cerrar
 * atrás con el muro es lo que hace que se sienta cañaveral.
 */
const TABLONES = [
  // el grande de la izquierda: el que la cámara mira de frente y por el que
  // camina la lección
  { x0: -17.5, x1: -1.4, z0: -13, z1: 13.5, giro: 0.06 },
  // el de atrás, subiendo la loma detrás de la enramada
  { x0: 0.5, x1: 19, z0: -13.5, z1: -6.5, giro: -0.05 },
  // la manchita del frente derecho, junto al camino de llegada
  { x0: 16.5, x1: 22.5, z0: -4, z1: 12, giro: 0.03 },
];

/**
 * El eje de un PASILLO entre dos surcos del tablón grande, a la altura `z`.
 *
 * Existe por una razón concreta: la lección mete la cámara a caminar por una
 * calle del cañaveral, y el surco NO es una recta — ondula con el terreno y
 * sesga con el tablón. Una x fija se sale de la calle a los pocos metros y la
 * cámara termina dentro de una cepa. Esta función sale de las MISMAS constantes
 * con las que se siembra (SURCO, TABLONES, la ondulación), así que el pasillo y
 * las matas no se pueden desalinear: una sola cuenta, no dos.
 *
 * @param {number} z    profundidad del mundo.
 * @param {number} [s]  entre qué surco y el siguiente se camina.
 */
export function pasilloCanaveral(z, s = 5) {
  const tb = TABLONES[0];
  const xs = tb.x0 + (s + 0.5) * SURCO; // el centro entre el surco s y el s+1
  return xs + Math.sin(z * 0.17) * 0.42 + z * tb.giro;
}

/**
 * Siembra el lote completo, determinista.
 *
 * Cada cepa cae en UNA de las mallas de `mallas` (variante × calidad). La
 * VARIANTE la decide un ruido de posición (matas vecinas se parecen, como en un
 * lote real donde una zona macolló mejor que otra); la CALIDAD la decide la
 * distancia a donde camina la cámara. Los presupuestos de cerca y lejos son
 * independientes: así el pasillo queda tupido aunque el fondo se ralee.
 *
 * @param {{mataCerca:number, mataLejos:number, penacho:number, hojarasca:number,
 *          piedra:number, matojo:number}} conteos
 * @param {{v:number, detalle:string}[]} mallas  las mallas construidas.
 * @param {[number,number,number][][]} topesPorMalla  puntas de tallo por malla.
 * @param {number} [seed]
 */
export function sembrarCanaveral(conteos, mallas, topesPorMalla, seed = 907) {
  const r = rng(seed);
  const nM = mallas.length;

  const matas = Array.from({ length: nM }, () => []);
  const hojas = Array.from({ length: nM }, () => []);
  const chala = Array.from({ length: nM }, () => []);
  const penacho = [];
  const cPenacho = [0.98, 0.96, 0.9];

  /* A qué malla va una cepa. Si el tier no construyó esa combinación (gama
     frugal o baja), cae en la primera que exista: nunca se pierde una mata por
     no haber malla — se pierde detalle, que es lo barato. */
  const mallaDe = (v, detalle) => {
    const i = mallas.findIndex((m) => m.v === v && m.detalle === detalle);
    if (i >= 0) return i;
    const j = mallas.findIndex((m) => m.detalle === detalle);
    return j >= 0 ? j : 0;
  };

  /* 1) Se recorren los surcos de cada tablón y se apuntan todos los sitios
        posibles, separando los de CERCA de los de LEJOS. */
  const cerca = [];
  const lejos = [];
  TABLONES.forEach((tb, ti) => {
    const nSurcos = Math.floor((tb.x1 - tb.x0) / SURCO);
    for (let s = 0; s <= nSurcos; s++) {
      const xs = tb.x0 + s * SURCO;
      const largo = tb.z1 - tb.z0;
      const nCepas = Math.floor(largo / PASO_CEPA);
      for (let c = 0; c <= nCepas; c++) {
        const zc = tb.z0 + c * PASO_CEPA;
        // el surco no es una recta de tiralíneas: ondula con el terreno
        const x = xs + Math.sin(zc * 0.17 + ti) * 0.42 + zc * tb.giro;
        const z = zc + (r() - 0.5) * 0.34;
        if (enLaEra(x, z)) continue; // la era del trapiche está limpia
        // el camino de llegada se respeta (por ahí entra la caña cortada)
        if (Math.abs(x - caminoX(z)) < 2.3 && z > -2) continue;
        (enZonaCerca(x, z) ? cerca : lejos).push([x, z, ti]);
      }
    }
  });

  // Barajado determinista: al recortar por tier el lote se ralea PAREJO, no se
  // queda media hectárea llena y la otra vacía.
  const barajar = (lista) => {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = lista[i];
      lista[i] = lista[j];
      lista[j] = t;
    }
    return lista;
  };
  barajar(cerca);
  barajar(lejos);

  /*
   * Las cepas de CERCA no se recortan al azar: se gastan EMPEZANDO POR EL
   * PASILLO que camina la lección y abriéndose hacia afuera. Barajar parejo
   * dejaba huecos justo donde la cámara se para — un tramo del pasillo con tres
   * matas y el resto aire, que es exactamente lo que no puede pasar en el plano
   * que sostiene todo el mundo.
   *
   * El ruido que se le suma al puntaje evita lo contrario: sin él quedaría una
   * franja densa de bordes rectos y el lote se leería como una banda pintada.
   * Con él, la densidad baja a manchas — como baja de verdad en un cultivo.
   */
  cerca.sort((a, b) => {
    const pa = Math.abs(a[0] - pasilloCanaveral(a[1])) + ruidoFbm(a[0] * 0.5 + 3, 1.5, a[1] * 0.5) * 5.5;
    const pb = Math.abs(b[0] - pasilloCanaveral(b[1])) + ruidoFbm(b[0] * 0.5 + 3, 1.5, b[1] * 0.5) * 5.5;
    return pa - pb;
  });

  const elegidos = [
    ...cerca.slice(0, conteos.mataCerca).map((s) => [...s, 'cerca']),
    ...lejos.slice(0, conteos.mataLejos).map((s) => [...s, 'lejos']),
  ];

  for (let i = 0; i < elegidos.length; i++) {
    const [x, z, ti, detalle] = elegidos[i];
    const y = alturaVega(x, z);
    // Claros: donde ya pasó el corte queda la cepa rapada. Se salta una de cada
    // tantas, en manchas (ruido), no al azar puro — así se ve el corte por eras.
    // Solo en el fondo del tablón grande: el pasillo que camina la lección NO se
    // ralea, que es justo donde se necesita la caña cerrada.
    const corte = ruidoFbm(x * 0.14 + 5, 0.5, z * 0.14);
    if (corte > 0.76 && ti === 0 && detalle === 'lejos') continue;

    const v = ruidoFbm(x * 0.3, 1.5, z * 0.3) > 0.5 ? 1 : 0;
    const m = mallaDe(v, detalle);
    const variedad = variedadPara(ruidoFbm(x * 0.09 + 21, 3.5, z * 0.09));
    // las cepas de la orilla del tablón vienen más chicas (menos competencia,
    // pero más golpe de sol y de viento) — el borde de un lote nunca va parejo
    const escala = 0.84 + r() * 0.3;
    const rotY = r() * Math.PI * 2;
    const item = {
      pos: /** @type {[number,number,number]} */ ([x, y, z]),
      rotY,
      escala,
      tint: variedad.tinte,
      fase: x * 0.32 + z * 0.19, // la ONDA del viento viaja por el lote
    };
    matas[m].push(item);
    // hoja y chala comparten transformación con el tallo (misma cepa), pero la
    // hoja va siempre verde: el tinte de la variedad NO le toca el follaje
    hojas[m].push({ ...item, tint: [0.94 + r() * 0.1, 1, 0.9 + r() * 0.12] });
    chala[m].push({ ...item, tint: [1, 0.97, 0.92] });

    /* EL PENACHO: solo en las cepas que ya espigaron, y montado EN una punta
       real de tallo (por eso hicieron falta los `topes`). */
    if (penacho.length < conteos.penacho && r() < 0.42) {
      /* Las puntas de SU malla. El `||` no es adorno: si un llamador manda
         menos listas de topes que mallas, sin esto el mundo entero truena al
         sembrar. Un penacho de menos es barato; una escena en blanco no. */
      const tops = topesPorMalla[m] || topesPorMalla[0] || [];
      const tp = tops.length ? tops[Math.floor(r() * tops.length)] : null;
      if (tp) {
        const ca = Math.cos(rotY);
        const sa = Math.sin(rotY);
        const dx = (tp[0] * ca - tp[2] * sa) * escala;
        const dz = (tp[0] * sa + tp[2] * ca) * escala;
        const dy = tp[1] * escala - 0.06;
        penacho.push({
          pos: /** @type {[number,number,number]} */ ([x + dx, y + dy, z + dz]),
          rotY: r() * Math.PI * 2,
          escala: escala * (0.85 + r() * 0.4),
          tint: cPenacho,
          // La fase la hereda de SU cepa: penacho y tallo se mecen juntos.
          fase: x * 0.32 + z * 0.19,
          /* El penacho no pivota en su propio pie: pivota en el PIE DE LA CEPA,
             a 4 m más abajo. Sin esto, al mecerse la caña la punta del tallo se
             corre ~15 cm y el penacho se queda flotando en el aire. `ancla` es
             el pie de la mata y `brazo` el vector del pie a la punta. */
          ancla: /** @type {[number,number,number]} */ ([x, y, z]),
          brazo: /** @type {[number,number,number]} */ ([dx, dy, dz]),
        });
      }
    }
  }

  /* 2) El suelo: hojarasca y matojos en las calles, piedras sueltas. */
  const suelo = (n, semilla, filtro) => {
    const rr = rng(semilla);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 40) {
      intentos++;
      const x = -23 + rr() * 46;
      const z = -20 + rr() * 40;
      if (enLaEra(x, z, 0.94)) continue;
      if (filtro && !filtro(x, z)) continue;
      lista.push({
        pos: /** @type {[number,number,number]} */ ([x, alturaVega(x, z), z]),
        rotY: rr() * Math.PI * 2,
        escala: 0.7 + rr() * 0.7,
        tint: [0.9 + rr() * 0.2, 0.92 + rr() * 0.16, 0.88 + rr() * 0.2],
        fase: 0,
      });
    }
    return lista;
  };

  return {
    matas,
    hojas,
    chala,
    penacho,
    hojarasca: suelo(conteos.hojarasca, 71),
    piedra: suelo(conteos.piedra, 72),
    matojo: suelo(conteos.matojo, 73),
  };
}

/* -------------------------------------------------------------------------- */
/*  El cañaveral del FONDO (la silueta a media y larga distancia)              */
/* -------------------------------------------------------------------------- */

/*
 * El error que ya se pagó en el café: la mata de primer plano quedaba perfecta y
 * a media distancia la ladera parecía un bosque de pinos. Un cañaveral visto de
 * lejos NO es una fila de conos: es un MURO verde de borde superior RASGADO y
 * casi horizontal, del que sobresalen penachos sueltos. Esto lo dibuja barato:
 * una banda de altura ondulada con flecos arriba, detrás del lote instanciado,
 * para que el cultivo no se acabe en seco.
 */
export function geomMuroCanaveral({ largo, alto, semilla = 88, dientes = 46 }) {
  const r = rng(semilla);
  const partes = [];
  const paso = largo / dientes;
  const cBaja = new THREE.Color(PAL.hojaSombra);
  const cAlta = new THREE.Color(PAL.hoja);
  const cLuz = new THREE.Color(PAL.hojaSol);
  const tmp = new THREE.Color();

  for (let i = 0; i < dientes; i++) {
    const x = -largo / 2 + i * paso + paso * 0.5;
    // el borde de arriba RASGA: cada diente tiene su altura y su ancho
    const h = alto * (0.72 + 0.45 * ruidoFbm(i * 0.4, 0.5, 0.5) + r() * 0.12);
    const w = paso * (1.05 + r() * 0.7);
    const d = 1.1 + r() * 1.3;
    const g = new THREE.BoxGeometry(w, h, d, 1, 3, 1);
    poner(g, [x, h * 0.5, (r() - 0.5) * 1.4], [0, (r() - 0.5) * 0.4, (r() - 0.5) * 0.06]);
    pintarPorVertice(g, (px, py) => {
      const u = clamp(py / Math.max(0.01, alto), 0, 1);
      tmp.copy(cBaja).lerp(cAlta, u * 0.85);
      tmp.lerp(cLuz, Math.pow(u, 2.2) * 0.55);
      const n = ruidoFbm(px * 0.7 + 9, py * 0.7, 0.5);
      tmp.multiplyScalar(0.86 + n * 0.28);
      return tmp;
    });
    partes.push(g);
  }
  return fusionarSeguro(partes, 'muro-canaveral');
}
