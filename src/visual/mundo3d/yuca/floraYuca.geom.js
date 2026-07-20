/*
 * floraYuca.geom — la GEOMETRÍA del YUCAL de clima medio (0–2.000 m).
 *
 * La yuca (Manihot esculenta) es el pan del piso cálido y templado, y tiene dos
 * firmas visuales que ninguna otra mata de la finca comparte:
 *
 *   1. EL TALLO CON CICATRICES. La yuca bota las hojas de abajo a medida que
 *      crece, y cada hoja caída deja su marca en el nudo. El resultado es un
 *      tallo leñoso, PELADO y ANILLADO de cicatrices en espiral, con el follaje
 *      arriba no más. Esa es la seña que la delata a media distancia.
 *   2. LA RAÍZ ARRANCADA. La imagen del cultivo no es la mata: es el momento en
 *      que se alza la planta y la tierra entrega el racimo de raíces.
 *
 * Por eso este mundo se compone alrededor del ARRANQUE, y no del sembrado.
 *
 * Cada pieza con su identidad:
 *
 *   · Mata de yuca        — TRES esqueletos distintos (no una copia repetida):
 *                           tronco leñoso anillado, horqueta arriba y follaje
 *                           solo en las puntas. Cada mata deterministamente
 *                           asignada a uno de los tres.
 *   · Hoja palmeada       — 5–7 lóbulos lanceolados en abanico. Instanciada
 *                           aparte para que quepa la variación.
 *   · Pecíolo             — INSTANCIADO APARTE con color POR INSTANCIA: verde,
 *                           rojo o morado. Es un rasgo de VARIEDAD real, y en la
 *                           parcela campesina conviven varias.
 *   · Raíz tuberosa       — el racimo destapado, color POR INSTANCIA (cáscara
 *                           parda o rojiza).
 *   · Corte de raíz       — la cara blanca de la pulpa donde se partió: cáscara
 *                           parda por fuera, pulpa blanca por dentro.
 *   · Estaca              — el trozo de tallo sembrado INCLINADO: así se
 *                           propaga la yuca, por estaca y no por semilla.
 *   · Plátano y maíz      — la asociación real de la parcela campesina.
 *   · Monte / piedra      — el borde vivo del lote.
 *
 * TÉCNICA tier-safe (mismo contrato que floraPapa.geom): cada especie se FUSIONA
 * en UNA geometría con el color horneado en vertexColors y se dibuja con UN
 * InstancedMesh. PECÍOLO y RAÍZ se pintan BLANCOS en la geometría para que el
 * color POR INSTANCIA (setColorAt) sea el real.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (mordida conocida): aquí TODO se desindexa antes de
 * fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  La loma templada (la geografía del mundo, determinista)                    */
/* -------------------------------------------------------------------------- */

export const ANCHO = 40; // x: -20 … 20
export const FONDO = 38; // z: -19 (la loma del fondo) … 19 (el frente, abajo)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma loma siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.75 + wz * 0.55) * 0.5 +
    Math.sin(wx * 1.7 - wz * 1.3 + 1.7) * 0.3 +
    Math.sin(wx * 2.9 + wz * 2.5 + 4.4) * 0.2
  );
}

/**
 * La altura BASE de la loma (sin montículos). La yuca es de clima medio: la
 * pendiente es MANSA comparada con el papal de tierra fría — loma de vega, no
 * ladera brava. Y se queda baja a propósito: el sujeto es el arranque, no el
 * cerro (si el fondo sube mucho, se come el encuadre).
 */
export function alturaBase(wx, wz) {
  const sub = smoothstep(10, -17, wz); // 0 al frente (bajo), 1 en la loma
  let h = 0.12;
  h += sub * sub * 4.2; // loma mansa de clima medio
  h += ruido(wx * 0.4, wz * 0.4) * 0.42 * (0.35 + sub);
  return h;
}

/* --- Los MONTÍCULOS: la yuca se siembra en montón, mata por mata. ---------- */

/* La yuca no va en caballón corrido como la papa: va en MONTÍCULO individual,
   un montón de tierra por mata para que la raíz tenga dónde engordar y el agua
   escurra. La retícula de siembra (~1,4 m entre matas) va horneada en el
   relieve, y las matas se siembran justo encima de cada montón. */
export const PASO_X = 1.45;
export const PASO_Z = 1.6;

/* Jitter determinista por celda: la siembra campesina no es una cuadrícula
   de ingeniero, pero tampoco es azar — se ve la fila y se ve el desorden. */
function hash2(i, j) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** El centro real de la mata de la celda (i, j), con su desorden de siembra. */
export function centroMata(i, j) {
  return [
    i * PASO_X + (hash2(i, j) - 0.5) * 0.52,
    j * PASO_Z + (hash2(j + 7, i - 3) - 0.5) * 0.48,
  ];
}

/* El lote sembrado y los claros que respeta. El ARRANQUE va ADELANTE, cerca de
   la cámara: es el sujeto, no puede quedar escondido detrás del cultivo. */
export const SITIO_ARRANQUE = /** @type {[number, number]} */ ([3.2, 6.4]);

/* Las CEPAS ya arrancadas del claro: cada una es un tocón ladeado con su racimo
   de raíces colgando. Van aquí arriba (y no enterradas en la distribución)
   porque la escena las necesita para poner el canasto y el gancho al lado. */
export const CEPAS_ARRANQUE = /** @type {[number, number][]} */ ([
  [3.2 - 0.5, 6.4 + 0.3],
  [3.2 + 1.4, 6.4 - 0.9],
  [3.2 - 1.7, 6.4 - 1.3],
]);
export const SITIO_ESTACAS = /** @type {[number, number]} */ ([-5.2, 7.0]);
export const SITIO_CASA = /** @type {[number, number]} */ ([-11.0, -12.2]);

/** Máscara 0…1 del lote sembrado (dentro hay montículos; fuera, monte). */
export function dentroLote(wx, wz) {
  let m =
    smoothstep(-15.5, -13, wx) *
    smoothstep(15.5, 13, wx) *
    smoothstep(8.2, 6.4, wz) *
    smoothstep(-12.6, -10.4, wz);
  // el claro del ARRANQUE (la tierra ya destapada)
  const dAx = wx - SITIO_ARRANQUE[0];
  const dAz = wz - SITIO_ARRANQUE[1];
  m *= smoothstep(5.5, 12.5, dAx * dAx + dAz * dAz);
  // el semillero de ESTACAS (la siembra que apenas arranca)
  const dEx = wx - SITIO_ESTACAS[0];
  const dEz = wz - SITIO_ESTACAS[1];
  m *= smoothstep(4.5, 11, dEx * dEx + dEz * dEz);
  // el patio de la casa
  const dHx = wx - SITIO_CASA[0];
  const dHz = wz - SITIO_CASA[1];
  m *= smoothstep(9, 20, dHx * dHx + dHz * dHz);
  return m;
}

