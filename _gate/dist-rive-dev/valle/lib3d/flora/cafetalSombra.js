// ═════════════════════════════════════════════════════════════════════════════
//  cafetalSombra.js — EL CAFETAL BAJO SOMBRA del piso templado (tarea ARTE #26)
//
//  Café (Coffea arabica) con cerezas rojas BAJO el dosel ralo del guamo
//  (Inga edulis). Dos estratos que se tienen que LEER desde el suelo:
//  arriba el techo alto y abierto del guamo, abajo el cafetal en surcos,
//  y entre los dos la luz cayendo en PARCHES.
//
//  ── POR QUÉ BAJO SOMBRA (el proyecto enseña; esto no es decoración) ──────────
//  El guamo es leguminosa: FIJA NITRÓGENO, su hojarasca alimenta el suelo, la
//  sombra regula temperatura y humedad, y el sistema sostiene aves e insectos
//  que el café a pleno sol no tiene. Por eso el dosel es RALO (sombrío regulado
//  ~35-45%, la recomendación agronómica), no un techo cerrado: el café necesita
//  luz filtrada, no oscuridad ni rayo directo. Un cafetal en fila cerrada a
//  pleno sol sería exactamente lo contrario de lo que el proyecto predica.
//
//  ── DATOS DEL GRAFO AGE `chagra_kg` (consultado 2026-08-07, no de memoria) ───
//   · Coffea arabica L. — "Café caturra / Castillo / Cenicafé 1":
//     1400-2000 msnm (Castillo 1300-1800), 17-23 °C, brillo solar SOL_PARCIAL
//     (el grafo mismo respalda la sombra), pH 5.0-5.5, sensibilidad helada alta.
//     Fuente suelo: Cenicafé. Variedades: Colombia, Castillo, caturra, Cenicafé 1.
//   · Inga edulis Mart. — "Guamo": frutal perenne, sol_parcial, naturalizada;
//     0-2000 msnm en zonas cálidas y templadas de Valle, Antioquia, Caldas,
//     Quindío, Tolima y Huila (teaser del grafo; altitud_min/max nodal 500-1500).
//   El candelabro del cafeto (ramas horizontales en pisos), la cosecha bimodal
//   (flor + grano verde + cereza roja EN LA MISMA mata) y el sombrío de Inga
//   vienen del grounding Cenicafé/FNC ya documentado en el cafetal del valle.
//
//  ── QUÉ REUSA (no reinventa) ─────────────────────────────────────────────────
//   · FollajeMasa.js  → TODA copa es masa: núcleo esculpido + cards
//     texturizados. Ni una hoja contable (regla dura, gate Humboldt).
//   · vientoMundos.js → reloj global compartido; los materiales de copa se
//     parchean con aplicarVientoMundo y los impostores leen el mismo uniform.
//   · matrizParamo.js → la RECETA del estrato denso (se copia la técnica, no el
//     código, que no exporta sus internos): anillo de detalle por tiles con
//     frustum culling + manto de impostores en super-tiles + erosión de alfa
//     por cercanía + colapso duro por distancia en el vertex shader.
//   · arbolesFrioAndino.js → la receta de silueta por especie (cilindro doblado
//     por vértice, ficha por especie, materiales cacheados). NO se importa:
//     otro Fable lo está consolidando AHORA MISMO y acoplarse a un módulo en
//     refactor es pedir la rotura; el cilindroDoblado local (~30 líneas) es
//     duplicación deliberada y documentada.
//
//  ── LAS DOS SILUETAS ─────────────────────────────────────────────────────────
//   · GUAMO: fuste alto, copa ANCHA, PLANA y RALA (paraguas abierto) — lóbulos
//     achatados separados, cobertura moderada: por los huecos pasa la luz. Las
//     guamas (vainas verdes colgantes) son la firma de la especie. El NÚCLEO de
//     la copa NO proyecta sombra: la sombra la dan solo los cards con alphaTest
//     (three r160 copia map+alphaTest al depth material), así el suelo recibe
//     luz ROTA en parches y no un manchón sólido.
//   · CAFETO: candelabro — tallo vertical y ramas HORIZONTALES en pisos, follaje
//     verde oscuro lustroso en masa, y las cerezas en GLOMÉRULOS pegados a la
//     rama (así crecen de verdad: en las axilas, no en las puntas). El rojo es
//     ACENTO — puntos en la masa verde, jamás alfombra.
//
//  ── PRESUPUESTO (arquitectura, los números medidos van en el informe) ────────
//   · Cafetos HÉROE solo en un anillo de detalle (tiles de 12 m, InstancedMesh
//     por parte, 1 variante por tile — el café es cultivo clonal: la uniformidad
//     por lote es verdad agronómica, no pereza). Fuera del anillo manda el manto
//     de impostores (cruz de 2 quads con la mata horneada en canvas), que se
//     EROSIONA al acercarse y se COLAPSA en el vertex shader más allá de la
//     niebla: el costo queda acotado por un disco alrededor de la cámara.
//   · Guamos héroe en super-tiles de 44 m hasta ~55 m; más allá, impostor.
//   · Todo InstancedMesh. Todo determinista por seed (el gate compara).
//
//  API:
//    crearCafeto(opts)        → THREE.Group (una mata suelta — Angelita Bros)
//    crearGuamo(opts)         → THREE.Group (un guamo suelto)
//    crearCafetalSombra(opts) → { grupo, actualizar(camara), stats(), conteo,
//                                 dispose() }
//  opts de crearCafetalSombra:
//    area          {x0,x1,z0,z1}  extensión en metros (def 80×80)
//    alturaEn      (x,z)=>y       altura del terreno (def 0)
//    libre         (x,z)=>bool    false = zona vetada (camino, casa, agua)
//    seed          int
//    surco         m entre surcos (def 2.0) · mata m entre matas (def 1.45)
//    guamoCada     m de la cuadrícula del dosel (def 11 → ~40% de sombrío)
//    radioDetalle  m del anillo de cafetos héroe (def 20)
//    radioGuamo    m del anillo de guamos héroe (def 55)
//    corte         m del colapso duro de impostores (def 170; casar con niebla)
//    niebla        {color, densidad} para fundir impostores con FogExp2
//    variantes     variantes de cafeto héroe (def 3)
//
//  El sol lo pone el que llama. Los parches de luz son sombras REALES del dosel:
//  activá shadowMap y un DirectionalLight con castShadow; el módulo ya dejó los
//  castShadow de cada parte como deben ir.
// ═════════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import {
  texturaFollaje, materialFollaje, materialNucleo,
  geometriaNucleoMasa, geometriaCardsMasa, fusionarPreservando,
} from './FollajeMasa.js';
import { aplicarVientoMundo, aplicarVientoSombra, uniformesVientoMundo } from './vientoMundos.js';

