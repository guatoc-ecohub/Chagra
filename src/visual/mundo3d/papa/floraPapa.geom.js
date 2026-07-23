/*
 * floraPapa.geom — la GEOMETRÍA del PAPAL de tierra fría (piso frío, 2.000–3.200 m).
 *
 * La papa criolla es EL cultivo del frío: la montaña alta, el aire delgado y la
 * tierra negra. Y su firma visual es el SURCO — el caballón de tierra amontonada
 * a curva de nivel donde la mata se aporca. Aquí el caballón va HORNEADO EN EL
 * RELIEVE del terreno (no es utilería: es la geografía), y encima de cada lomo
 * va sembrada la mata. Cada especie con su identidad inequívoca:
 *
 *   · Mata de papa (Solanum       — mata baja y tupida de follaje verde medio,
 *     phureja, la criolla)          amontonada sobre el caballón.
 *   · Flor de papa                — INSTANCIADA APARTE con color por instancia:
 *                                   LILA o BLANCA (así florece la papa andina,
 *                                   según la variedad de cada mata).
 *   · Papa criolla (tubérculo)    — instanciada con color por instancia en el
 *                                   rincón de COSECHA: amarilla criolla en su
 *                                   mayoría, con rojas y moradas — la diversidad
 *                                   de variedades andinas a la vista.
 *   · Paja de pajonal             — los macollos amarillos del frío rodeando
 *                                   el lote (la tierra alta se anuncia sola).
 *   · Frailejón lejano            — SILUETA al fondo, en la loma alta: la seña
 *                                   de que el páramo queda ahí no más.
 *   · Montículo de cosecha        — la tierra abierta con azadón, destapada.
 *   · Piedra                      — la piedra suelta de la montaña.
 *
 * TÉCNICA tier-safe (mismo contrato que floraCafetal.geom): cada especie se
 * FUSIONA en UNA geometría con color horneado en vertexColors y se dibuja con
 * UN InstancedMesh → una draw-call por especie. FLOR y PAPA se pintan BLANCAS
 * en la geometría para que el color POR INSTANCIA (setColorAt) sea el real.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (ya mordió varias veces): aquí TODO se desindexa
 * antes de fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  La ladera fría (la geografía del mundo, determinista)                      */
/* -------------------------------------------------------------------------- */

export const ANCHO = 40; // x: -20 … 20
export const FONDO = 38; // z: -19 (la loma alta, arriba) … 19 (el frente, abajo)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma ladera siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/** La altura BASE de la ladera (sin surcos): sube fuerte hacia el fondo. */
export function alturaBase(wx, wz) {
  const sub = smoothstep(8, -17, wz); // 0 al frente (bajo), 1 en la loma alta
  let h = 0.15;
  h += sub * sub * 7.2; // la tierra fría es de pendiente brava
  h += ruido(wx * 0.45, wz * 0.45) * 0.4 * (0.3 + sub); // ondulación natural
  return h;
}

/* --- Los SURCOS: caballones a curva de nivel, horneados en el relieve. ----- */

/* Las filas del lote (z del centro de cada caballón) y su curva de nivel. */
export const FILAS_SURCO = [7.2, 5.6, 4.0, 2.4, 0.8, -0.8, -2.4, -4.0, -5.6, -7.2, -8.8, -10.4];

/** La curva de nivel del surco: el caballón serpentea con la ladera. */
export function curvaSurco(wx, fila) {
  return Math.sin(wx * 0.11 + fila * 0.55) * 1.05;
}

/* El lote sembrado (dónde hay caballones) y los claros que el lote respeta. */
export const SITIO_CASA = /** @type {[number, number]} */ ([-11.5, -13.2]);
export const SITIO_COSECHA = /** @type {[number, number]} */ ([6.8, 4.6]);

/** Máscara 0…1 del lote sembrado (dentro hay caballones; fuera, pajonal). */
export function dentroLote(wx, wz) {
  let m =
    smoothstep(-17, -14.5, wx) *
    smoothstep(17, 14.5, wx) *
    smoothstep(9.4, 7.6, wz) *
    smoothstep(-13.2, -11.0, wz);
  // el claro de la cosecha (la tierra ya destapada) y el patio de la casa
  const dCx = wx - SITIO_COSECHA[0];
  const dCz = wz - SITIO_COSECHA[1];
  m *= smoothstep(6.5, 13.5, dCx * dCx + dCz * dCz);
  const dHx = wx - SITIO_CASA[0];
  const dHz = wz - SITIO_CASA[1];
  m *= smoothstep(9, 20, dHx * dHx + dHz * dHz);
  return m;
}

