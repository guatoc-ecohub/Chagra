/*
 * arbolMayor.geom — la GEOMETRÍA de los árboles de la Sierra, apuntando a
 * REALISMO. Geometría pura: cero three-en-pantalla, cero React, cero texturas,
 * cero assets. Corre headless (es matemática de buffers) y se testea headless.
 *
 * ── POR QUÉ SE REHIZO (el veredicto: "parece una caricatura mal hecha") ───────
 * La versión anterior era el "árbol de navidad" de manual: un cono/elipsoide de
 * blobs de follaje encima de un cilindro de tronco. El DR de realismo
 * (deepresearch/DR-FANOUT/realismo-3d-vegetacion-*-2026-06-19.md) diagnostica
 * exactamente ese fallo y ordena las recetas por RETORNO VISUAL POR COSTO. Este
 * módulo las aplica, en ese orden:
 *
 *   R1 · SOMBREADO DE FOLLAJE (el mayor retorno del DR) — horneado en
 *        `vertexColors`, sin shaders propios:
 *          · AO por vértice: el follaje hondo de la copa y las axilas de rama
 *            se oscurecen; las caras que miran al suelo pierden cielo.
 *          · Gradiente de altura: la copa se aclara hacia arriba.
 *          · TRANSLUCIDEZ a contraluz (la hoja encendida): se puede HORNEAR
 *            porque el sol de esta escena es FIJO (hora dorada). Ver §EL SOL.
 *          · Variación de color por hoja/cluster y por instancia.
 *   R2 · SILUETA Y JERARQUÍA DE RAMAS — ramificación recursiva (tronco → ramas
 *        primarias → secundarias → terciarias) con conicidad REAL y curvatura.
 *        El follaje se cuelga de las PUNTAS de rama, no en una cáscara de
 *        elipsoide: por eso la copa sale irregular y CON HUECOS —se ve cielo
 *        entre las hojas— sin tener que "hacerle huecos" a mano.
 *   R3 · ROTURA DE LA SIMETRÍA — `variante` genera árboles distintos de la misma
 *        especie (el DR: "10 árboles diferentes valen más que 100 idénticos").
 *   R4 · TRONCO SIN TEXTURA — conicidad real + rugosidad de corteza en la
 *        geometría + color de vértice más oscuro en los valles del relieve.
 *
 * ── EL SOL ES FIJO (y por eso se puede hornear la luz) ───────────────────────
 * `GaleriaSierraArboles` alumbra con un directional en [-11, 8, 4] (coords del
 * grupo del diorama). El sol no se mueve nunca: la cara encendida de un árbol es
 * SIEMPRE la misma. Eso permite hornear en el vértice lo que un Lambert no sabe
 * hacer —AO y translucidez a contraluz— sin escribir un shader (el repo no usa
 * ninguno: corre en Android barato y en una Quadro vieja).
 *
 * OJO con lo que NO se hornea: la difusa del sol la calcula el Lambert con la
 * luz real. Hornearla también la contaría DOS VECES. Aquí solo va lo que el
 * Lambert no puede: oclusión, contraluz, gradiente y variación (todo albedo).
 *
 * ── ROTACIÓN Y LUZ HORNEADA (la regla que hay que respetar al instanciar) ────
 * Si una instancia gira en Y, la luz horneada gira con ella y el contraluz queda
 * mirando a cualquier lado. Por eso:
 *   · AO y gradiente son invariantes al giro en Y (radiales/verticales) → libres.
 *   · La TRANSLUCIDEZ es direccional → las instancias usan `giroMax` chico
 *     (±0.18 rad); la variedad la dan las VARIANTES de geometría, no el giro.
 * `JITTER_GIRO` es ese tope y está exportado para que el consumidor no lo invente.
 *
 * ── PRESUPUESTO ─────────────────────────────────────────────────────────────
 * Una geometría FUSIONADA por (especie × variante) → un InstancedMesh → una
 * draw-call, por más árboles que haya. `q` (calidad por tier) recorta niveles de
 * rama y hojas. ~2-4k triángulos por árbol héroe en 'alto'; el bosque de relleno
 * usa `q` bajo (~300-600).
 *
 * ⚠️ `mergeGeometries` devuelve null EN SILENCIO al mezclar geometría indexada
 * con no-indexada, y r3f hace `if (!geo) return null` → la especie desaparece sin
 * un solo error. Ya mordió dos veces en este repo. `fusionar()` desindexa TODO
 * antes de mezclar y TRUENA si el merge devuelve null: mejor romper el build que
 * enviar un árbol invisible.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* Ruido determinista: el mismo árbol en todos los equipos, y cachea limpio en el
   service worker (nada de Math.random). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Dirección del sol en coordenadas del diorama (ver §EL SOL). Unitaria. */