/**
 * El RELIEVE del montículo en un punto: la campana de tierra amontonada de la
 * mata más cercana (se revisan las 9 celdas vecinas porque el jitter puede
 * acercar la de al lado). `lomo` sirve para pintar la tierra en el terreno.
 */
export function reliefMonticulo(wx, wz) {
  const lote = dentroLote(wx, wz);
  if (lote <= 0.001) return { alza: 0, lomo: 0, lote: 0 };
  const i0 = Math.round(wx / PASO_X);
  const j0 = Math.round(wz / PASO_Z);
  let mejor = 1e9;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const [cx, cz] = centroMata(i0 + di, j0 + dj);
      const dx = wx - cx;
      const dz = wz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < mejor) mejor = d2;
    }
  }
  const perfil = Math.exp(-mejor / 0.4);
  return { alza: perfil * 0.3 * lote, lomo: perfil * lote, lote };
}

/** La altura FINAL de la loma con los montículos horneados. */
export function alturaYucal(wx, wz) {
  return alturaBase(wx, wz) + reliefMonticulo(wx, wz).alza;
}

/* -------------------------------------------------------------------------- */
/*  LA CÁMARA — lo que este mundo NO puede fallar                             */
/* -------------------------------------------------------------------------- */

/*
 * La cámara vive JUNTO A LA GEOGRAFÍA, no en la escena: encuadrar es una
 * decisión sobre el terreno, y así el diagnóstico de encuadre puede importarla
 * de verdad en vez de adivinarla leyendo el .jsx.
 *
 * El sujeto es el claro del ARRANQUE (z ≈ 6,4), no el cerro del fondo. Estos
 * números están verificados por trazado de rayos contra esta MISMA función de
 * altura (`node scripts/diag/encuadre-mundo.mjs yuca`), y calibrados contra el
 * papal, que es un mundo ya aprobado:
 *
 *              cielo   terreno   tercio alto   sujeto
 *   papal      32.8%    67.2%       0.6%       tercio bajo · derecha
 *   yucal      37.2%    62.8%       0.0%       tercio bajo · derecha
 *
 * Si alguien mueve esto, que vuelva a correr el trazado. Medir el tamaño de las
 * plantas NO es ver la escena: una cámara enterrada en la loma da números
 * correctos de todo menos de lo único que importa, que es si el sujeto aparece.
 */
export const CAMARA = {
  reposo: /** @type {[number, number, number]} */ ([1.4, 5.2, 16.4]),
  mirada: /** @type {[number, number, number]} */ ([1.8, 3.4, 4.0]),
  objetivo: /** @type {[number, number, number]} */ ([1.8, 2.2, 3.0]),
  fov: 50,
};

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Instancias por especie. 'alto' puebla el yucal pleno; 'medio' es frugal;
 * 'bajo' deja lo mínimo para que AÚN se lea "yucal con la raíz destapada". Las
 * HOJAS no se cuentan aquí: salen del esqueleto de cada mata (tantas como
 * puntas tenga), y el tier las recorta bajando el detalle del esqueleto.
 */