// ── PRNG y hash deterministas (las mismas formas del resto de lib3d) ─────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash32(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(texto).length; i += 1) {
    h ^= String(texto).charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 1;
}
function vnoise(x, z) {
  const hx = (a, b) => {
    const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return h - Math.floor(h);
  };
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hx(xi, zi), b = hx(xi + 1, zi), c = hx(xi, zi + 1), d = hx(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ═════════════════════════════════════════════════════════════════════════════
//  PALETA — verdes del piso templado. El rojo de la cereza es EL acento.
// ═════════════════════════════════════════════════════════════════════════════
export const PALETA_CAFETAL = Object.freeze({
  // cafeto: hoja oscura lustrosa (Coffea es de sotobosque: verde profundo)
  cafeOscuro: '#1e3a1f', cafeMedio: '#2e5228', cafeClaro: '#4d7c31',
  // guamo: dosel más cálido y luminoso (el sol le pega de lleno)
  guamoOscuro: '#2b4a24', guamoMedio: '#42672e', guamoClaro: '#7f9f42',
  // frutos y flor (cosecha bimodal: conviven en la misma mata)
  cereza: '#c1271a', cerezaMadura: '#9e1710', pinton: '#d98426',
  bayaVerde: '#57803a', flor: '#f3efdd',
  // maderas
  cortezaCafe: '#6b5540', cortezaCafeTinte: '#8a7258',
  cortezaGuamo: '#7a6b57', cortezaGuamoTinte: '#96876c',
  guama: '#6f8f3e', guamaOscura: '#4c672c',
  // suelo del cafetal (hojarasca del guamo: el abono que se ve)
  hojarasca: '#6d5433', hojarascaSombra: '#4e3c26',
});

/** Ficha pública con la procedencia del grafo (para HUD/labels/lecciones). */
export const FICHA_CAFETAL = Object.freeze({
  cafeto: {
    nombre: 'Café', cientifico: 'Coffea arabica L.',
    grafo: 'chagra_kg: 1400-2000 msnm · 17-23 °C · sol_parcial · pH 5.0-5.5',
  },
  guamo: {
    nombre: 'Guamo', cientifico: 'Inga edulis Mart.',
    grafo: 'chagra_kg: frutal perenne · sol_parcial · leguminosa (fija N)',
  },
});

// ═════════════════════════════════════════════════════════════════════════════
//  FICHA TÉCNICA POR ESPECIE (follaje, corteza, viento)
// ═════════════════════════════════════════════════════════════════════════════
const SPP = Object.freeze({
  cafeto: {
    fol: {
      oscuro: PALETA_CAFETAL.cafeOscuro, medio: PALETA_CAFETAL.cafeMedio,
      claro: PALETA_CAFETAL.cafeClaro, hojas: 420, alargue: 2.2,
    },
    sombra: '#12240f', brillo: 0.16,
    corteza: { base: PALETA_CAFETAL.cortezaCafe, tinte: PALETA_CAFETAL.cortezaCafeTinte, banda: 0.3 },
    viento: { amp: 0.035, piso: 0.45, vel: 1.25 },
  },
  guamo: {
    fol: {
      oscuro: PALETA_CAFETAL.guamoOscuro, medio: PALETA_CAFETAL.guamoMedio,
      claro: PALETA_CAFETAL.guamoClaro, hojas: 360, alargue: 2.4,
    },
    sombra: '#1a2e14', brillo: 0.20,
    corteza: { base: PALETA_CAFETAL.cortezaGuamo, tinte: PALETA_CAFETAL.cortezaGuamoTinte, banda: 0.35 },
    viento: { amp: 0.10, piso: 4.4, vel: 0.9 },
  },
});

// ── materiales cacheados por especie (todo el cafetal comparte 2 juegos) ─────
const _mats = new Map();
function matsDe(especie) {
  if (_mats.has(especie)) return _mats.get(especie);
  const S = SPP[especie];
  const tex = texturaFollaje(THREE, { seed: hash32('tex|' + especie), ...S.fol });
  const cards = materialFollaje(THREE, tex, { brillo: S.brillo });
  const nucleo = materialNucleo(THREE, { brillo: S.brillo * 0.35, tono: S.fol.medio });
  aplicarVientoMundo(cards, { amplitud: S.viento.amp, piso: S.viento.piso, velocidad: S.viento.vel });
  aplicarVientoMundo(nucleo, { amplitud: S.viento.amp * 0.7, piso: S.viento.piso, velocidad: S.viento.vel });
  const corteza = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true,
  });
  const juego = { tex, cards, nucleo, corteza };
  if (especie === 'cafeto') {
    // frutos: un solo material con color por vértice (rojo/pintón/verde/flor).
    // El emissive rojizo tenue es lo que hace SALTAR la cereza en la penumbra
    // del sotobosque; sobre los verdes apenas se nota (ventaja del tono).
    juego.frutos = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.5, metalness: 0,
      emissive: new THREE.Color('#5c120a'), emissiveIntensity: 0.55,
    });
  }
  _mats.set(especie, juego);
  return juego;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CILINDRO DOBLADO local (receta de la casa; ver cabecera por qué es copia)