export const SOL = new THREE.Vector3(-11, 8, 4).normalize();

/** Tope de giro en Y al instanciar: más que esto y el contraluz horneado miente. */
export const JITTER_GIRO = 0.18;

/** Calidad geométrica por tier (recorta ramas y hojas, no especies). */
export const CALIDAD_TIER = { alto: 1, medio: 0.6, bajo: 0.38 };
export const calidadDeTier = (tier) => CALIDAD_TIER[tier] ?? CALIDAD_TIER.medio;

/* -------------------------------------------------------------------------- */
/*  Fusión y pintado                                                           */
/* -------------------------------------------------------------------------- */

/*
 * Los ÚNICOS atributos que sobreviven a la fusión. `mergeGeometries` exige que
 * TODAS las partes traigan exactamente el mismo juego de atributos, y falla
 * devolviendo null si una trae uno de más. Las primitivas de three
 * (Icosahedron/Cylinder/Extrude) traen `uv`; `tuboAhusado` no (no hay texturas
 * en todo el módulo: el color va en el vértice). Esa sola diferencia bastaba
 * para devolver null. Se normaliza a este juego y se acabó la clase de bug.
 */
const ATRIBUTOS = ['position', 'normal', 'color'];

/**
 * Fusiona partes en UNA geometría. Desindexa y normaliza atributos antes (ver el
 * aviso de cabecera) y TRUENA si el merge falla: un árbol invisible es peor que
 * un build roto, porque no avisa.
 *
 * @param {Array<THREE.BufferGeometry|null>} partes
 * @param {string} etiqueta  para que el error diga QUÉ especie reventó.
 * @returns {THREE.BufferGeometry}
 */
export function fusionar(partes, etiqueta = 'árbol') {
  const buenas = partes.filter(Boolean).map((g) => {
    const plana = g.index ? g.toNonIndexed() : g;
    if (!plana.attributes.normal) plana.computeVertexNormals();
    // fuera todo lo que no sea position/normal/color (uv, aRelieve, tangentes…)
    for (const nombre of Object.keys(plana.attributes)) {
      if (!ATRIBUTOS.includes(nombre)) plana.deleteAttribute(nombre);
    }
    return plana;
  });
  if (!buenas.length) throw new Error(`[arbolMayor.geom] ${etiqueta}: sin partes que fusionar`);

  // Un color faltante convierte el merge en null (o, peor, en un árbol negro).
  const sinColor = buenas.findIndex((g) => !g.attributes.color);
  if (sinColor >= 0) {
    throw new Error(
      `[arbolMayor.geom] ${etiqueta}: la parte #${sinColor} no trae color horneado`,
    );
  }

  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error(
      `[arbolMayor.geom] ${etiqueta}: mergeGeometries devolvió null ` +
        `(${buenas.length} partes). Atributos disparejos entre partes.`,
    );
  }
  return g;
}

/**
 * Hornea color por vértice llamando a `fn(posición, normal, índice) → THREE.Color`.
 * Necesita normales: las calcula si faltan. Es el único punto donde se decide el
 * albedo — todo el sombreado horneado (R1) pasa por aquí.
 */
export function pintarPorVertice(geo, fn) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const arr = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const c = fn(p, n, i);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Color plano en todos los vértices (para piezas que no necesitan degradado). */
export function pintar(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  return pintarPorVertice(geo, () => c);
}

/* -------------------------------------------------------------------------- */
/*  R4 · Tubo AHUSADO — el tronco/rama que SÍ se estrecha                      */
/* -------------------------------------------------------------------------- */

/*
 * La versión vieja usaba TubeGeometry (radio CONSTANTE) y un comentario que
 * prometía "ahusar: estrechar el radio hacia la punta" … seguido de `return geo`.
 * El ahusado nunca existió: todas las ramas eran tubos parejos. Aquí se construye
 * anillo por anillo con el radio interpolado, que además deja meter rugosidad de
 * corteza y hornear las grietas.
 */