export const FLORA_YUCA = {
  alto: { mata: 58, raiz: 30, estaca: 20, platano: 8, maiz: 46, monte: 34, piedra: 9 },
  medio: { mata: 34, raiz: 18, estaca: 12, platano: 5, maiz: 26, monte: 20, piedra: 5 },
  bajo: { mata: 16, raiz: 9, estaca: 6, platano: 3, maiz: 12, monte: 9, piedra: 3 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const yucalDeTier = (tier) => FLORA_YUCA[tier] || FLORA_YUCA.medio;

/** Factor de detalle geométrico por tier (menos nudos/lóbulos en gama baja). */
export const CALIDAD_YUCA = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadYuca = (tier) => CALIDAD_YUCA[tier] ?? CALIDAD_YUCA.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del yucal (colores horneados en vertexColors)                       */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // El tallo leñoso: pardo claro, y las cicatrices MÁS OSCURAS para que el
  // anillado se lea aunque la luz esté plana.
  tallo: '#8d6c4a',
  talloAlto: '#9d7f55', // arriba, donde la madera aún está tierna
  cicatriz: '#63472f', // la marca de la hoja caída (el rasgo que la delata)
  yema: '#7d9440', // la yema que asoma sobre cada cicatriz

  // El follaje: verde franco de clima medio, con cara al sol y cara en sombra
  hoja: '#3f6f3a',
  hojaSol: '#548c3d',
  hojaSombra: '#335b31',

  // El PECÍOLO va POR INSTANCIA (referencia): el rasgo de variedad
  pecioloVerde: '#83a244',
  pecioloRojo: '#b04530',
  pecioloMorado: '#7a3a68',

  // La RAÍZ va POR INSTANCIA (referencia): la cáscara
  raizParda: '#9a6b45',
  raizRojiza: '#a4593a',
  // …y la PULPA es fija: blanca cremosa, el contraste que enseña el corte
  raizPulpa: '#f2e8d2',

  // La asociación de la parcela
  platanoTallo: '#7f8c4a',
  platanoHoja: '#4a8340',
  platanoHojaSol: '#63a04a',
  maizTallo: '#7d9340',
  maizHoja: '#6d9a3e',

  // El borde vivo y el suelo
  monte: '#4d7a3c',
  monteSeco: '#8e9a52',
  tierraRoja: '#8a5636',
  tierraAbierta: '#6d4527',
  piedra: '#9a8b74',
  liquen: '#a5a986',
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

/** Orienta el +Y de la geometría hacia `dir` y la ubica en `pos`. */
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
    throw new Error('floraYuca: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que el yucal no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  EL ESQUELETO DE LA MATA — la estructura, aparte de la malla               */
/* -------------------------------------------------------------------------- */

/*
 * La forma de la yuca en tres datos: el tronco anillado, la horqueta donde se
 * abre, y las PUNTAS donde vive el follaje. Se calcula aparte de la geometría
 * porque las HOJAS se instancian por separado (para que el pecíolo pueda llevar
 * su color de variedad) y necesitan saber dónde se agarran.
 *
 * Se generan VARIOS esqueletos con semillas distintas y cada mata se asigna a
 * uno: sin esto todas las matas salen clonadas y el yucal se lee como
 * estampado, no como cultivo (el pecado de las copas-brócoli).
 */
export function esqueletoYuca(seed = 31, q = 1) {
  const r = rng(seed);

  const altoTronco = 1.15 + r() * 0.55; // hasta la primera horqueta
  const radioBase = 0.055 + r() * 0.016;
  const radioHorqueta = radioBase * 0.62;

  // Los NUDOS del tronco: donde estuvo cada hoja que ya se cayó. Van en
  // espiral (filotaxia), que es como de verdad se ordenan en el tallo.
  const nNudos = Math.max(5, Math.round(12 * q));
  const nudos = [];
  for (let i = 0; i < nNudos; i++) {
    const t = (i + 0.6) / (nNudos + 0.5);
    nudos.push({
      y: t * altoTronco,
      ang: i * 2.399 + r() * 0.25, // ~137,5°: la espiral de la filotaxia
      radio: radioBase * (1 - t * 0.38),
    });
  }

  // La HORQUETA: la yuca se abre en dos o tres brazos cuando florece.
  const nRamas = q < 0.5 ? 2 : 2 + (r() > 0.55 ? 1 : 0);
  const ramas = [];
  const puntas = [];
  const giro = r() * Math.PI * 2;
  for (let i = 0; i < nRamas; i++) {
    const a = giro + (i / nRamas) * Math.PI * 2 + (r() - 0.5) * 0.4;
    const abre = 0.42 + r() * 0.3; // cuánto se abre del eje vertical
    const largo = 0.6 + r() * 0.3;
    const dir = [Math.cos(a) * abre, 1, Math.sin(a) * abre];
    const base = [0, altoTronco, 0];
    const n = Math.hypot(dir[0], dir[1], dir[2]);
    const fin = [
      base[0] + (dir[0] / n) * largo,
      base[1] + (dir[1] / n) * largo,
      base[2] + (dir[2] / n) * largo,
    ];
    ramas.push({ base, fin, dir, largo, radio: radioHorqueta });

    // Segunda horqueta en gama alta: la mata adulta se vuelve a partir.
    if (q >= 0.6 && r() > 0.35) {
      const nSub = 2;
      for (let k = 0; k < nSub; k++) {
        const a2 = a + (k === 0 ? -0.7 : 0.7) + (r() - 0.5) * 0.3;
        const abre2 = 0.5 + r() * 0.3;
        const largo2 = largo * (0.6 + r() * 0.2);
        const dir2 = [Math.cos(a2) * abre2, 1, Math.sin(a2) * abre2];
        const n2 = Math.hypot(dir2[0], dir2[1], dir2[2]);
        const fin2 = [
          fin[0] + (dir2[0] / n2) * largo2,
          fin[1] + (dir2[1] / n2) * largo2,
          fin[2] + (dir2[2] / n2) * largo2,
        ];
        ramas.push({ base: fin, fin: fin2, dir: dir2, largo: largo2, radio: radioHorqueta * 0.7 });
        puntas.push({ pos: fin2, dir: dir2, vigor: 0.85 + r() * 0.25 });
      }
    } else {
      puntas.push({ pos: fin, dir, vigor: 0.9 + r() * 0.25 });
    }
  }

  return { altoTronco, radioBase, radioHorqueta, nudos, ramas, puntas };
}

/**
 * Las HOJAS que cuelga un esqueleto, en espacio local de la mata. Cada punta
 * saca una roseta de hojas: así es la yuca — el follaje SOLO arriba, porque
 * abajo ya se le cayeron (y por eso el tallo queda anillado de cicatrices).
 * Devuelve, por hoja, dónde se agarra el pecíolo y hacia dónde sale.
 */
export function hojasDeEsqueleto(esq, q = 1) {
  const r = rng(97);
  const hojas = [];
  const nPorPunta = Math.max(3, Math.round(6 * q));
  for (const punta of esq.puntas) {
    for (let i = 0; i < nPorPunta; i++) {
      const a = (i / nPorPunta) * Math.PI * 2 + r() * 0.7;
      // las hojas salen en abanico alrededor de la punta, unas paradas y
      // otras ya vencidas hacia afuera (la yuca las carga colgando)
      const caida = -0.15 + r() * 0.95;
      const dir = [Math.cos(a) * (0.55 + r() * 0.5), caida, Math.sin(a) * (0.55 + r() * 0.5)];
      const n = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      hojas.push({
        base: [
          punta.pos[0] + (r() - 0.5) * 0.05,
          punta.pos[1] - r() * 0.1,
          punta.pos[2] + (r() - 0.5) * 0.05,
        ],
        dir: [dir[0] / n, dir[1] / n, dir[2] / n],
        peciolo: (0.19 + r() * 0.13) * punta.vigor, // 19–32 cm: bien visible
        esc: (0.85 + r() * 0.35) * punta.vigor,
        giro: r() * Math.PI * 2,
      });
    }
  }
  return hojas;
}

/* -------------------------------------------------------------------------- */
/*  MATA DE YUCA — el tallo leñoso ANILLADO DE CICATRICES                     */
/* -------------------------------------------------------------------------- */

/*
 * El tronco pelado con su anillado, la horqueta y nada más: el follaje se
 * instancia aparte. Cada CICATRIZ es un anillo un poco más ancho que el tallo,
 * pintado más oscuro, con una yema encima — y van en espiral. Ese detalle es
 * caro en vértices pero es LA identidad del cultivo: sin él la yuca es un palo
 * cualquiera.
 */
export function geomMataYuca(esq, { q = 1 } = {}) {
  const r = rng(41);
  const partes = [];

  // El tronco: leñoso abajo, más tierno arriba.
  const tronco = new THREE.CylinderGeometry(
    esq.radioHorqueta,
    esq.radioBase,
    esq.altoTronco,
    q < 0.5 ? 5 : 7,
    1,
  );
  poner(tronco, [0, esq.altoTronco / 2, 0]);
  partes.push(pintar(tronco, PAL.tallo));

  // LAS CICATRICES: el anillado en espiral que delata a la yuca.
  const ladosNudo = q < 0.5 ? 5 : 6;
  for (const nd of esq.nudos) {
    const anillo = new THREE.CylinderGeometry(nd.radio * 1.34, nd.radio * 1.2, 0.036, ladosNudo, 1);
    poner(anillo, [0, nd.y, 0]);
    partes.push(pintar(anillo, PAL.cicatriz));
    // la marca en relieve de la hoja que se cayó, mirando hacia su lado
    const marca = new THREE.ConeGeometry(nd.radio * 0.52, 0.075, 4, 1);
    apuntar(
      marca,
      [Math.cos(nd.ang) * nd.radio * 1.1, nd.y + 0.012, Math.sin(nd.ang) * nd.radio * 1.1],
      [Math.cos(nd.ang), 0.55, Math.sin(nd.ang)],
    );
    partes.push(pintar(marca, PAL.cicatriz));
    // y la YEMA que espera arriba de la cicatriz (de ahí rebrota la estaca)
    if (q >= 0.6) {
      const yema = new THREE.IcosahedronGeometry(nd.radio * 0.3, 0);
      poner(yema, [
        Math.cos(nd.ang) * nd.radio * 1.05,
        nd.y + 0.055,
        Math.sin(nd.ang) * nd.radio * 1.05,
      ]);
      partes.push(pintar(yema, PAL.yema));
    }
  }

  // La horqueta: los brazos que se abren arriba, también anillados.
  for (const rama of esq.ramas) {
    const largo = Math.hypot(
      rama.fin[0] - rama.base[0],
      rama.fin[1] - rama.base[1],
      rama.fin[2] - rama.base[2],
    );
    const brazo = new THREE.CylinderGeometry(rama.radio * 0.68, rama.radio, largo, q < 0.5 ? 4 : 6, 1);
    apuntar(
      brazo,
      [
        (rama.base[0] + rama.fin[0]) / 2,
        (rama.base[1] + rama.fin[1]) / 2,
        (rama.base[2] + rama.fin[2]) / 2,
      ],
      [
        rama.fin[0] - rama.base[0],
        rama.fin[1] - rama.base[1],
        rama.fin[2] - rama.base[2],
      ],
    );
    partes.push(pintar(brazo, variar(PAL.talloAlto, r, 0.05)));

    // un par de cicatrices también en el brazo (sigue botando hoja)
    if (q >= 0.6) {
      for (let k = 1; k <= 2; k++) {
        const t = k / 3;
        const anillo = new THREE.CylinderGeometry(rama.radio * 1.3, rama.radio * 1.15, 0.03, 5, 1);
        apuntar(
          anillo,
          [
            rama.base[0] + (rama.fin[0] - rama.base[0]) * t,
            rama.base[1] + (rama.fin[1] - rama.base[1]) * t,
            rama.base[2] + (rama.fin[2] - rama.base[2]) * t,
          ],
          [
            rama.fin[0] - rama.base[0],
            rama.fin[1] - rama.base[1],
            rama.fin[2] - rama.base[2],
          ],
        );
        partes.push(pintar(anillo, PAL.cicatriz));
      }
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  HOJA PALMEADA — los lóbulos en abanico                                    */
/* -------------------------------------------------------------------------- */

/*
 * La hoja de yuca es PALMEADA y profundamente lobulada: los lóbulos salen todos
 * de un mismo punto, como los dedos de una mano abierta, y los del centro son
 * más largos que los de los lados. Cada lóbulo es un octaedro achatado —
 * lanceolado, puntudo en las dos puntas y ancho en la mitad — que es justo la
 * forma del lóbulo real y cuesta ocho triángulos.
 *
 * Se construye ACOSTADA en el plano XZ y con el punto de agarre en el origen:
 * la instancia la orienta después.
 */
export function geomHojaYuca({ q = 1 } = {}, seed = 51) {
  const r = rng(seed);
  const partes = [];
  const nLobulos = q < 0.5 ? 5 : 5 + Math.round(r() * 2); // 5–7 lóbulos

  for (let i = 0; i < nLobulos; i++) {
    // el abanico se abre ~200°, con los lóbulos del centro más largos
    const t = nLobulos === 1 ? 0.5 : i / (nLobulos - 1);
    const a = (t - 0.5) * 2.6;
    const centro = 1 - Math.abs(t - 0.5) * 1.25; // 1 en el medio, 0.37 en el borde
    const largo = 0.17 + centro * 0.13;
    const ancho = 0.031 + centro * 0.019;

    const lobulo = new THREE.OctahedronGeometry(1, 0);
    // achatado a lámina y estirado a lanceta
    poner(
      lobulo,
      [Math.sin(a) * largo * 0.52, 0, Math.cos(a) * largo * 0.52],
      [0, -a, 0],
      [ancho, 0.012, largo * 0.62],
    );
    const tono = r();
    partes.push(
      pintar(lobulo, variar(tono > 0.66 ? PAL.hojaSol : tono > 0.28 ? PAL.hoja : PAL.hojaSombra, r, 0.07)),
    );
  }

  return fusionar(partes);
}

/**
 * El PECÍOLO: el rabito que sostiene la hoja. Va BLANCO en la geometría porque
 * su color real —verde, rojo o morado— es un rasgo de VARIEDAD y viaja POR
 * INSTANCIA. Es largo y bien visible: en la yuca no es un detalle, es una seña.
 * Se construye del origen hacia +Y con largo 1 (la instancia lo escala).
 */
export function geomPecioloYuca() {
  const g = new THREE.CylinderGeometry(0.011, 0.015, 1, 4, 1);
  poner(g, [0, 0.5, 0]);
  return pintar(g.index ? g.toNonIndexed() : g, '#ffffff');
}

/* -------------------------------------------------------------------------- */
/*  RAÍZ TUBEROSA — la imagen del cultivo                                     */
/* -------------------------------------------------------------------------- */

/*
 * La raíz de yuca es ALARGADA y cónica, con el cuello grueso pegado a la mata y
 * la punta afilada. Va BLANCA en la geometría: la cáscara —parda o rojiza según
 * la variedad— viaja POR INSTANCIA. Se construye acostada a lo largo de +Y para
 * que la instancia la pueda apuntar en cualquier dirección del racimo.
 */
export function geomRaizYuca({ q = 1 } = {}) {
  const partes = [];
  const lados = q < 0.5 ? 5 : 7;
  // el cuerpo: grueso en el cuello, afilándose a la punta
  const cuerpo = new THREE.CylinderGeometry(0.052, 0.085, 0.62, lados, 1);
  poner(cuerpo, [0, 0.31, 0]);
  partes.push(pintar(cuerpo, '#ffffff'));
  // la punta afilada
  const punta = new THREE.ConeGeometry(0.052, 0.16, lados, 1);
  poner(punta, [0, 0.68, 0]);
  partes.push(pintar(punta, '#ffffff'));
  // el cuello leñoso que la amarra a la mata
  const cuello = new THREE.CylinderGeometry(0.03, 0.052, 0.1, lados, 1);
  poner(cuello, [0, -0.05, 0]);
  partes.push(pintar(cuello, '#ffffff'));
  return fusionar(partes);
}

/**
 * EL CORTE de la raíz: la cara blanca de la pulpa donde se partió. Color FIJO
 * (no por instancia) — justamente porque el punto es el contraste: por fuera
 * parda, por dentro blanca. Se pega en el cuello de algunas raíces.
 */
export function geomCorteRaiz() {
  const g = new THREE.CylinderGeometry(0.054, 0.05, 0.03, 8, 1);
  return pintar(g.index ? g.toNonIndexed() : g, PAL.raizPulpa);
}

/*
 * EL TOCÓN del arranque: cuando se cosecha yuca NO se hala la planta entera —
 * primero se le corta el tallo (que se guarda para semilla) y queda un muñón de
 * unos 30 cm, y de ese muñón se palanquea la mata hasta que la tierra suelta el
 * racimo. Por eso el arranque se dibuja así: el tocón inclinado con las raíces
 * colgando del cuello, y no una planta entera acostada.
 */
export function geomToconYuca({ q = 1 } = {}, seed = 63) {
  const r = rng(seed);
  const partes = [];
  const largo = 0.42;
  const palo = new THREE.CylinderGeometry(0.045, 0.062, largo, q < 0.5 ? 5 : 7, 1);
  poner(palo, [0, largo / 2, 0]);
  partes.push(pintar(palo, PAL.tallo));

  // el corte de machete arriba: la cara clara de la madera fresca
  const corte = new THREE.CylinderGeometry(0.046, 0.045, 0.02, 7, 1);
  poner(corte, [0, largo + 0.008, 0], [0.12, 0, 0.06]);
  partes.push(pintar(corte, PAL.talloAlto));

  const nNudos = q < 0.5 ? 2 : 4;
  for (let i = 0; i < nNudos; i++) {
    const y = 0.07 + (i / nNudos) * (largo - 0.1);
    const ang = i * 2.399 + r() * 0.3;
    const anillo = new THREE.CylinderGeometry(0.07, 0.062, 0.03, 5, 1);
    poner(anillo, [0, y, 0]);
    partes.push(pintar(anillo, PAL.cicatriz));
    const marca = new THREE.ConeGeometry(0.026, 0.06, 4, 1);
    apuntar(marca, [Math.cos(ang) * 0.06, y + 0.01, Math.sin(ang) * 0.06], [Math.cos(ang), 0.5, Math.sin(ang)]);
    partes.push(pintar(marca, PAL.cicatriz));
  }

  // el CUELLO: la corona leñosa de donde salen las raíces
  const cuello = new THREE.IcosahedronGeometry(0.1, 0);
  poner(cuello, [0, 0.02, 0], [0, r() * Math.PI, 0], [1.25, 0.8, 1.25]);
  partes.push(pintar(cuello, PAL.cicatriz));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  ESTACA — así se siembra la yuca (por tallo, no por semilla)               */
/* -------------------------------------------------------------------------- */

/*
 * Un trozo de tallo maduro de unos 20–25 cm con varias yemas, enterrado
 * INCLINADO. Esa inclinación no es capricho de dibujo: es como se siembra. La
 * estaca lleva sus cicatrices y sus yemas, que es de donde rebrota.
 */
export function geomEstacaYuca({ q = 1 } = {}, seed = 61) {
  const r = rng(seed);
  const partes = [];
  const largo = 0.36; // lo que asoma + lo que va enterrado
  const palo = new THREE.CylinderGeometry(0.028, 0.032, largo, q < 0.5 ? 4 : 6, 1);
  poner(palo, [0, largo / 2, 0]);
  partes.push(pintar(palo, PAL.tallo));

  const nNudos = q < 0.5 ? 2 : 4;
  for (let i = 0; i < nNudos; i++) {
    const y = 0.06 + (i / nNudos) * (largo - 0.08);
    const ang = i * 2.399 + r() * 0.3;
    const anillo = new THREE.CylinderGeometry(0.039, 0.035, 0.028, 5, 1);
    poner(anillo, [0, y, 0]);
    partes.push(pintar(anillo, PAL.cicatriz));
    const yema = new THREE.IcosahedronGeometry(0.019, 0);
    poner(yema, [Math.cos(ang) * 0.033, y + 0.035, Math.sin(ang) * 0.033]);
    partes.push(pintar(yema, PAL.yema));
  }

  // el brote tierno que ya arrancó en las estacas más viejas del semillero
  const brote = new THREE.ConeGeometry(0.03, 0.15, 4, 1);
  apuntar(brote, [0.02, largo - 0.02, 0.01], [0.25, 1, 0.15]);
  partes.push(pintar(brote, PAL.hojaSol));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  LA ASOCIACIÓN — plátano y maíz (la parcela campesina no es monocultivo)   */
/* -------------------------------------------------------------------------- */

/** El plátano: pseudotallo grueso y las paletas grandes, ya rasgadas por el viento. */
export function geomPlatano({ q = 1 } = {}, seed = 71) {
  const r = rng(seed);
  const partes = [];
  const alto = 2.1 + r() * 0.5;

  const tallo = new THREE.CylinderGeometry(0.11, 0.19, alto, q < 0.5 ? 5 : 7, 1);
  poner(tallo, [0, alto / 2, 0]);
  partes.push(pintar(tallo, PAL.platanoTallo));

  const nHojas = Math.max(4, Math.round(7 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + r() * 0.5;
    const caida = -0.25 - r() * 0.5; // las paletas se vencen hacia afuera
    const largo = 1.0 + r() * 0.5;
    // la paleta: una lámina larga, no una bola
    const paleta = new THREE.OctahedronGeometry(1, 0);
    poner(paleta, [0, 0, 0], [0, 0, 0], [0.15, 0.02, largo * 0.5]);
    apuntar(
      paleta,
      [Math.cos(a) * largo * 0.42, alto + caida * 0.35, Math.sin(a) * largo * 0.42],
      [Math.cos(a) * 0.85, 0.42 + caida * 0.3, Math.sin(a) * 0.85],
    );
    partes.push(pintar(paleta, variar(i % 2 ? PAL.platanoHojaSol : PAL.platanoHoja, r, 0.07)));
  }
  return fusionar(partes);
}

/** El maíz: la caña con sus hojas colgadas y la espiga arriba. */
export function geomMaiz({ q = 1 } = {}, seed = 73) {
  const r = rng(seed);
  const partes = [];
  const alto = 1.5 + r() * 0.45;

  const cana = new THREE.CylinderGeometry(0.022, 0.035, alto, 4, 1);
  poner(cana, [0, alto / 2, 0]);
  partes.push(pintar(cana, PAL.maizTallo));

  const nHojas = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = i * 2.4 + r() * 0.4;
    const y = 0.35 + (i / nHojas) * (alto - 0.5);
    const largo = 0.55 + r() * 0.3;
    const hoja = new THREE.OctahedronGeometry(1, 0);
    poner(hoja, [0, 0, 0], [0, 0, 0], [0.045, 0.012, largo * 0.5]);
    apuntar(
      hoja,
      [Math.cos(a) * largo * 0.34, y, Math.sin(a) * largo * 0.34],
      [Math.cos(a) * 0.9, -0.25 - r() * 0.35, Math.sin(a) * 0.9],
    );
    partes.push(pintar(hoja, variar(PAL.maizHoja, r, 0.08)));
  }

  const espiga = new THREE.ConeGeometry(0.035, 0.28, 4, 1);
  poner(espiga, [0, alto + 0.12, 0]);
  partes.push(pintar(espiga, PAL.monteSeco));
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  MONTE Y PIEDRA — el borde vivo del lote                                   */
/* -------------------------------------------------------------------------- */

export function geomMonte({ q = 1 } = {}, seed = 77) {
  const r = rng(seed);
  const partes = [];
  const nMasas = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = (i / nMasas) * Math.PI * 2 + r();
    const rad = 0.18 + r() * 0.14;
    const masa = new THREE.IcosahedronGeometry(rad, 0);
    poner(
      masa,
      [Math.cos(a) * 0.16, 0.14 + r() * 0.18, Math.sin(a) * 0.16],
      [0, r() * Math.PI, 0],
      [1.2, 0.8, 1.2],
    );
    partes.push(pintar(masa, variar(r() > 0.7 ? PAL.monteSeco : PAL.monte, r, 0.08)));
  }
  return fusionar(partes);
}

export function geomPiedra(seed = 79) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.3, 0);
  poner(roca, [0, 0.12, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.3, 0.65, 1]);
  const capa = new THREE.DodecahedronGeometry(0.15, 0);
  poner(capa, [0.1, 0.22, 0.04], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.liquen)]);
}

/* -------------------------------------------------------------------------- */
/*  Distribución: el yucal sembrado + el arranque + el semillero              */
/* -------------------------------------------------------------------------- */

/* Cuántos esqueletos distintos hay (que el yucal no se lea como estampado). */
export const N_ESQUELETOS = 3;

/* Las semillas de las tres variantes de mata (deterministas, una por variante). */
export const SEMILLAS_ESQUELETO = [31, 137, 419];

/**
 * Construye los N esqueletos del yucal, cada uno YA con sus hojas colgadas.
 * Es la única puerta: la malla de la mata y la instancia de sus hojas tienen que
 * salir del MISMO esqueleto, o las hojas quedan flotando al lado del tallo.
 */
export function construirEsqueletos(q = 1) {
  return SEMILLAS_ESQUELETO.map((s) => {
    const esq = esqueletoYuca(s, q);
    return { ...esq, hojas: hojasDeEsqueleto(esq, q) };
  });
}

/**
 * Siembra determinista del yucal completo.
 *
 * `esqs` son los N esqueletos ya construidos (uno por variante de mata): se
 * necesitan aquí porque las HOJAS se instancian aparte y tienen que agarrarse
 * exactamente donde la malla de la mata puso sus puntas.
 *
 * Devuelve items por especie con el contrato del componente `Especie`:
 * `{pos, quat?, rotY?, escala, tint}`. Para PECÍOLO el `tint` ES el color de la
 * variedad, y para RAÍZ el de la cáscara.
 */
export function distribucionYucal(conteos, esqs, seed = 523) {
  const c = conteos;
  const rMat = rng(seed + 1);
  const rHoj = rng(seed + 2);
  const rSue = rng(seed + 3);
  const rRaiz = rng(seed + 4);

  /* --- Las matas sobre su montículo, en la retícula de siembra. ----------- */
  const sitios = [];
  const iMin = Math.ceil(-14 / PASO_X);
  const iMax = Math.floor(14 / PASO_X);
  const jMin = Math.ceil(-11.5 / PASO_Z);
  const jMax = Math.floor(7.5 / PASO_Z);
  for (let j = jMin; j <= jMax; j++) {
    for (let i = iMin; i <= iMax; i++) {
      const [px, pz] = centroMata(i, j);
      if (dentroLote(px, pz) < 0.6) continue; // fuera del lote o en un claro
      sitios.push({ px, pz, i, j });
    }
  }
  // recorte determinista al presupuesto del tier (salto parejo, no los primeros N)
  const paso = Math.max(1, Math.floor(sitios.length / Math.max(1, c.mata)));
  const elegidos = [];
  for (let k = 0; k < sitios.length && elegidos.length < c.mata; k += paso) {
    elegidos.push(sitios[k]);
  }

  /* La VARIEDAD de cada mata decide el color de su pecíolo. En una parcela
     campesina conviven varias: verde la más común, y las de pecíolo rojo o
     morado se reconocen de lejos. */
  const pecVerde = new THREE.Color(PAL.pecioloVerde);
  const pecRojo = new THREE.Color(PAL.pecioloRojo);
  const pecMorado = new THREE.Color(PAL.pecioloMorado);
  const col = new THREE.Color();

  // una lista de items por VARIANTE de esqueleto (cada una es su propio banco)
  const mata = Array.from({ length: esqs.length }, () => []);
  const hoja = [];
  const peciolo = [];

  const mPlanta = new THREE.Matrix4();
  const mHoja = new THREE.Matrix4();
  const mFinal = new THREE.Matrix4();
  const vPos = new THREE.Vector3();
  const qRot = new THREE.Quaternion();
  const vEsc = new THREE.Vector3();
  const vDir = new THREE.Vector3();
  const qDir = new THREE.Quaternion();
  const arriba = new THREE.Vector3(0, 1, 0);

  elegidos.forEach((s) => {
    const variante = Math.floor(rMat() * esqs.length) % esqs.length;
    const esq = esqs[variante];
    const escala = 0.82 + rMat() * 0.45;
    const rotY = rMat() * Math.PI * 2;
    const y = alturaYucal(s.px, s.pz);

    mata[variante].push({
      pos: [s.px, y, s.pz],
      rotY,
      escala,
      tint: [0.92 + rMat() * 0.14, 0.92 + rMat() * 0.14, 0.92 + rMat() * 0.14],
    });

    // el color de pecíolo de ESTA mata (su variedad)
    const v = rMat();
    if (v > 0.82) col.copy(pecMorado);
    else if (v > 0.58) col.copy(pecRojo);
    else col.copy(pecVerde);
    col.multiplyScalar(0.92 + rMat() * 0.16);
    const tintePeciolo = [col.r, col.g, col.b];

    // la matriz de la planta, para llevar sus hojas locales al mundo
    mPlanta.compose(
      vPos.set(s.px, y, s.pz),
      qRot.setFromEuler(new THREE.Euler(0, rotY, 0)),
      vEsc.setScalar(escala),
    );

    for (const h of esq.hojas) {
      // el PECÍOLO: del punto de agarre hacia la dirección de la hoja
      vDir.set(h.dir[0], h.dir[1], h.dir[2]).normalize();
      qDir.setFromUnitVectors(arriba, vDir);
      mHoja.compose(
        vPos.set(h.base[0], h.base[1], h.base[2]),
        qDir,
        vEsc.set(1, h.peciolo, 1),
      );
      mFinal.multiplyMatrices(mPlanta, mHoja);
      mFinal.decompose(vPos, qRot, vEsc);
      peciolo.push({
        pos: [vPos.x, vPos.y, vPos.z],
        quat: [qRot.x, qRot.y, qRot.z, qRot.w],
        escalaXYZ: [vEsc.x, vEsc.y, vEsc.z],
        tint: tintePeciolo,
      });

      // LA LÁMINA: al final del pecíolo, acostada y con su giro propio. Se
      // inclina un poco con la caída de la hoja (la yuca la carga vencida).
      const bx = h.base[0] + h.dir[0] * h.peciolo;
      const by = h.base[1] + h.dir[1] * h.peciolo;
      const bz = h.base[2] + h.dir[2] * h.peciolo;
      const inclina = 0.25 + rHoj() * 0.45;
      mHoja.compose(
        vPos.set(bx, by, bz),
        qRot.setFromEuler(
          new THREE.Euler(Math.cos(h.giro) * inclina, h.giro, Math.sin(h.giro) * inclina),
        ),
        vEsc.setScalar(h.esc),
      );
      mFinal.multiplyMatrices(mPlanta, mHoja);
      mFinal.decompose(vPos, qRot, vEsc);
      hoja.push({
        pos: [vPos.x, vPos.y, vPos.z],
        quat: [qRot.x, qRot.y, qRot.z, qRot.w],
        escala: vEsc.x,
        tint: [0.9 + rHoj() * 0.2, 0.9 + rHoj() * 0.2, 0.9 + rHoj() * 0.2],
      });
    }
  });

  /* --- EL ARRANQUE: el racimo de raíces destapado. ------------------------ */
  /* Las raíces no salen sueltas: salen EN RACIMO desde el cuello de la mata,
     abriéndose como los radios de una rueda. Aquí se arman dos o tres matas
     arrancadas con su racimo, más las raíces ya apartadas en el suelo. */
  const cascParda = new THREE.Color(PAL.raizParda);
  const cascRojiza = new THREE.Color(PAL.raizRojiza);
  const raiz = [];
  const corte = [];

  const tocon = [];
  const nCepas = Math.max(1, Math.min(CEPAS_ARRANQUE.length, Math.round(c.raiz / 7)));
  let puestas = 0;

  for (let k = 0; k < nCepas && puestas < c.raiz; k++) {
    const [cx, cz] = CEPAS_ARRANQUE[k];
    const suelo = alturaYucal(cx, cz);
    /* EL CUELLO de la mata, ya alzado fuera de la tierra: de ahí para arriba va
       el tocón cortado y de ahí para abajo cuelga el racimo. */
    const cy = suelo + 0.56;
    const ladeo = 0.45 + rRaiz() * 0.35; // lo que quedó ladeada al palanquearla
    const haciaDonde = rRaiz() * Math.PI * 2;

    // el TOCÓN: el muñón de tallo por donde se palanqueó, ladeado
    tocon.push({
      pos: [cx, cy - 0.06, cz],
      rot: [Math.sin(haciaDonde) * ladeo, rRaiz() * Math.PI * 2, Math.cos(haciaDonde) * ladeo],
      escala: 0.95 + rRaiz() * 0.25,
      tint: [0.94 + rRaiz() * 0.12, 0.94 + rRaiz() * 0.12, 0.94 + rRaiz() * 0.12],
    });

    const nEnCepa = 4 + Math.floor(rRaiz() * 3); // 4–6 raíces por mata
    const giro = rRaiz() * Math.PI * 2;
    for (let i = 0; i < nEnCepa && puestas < c.raiz; i++) {
      const a = giro + (i / nEnCepa) * Math.PI * 2 + (rRaiz() - 0.5) * 0.5;
      // el racimo se abre hacia abajo-afuera, como salió de la tierra
      const abre = 0.8 + rRaiz() * 0.5;
      vDir.set(Math.cos(a) * abre, -0.62 - rRaiz() * 0.3, Math.sin(a) * abre).normalize();
      qDir.setFromUnitVectors(arriba, vDir);
      const esc = 0.85 + rRaiz() * 0.45;
      if (rRaiz() > 0.62) col.copy(cascRojiza);
      else col.copy(cascParda);
      col.multiplyScalar(0.9 + rRaiz() * 0.2);
      const px = cx + Math.cos(a) * 0.09;
      const pz = cz + Math.sin(a) * 0.09;
      raiz.push({
        pos: [px, cy, pz],
        quat: [qDir.x, qDir.y, qDir.z, qDir.w],
        escala: esc,
        tint: [col.r, col.g, col.b],
      });
      puestas += 1;
    }
    // el corte blanco: en cada cepa hay una raíz partida mostrando la pulpa
    corte.push({
      pos: [cx + 0.14, cy - 0.02, cz + 0.09],
      rotY: rRaiz() * Math.PI,
      escala: 1,
      tint: [1, 1, 1],
    });
  }

  // las raíces ya apartadas, acostadas en la tierra abierta del claro
  while (puestas < c.raiz) {
    const a = rRaiz() * Math.PI * 2;
    const rad = 0.9 + Math.sqrt(rRaiz()) * 1.7;
    const px = SITIO_ARRANQUE[0] + Math.cos(a) * rad;
    const pz = SITIO_ARRANQUE[1] + Math.sin(a) * rad * 0.75;
    // acostada: el eje +Y de la raíz apuntando casi horizontal
    const ah = rRaiz() * Math.PI * 2;
    vDir.set(Math.cos(ah), 0.12 + rRaiz() * 0.16, Math.sin(ah)).normalize();
    qDir.setFromUnitVectors(arriba, vDir);
    if (rRaiz() > 0.62) col.copy(cascRojiza);
    else col.copy(cascParda);
    col.multiplyScalar(0.9 + rRaiz() * 0.2);
    raiz.push({
      pos: [px, alturaYucal(px, pz) + 0.07, pz],
      quat: [qDir.x, qDir.y, qDir.z, qDir.w],
      escala: 0.8 + rRaiz() * 0.4,
      tint: [col.r, col.g, col.b],
    });
    if (rRaiz() > 0.55) {
      corte.push({
        pos: [px - Math.cos(ah) * 0.05, alturaYucal(px, pz) + 0.07, pz - Math.sin(ah) * 0.05],
        rotY: rRaiz() * Math.PI,
        escala: 0.95,
        tint: [1, 1, 1],
      });
    }
    puestas += 1;
  }

  /* --- EL SEMILLERO: las estacas sembradas INCLINADAS. -------------------- */
  const estaca = [];
  for (let i = 0; i < c.estaca; i++) {
    const fila = Math.floor(i / 5);
    const enFila = i % 5;
    const px = SITIO_ESTACAS[0] - 1.5 + enFila * 0.72 + (rSue() - 0.5) * 0.16;
    const pz = SITIO_ESTACAS[1] - 0.9 + fila * 0.62 + (rSue() - 0.5) * 0.14;
    // la inclinación de siembra: ~35–50° del vertical, todas para el mismo lado
    const inc = 0.62 + rSue() * 0.26;
    const giro = 0.5 + (rSue() - 0.5) * 0.5;
    estaca.push({
      pos: [px, alturaYucal(px, pz) - 0.04, pz],
      rot: [Math.sin(giro) * inc, rSue() * Math.PI * 2, Math.cos(giro) * inc],
      escala: 0.9 + rSue() * 0.3,
      tint: [0.94 + rSue() * 0.12, 0.94 + rSue() * 0.12, 0.94 + rSue() * 0.12],
    });
  }

  /* --- La ASOCIACIÓN: plátano en los bordes, maíz entre las matas. -------- */
  const platano = [];
  const sitiosPlat = [
    [-12.8, 2.4], [-13.4, -3.6], [-12.2, -8.2], [12.6, 1.2],
    [13.2, -4.8], [12.0, -9.0], [-9.5, 6.6], [9.8, 6.2],
  ];
  for (let i = 0; i < Math.min(c.platano, sitiosPlat.length); i++) {
    const [x, z] = sitiosPlat[i];
    platano.push({
      pos: [x, alturaYucal(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.85 + rSue() * 0.35,
      tint: [0.9 + rSue() * 0.18, 0.9 + rSue() * 0.18, 0.9 + rSue() * 0.18],
    });
  }

  const maiz = [];
  let intentosMaiz = 0;
  while (maiz.length < c.maiz && intentosMaiz < c.maiz * 20) {
    intentosMaiz += 1;
    const x = -13 + rSue() * 26;
    const z = -10.5 + rSue() * 16.5;
    if (dentroLote(x, z) < 0.5) continue; // el maíz va DENTRO, intercalado
    // que no se pare justo encima de una mata de yuca
    const i0 = Math.round(x / PASO_X);
    const j0 = Math.round(z / PASO_Z);
    const [cx, cz] = centroMata(i0, j0);
    if ((x - cx) ** 2 + (z - cz) ** 2 < 0.35) continue;
    maiz.push({
      pos: [x, alturaYucal(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.85 + rSue() * 0.35,
      tint: [0.9 + rSue() * 0.2, 0.9 + rSue() * 0.2, 0.9 + rSue() * 0.2],
    });
  }

  /* --- El monte y la piedra del borde (fuera del lote). ------------------- */
  const monte = [];
  let intentosMonte = 0;
  while (monte.length < c.monte && intentosMonte < c.monte * 16) {
    intentosMonte += 1;
    const x = -19 + rSue() * 38;
    const z = -18 + rSue() * 36;
    if (dentroLote(x, z) > 0.25) continue;
    const dHx = x - SITIO_CASA[0];
    const dHz = z - SITIO_CASA[1];
    if (dHx * dHx + dHz * dHz < 9) continue;
    monte.push({
      pos: [x, alturaYucal(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.9,
      tint: [0.9 + rSue() * 0.2, 0.9 + rSue() * 0.2, 0.9 + rSue() * 0.2],
    });
  }

  const piedra = [];
  let intentosPiedra = 0;
  while (piedra.length < c.piedra && intentosPiedra < c.piedra * 16) {
    intentosPiedra += 1;
    const x = -18 + rSue() * 36;
    const z = -16 + rSue() * 32;
    if (dentroLote(x, z) > 0.25) continue;
    piedra.push({
      pos: [x, alturaYucal(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.8,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return { mata, hoja, peciolo, raiz, corte, tocon, estaca, platano, maiz, monte, piedra };
}
