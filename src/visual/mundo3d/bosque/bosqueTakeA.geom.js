/*
 * bosqueTakeA.geom — la GEOMETRÍA del bosque de niebla TAKE A (naturalista).
 *
 * El claro del guardián deja de ser un plato verde: aquí vive el RELIEVE del
 * anfiteatro altoandino (heightfield determinista), el QUEÑUAL de troncos
 * retorcidos con copas que son MASA de hojas (nubes deformadas con normales
 * radiales — nada de poliedros literales), la hojarasca del suelo, los troncos
 * caídos con musgo y el arroyo que baja de la niebla.
 *
 * Reglas de la casa:
 *   · Todo procedural y determinista (rng con semilla): el mismo bosque en
 *     cada carga, cero assets externos.
 *   · Color HORNEADO por vértice (hornearCorteza/hornearFollaje del taller
 *     sombreadoVegetal) → un material con vertexColors por banco.
 *   · mergeGeometries devuelve NULL EN SILENCIO si se mezclan indexadas con
 *     no-indexadas (ya mordió 3 veces): aquí TODO se desindexa y se TRUENA si
 *     el merge falla — pero SIN recomputar normales (las copas traen normales
 *     radiales a propósito: así la nube de hojas se sombrea suave).
 *   · three core puro: corre headless, sin contexto GL.
 */
import * as THREE from 'three';
import {
  rng,
  fusionarSeguro,
  poner,
  apuntar,
  pintarPlano,
  hornearFollaje,
  hornearCorteza,
  tuboOrganico,
  taperTronco,
  taperLineal,
  curvaTronco,
  sembrarFollaje,
  matojoNube,
} from './sombreadoVegetal.js';
import { crearSueloRico } from '../terreno/sueloRico.geom.js';

const ss = THREE.MathUtils.smoothstep;

/* Fusión que PRESERVA las normales radiales de las copas-nube (matojoNube):
   la opción canónica del taller — nada de reimplementar la trampa del null. */
const fusionarConNormales = (partes, etiqueta) => fusionarSeguro(partes, etiqueta, { preservarNormales: true });

/* -------------------------------------------------------------------------- */
/*  EL TERRENO — el anfiteatro del bosque de niebla, sobre el SUELO RICO       */
/* -------------------------------------------------------------------------- */

/*
 * El relieve es una COMPOSICIÓN: el sistema compartido `crearSueloRico`
 * (heightfield fbm con warp de dominio + claro central llano + SENDERO que
 * recorta el relieve — el suelo calibre consola de toda escena) MÁS la
 * identidad del bosque de niebla, que el sistema no conoce:
 *   · la PARED del anfiteatro (r>12.5) que trepa hasta ~6 con crestas
 *     irregulares por ángulo — el cuenco que la niebla se come al fondo;
 *   · la CAÑADA del arroyo: la vaguada honda que baja del fondo brumoso y
 *     cruza el flanco derecho del claro.
 * Determinista y barata: TODO lo que se siembra se posa con `alturaBosque`.
 */
export function xArroyo(z) {
  return 4.7 + Math.sin(z * 0.24 + 1.3) * 1.5;
}

/* La identidad del anfiteatro (lo que crearSueloRico no sabe). */
function extraAnfiteatro(x, z) {
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);
  const cresta = 1 + 0.34 * Math.sin(ang * 3 + 1.2)
    + 0.2 * Math.sin(ang * 7 - 0.7)
    + 0.12 * Math.sin(ang * 13 + 2.3);
  const pared = ss(r, 12.5, 30) ** 1.25 * 4.8 * cresta;
  const dx = x - xArroyo(z);
  const canada = -0.4 * Math.exp(-(dx * dx) / 1.15) * ss(z, -13, -6) * (1 - ss(r, 20, 28));
  return pared + canada;
}

/* Paleta del bosque de niebla para el suelo rico: musgo hondo en vez de pasto
   de páramo, trillo pardo húmedo, roca fría — el mood de la toma A. */
export const PALETA_BOSQUE = {
  base: '#48552f', // musgo del claro
  pastoVivo: '#5a6b3a', // musgo claro (nubes grandes de mota)
  humedo: '#2f3d2b', // hondonadas y la orilla de la cañada
  seco: '#7e7a4e', // lomos apenas pajizos (bosque húmedo: sin oro de páramo)
  hojarasca: '#6e5838', // manto pardo bajo el queñual
  tierraSenda: '#8a7048', // el trillo pisado que entra al claro
  tierraHumeda: '#4c3f2e',
  roca: '#7b8074', // piedra fría del anfiteatro
  rocaClara: '#989b8c',
  liquen: '#9aa86a',
  raiz: '#5b4a35',
  paja: '#8f855a',
  pajaVerde: '#66713f',
  flor: '#e8e3c9',
  florMiel: '#d9b45a',
};