/**
 * Tubo de radio variable a lo largo de una curva.
 *
 * @param {THREE.Curve} curva
 * @param {number} segs    anillos a lo largo (detalle longitudinal).
 * @param {number} radial  vértices por anillo (detalle transversal).
 * @param {(t:number)=>number} radioDe  radio en t∈[0,1] (0=base, 1=punta).
 * @param {number} rugosidad  0=cilindro perfecto; ~0.1 = corteza irregular.
 * @param {number} faseRug    desfasa la rugosidad (que dos ramas no se repitan).
 * @returns {THREE.BufferGeometry} con `position`, `normal` y `aRelieve` (0..1,
 *   cuánto SALE el vértice respecto al radio liso → para oscurecer las grietas).
 */
export function tuboAhusado(curva, segs, radial, radioDe, rugosidad = 0, faseRug = 0) {
  const frames = curva.computeFrenetFrames(segs, false);
  const pos = new Float32Array((segs + 1) * radial * 3);
  const relieve = new Float32Array((segs + 1) * radial);
  const idx = [];
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  let k = 0;

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curva.getPointAt(t, p);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const rad = radioDe(t);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      // Corteza: dos senos cruzados → costillas verticales que serpentean. No es
      // ruido puro a propósito: la corteza real tiene grano, no confeti.
      const grano =
        Math.sin(a * 3 + faseRug) * 0.6 + Math.sin(a * 7 - t * 5 + faseRug * 1.7) * 0.4;
      const rel = grano * 0.5 + 0.5; // 0..1
      const wob = 1 + grano * rugosidad;
      v.copy(p)
        .addScaledVector(N, Math.cos(a) * rad * wob)
        .addScaledVector(B, Math.sin(a) * rad * wob);
      pos[k * 3] = v.x;
      pos[k * 3 + 1] = v.y;
      pos[k * 3 + 2] = v.z;
      relieve[k] = rel;
      k++;
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRelieve', new THREE.BufferAttribute(relieve, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Hornea la corteza: base oscura, grietas (relieve bajo) más oscuras aún, y las
 * costillas expuestas más claras. Sin una sola textura.
 * `aRelieve` se consume aquí y se BORRA: si sobreviviera, la fusión con partes que
 * no lo traen devolvería null (justo el fallo silencioso de la cabecera).
 */
function hornearCorteza(geo, base, clara, r) {
  const rel = geo.getAttribute('aRelieve');
  const cBase = new THREE.Color(base);
  const cClara = new THREE.Color(clara);
  const tmp = new THREE.Color();
  const jitter = 0.94 + r() * 0.12; // cada rama, un pelo distinta
  pintarPorVertice(geo, (p, n, i) => {
    const rl = rel ? rel.getX(i) : 0.5;
    tmp.copy(cBase).lerp(cClara, Math.pow(rl, 1.3));
    // el pie del tronco recibe menos cielo: oclusión de contacto con el suelo
    const contacto = smoothstep(0.0, 0.55, p.y);
    tmp.multiplyScalar(lerp(0.62, 1, contacto) * jitter);
    return tmp;
  });
  geo.deleteAttribute('aRelieve');
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  R2 · Ramificación recursiva — la jerarquía que da la SILUETA               */
/* -------------------------------------------------------------------------- */

/*
 * Un L-system "de bolsillo": el tronco se parte en ramas primarias, esas en
 * secundarias, y así hasta `niveles`. Cada rama:
 *   · se estrecha (taper) respecto de su madre,
 *   · se curva (fototropismo: la punta busca arriba; gravitropismo: pesa),
 *   · diverge un ángulo de su madre y reparte a sus hijas en azimut.
 * Las PUNTAS terminales son donde se cuelga el follaje: por eso la copa hereda la
 * irregularidad del ramaje y aparecen los huecos. No hay ningún elipsoide.
 */

/** Un vector perpendicular a `d` (cualquiera, estable). */
function perpendicular(d) {
  const a = Math.abs(d.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(d, a).normalize();
}

/**
 * Hace crecer una rama y, recursivamente, sus hijas.
 *
 * @param {object} arg
 * @param {THREE.Vector3} arg.base   de dónde sale.
 * @param {THREE.Vector3} arg.dir    hacia dónde apunta (unitario).
 * @param {number} arg.largo
 * @param {number} arg.radio         radio en la base de ESTA rama.
 * @param {number} arg.nivel         0 = tronco.
 * @param {object} arg.cfg           receta de la especie (ver ESPECIES).
 * @param {Function} arg.r           rng.
 * @param {Array} arg.ramas          salida: {curva, r0, r1, nivel}.
 * @param {Array} arg.puntas         salida: {pos, dir, nivel} donde va el follaje.
 */
function crecer({ base, dir, largo, radio, nivel, cfg, r, ramas, puntas }) {
  // La rama no es recta: se curva. `curvatura` la tuerce lateralmente y
  // `subeALaLuz` levanta la punta (o la deja caer, si es negativo).
  const lat = perpendicular(dir).multiplyScalar((r() - 0.5) * cfg.curvatura * largo);
  const arriba = new THREE.Vector3(0, 1, 0).multiplyScalar(cfg.subeALaLuz * largo * (nivel ? 1 : 0.35));

  const p0 = base.clone();
  const p1 = base.clone().addScaledVector(dir, largo * 0.5).add(lat.clone().multiplyScalar(0.5)).add(arriba.clone().multiplyScalar(0.25));
  const p2 = base.clone().addScaledVector(dir, largo).add(lat).add(arriba);
  const curva = new THREE.CatmullRomCurve3([p0, p1, p2]);

  ramas.push({ curva, r0: radio, r1: radio * cfg.taper, nivel });

  const dirPunta = new THREE.Vector3().subVectors(p2, p1).normalize();

  if (nivel >= cfg.niveles) {
    puntas.push({ pos: p2, dir: dirPunta, nivel });
    return;
  }

  // Hijas: menos y más cortas a cada nivel. `hijos` puede ser fraccional por
  // tier → se redondea con el rng (así 2.4 da a veces 2 y a veces 3).
  const nf = cfg.hijos[Math.min(nivel, cfg.hijos.length - 1)];
  const n = Math.max(1, Math.floor(nf) + (r() < nf % 1 ? 1 : 0));
  const az0 = r() * Math.PI * 2;
  const eje = perpendicular(dirPunta);

  for (let i = 0; i < n; i++) {
    const az = az0 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.7;
    const div = cfg.divergencia * (0.65 + r() * 0.7);
    const d = dirPunta
      .clone()
      .applyAxisAngle(eje, div)
      .applyAxisAngle(dirPunta, az)
      .normalize();
    // punto de salida: reparte las hijas por el tramo alto de la madre (no todas
    // del mismo nudo: eso es lo que delata al árbol procedural)
    const donde = lerp(cfg.saleDesde, 1, r());
    const salida = curva.getPointAt(clamp(donde, 0, 1));
    crecer({
      base: salida,
      dir: d,
      largo: largo * cfg.acorta * (0.8 + r() * 0.4),
      radio: radio * cfg.taper * (0.72 + r() * 0.2),
      nivel: nivel + 1,
      cfg,
      r,
      ramas,
      puntas,
    });
  }
}

/* -------------------------------------------------------------------------- */
/*  R1 · Follaje: cluster en la PUNTA de rama, con sombreado horneado          */
/* -------------------------------------------------------------------------- */

/**
 * Un cluster de follaje: poliedro bajo, achatado y deformado (nunca una esfera
 * limpia). Se hornea aquí todo el R1.
 *
 * @param {object} arg
 * @param {THREE.Vector3} arg.centro     posición del cluster.
 * @param {number} arg.radio
 * @param {THREE.Vector3} arg.centroCopa centroide de la copa (para el AO).
 * @param {number} arg.radioCopa
 * @param {number} arg.yMin @param {number} arg.yMax  extremos de la copa (gradiente).
 * @param {object} arg.pal  paleta de la especie.
 * @param {Function} arg.r
 * @param {boolean} arg.sss  hornear translucidez direccional (solo si el árbol
 *   no va a girar; ver §ROTACIÓN Y LUZ HORNEADA).
 */
function clusterFollaje({ centro, radio, centroCopa, radioCopa, yMin, yMax, pal, r, sss }) {
  const geo = new THREE.IcosahedronGeometry(radio, 0);
  // Deformar: que no quede ni una esfera ni dos clusters iguales.
  const pos = geo.getAttribute('position');
  const v = new THREE.Vector3();
  const kx = 0.75 + r() * 0.55;
  const ky = 0.5 + r() * 0.34; // achatado: las copas no son bolas
  const kz = 0.75 + r() * 0.55;
  const f1 = r() * 6.283;
  const f2 = r() * 6.283;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const bulto = 1 + Math.sin(v.x * 5.5 + f1) * 0.14 + Math.sin(v.y * 6.1 + f2) * 0.12;
    pos.setXYZ(i, v.x * kx * bulto, v.y * ky * bulto, v.z * kz * bulto);
  }
  geo.computeVertexNormals();
  geo.translate(centro.x, centro.y, centro.z);

  // Qué tan HONDO está el cluster en la copa (0 = al borde, 1 = en el corazón).
  const dCentro = new THREE.Vector3().subVectors(centro, centroCopa).length();
  const profundidad = 1 - clamp(dCentro / Math.max(0.001, radioCopa), 0, 1);
  const expuesto = 1 - profundidad;

  const cBase = new THREE.Color(pal.hoja);
  const cClara = new THREE.Color(pal.hojaClara);
  const cLuz = new THREE.Color(pal.contraluz);
  const tono = r(); // variación por cluster (R3)
  const tmp = new THREE.Color();

  return pintarPorVertice(geo, (p, n) => {
    tmp.copy(cBase).lerp(cClara, tono * 0.55);

    // ── AO horneado: el corazón de la copa no ve el cielo ──
    let ao = lerp(1, 0.62, profundidad);
    // …y las caras que miran hacia abajo, tampoco (el cielo viene de arriba)
    ao *= lerp(0.74, 1.08, n.y * 0.5 + 0.5);

    // ── Gradiente de altura: la copa se enciende hacia arriba ──
    const yf = clamp((p.y - yMin) / Math.max(0.001, yMax - yMin), 0, 1);
    ao *= lerp(0.84, 1.12, yf);

    tmp.multiplyScalar(clamp(ao, 0.4, 1.2));

    // ── Translucidez a contraluz (R1, el mayor retorno) ──
    // El Lambert va a apagar esta cara porque mira EN CONTRA del sol; al subirle
    // el albedo hacia un verde-oro, la hoja queda encendida por dentro en vez de
    // apagada. Solo en el follaje expuesto: la hoja honda no tiene luz que pasar.
    if (sss) {
      const contra = clamp(-n.dot(SOL), 0, 1);
      const glow = Math.pow(contra, 2.2) * expuesto * 0.85;
      if (glow > 0.001) tmp.lerp(cLuz, glow);
    }
    return tmp;
  });
}

/* -------------------------------------------------------------------------- */
/*  Firmas de especie                                                          */
/* -------------------------------------------------------------------------- */

/*
 * Cada especie es una RECETA de ramificación + paleta. Los números salen de la
 * silueta real del árbol, no de "lo que se ve bonito":
 *
 *   niveles      profundidad de ramificación (más = copa más fina)
 *   hijos[]      ramas hijas por nivel
 *   divergencia  ángulo con que la hija se abre de la madre (rad)
 *   acorta       cuánto más corta es la hija (0..1)
 *   taper        cuánto adelgaza cada rama
 *   curvatura    serpenteo lateral (queñua alto = retorcida)
 *   subeALaLuz   la punta busca el cielo (+) o cuelga (−)
 *   saleDesde    desde qué fracción de la madre salen las hijas
 *   troncos      tallos desde el pie (queñua multitallo)
 *   inclina      el árbol entero ladeado (viento del páramo)
 */
export const ESPECIES = {
  /* QUEÑUA (Polylepis) — el límite arbóreo más alto del mundo. Multitallo,
     RETORCIDA, y su firma es la corteza cobriza que se descama en láminas de
     papel: eso es GEOMETRÍA (láminas), no un color rojizo. Copa compacta y
     menuda (hoja diminuta) — y baja: aquí arriba nada crece derecho. */
  quenua: {
    nombre: 'Queñua',
    cientifico: 'Polylepis quadrijuga',
    rasgo: 'el bosque más alto del mundo: corteza de papel y tronco retorcido',
    piso: 'paramo',
    alto: 1.55,
    troncos: 3,
    inclina: 0.14,
    niveles: 3,
    hijos: [2.6, 2.4, 2.2],
    divergencia: 0.72,
    acorta: 0.62,
    taper: 0.62,
    curvatura: 0.62, // la más retorcida del catálogo
    subeALaLuz: 0.24,
    saleDesde: 0.42,
    radioBase: 0.052,
    follaje: { radio: 0.2, porPunta: 1.5 },
    laminas: true, // corteza que se descama (firma)
    pal: {
      corteza: '#8f4526',
      cortezaClara: '#d08046',
      lamina: '#e0996a', // la lámina que se levanta, iluminada por dentro
      hoja: '#4d6b41',
      hojaClara: '#8ba470',
      contraluz: '#cfd98a',
    },
  },

  /* ROBLE ANDINO (Quercus humboldtii) — el único roble nativo de Colombia. El
     gran árbol de la tierra fría: tronco grueso, ramas primarias que salen BAJO
     y se abren horizontales, copa ancha y pesada que se extiende más que sube. */
  roble: {
    nombre: 'Roble andino',
    cientifico: 'Quercus humboldtii',
    rasgo: 'el gran árbol de la tierra fría: copa ancha, madera lenta',
    piso: 'frio',
    alto: 2.7,
    troncos: 1,
    inclina: 0.02,
    niveles: 4,
    hijos: [3.4, 2.6, 2.3, 2],
    divergencia: 0.82, // se abre mucho: la copa manda a lo ancho
    acorta: 0.7,
    taper: 0.68,
    curvatura: 0.3,
    subeALaLuz: 0.16,
    saleDesde: 0.3, // ramas primarias bajas (firma del roble)
    radioBase: 0.13,
    follaje: { radio: 0.3, porPunta: 1.7 },
    laminas: false,
    pal: {
      corteza: '#5c4b3c',
      cortezaClara: '#8a7660',
      hoja: '#436636',
      hojaClara: '#75974c',
      contraluz: '#b9cc5f',
    },
  },

  /* GUAYACÁN AMARILLO (Handroanthus chrysanthus) — florece PELADO: se le cae
     toda la hoja y estalla en oro. Es el árbol donde la jerarquía de ramas queda
     a la vista, así que el ramaje tiene que aguantar el primer plano. */
  guayacan: {
    nombre: 'Guayacán amarillo',
    cientifico: 'Handroanthus chrysanthus',
    rasgo: 'florece de oro, sin una sola hoja',
    piso: 'templado',
    alto: 2.3,
    troncos: 1,
    inclina: 0.03,
    niveles: 4,
    hijos: [3, 2.6, 2.4, 2.2],
    divergencia: 0.6,
    acorta: 0.66,
    taper: 0.66,
    curvatura: 0.34,
    subeALaLuz: 0.3, // ramaje ascendente, en copa de vaso
    saleDesde: 0.44,
    radioBase: 0.1,
    follaje: { radio: 0.2, porPunta: 2.2 }, // racimos de FLOR, no hojas
    laminas: false,
    floracion: true,
    pal: {
      corteza: '#6b6152',
      cortezaClara: '#988a72',
      hoja: '#e8b32a',
      hojaClara: '#ffd85e',
      contraluz: '#fff0a8', // la flor a contraluz es casi blanca
    },
  },

  /* CEIBA (Ceiba pentandra) — la emergente: rompe el dosel y se abre en
     PARASOL sobre el bosque. Firma doble: raíces tablares (contrafuertes) y esa
     copa plana y altísima. Tronco verdoso-gris, casi liso. */
  ceiba: {
    nombre: 'Ceiba',
    cientifico: 'Ceiba pentandra',
    rasgo: 'raíces tablares y una copa que emerge sobre todo el bosque',
    piso: 'calido',
    alto: 3.2,
    troncos: 1,
    inclina: 0,
    niveles: 4,
    hijos: [4, 2.8, 2.4, 2.2],
    divergencia: 0.86, // muy abierta: el parasol
    acorta: 0.74,
    taper: 0.72,
    curvatura: 0.26,
    subeALaLuz: -0.04, // la copa se APLANA, no sube
    saleDesde: 0.82, // todo el ramaje arriba: debajo, tronco limpio
    radioBase: 0.16,
    tablares: 5,
    follaje: { radio: 0.52, porPunta: 1.2 }, // pocos y grandes: dosel, no confeti
    laminas: false,
    pal: {
      corteza: '#7c8368',
      cortezaClara: '#a3a985',
      hoja: '#5a8a48',
      hojaClara: '#82ad5f',
      contraluz: '#c8dd72',
    },
  },
};

/** El árbol de un piso térmico (o null: superpáramo y nival no tienen árbol). */
export function arbolDePiso(pisoId) {
  return Object.values(ESPECIES).find((e) => e.piso === pisoId) || null;
}
/** La clave de catálogo del árbol de un piso ('quenua' | 'roble' | …). */
export function tipoDePiso(pisoId) {
  return Object.keys(ESPECIES).find((k) => ESPECIES[k].piso === pisoId) || null;
}

/* -------------------------------------------------------------------------- */
/*  Piezas de firma                                                            */
/* -------------------------------------------------------------------------- */

/*
 * LÁMINAS de la queñua: su corteza se descama en hojas de papel que se levantan
 * del tronco. El DR es explícito: la clave es la GEOMETRÍA de las láminas que se
 * desprenden, no el color. Son cascarones curvos, pegados y despegándose.
 */
function laminasCorteza(curva, cfg, r, q) {
  const n = Math.max(3, Math.round(9 * q));
  const partes = [];
  const cLam = new THREE.Color(cfg.pal.lamina);
  const cOsc = new THREE.Color(cfg.pal.corteza);
  const tmp = new THREE.Color();
  const p = new THREE.Vector3();
  const frames = curva.computeFrenetFrames(16, false);

  for (let i = 0; i < n; i++) {
    const t = 0.1 + r() * 0.75;
    curva.getPointAt(t, p);
    const fi = Math.min(15, Math.round(t * 16));
    const N = frames.normals[fi];
    const B = frames.binormals[fi];
    const a = r() * Math.PI * 2;
    const rad = cfg.radioBase * lerp(1, cfg.taper, t) * 1.02;

    // cascarón: un trozo de cilindro que se abre del tronco
    const alto = 0.1 + r() * 0.16;
    const arco = 0.7 + r() * 0.8;
    const lam = new THREE.CylinderGeometry(rad, rad * 1.16, alto, 4, 1, true, a, arco);
    // se despega: la lámina se aleja del eje y se ladea
    const despegue = 0.006 + r() * 0.02;
    lam.translate(Math.cos(a + arco / 2) * despegue, 0, Math.sin(a + arco / 2) * despegue);
    lam.rotateX((r() - 0.5) * 0.5);

    const m = new THREE.Matrix4().makeBasis(N, new THREE.Vector3().crossVectors(N, B), B);
    lam.applyMatrix4(m);
    lam.translate(p.x, p.y, p.z);

    // la lámina levantada se enciende por el borde (papel a contraluz)
    const brillo = 0.55 + r() * 0.45;
    partes.push(
      pintarPorVertice(lam, (_, nn) => {
        const contra = clamp(-nn.dot(SOL), 0, 1);
        tmp.copy(cOsc).lerp(cLam, brillo);
        tmp.lerp(new THREE.Color(cfg.pal.lamina), Math.pow(contra, 2) * 0.5);
        return tmp;
      }),
    );
  }
  return partes;
}

/*
 * RAÍCES TABLARES de la ceiba: contrafuertes que salen del pie como aletas y
 * agarran la tierra. Sin ellas, la ceiba es un palo cualquiera.
 */
function raicesTablares(cfg, r) {
  const n = cfg.tablares || 0;
  const partes = [];
  const cBase = new THREE.Color(cfg.pal.corteza);
  const cClara = new THREE.Color(cfg.pal.cortezaClara);
  const tmp = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4;
    const largo = cfg.alto * (0.16 + r() * 0.07);
    const altoAleta = cfg.alto * (0.2 + r() * 0.1);

    // Perfil de aleta: sube pegada al tronco y baja en curva hasta el suelo.
    const forma = new THREE.Shape();
    forma.moveTo(0, 0);
    forma.lineTo(0, altoAleta);
    forma.quadraticCurveTo(largo * 0.5, altoAleta * 0.22, largo, 0);
    forma.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(forma, {
      depth: cfg.radioBase * 0.5,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -cfg.radioBase * 0.25);
    geo.rotateY(-a);
    geo.translate(Math.cos(a) * cfg.radioBase * 0.6, 0, Math.sin(a) * cfg.radioBase * 0.6);

    partes.push(
      pintarPorVertice(geo, (p) => {
        // el pie de la aleta se hunde en sombra: oclusión de contacto
        const alto = clamp(p.y / Math.max(0.001, altoAleta), 0, 1);
        tmp.copy(cBase).lerp(cClara, alto * 0.5);
        tmp.multiplyScalar(lerp(0.55, 1, smoothstep(0, 0.5, alto)));
        return tmp;
      }),
    );
  }
  return partes;
}

/* -------------------------------------------------------------------------- */
/*  El árbol completo                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Construye UN árbol fusionado, con el sombreado ya horneado.
 *
 * @param {string} tipo  clave de ESPECIES ('quenua'|'roble'|'guayacan'|'ceiba').
 * @param {object} [opts]
 * @param {number} [opts.q=1]         calidad geométrica (calidadDeTier).
 * @param {number} [opts.variante=0]  MISMA especie, OTRO árbol (R3).
 * @param {boolean} [opts.sss=true]   hornear contraluz (ver §ROTACIÓN).
 * @returns {THREE.BufferGeometry} fusionada, con `color` horneado.
 */
export function geomArbol(tipo, { q = 1, variante = 0, sss = true } = {}) {
  const cfg = ESPECIES[tipo];
  if (!cfg) throw new Error(`[arbolMayor.geom] especie desconocida: ${tipo}`);

  const r = rng((tipo.length * 977 + variante * 7919 + 13) >>> 0);
  const partes = [];
  const ramas = [];
  const puntas = [];

  // ── Estructura: uno o varios tallos desde el pie ──
  const nTroncos = cfg.troncos;
  for (let ti = 0; ti < nTroncos; ti++) {
    const a = (ti / nTroncos) * Math.PI * 2 + r() * 0.8;
    const off = nTroncos > 1 ? cfg.radioBase * (1.1 + r() * 1.5) : 0;
    const base = new THREE.Vector3(Math.cos(a) * off, 0, Math.sin(a) * off);
    // los multitallo se abren en abanico desde el pie
    const abre = nTroncos > 1 ? 0.1 + r() * 0.16 : 0;
    const dir = new THREE.Vector3(Math.cos(a) * abre, 1, Math.sin(a) * abre).normalize();
    // + la inclinación del árbol entero (viento)
    if (cfg.inclina) dir.x += cfg.inclina * (0.6 + r() * 0.8);
    dir.normalize();

    crecer({
      base,
      dir,
      largo: cfg.alto * (nTroncos > 1 ? 0.46 + r() * 0.2 : 0.56),
      radio: cfg.radioBase * (nTroncos > 1 ? 0.66 + r() * 0.24 : 1),
      nivel: 0,
      cfg,
      r,
      ramas,
      puntas,
    });
  }

  // ── Leño: cada rama, un tubo ahusado con corteza horneada ──
  // Detalle por nivel y por tier: el tronco se ve, las ramitas no.
  for (const rama of ramas) {
    const finura = 1 - rama.nivel / (cfg.niveles + 1);
    const segs = Math.max(2, Math.round(lerp(2, 7, finura) * clamp(q, 0.4, 1)));
    const radial = Math.max(3, Math.round(lerp(3, 8, finura) * clamp(q, 0.5, 1)));
    const rugosidad = rama.nivel === 0 ? 0.1 : 0.05;
    const geo = tuboAhusado(
      rama.curva,
      segs,
      radial,
      (t) => lerp(rama.r0, rama.r1, Math.pow(t, 0.8)),
      rugosidad,
      r() * 6.283,
    );
    partes.push(hornearCorteza(geo, cfg.pal.corteza, cfg.pal.cortezaClara, r));
  }

  // ── Firmas de especie ──
  if (cfg.laminas) {
    // las láminas van en los tallos (nivel 0), que es donde se ven
    for (const rama of ramas.filter((x) => x.nivel === 0)) {
      partes.push(...laminasCorteza(rama.curva, cfg, r, q));
    }
  }
  if (cfg.tablares) partes.push(...raicesTablares(cfg, r));

  // ── Follaje en las puntas (de aquí sale la silueta y los huecos) ──
  const caja = new THREE.Box3();
  const pts = puntas.map((p) => p.pos);
  if (pts.length) caja.setFromPoints(pts);
  const centroCopa = new THREE.Vector3();
  caja.getCenter(centroCopa);
  const radioCopa = Math.max(0.001, caja.getSize(new THREE.Vector3()).length() * 0.5);
  const yMin = caja.min.y;
  const yMax = caja.max.y;

  const porPunta = cfg.follaje.porPunta;
  for (const punta of puntas) {
    const n = Math.max(1, Math.round(porPunta * clamp(q, 0.45, 1)));
    for (let i = 0; i < n; i++) {
      // el cluster se corre un poco hacia afuera de la punta: el follaje ENVUELVE
      // el final de la ramita, no se posa encima como un sombrero
      const jit = new THREE.Vector3(
        (r() - 0.5) * cfg.follaje.radio * 1.5,
        (r() - 0.5) * cfg.follaje.radio * 1.1,
        (r() - 0.5) * cfg.follaje.radio * 1.5,
      );
      const centro = punta.pos
        .clone()
        .addScaledVector(punta.dir, cfg.follaje.radio * 0.35)
        .add(jit);
      const radio = cfg.follaje.radio * (0.62 + r() * 0.62);
      partes.push(
        clusterFollaje({
          centro,
          radio,
          centroCopa,
          radioCopa,
          yMin,
          yMax,
          pal: cfg.pal,
          r,
          sss,
        }),
      );
    }
  }

  const geo = fusionar(partes, `${tipo}#${variante}`);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Cuántas VARIANTES distintas de una especie conviene generar por tier. Cada
 * variante es una draw-call más, y el retorno cae rápido: 3 ya rompen el patrón.
 */
export const VARIANTES_TIER = { alto: 3, medio: 2, bajo: 1 };
export const variantesDeTier = (tier) => VARIANTES_TIER[tier] ?? VARIANTES_TIER.medio;