/**
 * El RELIEVE del caballón en un punto: la campana de tierra amontonada de la
 * fila más cercana, solo dentro del lote. Devuelve también qué tan "encima del
 * lomo" está el punto (para pintar la tierra en el terreno).
 */
export function reliefSurco(wx, wz) {
  const lote = dentroLote(wx, wz);
  if (lote <= 0.001) return { alza: 0, lomo: 0, lote: 0 };
  let mejor = 1e9;
  for (let i = 0; i < FILAS_SURCO.length; i++) {
    const zc = FILAS_SURCO[i] + curvaSurco(wx, i);
    const d = wz - zc;
    const d2 = d * d;
    if (d2 < mejor) mejor = d2;
  }
  // campana del caballón: ~0.9 de ancho, 0.42 de alto de tierra aporcada
  const perfil = Math.exp(-mejor / 0.2);
  return { alza: perfil * 0.42 * lote, lomo: perfil * lote, lote };
}

/** La altura FINAL de la ladera con los surcos horneados. */
export function alturaLadera(wx, wz) {
  return alturaBase(wx, wz) + reliefSurco(wx, wz).alza;
}

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Instancias por especie. 'alto' puebla el papal pleno; 'medio' es frugal;
 * 'bajo' deja lo mínimo para que AÚN se lea "papal en surcos con pajonal". La
 * flor es el conteo del InstancedMesh de flores (repartidas entre las matas) y
 * la papa el de tubérculos destapados en el rincón de cosecha.
 */