// ═════════════════════════════════════════════════════════════════════════════
function cilindroDoblado(opts) {
  const h = opts.h, r0 = opts.r0, r1 = opts.r1 ?? r0 * 0.45;
  const seg = opts.seg ?? 6, hSeg = opts.hSeg ?? 4;
  const lean = opts.lean ?? [0, 0];
  const onda = opts.onda ?? [0, 0];
  const fase = opts.fase ?? 0;
  const rn = opts.rn ?? prng(11);
  const cBase = new THREE.Color(opts.base ?? '#6b5540');
  const cTinte = new THREE.Color(opts.tinte ?? '#8a7258');
  const banda = opts.banda ?? 0.3;
  const geo = new THREE.CylinderGeometry(r1, r0, h, seg, hSeg, true);
  geo.translate(0, h / 2, 0);
  const P = geo.attributes.position, n = P.count;
  const col = new Float32Array(n * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = P.getY(i);
    const t = THREE.MathUtils.clamp(y / h, 0, 1);
    P.setX(i, P.getX(i) + lean[0] * t * t * h + onda[0] * Math.sin(t * Math.PI * 1.7 + fase) * t);
    P.setZ(i, P.getZ(i) + lean[1] * t * t * h + onda[1] * Math.cos(t * Math.PI * 1.4 + fase * 1.3) * t);
    const b = 0.5 + 0.5 * Math.sin(y * 4.6 + fase * 3.1);
    tmp.copy(cBase).lerp(cTinte, banda * b + (rn() - 0.5) * 0.12);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

// rama orientada desde `origen` hacia `dir` (anclaje se llama origen: `base`
// ya es color de corteza — la colisión de nombres está documentada en la casa)
function ramaHacia(opts) {
  const dir = opts.dir.clone().normalize();
  const geo = cilindroDoblado(opts);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  geo.applyQuaternion(q);
  geo.translate(opts.origen.x, opts.origen.y, opts.origen.z);
  return geo;
}

// gradiente de copa sombra→luz por altura (FollajeMasa lo consume)
function gradienteCopa(pal, yBase, yTop) {
  const cO = new THREE.Color(pal.oscuro), cM = new THREE.Color(pal.medio), cC = new THREE.Color(pal.claro);
  const tmp = new THREE.Color();
  const span = Math.max(0.001, yTop - yBase);
  return (x, y, z) => {
    const t = THREE.MathUtils.clamp((y - yBase) / span, 0, 1);
    if (t < 0.5) tmp.copy(cO).lerp(cM, t * 2);
    else tmp.copy(cM).lerp(cC, (t - 0.5) * 2);
    return tmp;
  };
}

// octaedro chiquito coloreado — la unidad de cereza/flor (8 tris, normales
// suaves a este tamaño leen redondo). Se traslada y colorea al fusionar.
function bolita(r, cx, cy, cz, color) {
  const g = new THREE.OctahedronGeometry(r, 0);
  g.translate(cx, cy, cz);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  EL CAFETO — candelabro: tallo vertical, ramas horizontales en pisos,
//  follaje en masa por rama, glomérulos de cereza EN la rama (axilas).
// ═════════════════════════════════════════════════════════════════════════════
function geoCafeto(seed) {
  const rn = prng(seed);
  const S = SPP.cafeto;
  // caturra/Castillo real: 1.45-1.8 m — MÁS BAJO que el ojo del que camina,
  // para que los surcos, el suelo y los parches de luz respiren en la vista
  const h = 1.45 + rn() * 0.35;
  const fase = rn() * 6.28;
  const maderas = [cilindroDoblado({
    h, r0: 0.045, r1: 0.02, seg: 5, hSeg: 3, fase, rn,
    onda: [0.03, 0.025], ...S.corteza,
  })];

  const esferas = [];        // lóbulos de follaje (uno por rama + remate)
  const frutos = [];         // glomérulos
  const cRojo = new THREE.Color(PALETA_CAFETAL.cereza);
  const cMad = new THREE.Color(PALETA_CAFETAL.cerezaMadura);
  const cPin = new THREE.Color(PALETA_CAFETAL.pinton);
  const cVer = new THREE.Color(PALETA_CAFETAL.bayaVerde);
  const cFlor = new THREE.Color(PALETA_CAFETAL.flor);
  const tmpC = new THREE.Color();

  const nPisos = 6 + Math.floor(rn() * 2);     // 6-7 pisos de ramas
  const y0 = 0.24;                             // primer piso (falda baja)
  const dir = new THREE.Vector3();
  for (let p = 0; p < nPisos; p++) {
    const fp = p / (nPisos - 1);
    const y = y0 + fp * (h - y0 - 0.12);
    const L = (0.80 - fp * 0.52) * (0.85 + rn() * 0.3);   // falda larga, cima corta
    const aBase = fase + p * 1.35;                        // rota ~77° por piso
    for (let lado = 0; lado < 2; lado++) {
      const a = aBase + lado * Math.PI + (rn() - 0.5) * 0.5;
      const caida = -(0.08 + fp * 0.08 + rn() * 0.06);    // la rama cuelga un pelo
      dir.set(Math.cos(a), caida, Math.sin(a)).normalize();
      maderas.push(ramaHacia({
        origen: new THREE.Vector3(0, y, 0), dir: dir.clone(),
        h: L, r0: 0.016, r1: 0.007, seg: 4, hSeg: 2, fase: fase + p + lado, rn,
        lean: [dir.x * 0.02, dir.z * 0.02], ...S.corteza,
      }));
      // lóbulo de masa hacia AFUERA (68% de la rama): el tramo interior queda
      // en madera desnuda — ahí es donde el glomérulo de cereza se VE
      const rl = 0.13 + L * 0.15;
      esferas.push({
        c: [dir.x * L * 0.68, y + dir.y * L * 0.68 + rl * 0.15, dir.z * L * 0.68],
        r: rl, esc: [1.15, 0.6, 1.15],
      });
      if (L > 0.62) {
        esferas.push({
          c: [dir.x * L * 0.98, y + dir.y * L * 0.98 + rl * 0.12, dir.z * L * 0.98],
          r: rl * 0.62, esc: [1.05, 0.6, 1.05],
        });
      }
      // GLOMÉRULOS: 1-3 nodos por rama en el 12-50% (pegados a la madera).
      // Cosecha bimodal: rojo dominante como acento + pintón + verde + flor.
      const nNudos = 1 + Math.floor(rn() * (L > 0.5 ? 3 : 2));
      for (let k = 0; k < nNudos; k++) {
        const t = 0.12 + rn() * 0.38;
        const bx = dir.x * L * t, by = y + dir.y * L * t, bz = dir.z * L * t;
        const nB = 3 + Math.floor(rn() * 3);
        const sorteo = rn();
        for (let b = 0; b < nB; b++) {
          const rB = 0.026 + rn() * 0.010;
          const u = sorteo < 0.14 ? cFlor
            : sorteo < 0.36 ? cVer
              : sorteo < 0.5 ? cPin
                : (rn() < 0.5 ? cRojo : cMad);
          tmpC.copy(u).offsetHSL(0, 0, (rn() - 0.5) * 0.05);
          // racimo APRETADO colgando apenas bajo la rama (así crece el glomérulo)
          frutos.push(bolita(
            sorteo < 0.14 ? rB * 0.55 : rB,
            bx + (rn() - 0.5) * 0.045, by - 0.01 - rn() * 0.035, bz + (rn() - 0.5) * 0.045,
            tmpC
          ));
        }
      }
    }
  }
  // remate: cogollo arriba
  esferas.push({ c: [0, h - 0.02, 0], r: 0.15 + rn() * 0.04, esc: [1, 0.8, 1] });

  let yB = Infinity, yT = -Infinity;
  for (const e of esferas) {
    yB = Math.min(yB, e.c[1] - e.r); yT = Math.max(yT, e.c[1] + e.r);
  }
  const grad = gradienteCopa(S.fol, yB, yT);
  // núcleo POR LÓBULO, hundido DENTRO de sus cards (doctrina FollajeMasa):
  // tapa el ver-a-través sin asomar. La columna central como huevo expuesto
  // fue el error de las pasadas 2-3 del gate.
  const nucleo = geometriaNucleoMasa(THREE, esferas, {
    seed, gradiente: grad, tonoSombra: S.sombra,
    sombra: 0.7, encoger: 0.62, rugosidad: 0.4, segs: [6, 5],
  });
  // cards CHICOS y densos: el card grande se lee como hoja contable (gate 1ª).
  // maxCards holgado: con el cap mordiendo, la cima del lóbulo achatado queda
  // calva y el núcleo asoma como panqueque (gate 4ª pasada).
  const cards = geometriaCardsMasa(THREE, esferas, {
    seed: seed + 1, gradiente: grad,
    cobertura: 1.6, tamCard: 0.21, minCards: 5, maxCards: 24,
  });
  const mats = matsDe('cafeto');
  return {
    altura: h,
    partes: [
      { nombre: 'madera', geo: fusionarPreservando(THREE, maderas), mat: mats.corteza, sombra: true },
      { nombre: 'nucleo', geo: nucleo, mat: mats.nucleo, sombra: false },
      { nombre: 'cards', geo: cards, mat: mats.cards, sombra: true },
      { nombre: 'frutos', geo: fusionarPreservando(THREE, frutos), mat: mats.frutos, sombra: false },
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  EL GUAMO — fuste alto, copa ancha PLANA y RALA (paraguas), guamas colgantes.
//  El núcleo NO proyecta sombra: los parches de luz en el suelo son la firma
//  visual del sombrío regulado.
// ═════════════════════════════════════════════════════════════════════════════
function geoGuamo(seed) {
  const rn = prng(seed);
  const S = SPP.guamo;
  const h = 6.4 + rn() * 1.6;                  // arranque de copa 6.4-8 m
  const fase = rn() * 6.28;
  const maderas = [cilindroDoblado({
    h: h + 1.0, r0: 0.34, r1: 0.13, seg: 7, hSeg: 6, fase, rn,
    onda: [0.16, 0.12], lean: [(rn() - 0.5) * 0.04, (rn() - 0.5) * 0.04],
    ...S.corteza,
  })];

  // lóbulos: anillo ancho de elipsoides ACHATADOS + centro — paraguas abierto
  const esferas = [];
  const nLob = 4 + Math.floor(rn() * 2);
  const spread = 2.3 + rn() * 0.8;
  for (let i = 0; i < nLob; i++) {
    const a = (i / nLob) * Math.PI * 2 + rn() * 0.7;
    const rad = spread * (0.8 + rn() * 0.4);
    const yy = h + 0.5 + rn() * 0.9;
    const r = 1.5 + rn() * 0.5;
    esferas.push({ c: [Math.cos(a) * rad, yy, Math.sin(a) * rad], r, esc: [1.25, 0.5, 1.25] });
    // rama principal que sostiene el lóbulo (se ve por los huecos del dosel)
    maderas.push(ramaHacia({
      origen: new THREE.Vector3(0, h * (0.62 + rn() * 0.18), 0),
      dir: new THREE.Vector3(Math.cos(a) * rad, yy - h * 0.7, Math.sin(a) * rad),
      h: Math.hypot(rad, yy - h * 0.7) * 1.04,
      r0: 0.12, r1: 0.045, seg: 5, hSeg: 3, fase: fase + i, rn,
      lean: [Math.cos(a) * 0.03, Math.sin(a) * 0.03], ...S.corteza,
    }));
  }
  esferas.push({ c: [(rn() - 0.5) * 0.8, h + 1.35, (rn() - 0.5) * 0.8], r: 1.45 + rn() * 0.35, esc: [1.3, 0.5, 1.3] });

  let yB = Infinity, yT = -Infinity;
  for (const e of esferas) {
    const ey = e.esc ? e.esc[1] : 1;
    yB = Math.min(yB, e.c[1] - e.r * ey); yT = Math.max(yT, e.c[1] + e.r * ey);
  }
  const grad = gradienteCopa(S.fol, yB, yT);
  const nucleo = geometriaNucleoMasa(THREE, esferas, {
    seed, gradiente: grad, tonoSombra: S.sombra,
    rugosidad: 0.44, encoger: 0.87, sombra: 0.6, segs: [13, 9],
  });
  // cards chicos y suficientes para VESTIR el lóbulo (con tamCard grande el
  // núcleo asomaba como fríjol liso — gate de la 1ª pasada); la RALEZA del
  // dosel la dan los claros ENTRE lóbulos, no la calvicie de cada lóbulo.
  const cards = geometriaCardsMasa(THREE, esferas, {
    seed: seed + 1, gradiente: grad,
    cobertura: 1.7, tamCard: 0.95, maxCards: 160, minCards: 20,
  });

  // GUAMAS: vainas verdes colgando bajo los lóbulos (la firma de Inga).
  // Se fusionan con la madera: mismo material vertexColors, cero draw extra.
  const nVainas = 10 + Math.floor(rn() * 6);
  for (let i = 0; i < nVainas; i++) {
    const e = esferas[Math.floor(rn() * esferas.length)];
    const a = rn() * Math.PI * 2, rr = rn() * e.r * 0.8;
    maderas.push(ramaHacia({
      origen: new THREE.Vector3(
        e.c[0] + Math.cos(a) * rr,
        e.c[1] - e.r * (e.esc ? e.esc[1] : 1) * 0.6,
        e.c[2] + Math.sin(a) * rr
      ),
      dir: new THREE.Vector3((rn() - 0.5) * 0.25, -1, (rn() - 0.5) * 0.25),
      h: 0.6 + rn() * 0.35, r0: 0.045, r1: 0.035, seg: 4, hSeg: 3,
      fase: fase + i * 2.7, rn,
      lean: [(rn() - 0.5) * 0.35, (rn() - 0.5) * 0.35],  // la vaina se curva
      base: PALETA_CAFETAL.guama, tinte: PALETA_CAFETAL.guamaOscura, banda: 0.5,
    }));
  }

  const mats = matsDe('guamo');
  return {
    altura: yT,
    partes: [
      { nombre: 'madera', geo: fusionarPreservando(THREE, maderas), mat: mats.corteza, sombra: true },
      { nombre: 'nucleo', geo: nucleo, mat: mats.nucleo, sombra: false },  // ← parches de luz
      { nombre: 'cards', geo: cards, mat: mats.cards, sombra: true },
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  PLANTAS SUELTAS (para Angelita Bros y vitrinas): Group listo para escena.
// ═════════════════════════════════════════════════════════════════════════════
function comoGrupo(nombreEspecie, fabrica, opts = {}) {
  const seed = opts.seed ?? hash32(nombreEspecie + '|' + (opts.variante ?? 0));
  const { partes, altura } = fabrica(seed);
  const grupo = new THREE.Group();
  for (const p of partes) {
    const mesh = new THREE.Mesh(p.geo, p.mat);
    mesh.castShadow = p.sombra;
    aplicarVientoSombra(mesh);
    mesh.receiveShadow = true;
    mesh.name = `${nombreEspecie}-${p.nombre}`;
    grupo.add(mesh);
  }
  grupo.userData = { especie: nombreEspecie, seed, altura, ...FICHA_CAFETAL[nombreEspecie] };
  return grupo;
}
export function crearCafeto(opts = {}) { return comoGrupo('cafeto', geoCafeto, opts); }
export function crearGuamo(opts = {}) { return comoGrupo('guamo', geoGuamo, opts); }

// ═════════════════════════════════════════════════════════════════════════════
//  IMPOSTORES — la mata horneada en canvas (capas sombra→cuerpo→luz: masa
//  ilustrada, no color plano) sobre cruz de 2 quads alpha-test.
// ═════════════════════════════════════════════════════════════════════════════
function geoCruz(planos = 2) {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (let p = 0; p < planos; p++) {
    const a = (p / planos) * Math.PI;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const [ex, ey] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) {
      pos.push(ex * ca, ey, ex * sa);
      uv.push(ex + 0.5, ey);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// pincel de hojitas por capas sobre un ctx (la técnica de texturaFollaje,
// aplicada a formas de mata en vez de disco)
function daub(ctx, rn, x, y, L, tono, alpha, alargue = 2.1) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rn() * Math.PI);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = tono;
  ctx.beginPath();
  ctx.ellipse(0, 0, L, L / alargue, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = ((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t;
  const g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t;
  const bl = (pa & 255) + ((pb & 255) - (pa & 255)) * t;
  return `rgb(${r | 0},${g | 0},${bl | 0})`;
}

// atlas 2×2 de matas de café (4 variantes): candelabro con pisos de masa
// oscura y glomérulos rojos pegados al eje. A distancia = surco verde profundo
// con chispas rojas.
function texturaMataCafe(seed) {
  const tam = 512, T = tam / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, tam, tam);
  const F = SPP.cafeto.fol;
  for (let v = 0; v < 4; v++) {
    const rn = prng(seed * 131 + v * 977 + 7);
    const ox = (v % 2) * T, oy = ((v / 2) | 0) * T;
    const cx = ox + T / 2;
    // tallo
    ctx.strokeStyle = PALETA_CAFETAL.cortezaCafe;
    ctx.globalAlpha = 0.9; ctx.lineWidth = T * 0.022;
    ctx.beginPath();
    ctx.moveTo(cx, oy + T * 0.97); ctx.lineTo(cx + (rn() - 0.5) * T * 0.05, oy + T * 0.12);
    ctx.stroke();
    // pisos de follaje: anchos abajo, cortos arriba (candelabro)
    const nP = 6;
    for (let p = 0; p < nP; p++) {
      const fy = oy + T * (0.16 + (p / (nP - 1)) * 0.72);
      const half = T * (0.14 + (p / (nP - 1)) * 0.28) * (0.85 + rn() * 0.3);
      for (let i = 0; i < 26; i++) {
        const t = (rn() * 2 - 1);
        const x = cx + t * half, y = fy + (rn() - 0.5) * T * 0.075 + Math.abs(t) * T * 0.03;
        const capa = rn();
        const tono = capa < 0.3 ? lerpHex(F.oscuro, F.medio, rn() * 0.4)
          : capa < 0.75 ? lerpHex(F.medio, F.claro, rn() * 0.5)
            : lerpHex(F.medio, F.claro, 0.55 + rn() * 0.45);
        daub(ctx, rn, x, y, T * (0.02 + rn() * 0.026), tono, capa < 0.3 ? 0.6 : 0.9);
      }
      // glomérulos: puntitos rojos PEGADOS al eje (como crecen), acento
      if (p < nP - 1) {
        const nG = 1 + Math.floor(rn() * 2);
        for (let g = 0; g < nG; g++) {
          const gx = cx + (rn() * 2 - 1) * half * 0.42;
          const gy = fy + (rn() - 0.5) * T * 0.05;
          for (let b = 0; b < 3 + Math.floor(rn() * 3); b++) {
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = rn() < 0.25 ? PALETA_CAFETAL.pinton : PALETA_CAFETAL.cereza;
            ctx.beginPath();
            ctx.arc(gx + (rn() - 0.5) * T * 0.03, gy + (rn() - 0.5) * T * 0.03, T * (0.006 + rn() * 0.005), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// atlas 2×2 de guamos lejanos: copa ancha plana con claros + fuste
function texturaGuamoLejos(seed) {
  const tam = 512, T = tam / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, tam, tam);
  const F = SPP.guamo.fol;
  for (let v = 0; v < 4; v++) {
    const rn = prng(seed * 733 + v * 389 + 3);
    const ox = (v % 2) * T, oy = ((v / 2) | 0) * T;
    const cx = ox + T / 2;
    // fuste + un par de ramas madre
    ctx.strokeStyle = PALETA_CAFETAL.cortezaGuamo;
    ctx.globalAlpha = 0.92; ctx.lineWidth = T * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx, oy + T * 0.98); ctx.lineTo(cx + (rn() - 0.5) * T * 0.06, oy + T * 0.42);
    ctx.stroke();
    ctx.lineWidth = T * 0.014;
    for (let r = 0; r < 3; r++) {
      const dx = (rn() * 2 - 1) * T * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx, oy + T * (0.42 + rn() * 0.1));
      ctx.lineTo(cx + dx, oy + T * (0.22 + rn() * 0.08));
      ctx.stroke();
    }
    // copa: lóbulos ACHATADOS repartidos a lo ancho, con CLAROS entre ellos
    const nLob = 4 + Math.floor(rn() * 2);
    for (let l = 0; l < nLob; l++) {
      const lx = cx + (l / (nLob - 1) - 0.5) * T * 0.78 + (rn() - 0.5) * T * 0.06;
      const ly = oy + T * (0.20 + rn() * 0.10);
      const half = T * (0.10 + rn() * 0.05);
      for (let i = 0; i < 34; i++) {
        const t = rn() * 2 - 1;
        const x = lx + t * half, y = ly + (rn() - 0.5) * half * 0.65;
        const capa = rn();
        const tono = capa < 0.3 ? lerpHex(F.oscuro, F.medio, rn() * 0.4)
          : capa < 0.72 ? lerpHex(F.medio, F.claro, rn() * 0.55)
            : lerpHex(F.medio, F.claro, 0.5 + rn() * 0.5);
        daub(ctx, rn, x, y, T * (0.018 + rn() * 0.024), tono, capa < 0.3 ? 0.55 : 0.88, 2.3);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ── shader de cartas (doctrina matrizParamo): opaco con discard, erosión por
// cercanía (cede al héroe), colapso duro por lejanía (la niebla ya pintó todo),
// viento del reloj global, niebla FogExp2 idéntica a la del mundo. ────────────
const VERT_CARTA = /* glsl */`
  attribute vec3 aVar;
  uniform float uTiempoVM, uFuerzaVM, uViento, uCorte;
  varying vec2 vUv;
  varying float vDist, vAlt;
  varying vec3 vTint;
  void main() {
    vec3 p = position;
    float hf = clamp(p.y, 0.0, 1.0);
    vec4 wp4 = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vec3 wp = wp4.xyz;
    float fase = wp.x * 0.19 + wp.z * 0.11;
    float onda = sin(uTiempoVM * 1.1 + fase) + 0.42 * sin(uTiempoVM * 2.3 + fase * 1.7);
    float alto = length(instanceMatrix[1].xyz);
    float sway = uViento * uFuerzaVM * onda * hf * hf * 0.06 * alto;
    wp.x += sway; wp.z += sway * 0.55;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vDist = -mv.z;
    if (vDist > uCorte) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vAlt = hf;
    vUv = aVar.xy + uv * aVar.z;
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #else
      vTint = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG_CARTA = /* glsl */`
  precision mediump float;
  uniform sampler2D uMapa;
  uniform float uUmbral, uCerca, uLejos, uAmbiente;
  uniform float uNieblaDens, uNieblaFuerza;
  uniform vec3 uNiebla;
  varying vec2 vUv;
  varying float vDist, vAlt;
  varying vec3 vTint;
  void main() {
    vec4 t = texture2D(uMapa, vUv);
    float k = smoothstep(uCerca, uLejos, vDist);      // 0 pegado → erosionado
    float umbral = mix(0.98, uUmbral, k);
    if (t.a < umbral) discard;
    vec3 c = t.rgb * vTint;
    c *= mix(0.72, 1.05, smoothstep(0.0, 0.6, vAlt)); // AO de la falda
    c *= uAmbiente;
    float f = 1.0 - exp(-uNieblaDens * uNieblaDens * vDist * vDist);
    c = mix(c, uNiebla, f * uNieblaFuerza);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;
function materialCarta(tex, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMapa: { value: tex },
      uTiempoVM: uniformesVientoMundo.uTiempoVM,     // reloj global por referencia
      uFuerzaVM: uniformesVientoMundo.uFuerzaVM,
      uViento: { value: opts.viento ?? 0.7 },
      uUmbral: { value: opts.umbral ?? 0.32 },
      uCerca: { value: opts.cerca ?? 12 },
      uLejos: { value: opts.lejos ?? 24 },
      uCorte: { value: opts.corte ?? 170 },
      uAmbiente: { value: opts.ambiente ?? 1.0 },
      uNiebla: { value: new THREE.Color(opts.niebla?.color ?? 0xd8dfc4) },
      uNieblaDens: { value: opts.niebla?.densidad ?? 0 },
      uNieblaFuerza: { value: opts.niebla?.fuerza ?? 0.85 },
    },
    vertexShader: VERT_CARTA,
    fragmentShader: FRAG_CARTA,
    side: THREE.DoubleSide,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  EL CAFETAL COMPLETO — siembra + dosel + anillo de detalle + impostores.
// ═════════════════════════════════════════════════════════════════════════════
export function crearCafetalSombra(opts = {}) {
  const area = opts.area ?? { x0: -40, x1: 40, z0: -40, z1: 40 };
  const alturaEn = opts.alturaEn ?? (() => 0);
  const libre = opts.libre ?? (() => true);
  const seed = opts.seed ?? 26;
  const surco = opts.surco ?? 2.2;      // la CALLE entre surcos se debe poder
  const mata = opts.mata ?? 1.5;        // caminar (y por ella entra la luz)
  const guamoCada = opts.guamoCada ?? 11;
  const radioDetalle = opts.radioDetalle ?? 20;
  const radioGuamo = opts.radioGuamo ?? 55;
  const corte = opts.corte ?? 170;
  const niebla = opts.niebla ?? null;
  const variantes = Math.max(1, opts.variantes ?? 3);
  const rn = prng(seed * 5077 + 13);

  const anchoX = area.x1 - area.x0, anchoZ = area.z1 - area.z0;
  const m2 = anchoX * anchoZ;
  const grupo = new THREE.Group();
  grupo.name = 'cafetal-sombra';

  // ── 1) DOSEL: guamos en cuadrícula floja (así se siembra el sombrío) ───────
  const guamos = [];
  for (let gx = area.x0 + guamoCada * 0.5; gx < area.x1; gx += guamoCada) {
    for (let gz = area.z0 + guamoCada * 0.5; gz < area.z1; gz += guamoCada) {
      const x = gx + (rn() - 0.5) * guamoCada * 0.5;
      const z = gz + (rn() - 0.5) * guamoCada * 0.5;
      if (x < area.x0 || x > area.x1 || z < area.z0 || z > area.z1) continue;
      if (!libre(x, z)) continue;
      guamos.push({ x, z, y: alturaEn(x, z), rot: rn() * Math.PI * 2, esc: 0.85 + rn() * 0.3 });
    }
  }

  // ── 2) SURCOS a media ladera: la dirección del surco es PERPENDICULAR al
  // gradiente dominante del terreno (curva de nivel aproximada — con terreno
  // plano cae a surcos rectos). Meandro suave con ruido: mano campesina. ──────
  const cxA = (area.x0 + area.x1) / 2, czA = (area.z0 + area.z1) / 2;
  const eps = 2;
  const gX = (alturaEn(cxA + eps, czA) - alturaEn(cxA - eps, czA)) / (2 * eps);
  const gZ = (alturaEn(cxA, czA + eps) - alturaEn(cxA, czA - eps)) / (2 * eps);
  const gLen = Math.hypot(gX, gZ);
  // surco ⟂ gradiente; pendiente plana → a lo largo de X
  const sx = gLen > 0.01 ? -gZ / gLen : 1, sz = gLen > 0.01 ? gX / gLen : 0;
  const px = -sz, pz = sx;                       // ⟂ del surco (entre-surcos)
  const diag = Math.hypot(anchoX, anchoZ);
  const cafetos = [];
  const nSurcos = Math.ceil(diag / surco);
  for (let s = -nSurcos / 2; s < nSurcos / 2; s++) {
    const meandro = (vnoise(s * 0.23 + seed, seed * 0.7) - 0.5) * surco * 0.45;
    const bx = cxA + px * (s * surco + meandro);
    const bz = czA + pz * (s * surco + meandro);
    const nMatas = Math.ceil(diag / mata);
    for (let m = -nMatas / 2; m < nMatas / 2; m++) {
      const serp = (vnoise(m * 0.11 + s * 3.7, seed) - 0.5) * 0.35;
      const x = bx + sx * m * mata + px * serp + (rn() - 0.5) * 0.22;
      const z = bz + sz * m * mata + pz * serp + (rn() - 0.5) * 0.22;
      if (x < area.x0 + 0.6 || x > area.x1 - 0.6 || z < area.z0 + 0.6 || z > area.z1 - 0.6) continue;
      if (!libre(x, z)) continue;
      // el cafeto le cede el plato al guamo (1.4 m alrededor del fuste)
      let cede = false;
      for (const g of guamos) {
        const dx = g.x - x, dz = g.z - z;
        if (dx * dx + dz * dz < 1.4 * 1.4) { cede = true; break; }
      }
      if (cede) continue;
      cafetos.push({ x, z, y: alturaEn(x, z), rot: rn() * Math.PI * 2, esc: 0.85 + rn() * 0.3 });
    }
  }

  // ── 3) CAFETOS HÉROE: tiles de 12 m, 1 variante por tile, InstancedMesh por
  // parte. El tile entero se prende/apaga por distancia en actualizar(). ──────
  const TILE = opts.tile ?? 12;
  const desechables = [];
  const variantesGeo = [];
  for (let v = 0; v < variantes; v++) {
    const g = geoCafeto(hash32(`cafetal|${seed}|v${v}`));
    variantesGeo.push(g);
    for (const p of g.partes) desechables.push(p.geo);
  }
  const trisCafeto = Math.round(variantesGeo.reduce((a, g) =>
    a + g.partes.reduce((b, p) => b + p.geo.attributes.position.count / 3, 0), 0) / variantes);

  const tilesCafe = [];
  {
    const nx = Math.max(1, Math.ceil(anchoX / TILE));
    const cubos = new Map();
    for (const c of cafetos) {
      const gx = Math.min(nx - 1, Math.max(0, Math.floor((c.x - area.x0) / TILE)));
      const gz = Math.max(0, Math.floor((c.z - area.z0) / TILE));
      const k = gz * nx + gx;
      let l = cubos.get(k);
      if (!l) { l = []; cubos.set(k, l); }
      l.push(c);
    }
    const grupoHeroes = new THREE.Group();
    grupoHeroes.name = 'cafetos-heroe';
    grupo.add(grupoHeroes);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const vP = new THREE.Vector3(), vE = new THREE.Vector3();
    const YAX = new THREE.Vector3(0, 1, 0);
    for (const [k, lista] of cubos) {
      const gx = k % nx, gz = (k / nx) | 0;
      const varTile = (gx * 7 + gz * 13) % variantes;    // vecinos distintos
      const tileG = new THREE.Group();
      tileG.name = `cafe-tile-${gx}-${gz}`;
      for (const parte of variantesGeo[varTile].partes) {
        const im = new THREE.InstancedMesh(parte.geo, parte.mat, lista.length);
        im.name = `cafe-${gx}-${gz}-${parte.nombre}`;
        for (let i = 0; i < lista.length; i++) {
          const c = lista[i];
          q.setFromAxisAngle(YAX, c.rot);
          vP.set(c.x, c.y, c.z); vE.setScalar(c.esc);
          m4.compose(vP, q, vE);
          im.setMatrixAt(i, m4);
        }
        im.castShadow = parte.sombra;
        aplicarVientoSombra(im);
        im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true;
        tileG.add(im);
      }
      grupoHeroes.add(tileG);
      tileG.visible = false;
      tilesCafe.push({
        cx: area.x0 + (gx + 0.5) * TILE, cz: area.z0 + (gz + 0.5) * TILE,
        grupo: tileG, n: lista.length,
      });
    }
  }

  // ── 4) MANTO de impostores de café: super-tiles con frustum culling ────────
  const texCafe = texturaMataCafe(seed);
  const matCafeLejos = materialCarta(texCafe, {
    viento: 0.5, umbral: 0.34,
    cerca: radioDetalle * 0.55, lejos: radioDetalle * 1.05, corte,
    ambiente: 0.88,                 // el café vive en la media-luz del sombrío
    niebla,
  });
  const SUPER = opts.tileManto ?? 32;
  const capasCafe = [];
  {
    const nsx = Math.max(1, Math.ceil(anchoX / SUPER));
    const cubos = new Map();
    for (const c of cafetos) {
      const gx = Math.min(nsx - 1, Math.max(0, Math.floor((c.x - area.x0) / SUPER)));
      const gz = Math.max(0, Math.floor((c.z - area.z0) / SUPER));
      const k = gz * nsx + gx;
      let l = cubos.get(k);
      if (!l) { l = []; cubos.set(k, l); }
      l.push(c);
    }
    const grupoManto = new THREE.Group();
    grupoManto.name = 'cafetos-manto';
    grupo.add(grupoManto);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const vP = new THREE.Vector3(), vE = new THREE.Vector3();
    const YAX = new THREE.Vector3(0, 1, 0);
    for (const [k, lista] of cubos) {
      const gx = k % nsx, gz = (k / nsx) | 0;
      const n = lista.length;
      const geo = geoCruz(2);
      const aVar = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      geo.setAttribute('aVar', aVar);
      const im = new THREE.InstancedMesh(geo, matCafeLejos, n);
      im.name = `cafe-manto-${gx}-${gz}`;
      im.castShadow = false; im.receiveShadow = false;
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      const av = aVar.array, ic = im.instanceColor.array;
      for (let i = 0; i < n; i++) {
        const c = lista[i];
        q.setFromAxisAngle(YAX, c.rot);
        vP.set(c.x, c.y, c.z);
        vE.set(1.35 * c.esc, 1.65 * c.esc, 1.35 * c.esc);
        m4.compose(vP, q, vE);
        im.setMatrixAt(i, m4);
        const varI = (i * 2654435761) % 4;
        av[i * 3] = (varI % 2) * 0.5; av[i * 3 + 1] = ((varI / 2) | 0) * 0.5; av[i * 3 + 2] = 0.5;
        const t = 0.9 + ((i * 40503) % 97) / 97 * 0.2;
        ic[i * 3] = t * 0.97; ic[i * 3 + 1] = t; ic[i * 3 + 2] = t * 0.92;
      }
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
      aVar.needsUpdate = true;
      grupoManto.add(im);
      capasCafe.push({ cx: area.x0 + (gx + 0.5) * SUPER, cz: area.z0 + (gz + 0.5) * SUPER, mesh: im });
    }
  }

  // ── 5) GUAMOS HÉROE en super-tiles + manto de guamos lejanos ───────────────
  const TILE_G = opts.tileGuamo ?? 44;
  const variantesGuamo = [];
  for (let v = 0; v < 2; v++) {
    const g = geoGuamo(hash32(`guamo|${seed}|v${v}`));
    variantesGuamo.push(g);
    for (const p of g.partes) desechables.push(p.geo);
  }
  const trisGuamo = Math.round(variantesGuamo.reduce((a, g) =>
    a + g.partes.reduce((b, p) => b + p.geo.attributes.position.count / 3, 0), 0) / 2);

  const tilesGuamo = [];
  {
    const nx = Math.max(1, Math.ceil(anchoX / TILE_G));
    const cubos = new Map();
    guamos.forEach((g, i) => {
      const gx = Math.min(nx - 1, Math.max(0, Math.floor((g.x - area.x0) / TILE_G)));
      const gz = Math.max(0, Math.floor((g.z - area.z0) / TILE_G));
      const k = gz * nx + gx;
      let l = cubos.get(k);
      if (!l) { l = []; cubos.set(k, l); }
      l.push(g);
    });
    const grupoDosel = new THREE.Group();
    grupoDosel.name = 'guamos-heroe';
    grupo.add(grupoDosel);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const vP = new THREE.Vector3(), vE = new THREE.Vector3();
    const YAX = new THREE.Vector3(0, 1, 0);
    for (const [k, lista] of cubos) {
      const gx = k % nx, gz = (k / nx) | 0;
      const varTile = (gx + gz) % 2;
      const tileG = new THREE.Group();
      tileG.name = `guamo-tile-${gx}-${gz}`;
      for (const parte of variantesGuamo[varTile].partes) {
        const im = new THREE.InstancedMesh(parte.geo, parte.mat, lista.length);
        im.name = `guamo-${gx}-${gz}-${parte.nombre}`;
        for (let i = 0; i < lista.length; i++) {
          const g = lista[i];
          q.setFromAxisAngle(YAX, g.rot);
          vP.set(g.x, g.y, g.z); vE.setScalar(g.esc);
          m4.compose(vP, q, vE);
          im.setMatrixAt(i, m4);
        }
        im.castShadow = parte.sombra;      // núcleo NO: la luz cae en parches
        aplicarVientoSombra(im);
        im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true;
        tileG.add(im);
      }
      grupoDosel.add(tileG);
      tileG.visible = false;
      tilesGuamo.push({
        cx: area.x0 + (gx + 0.5) * TILE_G, cz: area.z0 + (gz + 0.5) * TILE_G,
        grupo: tileG, n: lista.length,
      });
    }
  }

  // manto de guamos lejanos (un InstancedMesh global: son pocos)
  let mantoGuamo = null;
  if (guamos.length) {
    const texG = texturaGuamoLejos(seed + 17);
    const matG = materialCarta(texG, {
      viento: 0.8, umbral: 0.34,
      cerca: radioGuamo * 0.72, lejos: radioGuamo * 1.05, corte: corte + 40,
      ambiente: 1.0, niebla,
    });
    const geo = geoCruz(2);
    const n = guamos.length;
    const aVar = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    geo.setAttribute('aVar', aVar);
    mantoGuamo = new THREE.InstancedMesh(geo, matG, n);
    mantoGuamo.name = 'guamos-manto';
    mantoGuamo.castShadow = false; mantoGuamo.receiveShadow = false;
    mantoGuamo.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const vP = new THREE.Vector3(), vE = new THREE.Vector3();
    const YAX = new THREE.Vector3(0, 1, 0);
    const av = aVar.array, ic = mantoGuamo.instanceColor.array;
    for (let i = 0; i < n; i++) {
      const g = guamos[i];
      q.setFromAxisAngle(YAX, g.rot);
      vP.set(g.x, g.y, g.z);
      vE.set(9.5 * g.esc, 10.5 * g.esc, 9.5 * g.esc);
      m4.compose(vP, q, vE);
      mantoGuamo.setMatrixAt(i, m4);
      const varI = (i * 2654435761) % 4;
      av[i * 3] = (varI % 2) * 0.5; av[i * 3 + 1] = ((varI / 2) | 0) * 0.5; av[i * 3 + 2] = 0.5;
      const t = 0.92 + ((i * 40503) % 89) / 89 * 0.16;
      ic[i * 3] = t * 0.96; ic[i * 3 + 1] = t; ic[i * 3 + 2] = t * 0.9;
    }
    mantoGuamo.instanceMatrix.needsUpdate = true;
    mantoGuamo.instanceColor.needsUpdate = true;
    aVar.needsUpdate = true;
    grupo.add(mantoGuamo);
  }

  // ── 6) actualizar(camara): 1×/frame — prende el anillo, apaga el resto ─────
  const rDet2 = (radioDetalle + TILE * 0.71) ** 2;
  const rGua2 = (radioGuamo + TILE_G * 0.71) ** 2;
  const rManto2 = (corte + SUPER) ** 2;
  function actualizar(camara) {
    if (!camara) return;
    const cx = camara.position.x, cz = camara.position.z;
    for (let i = 0; i < tilesCafe.length; i++) {
      const t = tilesCafe[i];
      const dx = t.cx - cx, dz = t.cz - cz;
      t.grupo.visible = (dx * dx + dz * dz) < rDet2;
    }
    for (let i = 0; i < tilesGuamo.length; i++) {
      const t = tilesGuamo[i];
      const dx = t.cx - cx, dz = t.cz - cz;
      t.grupo.visible = (dx * dx + dz * dz) < rGua2;
    }
    for (let i = 0; i < capasCafe.length; i++) {
      const c = capasCafe[i];
      const dx = c.cx - cx, dz = c.cz - cz;
      c.mesh.visible = (dx * dx + dz * dz) < rManto2;
    }
  }

  // sombrío estimado: área de copa de guamo sobre el lote (Ø medio ≈ 8.2 m)
  const sombraPct = Math.min(95, Math.round(guamos.length * Math.PI * 4.1 * 4.1 / m2 * 100));
  const conteo = {
    cafetos: cafetos.length, guamos: guamos.length,
    sombraPct, ha: +(m2 / 10000).toFixed(2),
  };

  function stats() {
    return {
      ...conteo,
      trisCafetoHeroe: trisCafeto, trisGuamoHeroe: trisGuamo,
      tilesCafe: tilesCafe.length,
      tilesCafeVivos: tilesCafe.reduce((a, t) => a + (t.grupo.visible ? 1 : 0), 0),
      tilesGuamo: tilesGuamo.length,
      tilesGuamoVivos: tilesGuamo.reduce((a, t) => a + (t.grupo.visible ? 1 : 0), 0),
      superTilesManto: capasCafe.length,
      radioDetalle, radioGuamo,
    };
  }

  function dispose() {
    for (const d of desechables) d.dispose();
    for (const c of capasCafe) c.mesh.geometry.dispose();
    matCafeLejos.dispose();
    texCafe.dispose();
    if (mantoGuamo) {
      mantoGuamo.geometry.dispose();
      mantoGuamo.material.uniforms.uMapa.value.dispose();
      mantoGuamo.material.dispose();
    }
  }

  grupo.userData = { paleta: PALETA_CAFETAL, ficha: FICHA_CAFETAL, conteo };
  return { grupo, actualizar, stats, conteo, dispose };
}