/* El trillo: entra por el flanco izquierdo del frente y muere en el claro del
   guardián (la afordancia de "por aquí se llega") — lejos del arroyo. */
const PUNTOS_SENDERO = /** @type {Array<[number, number]>} */ ([
  [-15.5, 11.5], [-11.5, 8.6], [-8.2, 6.3], [-5.2, 4.4], [-2.7, 2.3], [-0.9, 0.6],
]);

const sueloBase = crearSueloRico({
  tam: 64,
  seed: 929,
  amplitud: 0.5,
  micro: 0.085,
  claro: { radio: 3.2, transicion: 6.3 },
  falda: null, // la pared del anfiteatro (con crestas) la pone extraAnfiteatro
  sendero: { puntos: PUNTOS_SENDERO, ancho: 1.05 },
  paleta: PALETA_BOSQUE,
});

/**
 * EL SUELO del bosque: el contrato `SueloRico` (alturaDe/pendienteDe/
 * senderoCerca/opts) con la identidad del anfiteatro compuesta encima —
 * `geomSueloRico`/`<SueloRico>` lo consumen tal cual, y TODO lo que la escena
 * siembra (queñual, flora, hojarasca, arroyo) se posa con su `alturaDe`.
 */
export const sueloDelBosque = {
  ...sueloBase,
  alturaDe: (x, z) => sueloBase.alturaDe(x, z) + extraAnfiteatro(x, z),
  pendienteDe: (x, z, e = 0.4) => {
    const a = sueloDelBosque.alturaDe;
    const dx = (a(x + e, z) - a(x - e, z)) / (2 * e);
    const dz = (a(x, z + e) - a(x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  },
};

/** Cota del terreno del bosque en (x,z) — la función que TODO usa para posarse. */
export function alturaBosque(x, z) {
  return sueloDelBosque.alturaDe(x, z);
}

/* -------------------------------------------------------------------------- */
/*  LA QUEÑUA (Polylepis) — el árbol del bosque de niebla                      */
/* -------------------------------------------------------------------------- */

/* Paleta Polylepis: corteza roja que se despapela + hoja menuda verde-gris. */
const QUENUA = {
  grieta: '#3a231a',
  cuerpo: '#82503a',
  papel: '#cf9068', // la lámina que se desprende (la firma de la queñua)
  liquen: '#94a56b',
  hojaBase: '#2c4531',
  hojaSol: '#6f9150',
  hojaLuz: '#c3cf7e',
  barba: '#93a877', // musgo/usnea colgando en el bosque de niebla
};

/*
 * UNA queñua completa, fusionada en UNA geometría con color horneado:
 *   · fuste principal retorcido (curva + conicidad + arruga de corteza) y un
 *     segundo fuste bajo — Polylepis crece en macolla, nunca es un palo recto;
 *   · ramas que suben en busca de luz, cada una rematada en un LÓBULO de copa;
 *   · cada lóbulo es un puñado de matojos-nube sembrados con huecos y borde
 *     mordido (el cielo se ve a través) + AO/gradiente/contraluz horneados;
 *   · barbas de musgo colgando del borde inferior (el velo del bosque de niebla).
 * `q` escala el detalle (tier); `seed` da variantes distintas.
 */
export function geomQuenua({ q = 1 } = {}, seed = 21) {
  const r = rng(seed);
  const partesCorteza = [];
  const copas = [];
  const H = 3.3 + r() * 1.2;

  // Fuste principal: pelea con el viento (inclinación + sinuosidad + torsión).
  const curva = curvaTronco(
    { altura: H, inclina: 0.14 + r() * 0.14, sinuoso: 0.15 + r() * 0.12, giro: r() * Math.PI * 2 },
    seed + 1,
  );
  partesCorteza.push(tuboOrganico(curva, {
    tubular: Math.max(10, Math.round(20 * q)),
    radial: Math.max(6, Math.round(8 * q)),
    taper: taperTronco(0.24 + r() * 0.07, 0.085, 0.55),
    arruga: 0.16,
    semilla: seed * 3.1,
  }));

  // Segundo fuste (la macolla): más bajo, más recostado.
  const giro2 = r() * Math.PI * 2;
  const off2 = [Math.cos(giro2) * 0.3, 0, Math.sin(giro2) * 0.3];
  const curva2 = curvaTronco(
    { altura: H * (0.45 + r() * 0.2), inclina: 0.34 + r() * 0.2, sinuoso: 0.22, giro: giro2 },
    seed + 2,
  );
  const fuste2 = tuboOrganico(curva2, {
    tubular: Math.max(8, Math.round(12 * q)),
    radial: Math.max(5, Math.round(7 * q)),
    taper: taperTronco(0.13 + r() * 0.04, 0.05, 0.5),
    arruga: 0.18,
    semilla: seed * 5.7,
  });
  poner(fuste2, off2);
  partesCorteza.push(fuste2);

  // Lóbulos de copa: la corona del fuste + la punta de cada rama + la macolla.
  const lobulos = [];
  const puntaP = curva.getPointAt(1);
  lobulos.push({ c: [puntaP.x, puntaP.y + 0.42, puntaP.z], radio: 0.95 + r() * 0.3 });

  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const t0 = Math.min(0.9, 0.55 + i * (0.32 / nRamas) + r() * 0.05);
    const pIni = curva.getPointAt(t0);
    const ang = r() * Math.PI * 2;
    const alcance = 0.9 + r() * 0.7;
    const pFin = new THREE.Vector3(
      pIni.x + Math.cos(ang) * alcance,
      pIni.y + 0.55 + r() * 0.5,
      pIni.z + Math.sin(ang) * alcance,
    );
    const pMed = pIni.clone().lerp(pFin, 0.5);
    pMed.y += 0.18;
    partesCorteza.push(tuboOrganico(new THREE.CatmullRomCurve3([pIni, pMed, pFin]), {
      tubular: Math.max(6, Math.round(9 * q)),
      radial: Math.max(5, Math.round(6 * q)),
      taper: taperLineal(0.085, 0.03),
      arruga: 0.12,
      semilla: seed * 7 + i,
    }));
    lobulos.push({ c: [pFin.x, pFin.y + 0.3, pFin.z], radio: 0.68 + r() * 0.35 });
  }
  const punta2 = curva2.getPointAt(1);
  lobulos.push({
    c: [punta2.x + off2[0], punta2.y + 0.26, punta2.z + off2[2]],
    radio: 0.52 + r() * 0.25,
  });

  // Corteza horneada: grieta/cuerpo/papel rojizo + líquen trepando el pie.
  const corteza = fusionarConNormales(partesCorteza, 'quenua-corteza');
  hornearCorteza(corteza, {
    grieta: QUENUA.grieta,
    cuerpo: QUENUA.cuerpo,
    cresta: QUENUA.papel,
    liquen: QUENUA.liquen,
    escalaGrano: 4.2,
    hastaLiquen: 0.85,
  });

  // Copas: matojos-nube con huecos, borde mordido y sombreado horneado.
  const varia = (hex, amt) => {
    const c = new THREE.Color(hex);
    c.multiplyScalar(1 + (r() - 0.5) * amt);
    return c;
  };
  for (let i = 0; i < lobulos.length; i++) {
    const lb = lobulos[i];
    const puntos = sembrarFollaje({
      centro: lb.c,
      radio: lb.radio,
      achatado: 0.72,
      n: Math.max(5, Math.round(11 * q * lb.radio)),
      semilla: seed * 13 + i * 3,
      huecos: 0.46,
      mordida: 0.38,
      distMin: lb.radio * 0.3,
    });
    const matojos = puntos.map((p, k) => {
      const m = matojoNube((0.26 + 0.16 * p.esc) * lb.radio, seed * 17 + i * 5 + k, 0.5);
      poner(m, p.pos, p.giro, [1, 0.82, 1]);
      return m;
    });
    if (!matojos.length) {
      const m = matojoNube(lb.radio * 0.7, seed * 17 + i * 5, 0.5);
      poner(m, lb.c, [0, 0, 0], [1, 0.82, 1]);
      matojos.push(m);
    }
    const copa = fusionarConNormales(matojos, 'quenua-copa');
    hornearFollaje(copa, {
      base: varia(QUENUA.hojaBase, 0.1),
      sol: varia(QUENUA.hojaSol, 0.12),
      luz: QUENUA.hojaLuz,
      centro: lb.c,
      radio: lb.radio * 1.2,
      ao: 0.66,
      manchas: 0.16,
    });
    copas.push(copa);
  }

  // Barbas de musgo colgando del borde inferior de los lóbulos.
  const barbas = [];
  const nBarbas = Math.max(2, Math.round(5 * q));
  for (let i = 0; i < nBarbas; i++) {
    const lb = lobulos[i % lobulos.length];
    const ang = r() * Math.PI * 2;
    const largo = 0.3 + r() * 0.35;
    const barba = new THREE.ConeGeometry(0.045, largo, 4, 1);
    apuntar(
      barba,
      [
        lb.c[0] + Math.cos(ang) * lb.radio * 0.55,
        lb.c[1] - lb.radio * 0.5 - largo * 0.35,
        lb.c[2] + Math.sin(ang) * lb.radio * 0.55,
      ],
      [Math.cos(ang) * 0.12, -1, Math.sin(ang) * 0.12],
    );
    barbas.push(pintarPlano(barba, varia(QUENUA.barba, 0.14)));
  }

  return fusionarConNormales([corteza, ...copas, ...barbas], 'quenua');
}

/* -------------------------------------------------------------------------- */
/*  EL QUEÑUAL — dónde vive cada queñua                                        */
/* -------------------------------------------------------------------------- */

/* El corredor de cámara (la vista de reposo mira al Ent desde ~az 0.61): las
   queñuas HÉROE no se paran en el encuadre; las lejanas sí pueden velarse. */
const AZ_CAMARA = 0.61;
/* Los vecinos rubber-hose viven en estas anclas (FaunaBosque): despejarlas. */
const ANCLAS_VECINOS = [[-3.7, 3.0], [3.1, 3.2], [-4.9, 4.4], [3.0, 2.1]];

const CUPO_QUENUAL = {
  alto: { cerca: 8, lejos: 12 },
  medio: { cerca: 5, lejos: 6 },
  bajo: { cerca: 3, lejos: 0 },
};

function tinteInstancia(r, amt = 0.1) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.5;
  const cl = (v) => Math.max(0.75, Math.min(1.14, v));
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

/**
 * Sitios del queñual para un tier: anillo HÉROE (r 6.4–10.6, enmarca el claro
 * sin tapar el corredor de cámara ni el arroyo ni a los vecinos) + anillo
 * LEJANO (r 12.5–19.5, sobre la falda de la pared, velado por la niebla, con
 * escala mayor: siluetas que dan fondo). Determinista.
 */
export function sitiosQuenual(tier = 'alto') {
  const cupo = CUPO_QUENUAL[tier] || CUPO_QUENUAL.medio;
  const r = rng(929);
  const sitios = [];

  const cabe = (x, z, minSep) => {
    for (const s of sitios) {
      if ((s.pos[0] - x) ** 2 + (s.pos[2] - z) ** 2 < minSep * minSep) return false;
    }
    for (const [ax, az] of ANCLAS_VECINOS) {
      if ((ax - x) ** 2 + (az - z) ** 2 < 1.8 * 1.8) return false;
    }
    // El trillo queda libre: ninguna queñua plantada sobre el sendero.
    if (sueloDelBosque.senderoCerca(x, z).d < 1.7) return false;
    return true;
  };

  let cerca = 0;
  let intentos = 0;
  while (cerca < cupo.cerca && intentos++ < 300) {
    const ang = r() * Math.PI * 2;
    const d = Math.atan2(Math.sin(ang - AZ_CAMARA), Math.cos(ang - AZ_CAMARA));
    if (Math.abs(d) < 0.55) continue; // el encuadre del guardián queda libre
    const rad = 6.4 + r() * 4.2;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (z > -13 && Math.abs(x - xArroyo(z)) < 1.4) continue; // no pisar el agua
    if (!cabe(x, z, 2.6)) continue;
    sitios.push({
      pos: [x, alturaBosque(x, z) - 0.06, z],
      rotY: r() * Math.PI * 2,
      esc: 0.92 + r() * 0.35,
      variante: sitios.length % 3,
      tinte: tinteInstancia(r),
    });
    cerca++;
  }

  let lejos = 0;
  intentos = 0;
  while (lejos < cupo.lejos && intentos++ < 300) {
    const ang = r() * Math.PI * 2;
    const d = Math.atan2(Math.sin(ang - AZ_CAMARA), Math.cos(ang - AZ_CAMARA));
    if (Math.abs(d) < 0.22) continue; // ni las lejanas tapan al Ent de frente
    const rad = 12.5 + r() * 7;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (z > -13 && Math.abs(x - xArroyo(z)) < 1.6) continue;
    if (!cabe(x, z, 3.1)) continue;
    sitios.push({
      pos: [x, alturaBosque(x, z) - 0.1, z],
      rotY: r() * Math.PI * 2,
      esc: 1.15 + r() * 0.5,
      variante: sitios.length % 3,
      tinte: tinteInstancia(r, 0.14),
    });
    lejos++;
  }

  return sitios;
}

/* -------------------------------------------------------------------------- */
/*  HOJARASCA — el suelo del bosque no está barrido                            */
/* -------------------------------------------------------------------------- */

/** Loseta de hojarasca: disco bajo de borde irregular (se instancia). */
export function geomLosetaHojarasca(seed = 5) {
  const r = rng(seed);
  const g = new THREE.CircleGeometry(1, 7);
  const pos = g.attributes.position;
  const v = new THREE.Vector2();
  for (let i = 1; i < pos.count; i++) { // el vértice 0 es el centro
    v.set(pos.getX(i), pos.getY(i));
    const f = 0.72 + r() * 0.5;
    pos.setXY(i, v.x * f, v.y * f);
  }
  g.rotateX(-Math.PI / 2);
  return g;
}

const TINTES_HOJARASCA = ['#6e5838', '#7d6a44', '#5c4a30', '#87724d', '#4f4a2c', '#75543a'];

/** Siembra de hojarasca: parches bajo el anillo de árboles, no alfombra. */
export function sitiosHojarasca(n, seed = 31) {
  const r = rng(seed);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2;
    const rad = 2.6 + Math.sqrt(r()) * 13;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    arr.push({
      pos: [x, alturaBosque(x, z) + 0.02, z],
      rotY: r() * Math.PI * 2,
      esc: 0.07 + r() * (r() > 0.85 ? 0.24 : 0.12),
      tinte: TINTES_HOJARASCA[Math.floor(r() * TINTES_HOJARASCA.length)],
    });
  }
  return arr;
}