export const FLORA_PAPA = {
  alto: { mata: 130, flor: 300, papa: 84, paja: 90, frailejon: 9, monticulo: 3, piedra: 7 },
  medio: { mata: 78, flor: 160, papa: 48, paja: 52, frailejon: 5, monticulo: 2, piedra: 4 },
  bajo: { mata: 36, flor: 66, papa: 22, paja: 24, frailejon: 3, monticulo: 1, piedra: 2 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const papalDeTier = (tier) => FLORA_PAPA[tier] || FLORA_PAPA.medio;

/** Factor de detalle geométrico por tier (menos blobs/hojas en gama baja). */
export const CALIDAD_PAPA = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadPapa = (tier) => CALIDAD_PAPA[tier] ?? CALIDAD_PAPA.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del papal (colores horneados en vertexColors)                       */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Mata de papa (la criolla): follaje verde medio, un pelo amarilloso
  mataTallo: '#5d7038',
  mataHoja: '#4d7a35',
  mataHojaSol: '#699344',
  mataBrote: '#86a84e',

  // Las flores van POR INSTANCIA (referencia): lila y blanca
  florLila: '#b28cd6',
  florLila2: '#9a72c4',
  florBlanca: '#f3eef8',

  // El tubérculo va POR INSTANCIA (referencia): la diversidad andina.
  // Subidos de valor a propósito (receta del cafetal #2707): sobre tierra
  // negra el tubérculo tiene que GRITAR — la morada original ('#5c3a66')
  // leía NEGRO en penumbra y borraba la lección de las tres variedades.
  papaCriolla: '#f2c440', // la amarilla, la reina
  papaCriolla2: '#e0ad2e',
  papaRoja: '#c25538', // la pastusa roja
  papaMorada: '#7d5290', // la morada andina

  // Pajonal (los macollos del frío)
  paja: '#b3a95e',
  pajaSeca: '#c2b476',
  pajaVerde: '#8f9a52',

  // Frailejón lejano (silueta, no protagonista): la roseta plateada manda
  frailejonTronco: '#7a6648',
  frailejonHoja: '#aebe9a',
  frailejonHojaSeca: '#bcae84',

  // Tierra y piedra
  tierraNegra: '#43352a',
  tierraAbierta: '#382c21',
  piedra: '#8d8a80',
  liquen: '#a5a986',

  // El costal de fique de la cosecha
  costal: '#c8b184',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades (fusión desindexada + colocación + color horneado)              */
/* -------------------------------------------------------------------------- */

const UP = new THREE.Vector3(0, 1, 0);

/** Hornea un color plano en TODOS los vértices (atributo `color`). */
function pintar(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Coloca una geometría (posición/rotación/escala) transformando vértices. */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el +Y de la geometría hacia `dir` y la ubica en `pos` (hojas). */
function apuntar(geo, pos, dir, esc = [1, 1, 1]) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    q,
    new THREE.Vector3(esc[0], esc[1], esc[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/**
 * Fusiona partes (ya coloreadas) en UNA geometría. Se DESINDEXA todo antes de
 * fusionar y se TRUENA si falla: mejor un error de build que una especie
 * invisible en producción (mordida conocida de mergeGeometries).
 */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((p) => {
    const plana = p.index ? p.toNonIndexed() : p;
    if (plana !== p) p.dispose();
    return plana;
  });
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error('floraPapa: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que el papal no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  MATA DE PAPA (Solanum phureja, la criolla) — el cultivo                    */
/* -------------------------------------------------------------------------- */

/*
 * Mata BAJA y tupida, amontonada sobre el caballón: tallos cortos que apenas
 * asoman y 3–4 masas de follaje anchas y pegadas al lomo de tierra. Las FLORES
 * no van aquí: son un InstancedMesh aparte con color por instancia (lila o
 * blanca, según la variedad de la mata).
 */
export function geomMataPapa({ q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];

  // Los tallitos que asoman entre el follaje.
  const nTallos = q < 0.5 ? 2 : 3;
  for (let i = 0; i < nTallos; i++) {
    const a = (i / nTallos) * Math.PI * 2 + r();
    const tallo = new THREE.CylinderGeometry(0.014, 0.022, 0.34, 4, 1);
    apuntar(tallo, [Math.cos(a) * 0.1, 0.16, Math.sin(a) * 0.1], [Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35]);
    partes.push(pintar(tallo, PAL.mataTallo));
  }

  // Las masas de follaje: anchas, bajas, amontonadas (la mata aporcada).
  const masas = [
    { x: 0, z: 0, y: 0.2, rad: 0.3, cara: false },
    { x: 0.2, z: 0.14, y: 0.16, rad: 0.24, cara: true },
    { x: -0.2, z: -0.1, y: 0.17, rad: 0.25, cara: false },
    { x: -0.02, z: 0.18, y: 0.28, rad: 0.2, cara: true },
  ];
  const nMasas = q < 0.5 ? 3 : 4;
  for (let i = 0; i < nMasas; i++) {
    const m = masas[i];
    const masa = new THREE.IcosahedronGeometry(m.rad, 1); // detail 1: mata tupida
    poner(
      masa,
      [m.x + (r() - 0.5) * 0.06, m.y, m.z + (r() - 0.5) * 0.06],
      [0, r() * Math.PI, 0],
      [1.35, 0.72, 1.35],
    );
    partes.push(pintar(masa, variar(m.cara ? PAL.mataHojaSol : PAL.mataHoja, r, 0.05)));
  }

  // El cogollo tierno del centro.
  const brote = new THREE.IcosahedronGeometry(0.09, 0);
  poner(brote, [0.02, 0.38, 0.02], [0, r() * Math.PI, 0], [1, 0.75, 1]);
  partes.push(pintar(brote, PAL.mataBrote));

  return fusionar(partes);
}

/** La flor de papa: un ramito blanco — el color real (lila/blanca) va POR INSTANCIA. */
export function geomFlorPapa() {
  const partes = [];
  // tres florecitas apiñadas (el racimo terminal de la papa)
  const puntos = [
    [0, 0.045, 0],
    [0.055, 0.01, 0.02],
    [-0.04, 0.005, -0.045],
  ];
  for (const p of puntos) {
    const flor = new THREE.IcosahedronGeometry(0.042, 0);
    poner(flor, p);
    partes.push(pintar(flor, '#ffffff'));
  }
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PAPA CRIOLLA (el tubérculo destapado) — color por instancia                */
/* -------------------------------------------------------------------------- */

/** El tubérculo: bolita apenas ovalada, blanca — el color va POR INSTANCIA. */
export function geomPapa() {
  /* Radio EXAGERADO adrede (rubber-hose, receta de la cereza del café #2707):
     la criolla real cabe en la mano, pero a los ~12 m de la cámara eso son
     unos pocos px — invisible. La cuenta gorda es la que deja LEER la
     diversidad amarilla/roja/morada en el claro desde la entrada. */
  const g = new THREE.IcosahedronGeometry(0.125, 1);
  poner(g, [0, 0, 0], [0, 0, 0.35], [1.25, 0.85, 0.95]);
  return pintar(g.index ? g.toNonIndexed() : g, '#ffffff');
}

/* -------------------------------------------------------------------------- */
/*  PAJA DE PAJONAL — los macollos amarillos del frío                          */
/* -------------------------------------------------------------------------- */

export function geomPaja({ q = 1 } = {}, seed = 7) {
  const r = rng(seed);
  const partes = [];
  const nHojas = Math.max(4, Math.round(7 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + r() * 0.6;
    const inclina = 0.25 + r() * 0.4;
    const alto = 0.5 + r() * 0.35;
    const hoja = new THREE.ConeGeometry(0.035, alto, 4, 1);
    apuntar(
      hoja,
      [Math.cos(a) * 0.07, alto * 0.42, Math.sin(a) * 0.07],
      [Math.cos(a) * inclina, 1, Math.sin(a) * inclina],
    );
    const tono = r();
    partes.push(pintar(hoja, variar(tono > 0.6 ? PAL.pajaSeca : tono > 0.25 ? PAL.paja : PAL.pajaVerde, r, 0.06)));
  }
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  FRAILEJÓN LEJANO — la silueta del páramo al fondo (no protagonista)        */
/* -------------------------------------------------------------------------- */

export function geomFrailejon({ q = 1 } = {}, seed = 8) {
  const r = rng(seed);
  const partes = [];

  // El tronco lanudo, CORTO (las hojas viejas que lo abrigan): que la
  // silueta que mande sea la roseta, no un palo pelado.
  const tronco = new THREE.CylinderGeometry(0.17, 0.21, 0.72, 6, 1);
  poner(tronco, [0, 0.36, 0]);
  partes.push(pintar(tronco, PAL.frailejonTronco));

  // La roseta plateada: dos coronas de hojas anchas — la de abajo abierta,
  // la de arriba parada — y el cogollo del centro apuntando al cielo.
  const nHojas = Math.max(7, Math.round(10 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + r() * 0.4;
    const abre = 0.55 + r() * 0.35;
    const hoja = new THREE.ConeGeometry(0.12, 0.66, 4, 1);
    apuntar(
      hoja,
      [Math.cos(a) * 0.16, 0.82, Math.sin(a) * 0.16],
      [Math.cos(a) * abre, 1, Math.sin(a) * abre],
    );
    partes.push(pintar(hoja, variar(i % 3 === 2 ? PAL.frailejonHojaSeca : PAL.frailejonHoja, r, 0.06)));
  }
  const nAltas = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nAltas; i++) {
    const a = (i / nAltas) * Math.PI * 2 + 0.5 + r() * 0.4;
    const abre = 0.18 + r() * 0.2;
    const hoja = new THREE.ConeGeometry(0.1, 0.56, 4, 1);
    apuntar(
      hoja,
      [Math.cos(a) * 0.07, 0.98, Math.sin(a) * 0.07],
      [Math.cos(a) * abre, 1, Math.sin(a) * abre],
    );
    partes.push(pintar(hoja, variar(PAL.frailejonHoja, r, 0.05)));
  }
  const cogollo = new THREE.ConeGeometry(0.09, 0.4, 4, 1);
  poner(cogollo, [0, 1.14, 0]);
  partes.push(pintar(cogollo, variar(PAL.frailejonHoja, r, 0.04)));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  MONTÍCULO de cosecha — la tierra abierta con el azadón                     */
/* -------------------------------------------------------------------------- */

export function geomMonticulo(seed = 9) {
  const r = rng(seed);
  const partes = [];
  // la tierra volteada: dos terrones grandes y uno chico
  const t1 = new THREE.DodecahedronGeometry(0.42, 0);
  poner(t1, [0, 0.1, 0], [r() * 0.5, r() * Math.PI, r() * 0.5], [1.4, 0.5, 1.1]);
  partes.push(pintar(t1, PAL.tierraAbierta));
  const t2 = new THREE.DodecahedronGeometry(0.3, 0);
  poner(t2, [0.42, 0.08, 0.2], [r() * 0.5, r() * Math.PI, r() * 0.5], [1.2, 0.5, 1]);
  partes.push(pintar(t2, PAL.tierraNegra));
  const t3 = new THREE.DodecahedronGeometry(0.18, 0);
  poner(t3, [-0.36, 0.06, -0.2], [r() * 0.6, r() * Math.PI, 0], [1.1, 0.55, 1]);
  partes.push(pintar(t3, PAL.tierraAbierta));
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PIEDRA — la piedra suelta de la montaña                                    */
/* -------------------------------------------------------------------------- */

export function geomPiedra(seed = 6) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.34, 0);
  poner(roca, [0, 0.14, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.25, 0.68, 1]);
  const capa = new THREE.DodecahedronGeometry(0.18, 0);
  poner(capa, [0.12, 0.24, 0.05], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.liquen)]);
}

/* -------------------------------------------------------------------------- */
/*  Distribución: las matas SOBRE el lomo del caballón + el resto del mundo    */
/* -------------------------------------------------------------------------- */

/** ¿Qué tan florecida está la mata? El centro del lote florece más parejo. */
function floracionEn(wz, r) {
  const base = smoothstep(-11, 1.5, wz) * smoothstep(8.5, 0, wz);
  return clamp(0.3 + base * 0.55 + (r() - 0.5) * 0.3, 0, 1);
}

/**
 * Siembra determinista del papal completo. Devuelve items por especie:
 * `{pos, rotY, escala, tint}` (contrato del componente `Especie`); para la FLOR
 * el `tint` ES el color (lila/blanca por mata) y para la PAPA es la variedad
 * (amarilla criolla / roja / morada).
 */
export function distribucionPapal(conteos, seed = 419) {
  const c = conteos;
  const rMat = rng(seed + 1);
  const rFlo = rng(seed + 2);
  const rSue = rng(seed + 3);

  // --- Las matas SOBRE el lomo de cada caballón (la siembra aporcada). ------
  const sitios = [];
  FILAS_SURCO.forEach((z0, fila) => {
    for (let wx = -14.5; wx <= 14.5; wx += 1.05) {
      const px = wx + (rMat() - 0.5) * 0.3;
      const pz = z0 + curvaSurco(px, fila) + (rMat() - 0.5) * 0.16;
      if (dentroLote(px, pz) < 0.55) continue; // fuera del lote o en un claro
      sitios.push({
        px, pz,
        esc: 0.8 + rMat() * 0.5,
        rotY: rMat() * Math.PI * 2,
        florece: floracionEn(pz, rMat),
        lila: rMat() > 0.38, // la variedad de la mata decide el color de su flor
      });
    }
  });
  // recorte determinista al presupuesto del tier (salto parejo, no los primeros N)
  const paso = Math.max(1, Math.floor(sitios.length / Math.max(1, c.mata)));
  const matas = [];
  for (let i = 0; i < sitios.length && matas.length < c.mata; i += paso) matas.push(sitios[i]);

  const mata = matas.map((s) => ({
    pos: [s.px, alturaLadera(s.px, s.pz), s.pz],
    rotY: s.rotY,
    escala: s.esc,
    tint: [0.92 + rMat() * 0.16, 0.92 + rMat() * 0.16, 0.92 + rMat() * 0.16],
  }));

  // --- Las flores: ramitos sobre las matas que están floreciendo. -----------
  const lila = new THREE.Color(PAL.florLila);
  const lila2 = new THREE.Color(PAL.florLila2);
  const blanca = new THREE.Color(PAL.florBlanca);
  const col = new THREE.Color();
  const flor = [];
  const floridas = matas.filter((s) => s.florece > 0.35);
  let gi = 0;
  while (flor.length < c.flor && floridas.length > 0) {
    const s = floridas[gi % floridas.length];
    gi += 1;
    if (gi > floridas.length * 8) break;
    const cuantas = 1 + Math.floor(rFlo() * 3);
    for (let k = 0; k < cuantas && flor.length < c.flor; k++) {
      const a = rFlo() * Math.PI * 2;
      const rad = (0.12 + rFlo() * 0.2) * s.esc;
      if (s.lila) col.lerpColors(lila, lila2, rFlo());
      else col.copy(blanca);
      col.multiplyScalar(0.94 + rFlo() * 0.12);
      flor.push({
        pos: [
          s.px + Math.cos(a) * rad,
          alturaLadera(s.px, s.pz) + (0.34 + rFlo() * 0.12) * s.esc,
          s.pz + Math.sin(a) * rad,
        ],
        rotY: rFlo() * Math.PI,
        escala: 0.85 + rFlo() * 0.4,
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- La cosecha: papas destapadas en el claro (la diversidad andina). -----
  const criolla = new THREE.Color(PAL.papaCriolla);
  const criolla2 = new THREE.Color(PAL.papaCriolla2);
  const roja = new THREE.Color(PAL.papaRoja);
  const morada = new THREE.Color(PAL.papaMorada);
  const papa = [];
  for (let i = 0; i < c.papa; i++) {
    const a = rSue() * Math.PI * 2;
    const rad = Math.sqrt(rSue()) * 2.1;
    const x = SITIO_COSECHA[0] + Math.cos(a) * rad;
    const z = SITIO_COSECHA[1] + Math.sin(a) * rad * 0.8;
    // la mayoría criolla amarilla; rojas y moradas en cuota que SE VEA (la
    // lección son las TRES variedades — con 14% la morada se perdía)
    const v = rSue();
    if (v > 0.8) col.copy(morada);
    else if (v > 0.6) col.copy(roja);
    else col.lerpColors(criolla, criolla2, rSue());
    col.multiplyScalar(0.98 + rSue() * 0.1);
    papa.push({
      pos: [x, alturaLadera(x, z) + 0.08, z],
      rotY: rSue() * Math.PI * 2,
      escala: 1.0 + rSue() * 0.55,
      tint: [col.r, col.g, col.b],
    });
  }

  // --- Los montículos de tierra abierta del claro de cosecha. ---------------
  const monticulo = [];
  const sitiosMont = [
    [SITIO_COSECHA[0] - 1.3, SITIO_COSECHA[1] + 0.4],
    [SITIO_COSECHA[0] + 1.1, SITIO_COSECHA[1] - 0.9],
    [SITIO_COSECHA[0] + 0.2, SITIO_COSECHA[1] + 1.5],
  ];
  for (let i = 0; i < Math.min(c.monticulo, sitiosMont.length); i++) {
    const [x, z] = sitiosMont[i];
    monticulo.push({
      pos: [x, alturaLadera(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.85 + rSue() * 0.4,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  // --- El pajonal: macollos rodeando el lote y subiendo a la loma. -----------
  const paja = [];
  let intentosPaja = 0;
  while (paja.length < c.paja && intentosPaja < c.paja * 14) {
    intentosPaja += 1;
    const x = -19 + rSue() * 38;
    const z = -18 + rSue() * 36;
    if (dentroLote(x, z) > 0.25) continue; // el pajonal NO invade el lote
    const dCx = x - SITIO_COSECHA[0];
    const dCz = z - SITIO_COSECHA[1];
    if (dCx * dCx + dCz * dCz < 7) continue; // ni el claro de cosecha
    const dHx = x - SITIO_CASA[0];
    const dHz = z - SITIO_CASA[1];
    if (dHx * dHx + dHz * dHz < 8) continue; // ni el patio de la casa
    paja.push({
      pos: [x, alturaLadera(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.8,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  // --- Los frailejones LEJANOS: la loma alta del fondo, silueta del páramo. --
  const frailejon = [];
  const sitiosFrail = [
    [-15.5, -16.5], [-11, -17.5], [-6, -16.8], [-1, -17.6], [4, -16.9],
    [9, -17.4], [13.5, -16.6], [16.5, -17.2], [-18, -15.8],
  ];
  for (let i = 0; i < Math.min(c.frailejon, sitiosFrail.length); i++) {
    const [x, z] = sitiosFrail[i];
    frailejon.push({
      pos: [x, alturaLadera(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 1.25 + rSue() * 0.6,
      tint: [0.92 + rSue() * 0.12, 0.92 + rSue() * 0.12, 0.92 + rSue() * 0.12],
    });
  }

  // --- Las piedras sueltas (fuera del lote, que el azadón ya las sacó). ------
  const piedra = [];
  let intentosPiedra = 0;
  while (piedra.length < c.piedra && intentosPiedra < c.piedra * 14) {
    intentosPiedra += 1;
    const x = -18 + rSue() * 36;
    const z = -16 + rSue() * 32;
    if (dentroLote(x, z) > 0.25) continue;
    piedra.push({
      pos: [x, alturaLadera(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.9,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return { mata, flor, papa, paja, frailejon, monticulo, piedra };
}