/* -------------------------------------------------------------------------- */
/*  TRONCOS CAÍDOS — la madera muerta que hace bosque viejo                    */
/* -------------------------------------------------------------------------- */

/**
 * Dos troncos caídos con musgo encima, posados sobre el relieve. UNA geometría
 * (color horneado) → un draw-call.
 */
export function geomTroncosCaidos(q = 1) {
  const partes = [];
  const domos = [];
  const caido = (x0, z0, x1, z1, grosor, seed) => {
    const y0 = alturaBosque(x0, z0);
    const y1 = alturaBosque(x1, z1);
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0, y0 + grosor * 0.55, z0),
      new THREE.Vector3((x0 + x1) / 2, Math.max(y0, y1) + grosor * 0.9, (z0 + z1) / 2),
      new THREE.Vector3(x1, y1 + grosor * 0.5, z1),
    ]);
    partes.push(tuboOrganico(curva, {
      tubular: Math.max(8, Math.round(12 * q)),
      radial: Math.max(5, Math.round(7 * q)),
      taper: taperLineal(grosor, grosor * 0.62),
      arruga: 0.2,
      semilla: seed,
    }));
    // Musgo encima (domos bajos, el lado que mira al cielo húmedo).
    const rD = rng(seed * 3);
    for (let i = 0; i < Math.max(2, Math.round(4 * q)); i++) {
      const t = 0.2 + rD() * 0.6;
      const p = curva.getPointAt(t);
      const domo = new THREE.SphereGeometry(grosor * (0.5 + rD() * 0.4), 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
      poner(domo, [p.x, p.y + grosor * 0.5, p.z], [0, rD() * Math.PI, 0], [1.4, 0.5, 1]);
      domos.push(pintarPlano(domo, new THREE.Color(rD() > 0.5 ? '#4c5c34' : '#5a6a3e')));
    }
  };
  caido(-6.8, 4.6, -4.0, 6.6, 0.2, 41);
  caido(6.4, -5.2, 8.6, -3.2, 0.17, 43);

  const madera = fusionarConNormales(partes, 'troncos-caidos');
  hornearCorteza(madera, {
    grieta: '#33261d',
    cuerpo: '#6b503b',
    cresta: '#8a6d4f',
    liquen: '#94a56b',
    escalaGrano: 3.6,
    hastaLiquen: 1.4,
  });
  return fusionarConNormales([madera, ...domos], 'troncos-caidos-musgo');
}

/* -------------------------------------------------------------------------- */
/*  EL ARROYO — el hilo de agua que baja de la niebla                          */
/* -------------------------------------------------------------------------- */

/** La curva del arroyo, posada sobre su cañada (para TubeGeometry). */
export function curvaArroyo() {
  const pts = [];
  for (let z = -12; z <= 15; z += 3) {
    const x = xArroyo(z);
    pts.push(new THREE.Vector3(x, alturaBosque(x, z) + 0.05, z));
  }
  return new THREE.CatmullRomCurve3(pts);
}
