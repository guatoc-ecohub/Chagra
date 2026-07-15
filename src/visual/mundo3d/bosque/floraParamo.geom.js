/*
 * floraParamo.geom — el BOSQUE ALTOANDINO que rodea al Ent de la queñua.
 *
 * REHECHO tras el rechazo del operador: *"las matas alrededor ni se diga,
 * parecen más árboles de navidad que matas"*. Tenía toda la razón, y el DR de
 * realismo-3d-vegetacion nombra el fallo exacto que teníamos:
 *
 *   ANTES: `CylinderGeometry` recto + un puñado de `IcosahedronGeometry` regados
 *   en un domo, cada parte con UN color plano horneado (`pintar`). Es la
 *   definición literal del "cono/esfera de follaje sobre un cilindro" del DR:
 *   sin conicidad, sin jerarquía de ramas, sin huecos, sin AO, sin gradiente.
 *   El aliso incluso construía la copa como un CONO explícito. Árbol de navidad.
 *
 *   AHORA: todas las especies leñosas salen de `construirArbol`, que aplica las
 *   recetas del DR por orden de retorno visual:
 *     · tronco con CURVA, conicidad real, raigón y arruga en la geometría;
 *     · JERARQUÍA de ramas (primarias en ángulo áureo → secundarias);
 *     · copas sembradas en los EXTREMOS de rama, con HUECOS y borde MORDIDO
 *       (el cielo se ve a través → se acabó la masa sólida);
 *     · sombreado horneado por vértice: AO + gradiente de altura + contraluz;
 *     · variación determinista por instancia (rotación/escala/inclinación/tinte).
 *
 * Cada especie conserva lo que la hace INCONFUNDIBLE (si se ven genéricas,
 * fallamos):
 *   · Frailejón (Espeletia)      — roseta vellosa plateada + enagua de hojas
 *                                  muertas marcescentes. El ícono del páramo.
 *   · Queñua (Polylepis)         — tronco retorcido + corteza rojiza que se
 *                                  descama en LÁMINAS DE PAPEL (geometría real).
 *   · Encenillo (Weinmannia)     — árbol de niebla: tronco rojizo, copa oscura
 *                                  compacta, velo de musgo.
 *   · Aliso (Alnus acuminata)    — tronco gris claro esbelto, copa alta y fresca
 *                                  (alargada e IRREGULAR, nunca un cono).
 *   · Gaque (Clusia)             — copa redonda densa de hoja gruesa lustrosa.
 *   · Mortiño (Vaccinium)        — arbusto bajo con bayas azul-moradas (agraz).
 *   · Romerillo, rocas con líquen, musgo — el suelo y el sotobosque.
 *
 * TÉCNICA tier-safe: cada especie se fusiona en UNA geometría con el color ya
 * horneado → UN InstancedMesh → una draw-call por especie por más matas que
 * haya. Cero assets externos. Corre headless (three core puro).
 */
import * as THREE from 'three';
import {
  rng,
  ruidoFbm,
  fusionarSeguro,
  poner,
  apuntar,
  pintarPlano,
  hornearFollaje,
  hornearCorteza,
  tuboOrganico,
  taperLineal,
  taperTronco,
  curvaTronco,
  sembrarFollaje,
  matojoHoja,
} from './sombreadoVegetal.js';

export { rng };

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Cuántas matas de cada especie. 'alto' puebla un bosque pleno; 'medio' es
 * frugal; 'bajo' deja lo mínimo para que AÚN se lea "páramo". Cada especie es
 * UN InstancedMesh → estos números son instancias, no draw-calls.
 */
export const FLORA_TIER = {
  alto: {
    frailejon: 34, frailejonFlor: 7, quenua: 5, encenillo: 5, aliso: 4,
    gaque: 3, mortino: 12, romerillo: 14, roca: 10, musgo: 14, niebla: 3,
  },
  medio: {
    frailejon: 20, frailejonFlor: 4, quenua: 3, encenillo: 3, aliso: 2,
    gaque: 2, mortino: 7, romerillo: 8, roca: 6, musgo: 7, niebla: 0,
  },
  bajo: {
    frailejon: 8, frailejonFlor: 0, quenua: 2, encenillo: 0, aliso: 0,
    gaque: 0, mortino: 3, romerillo: 3, roca: 2, musgo: 3, niebla: 0,
  },
};

/** Conteos de flora para un tier (desconocido → frugal, nunca el más caro). */
export const floraDeTier = (tier) => FLORA_TIER[tier] || FLORA_TIER.medio;

/* Factor de DETALLE geométrico por tier: escala hojas/ramas por mata. */
export const CALIDAD_TIER = { alto: 1, medio: 0.6, bajo: 0.4 };
export const calidadDeTier = (tier) => CALIDAD_TIER[tier] ?? CALIDAD_TIER.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del páramo (horneada en vertexColors)                               */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Frailejón — la roseta plateada vellosa es la firma.
  frailejonTronco: '#5f4e36',
  frailejonSeco: '#7d6544', // enagua de hojas muertas marcescentes
  frailejonSeco2: '#93794f',
  frailejonPlata: '#a8b79a', // roseta: verde-plata vellosa (NO blanco tiza)
  frailejonPlataSol: '#c8d3b6',
  frailejonCorazon: '#b9c4a4',
  frailejonFlor: '#dcbc46',
  frailejonTallo: '#8d9866',

  // Queñua (Polylepis) — corteza rojiza en láminas de papel.
  quenuaGrieta: '#4a2a20',
  quenuaCuerpo: '#8a4a33',
  quenuaPapel: '#cf9166',
  quenuaLamina: '#b9744c',
  quenuaHoja: '#4e6640',
  quenuaHojaSol: '#8ba06d',

  // Encenillo (Weinmannia) — el árbol de la niebla.
  encenilloGrieta: '#3d2419',
  encenilloTronco: '#6d4535',
  encenilloHoja: '#31462d',
  encenilloHojaSol: '#5c7a4c',
  encenilloMusgo: '#6b7d4c',

  // Aliso (Alnus acuminata) — corteza gris clara.
  alisoGrieta: '#5f6156',
  alisoTronco: '#9a9a8f',
  alisoLenticela: '#c2c2b4',
  alisoHoja: '#415c30',
  alisoHojaSol: '#83a05a',

  // Gaque (Clusia) — hoja gruesa verde muy oscuro lustrosa.
  gaqueGrieta: '#33291f',
  gaqueTronco: '#57493a',
  gaqueHoja: '#263d24',
  gaqueHojaSol: '#4e6f43',

  // Mortiño (Vaccinium meridionale) — agraz andino.
  mortinoRama: '#5a4030',
  mortinoHoja: '#37502f',
  mortinoHojaSol: '#6a8248',
  mortinoBrote: '#7a4536',
  mortinoBaya: '#33305c',
  mortinoBaya2: '#454078',

  // Roble andino (Quercus humboldtii) — no es de páramo; lo usan la ladera de
  // restauración y el valle. Copa ancha de hoja coriácea oscura + bellotas.
  robleTronco: '#6a5c4a',
  robleHoja: '#3a4f32',
  robleHojaSol: '#6d8a4e',
  robleBellota: '#7a5a34',
  robleCapa: '#54432a',

  // Yarumo plateado (Cecropia telealba) — tampoco es de páramo; ladera + valle.
  // Su firma: el ENVÉS BLANCO de la hoja palmeada.
  yarumoTronco: '#bcbfb2',
  yarumoRama: '#a9ac9f',
  yarumoEnves: '#e2e7dc',
  yarumoHaz: '#7f9070',

  // Romerillo.
  romerilloHoja: '#65763a',
  romerilloHojaSol: '#98a85c',
  romerilloFlor: '#d8c24a',

  // Suelo.
  roca: '#77776b',
  rocaSol: '#9b9b8d',
  liquen: '#9aa86a',
  liquen2: '#b7c08a',
  musgo: '#46562f',
  musgoSol: '#6d8049',
};

/* Líquen del páramo que trepa el pie de todo lo leñoso. */
const LIQUEN_PIE = '#7c8a5e';

/* -------------------------------------------------------------------------- */
/*  El constructor de ÁRBOLES (jerarquía de ramas + copas con huecos)          */
/* -------------------------------------------------------------------------- */

const AUREO = Math.PI * (3 - Math.sqrt(5)); // ángulo áureo: filotaxia real

/**
 * Construye un árbol procedural completo y lo devuelve FUSIONADO (1 draw-call).
 *
 * Sigue la receta del DR en orden de retorno: silueta y jerarquía primero,
 * sombreado horneado encima. Las copas NO son un domo relleno: se siembran
 * cúmulos en las PUNTAS DE RAMA, cada uno con huecos y borde mordido.
 *
 * @param {object} o
 * @param {string} o.nombre        etiqueta (para que un merge nulo diga quién).
 * @param {number} o.altura        altura del fuste.
 * @param {number} o.r0            radio en la base.
 * @param {number} o.r1            radio en la punta.
 * @param {number} [o.inclina]     cuánto se inclina el fuste con la altura.
 * @param {number} [o.sinuoso]     cuánto serpentea alrededor de su eje.
 * @param {number} [o.raigon]      ensanche del pie (contrafuertes).
 * @param {number} [o.arruga]      amplitud del relieve de corteza.
 * @param {object} o.corteza       paleta de corteza (ver hornearCorteza).
 * @param {object} o.copa          { inicio, ramas, largo, alza, sub, subLargo }
 * @param {object} o.follaje       { base, sol, luz, radio, hojas, achatado, ... }
 * @param {number} o.q             calidad (tier): escala el detalle.
 * @param {number} o.semilla
 * @param {(partes:THREE.BufferGeometry[], ctx:object)=>void} [o.firma]
 *        gancho para el rasgo INCONFUNDIBLE de la especie (láminas de papel del
 *        Polylepis, lenticelas del aliso, musgo del encenillo, bayas…).
 */
export function construirArbol(o) {
  const {
    nombre, altura, r0, r1, corteza, copa, follaje, q = 1, semilla = 1,
    inclina = 0.08, sinuoso = 0.1, raigon = 0.35, arruga = 0.13,
  } = o;
  const r = rng(semilla);
  const partes = [];

  // 1) El FUSTE: curva sinuosa + conicidad con raigón + arruga en la malla.
  const giro = r() * Math.PI * 2;
  const curva = curvaTronco({ altura, inclina, sinuoso, giro }, semilla);
  const taper = taperTronco(r0, r1, raigon);
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(9, Math.round(16 * q)),
    radial: Math.max(5, Math.round(9 * q)),
    taper,
    arruga,
    semilla: semilla * 3,
  });
  hornearCorteza(tronco, {
    ...corteza,
    hastaLiquen: corteza.hastaLiquen ?? altura * 0.3,
    liquen: corteza.liquen ?? LIQUEN_PIE,
  });
  partes.push(tronco);

  // 2) RAMAS PRIMARIAS: nacen del tercio alto, en ángulo áureo (filotaxia real,
  //    no un reparto regular que se lee como radios de rueda).
  const nRamas = Math.max(2, Math.round(copa.ramas * q));
  const puntas = [];
  const ramaGeos = [];
  for (let i = 0; i < nRamas; i++) {
    const f = nRamas === 1 ? 0.5 : i / (nRamas - 1);
    const tBase = copa.inicio + f * (0.94 - copa.inicio);
    const base = curva.getPointAt(tBase);
    const ang = i * AUREO + giro;
    // Las ramas de abajo son más largas y abiertas; las de arriba, cortas y
    // erguidas → la copa se estrecha sola, sin ser un cono.
    const largo = copa.largo * (1.15 - f * 0.5) * (0.8 + r() * 0.4);
    const alza = copa.alza * (0.7 + f * 0.7);
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    const pts = [
      base.clone(),
      base.clone().add(new THREE.Vector3(dirX * largo * 0.34, alza * 0.3 + (r() - 0.5) * 0.1, dirZ * largo * 0.34)),
      base.clone().add(new THREE.Vector3(dirX * largo * 0.72 + (r() - 0.5) * 0.2, alza * 0.68, dirZ * largo * 0.72 + (r() - 0.5) * 0.2)),
      base.clone().add(new THREE.Vector3(dirX * largo, alza, dirZ * largo)),
    ];
    const cRama = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const rBase = Math.max(0.02, taper(tBase) * 0.4);
    const g = tuboOrganico(cRama, {
      tubular: Math.max(5, Math.round(9 * q)),
      radial: Math.max(4, Math.round(6 * q)),
      taper: taperLineal(rBase, rBase * 0.28),
      arruga: arruga * 0.7,
      semilla: semilla + i * 7,
    });
    ramaGeos.push(g);
    puntas.push({ p: pts[3].clone(), rBase, dir: [dirX, dirZ], nivel: 1 });

    // 3) RAMAS SECUNDARIAS: la jerarquía que el DR pide. Nacen a media rama y
    //    se abren en otro plano → la silueta deja de ser una estrella plana.
    const nSub = Math.max(0, Math.round((copa.sub ?? 2) * q));
    for (let k = 0; k < nSub; k++) {
      const tk = 0.42 + (k / Math.max(1, nSub)) * 0.45;
      const bk = cRama.getPointAt(tk);
      const desvio = ang + (k % 2 ? 1 : -1) * (0.6 + r() * 0.5);
      const lk = (copa.subLargo ?? largo * 0.5) * (0.7 + r() * 0.5);
      const pk = [
        bk.clone(),
        bk.clone().add(new THREE.Vector3(Math.cos(desvio) * lk * 0.5, alza * 0.22 + r() * 0.12, Math.sin(desvio) * lk * 0.5)),
        bk.clone().add(new THREE.Vector3(Math.cos(desvio) * lk, alza * 0.42 + r() * 0.16, Math.sin(desvio) * lk)),
      ];
      const cSub = new THREE.CatmullRomCurve3(pk, false, 'catmullrom', 0.5);
      const rk = rBase * 0.5;
      ramaGeos.push(tuboOrganico(cSub, {
        tubular: Math.max(4, Math.round(6 * q)),
        radial: 4,
        taper: taperLineal(rk, rk * 0.3),
        arruga: arruga * 0.5,
        semilla: semilla + i * 13 + k,
      }));
      puntas.push({ p: pk[2].clone(), rBase: rk, dir: [Math.cos(desvio), Math.sin(desvio)], nivel: 2 });
    }
  }
  for (const g of ramaGeos) {
    hornearCorteza(g, { ...corteza, hastaLiquen: 0, liquen: null });
    partes.push(g);
  }

  // 4) LA COPA: un cúmulo por punta de rama. Cada cúmulo trae huecos y borde
  //    mordido; juntos forman una masa irregular por la que entra el cielo.
  const cima = curva.getPointAt(1);
  const centros = puntas.map((pt) => ({
    centro: /** @type {[number, number, number]} */ ([pt.p.x, pt.p.y + follaje.radio * 0.25, pt.p.z]),
    radio: follaje.radio * (pt.nivel === 1 ? 1 : 0.66) * (0.75 + r() * 0.5),
  }));
  // La corona: remata el fuste para que la copa no se vea "colgada" de ramas.
  centros.push({ centro: /** @type {[number, number, number]} */ ([cima.x, cima.y + follaje.radio * 0.35, cima.z]), radio: follaje.radio * 0.95 });

  const totalHojas = Math.max(6, Math.round(follaje.hojas * q));
  const porCumulo = Math.max(2, Math.floor(totalHojas / centros.length));
  const yTope = cima.y + follaje.radio * 1.3;
  const yPie = copa.inicio * altura;

  centros.forEach((c, i) => {
    const puntos = sembrarFollaje({
      centro: c.centro,
      radio: c.radio,
      achatado: follaje.achatado ?? 0.8,
      n: porCumulo,
      semilla: semilla * 31 + i * 17,
      huecos: follaje.huecos ?? 0.42,
      mordida: follaje.mordida ?? 0.34,
      distMin: c.radio * (follaje.distMin ?? 0.38),
    });
    for (let k = 0; k < puntos.length; k++) {
      const h = puntos[k];
      const tam = c.radio * (follaje.escHoja ?? 0.34) * h.esc;
      const g = matojoHoja(tam, semilla + i * 5 + k, follaje.deform ?? 0.42);
      poner(g, h.pos, h.giro, [1, follaje.aplana ?? 0.72, 1]);
      // El sombreado se hornea contra el CÚMULO (AO local) pero con el rango de
      // altura del ÁRBOL entero → la copa tiene sol arriba y penumbra abajo.
      hornearFollaje(g, {
        base: follaje.base,
        sol: follaje.sol,
        luz: follaje.luz,
        centro: c.centro,
        radio: c.radio * 1.15,
        yMin: yPie,
        yMax: yTope,
        ao: follaje.ao ?? 0.6,
        manchas: follaje.manchas ?? 0.1,
      });
      partes.push(g);
    }
  });

  // 5) La FIRMA de la especie (lo que la hace inconfundible).
  if (o.firma) o.firma(partes, { r, curva, taper, altura, puntas, q, centros });

  return fusionarSeguro(partes, nombre);
}

/* -------------------------------------------------------------------------- */
/*  FRAILEJÓN (Espeletia) — el ícono, y el más difícil                         */
/* -------------------------------------------------------------------------- */

/*
 * Dos rasgos lo hacen inconfundible y los dos son geometría, no color:
 *   · la ENAGUA: el tallo va vestido con las hojas MUERTAS de toda su vida, que
 *     no se caen (marcescencia) — se apelmazan hacia abajo contra el tallo y lo
 *     engordan. Es lo que le da su silueta de columna peluda.
 *   · la ROSETA: hojas lanceoladas, gruesas y VELLOSAS, en espiral áurea,
 *     apretadas y erguidas formando una copa compacta — no un erizo de púas.
 *
 * La versión anterior fallaba justo aquí: pocas hojas, muy separadas, muy
 * blancas y muy abiertas → parecía un erizo blanco clavado en un palo.
 */
export function geomFrailejon({ flor = false, q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];
  const H = 1.0; // alto del tallo vestido

  // 1) Tallo columnar (casi todo oculto por la enagua).
  const tallo = new THREE.CylinderGeometry(0.1, 0.13, H, 7, 1);
  poner(tallo, [0, H / 2, 0]);
  hornearCorteza(tallo, {
    grieta: '#3f3324', cuerpo: PAL.frailejonTronco, cresta: '#7d6a4c',
    liquen: null, hastaLiquen: 0, escalaGrano: 9,
  });
  partes.push(tallo);

  // 2) ENAGUA: anillos densos de hojas muertas pegadas al tallo, apuntando
  //    abajo-afuera. Muchas y solapadas: es un manto, no un fleco.
  const anillos = Math.max(4, Math.round(7 * q));
  const porAnillo = Math.max(6, Math.round(10 * q));
  for (let a = 0; a < anillos; a++) {
    const f = a / anillos;
    const y = 0.1 + f * (H - 0.06);
    const rad = 0.13 - f * 0.015;
    for (let i = 0; i < porAnillo; i++) {
      const ang = (i / porAnillo) * Math.PI * 2 + a * 0.71 + r() * 0.16;
      const largo = 0.3 + r() * 0.1;
      const hoja = new THREE.ConeGeometry(0.055, largo, 4, 1);
      // Cuelgan pegadas: casi verticales hacia abajo, apenas abiertas.
      apuntar(
        hoja,
        [Math.cos(ang) * rad, y, Math.sin(ang) * rad],
        [Math.cos(ang) * 0.45, -0.9, Math.sin(ang) * 0.45],
        [1, 1, 0.42],
      );
      const seca = r() > 0.5 ? PAL.frailejonSeco : PAL.frailejonSeco2;
      hornearFollaje(hoja, {
        base: '#4a3a26', sol: seca, luz: '#a98d5e',
        centro: [0, y, 0], radio: 0.4, yMin: 0, yMax: H, ao: 0.42, manchas: 0.14,
      });
      partes.push(hoja);
    }
  }

  // 3) ROSETA: hojas lanceoladas apretadas en espiral áurea. Las de afuera se
  //    abren; las del centro van casi verticales → cogollo compacto y velloso.
  const nRoseta = Math.max(16, Math.round(34 * q));
  const cy = H + 0.02;
  for (let i = 0; i < nRoseta; i++) {
    const f = i / nRoseta; // 0 = exterior (vieja) → 1 = centro (nueva)
    const ang = i * AUREO;
    // Las viejas se tumban (casi horizontales), las nuevas se yerguen.
    const tilt = 0.85 - f * 0.62 + (r() - 0.5) * 0.08;
    const s = Math.sin(tilt);
    const largo = 0.32 - f * 0.1;
    // ANCHA y CORTA: una hoja de frailejón es una lengua carnosa, no una púa.
    // La versión anterior usaba conos largos y finos (r=0.062, l=0.5) muy
    // separados → el conjunto se leía como un ERIZO blanco clavado en un palo,
    // que es justo lo que el operador rechazó. Ancho ×2 y largo ×0.8, más
    // hojas y menos abiertas → roseta compacta y vellosa.
    const hoja = new THREE.ConeGeometry(0.135, largo, 6, 1);
    apuntar(
      hoja,
      [Math.cos(ang) * 0.03, cy + f * 0.045, Math.sin(ang) * 0.03],
      [Math.cos(ang) * s, Math.cos(tilt), Math.sin(ang) * s],
      [1, 1, 0.5], // lanceolada: carnosa. Aplanarla a 0.3 la volvía una púa.
    );
    // Vellosa: verde-plata MATE. Nada de blanco tiza (eso la volvía un erizo de
    // nieve); el frailejón es verde grisáceo con pelusa que apenas aclara.
    hornearFollaje(hoja, {
      base: '#5e6d4e', sol: PAL.frailejonPlata, luz: '#c2cdb0',
      centro: [0, cy, 0], radio: 0.5, yMin: cy - 0.2, yMax: cy + 0.38,
      ao: 0.5, manchas: 0.1,
    });
    partes.push(hoja);
  }
  // Cogollo velloso: el corazón apretado de la roseta.
  const corazon = matojoHoja(0.11, seed + 3, 0.3);
  poner(corazon, [0, cy + 0.08, 0], [0, 0, 0], [1, 0.8, 1]);
  hornearFollaje(corazon, {
    base: '#8e9a7c', sol: PAL.frailejonCorazon, luz: '#e2e8d6',
    centro: [0, cy + 0.08, 0], radio: 0.13, ao: 0.3, manchas: 0.06,
  });
  partes.push(corazon);

  // 4) Escapo floral (solo en flor): capítulos amarillos sobre tallo velloso.
  if (flor) {
    const tf = new THREE.CylinderGeometry(0.026, 0.038, 0.9, 5, 1);
    poner(tf, [0.04, cy + 0.44, 0], [0, 0, 0.07]);
    partes.push(pintarPlano(tf, PAL.frailejonTallo));
    const nCap = Math.max(4, Math.round(8 * q));
    for (let i = 0; i < nCap; i++) {
      const ang = i * AUREO;
      const rad = 0.09 + r() * 0.07;
      const cap = matojoHoja(0.05 + r() * 0.018, seed + i, 0.24);
      poner(cap, [0.07 + Math.cos(ang) * rad, cy + 0.86 + r() * 0.1, Math.sin(ang) * rad], [0, 0, 0], [1, 0.72, 1]);
      hornearFollaje(cap, {
        base: '#9b8420', sol: PAL.frailejonFlor, luz: '#f3e08a',
        centro: [0.07, cy + 0.9, 0], radio: 0.2, ao: 0.3, manchas: 0.05,
      });
      partes.push(cap);
    }
  }

  return fusionarSeguro(partes, flor ? 'frailejon-flor' : 'frailejon');
}

/* -------------------------------------------------------------------------- */
/*  QUEÑUA / Polylepis — la corteza de papel                                    */
/* -------------------------------------------------------------------------- */

/*
 * La misma especie del Ent, pero de porte normal: un cortejo de queñuas
 * jóvenes alrededor del guardián (una familia, no un solitario). Su firma es la
 * corteza rojiza que se DESCAMA en láminas de papel: se modela con geometría
 * (anillos de lámina despegada), que es lo único que la lee de verdad.
 */
export function geomQuenua({ q = 1 } = {}, seed = 2) {
  return construirArbol({
    nombre: 'quenua',
    altura: 2.3, r0: 0.17, r1: 0.05,
    inclina: 0.2, sinuoso: 0.2, raigon: 0.4, arruga: 0.16, // retorcida
    corteza: {
      grieta: PAL.quenuaGrieta, cuerpo: PAL.quenuaCuerpo, cresta: PAL.quenuaPapel,
      liquen: LIQUEN_PIE, escalaGrano: 4.5,
    },
    copa: { inicio: 0.4, ramas: 5, largo: 0.62, alza: 0.62, sub: 2, subLargo: 0.34 },
    follaje: {
      base: '#33452a', sol: PAL.quenuaHojaSol, luz: '#cdd58e',
      radio: 0.5, hojas: 46, achatado: 0.8, huecos: 0.46, mordida: 0.4,
      escHoja: 0.36, aplana: 0.7, ao: 0.62, manchas: 0.12,
    },
    q,
    semilla: seed,
    // FIRMA: las láminas de papel que se despegan del tronco.
    firma: (partes, { r, curva, taper, q: qq }) => {
      const n = Math.max(5, Math.round(14 * qq));
      for (let i = 0; i < n; i++) {
        const t = 0.06 + r() * 0.72;
        const c = curva.getPointAt(t);
        const ang = r() * Math.PI * 2;
        const rad = taper(t);
        // Cada lámina es un casquete fino, despegado y curvado hacia afuera.
        const lam = new THREE.CylinderGeometry(
          rad * 1.12, rad * 1.2, 0.1 + r() * 0.14, 7, 1, true,
          ang, 0.7 + r() * 0.9,
        );
        poner(lam, [c.x, c.y, c.z], [(r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3]);
        hornearFollaje(lam, {
          base: '#6d3b28', sol: PAL.quenuaPapel, luz: '#e9c2a0',
          centro: [c.x, c.y, c.z], radio: rad * 1.6,
          yMin: 0, yMax: 2.3, ao: 0.3, manchas: 0.16,
        });
        partes.push(lam);
      }
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  ENCENILLO (Weinmannia tomentosa) — el árbol de la niebla                   */
/* -------------------------------------------------------------------------- */

export function geomEncenillo({ q = 1 } = {}, seed = 3) {
  return construirArbol({
    nombre: 'encenillo',
    altura: 2.6, r0: 0.15, r1: 0.045,
    inclina: 0.1, sinuoso: 0.13, arruga: 0.14,
    corteza: {
      grieta: PAL.encenilloGrieta, cuerpo: PAL.encenilloTronco, cresta: '#8a5c46',
      liquen: '#6f8055', escalaGrano: 6,
    },
    // Copa compacta y estrecha: vive apretado en el bosque de niebla.
    copa: { inicio: 0.46, ramas: 5, largo: 0.5, alza: 0.66, sub: 2, subLargo: 0.3 },
    follaje: {
      base: '#22331f', sol: PAL.encenilloHojaSol, luz: '#adc07e',
      radio: 0.46, hojas: 52, achatado: 0.92, huecos: 0.36, mordida: 0.3,
      escHoja: 0.36, aplana: 0.8, ao: 0.68, manchas: 0.1,
    },
    q,
    semilla: seed,
    // FIRMA: el velo de MUSGO que lo cubre (vive envuelto en niebla).
    firma: (partes, { r, curva, taper, q: qq }) => {
      const n = Math.max(4, Math.round(11 * qq));
      for (let i = 0; i < n; i++) {
        const t = 0.12 + r() * 0.7;
        const c = curva.getPointAt(t);
        const ang = r() * Math.PI * 2;
        const rad = taper(t) * 1.05;
        const m = matojoHoja(0.1 + r() * 0.07, seed + i * 3, 0.5);
        poner(m, [c.x + Math.cos(ang) * rad, c.y, c.z + Math.sin(ang) * rad], [r(), r(), r()], [1.3, 0.9, 1.3]);
        hornearFollaje(m, {
          base: '#3d4a2a', sol: PAL.encenilloMusgo, luz: '#c2cf94',
          centro: [c.x, c.y, c.z], radio: 0.4, yMin: 0, yMax: 2.6, ao: 0.4, manchas: 0.2,
        });
        partes.push(m);
      }
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  ALISO (Alnus acuminata) — el vecino esbelto de corteza clara               */
/* -------------------------------------------------------------------------- */

/*
 * OJO: la versión anterior construía su copa como un CONO explícito ("copa
 * cónica: blobs que se estrechan hacia arriba") — el árbol de navidad literal.
 * Ahora la copa es alta y ovalada pero IRREGULAR: se estrecha porque las ramas
 * de arriba son cortas, no porque la dibujemos como un cono.
 */
export function geomAliso({ q = 1 } = {}, seed = 4) {
  return construirArbol({
    nombre: 'aliso',
    altura: 3.3, r0: 0.13, r1: 0.04,
    inclina: 0.06, sinuoso: 0.08, raigon: 0.28, arruga: 0.08, // recto y esbelto
    corteza: {
      grieta: PAL.alisoGrieta, cuerpo: PAL.alisoTronco, cresta: PAL.alisoLenticela,
      liquen: '#8a9668', escalaGrano: 7,
    },
    copa: { inicio: 0.42, ramas: 6, largo: 0.6, alza: 0.72, sub: 2, subLargo: 0.32 },
    follaje: {
      base: '#2c4020', sol: PAL.alisoHojaSol, luz: '#d2dc8e',
      radio: 0.5, hojas: 56, achatado: 0.86, huecos: 0.5, mordida: 0.42,
      escHoja: 0.34, aplana: 0.7, ao: 0.58, manchas: 0.12,
    },
    q,
    semilla: seed,
    // FIRMA: las LENTICELAS: las rayitas claras horizontales de su corteza gris.
    firma: (partes, { r, curva, taper, q: qq }) => {
      const n = Math.max(6, Math.round(16 * qq));
      for (let i = 0; i < n; i++) {
        const t = 0.06 + r() * 0.68;
        const c = curva.getPointAt(t);
        const ang = r() * Math.PI * 2;
        const rad = taper(t);
        const len = new THREE.BoxGeometry(0.07 + r() * 0.06, 0.014, 0.03);
        poner(
          len,
          [c.x + Math.cos(ang) * rad * 0.98, c.y, c.z + Math.sin(ang) * rad * 0.98],
          [0, -ang, 0],
        );
        partes.push(pintarPlano(len, PAL.alisoLenticela));
      }
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  GAQUE (Clusia) — copa redonda densa de hoja gruesa lustrosa                */
/* -------------------------------------------------------------------------- */

export function geomGaque({ q = 1 } = {}, seed = 5) {
  return construirArbol({
    nombre: 'gaque',
    altura: 1.9, r0: 0.17, r1: 0.06,
    inclina: 0.1, sinuoso: 0.1, arruga: 0.1,
    corteza: {
      grieta: PAL.gaqueGrieta, cuerpo: PAL.gaqueTronco, cresta: '#75664f',
      liquen: LIQUEN_PIE, escalaGrano: 6.5,
    },
    // Ramas cortas y muy abiertas → domo bajo, ancho y macizo.
    copa: { inicio: 0.4, ramas: 6, largo: 0.72, alza: 0.34, sub: 2, subLargo: 0.36 },
    follaje: {
      base: '#182a17', sol: PAL.gaqueHojaSol, luz: '#9ab97e',
      radio: 0.56, hojas: 58, achatado: 0.72, huecos: 0.3, mordida: 0.26,
      escHoja: 0.4, aplana: 0.66, ao: 0.7, manchas: 0.08,
    },
    q,
    semilla: seed,
  });
}

/* -------------------------------------------------------------------------- */
/*  ROBLE ANDINO (Quercus humboldtii) — el único roble nativo de Colombia      */
/* -------------------------------------------------------------------------- */

/*
 * No es de páramo (es del robledal andino, más abajo), así que NO entra en el
 * cortejo del Ent — pero lo usan la ladera de restauración y el valle, y esos
 * mundos también merecen dejar de tener bombones. Su firma: tronco grueso y
 * copa ANCHA y densa de hoja coriácea oscura, con bellotas.
 */
export function geomRoble({ q = 1 } = {}, seed = 11) {
  return construirArbol({
    nombre: 'roble',
    altura: 2.5, r0: 0.26, r1: 0.08,
    inclina: 0.07, sinuoso: 0.1, raigon: 0.42, arruga: 0.15,
    corteza: {
      grieta: '#3b3126', cuerpo: PAL.robleTronco, cresta: '#8a7a63',
      liquen: LIQUEN_PIE, escalaGrano: 5,
    },
    // Ramas largas y poco alzadas → la copa se va a lo ANCHO, que es su sello.
    copa: { inicio: 0.38, ramas: 6, largo: 1.0, alza: 0.5, sub: 2, subLargo: 0.5 },
    follaje: {
      base: '#1e2f1a', sol: PAL.robleHojaSol, luz: '#a8bd76',
      radio: 0.62, hojas: 66, achatado: 0.74, huecos: 0.34, mordida: 0.3,
      escHoja: 0.38, aplana: 0.7, ao: 0.68, manchas: 0.1,
    },
    q,
    semilla: seed,
    // FIRMA: las bellotas colgando del borde de la copa.
    firma: (partes, { r, q: qq, centros }) => {
      const n = Math.max(2, Math.round(5 * qq));
      for (let i = 0; i < n; i++) {
        const c = centros[Math.floor(r() * centros.length) % centros.length];
        const ang = r() * Math.PI * 2;
        const rad = c.radio * (0.4 + r() * 0.5);
        const p = [c.centro[0] + Math.cos(ang) * rad, c.centro[1] - c.radio * 0.5, c.centro[2] + Math.sin(ang) * rad];
        const bellota = new THREE.IcosahedronGeometry(0.055, 0);
        poner(bellota, p, [0, 0, 0], [1, 1.45, 1]);
        partes.push(pintarPlano(bellota, PAL.robleBellota));
        const capa = new THREE.SphereGeometry(0.048, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
        poner(capa, [p[0], p[1] + 0.06, p[2]]);
        partes.push(pintarPlano(capa, PAL.robleCapa));
      }
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  YARUMO PLATEADO / BLANCO (Cecropia telealba)                               */
/* -------------------------------------------------------------------------- */

/*
 * Tampoco es de páramo (es pionera de bosque andino) pero la usan la ladera y
 * el valle. Su firma es única y no pasa por el constructor genérico: pocas
 * ramas en candelabro y una copa en SOMBRILLA de hojas palmeadas grandes cuyo
 * ENVÉS es blanco-plata — desde abajo se ve ese blanco, y eso es el yarumo.
 */
export function geomYarumo({ q = 1 } = {}, seed = 12) {
  const r = rng(seed);
  const partes = [];
  const H = 3.4;

  // Tronco pálido, esbelto y anillado.
  const curva = curvaTronco({ altura: H, inclina: 0.07, sinuoso: 0.06, giro: r() * 6.28 }, seed);
  const taper = taperTronco(0.14, 0.06, 0.2);
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(8, Math.round(14 * q)), radial: Math.max(5, Math.round(8 * q)),
    taper, arruga: 0.05, semilla: seed * 3,
  });
  hornearCorteza(tronco, {
    grieta: '#8e9186', cuerpo: PAL.yarumoTronco, cresta: '#d6d9cc',
    liquen: LIQUEN_PIE, hastaLiquen: H * 0.18, escalaGrano: 3,
  });
  partes.push(tronco);

  // Anillos: las cicatrices de hoja caída que le marcan el tronco.
  const nAnillos = Math.max(3, Math.round(8 * q));
  for (let i = 0; i < nAnillos; i++) {
    const t = 0.12 + (i / nAnillos) * 0.72;
    const c = curva.getPointAt(t);
    const rad = taper(t);
    const anillo = new THREE.TorusGeometry(rad * 1.02, 0.012, 4, 9);
    poner(anillo, [c.x, c.y, c.z], [Math.PI / 2, 0, 0]);
    partes.push(pintarPlano(anillo, '#9fa294'));
  }

  // Ramas en candelabro: pocas, arriba, muy abiertas.
  const nRamas = Math.max(2, Math.round(4 * q));
  const puntas = [curva.getPointAt(1).clone()];
  for (let i = 0; i < nRamas; i++) {
    const ang = i * AUREO + r() * 0.4;
    const largo = 0.72 + r() * 0.3;
    const base = curva.getPointAt(0.86 + (i / nRamas) * 0.1);
    const fin = base.clone().add(new THREE.Vector3(Math.cos(ang) * largo, 0.66 + r() * 0.2, Math.sin(ang) * largo));
    const cR = new THREE.CatmullRomCurve3([
      base.clone(),
      base.clone().lerp(fin, 0.55).add(new THREE.Vector3(0, 0.1, 0)),
      fin.clone(),
    ], false, 'catmullrom', 0.5);
    const g = tuboOrganico(cR, {
      tubular: 5, radial: 4, taper: taperLineal(0.045, 0.022), arruga: 0.05, semilla: seed + i,
    });
    hornearCorteza(g, { grieta: '#8a8d82', cuerpo: PAL.yarumoRama, cresta: '#c8cbbe', liquen: null, hastaLiquen: 0, escalaGrano: 4 });
    partes.push(g);
    puntas.push(fin);
  }

  // Las HOJAS palmeadas: discos grandes de 7 lóbulos, casi horizontales, con el
  // envés blanco mirando al suelo. Es la sombrilla del yarumo.
  const porPunta = Math.max(2, Math.round(3 * q));
  for (const p of puntas) {
    for (let i = 0; i < porPunta; i++) {
      const ang = i * AUREO + r() * 1.2;
      const rad = 0.2 + r() * 0.14;
      const hoja = new THREE.ConeGeometry(0.44, 0.08, 7, 1); // heptágono chato = "mano"
      const pos = /** @type {[number, number, number]} */ ([p.x + Math.cos(ang) * rad, p.y - 0.04 - r() * 0.08, p.z + Math.sin(ang) * rad]);
      apuntar(hoja, pos, [Math.cos(ang) * 0.34, 0.94, Math.sin(ang) * 0.34], [1, 0.5, 1]);
      // El haz apenas verdea; el envés (abajo) es blanco-plata: el gradiente de
      // altura de hornearFollaje hace justo eso si le damos un rango corto.
      hornearFollaje(hoja, {
        base: PAL.yarumoEnves, sol: PAL.yarumoHaz, luz: '#f2f6ee',
        centro: pos, radio: 0.5, yMin: pos[1] - 0.06, yMax: pos[1] + 0.06,
        ao: 0.18, manchas: 0.05,
      });
      partes.push(hoja);
    }
  }

  return fusionarSeguro(partes, 'yarumo');
}

/* -------------------------------------------------------------------------- */
/*  MORTIÑO (Vaccinium meridionale) — el agraz andino                          */
/* -------------------------------------------------------------------------- */

/*
 * Arbusto bajo y ramoso. No pasa por `construirArbol` (no tiene fuste): es una
 * mata de varitas que salen del suelo, con hojita menuda y —la firma— BAYAS
 * azul-moradas salpicadas.
 */
export function geomMortino({ q = 1 } = {}, seed = 6) {
  const r = rng(seed);
  const partes = [];

  // Varitas desde la base (mata ramosa).
  const nVaras = Math.max(3, Math.round(6 * q));
  const puntas = [];
  for (let i = 0; i < nVaras; i++) {
    const ang = i * AUREO + r() * 0.5;
    const alto = 0.42 + r() * 0.3;
    const abre = 0.12 + r() * 0.16;
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(ang) * abre * 0.5, alto * 0.5, Math.sin(ang) * abre * 0.5),
      new THREE.Vector3(Math.cos(ang) * abre, alto, Math.sin(ang) * abre),
    ];
    const c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const g = tuboOrganico(c, {
      tubular: 4, radial: 4, taper: taperLineal(0.022, 0.01), arruga: 0.1, semilla: seed + i,
    });
    hornearCorteza(g, { grieta: '#38271c', cuerpo: PAL.mortinoRama, cresta: '#7a5a44', liquen: null, hastaLiquen: 0, escalaGrano: 10 });
    partes.push(g);
    puntas.push(pts[2]);
  }

  // Hojita menuda alrededor de las varitas.
  const nHojas = Math.max(6, Math.round(16 * q));
  for (let i = 0; i < nHojas; i++) {
    const p = puntas[i % puntas.length];
    const ang = r() * Math.PI * 2;
    const rad = 0.06 + r() * 0.16;
    const pos = [p.x + Math.cos(ang) * rad, 0.16 + r() * 0.42, p.z + Math.sin(ang) * rad];
    const h = matojoHoja(0.08 + r() * 0.05, seed + i * 3, 0.4);
    poner(h, pos, [r(), r(), r()], [1, 0.6, 1]);
    hornearFollaje(h, {
      base: '#25361f', sol: r() > 0.78 ? PAL.mortinoBrote : PAL.mortinoHojaSol, luz: '#b6c883',
      centro: [0, 0.4, 0], radio: 0.5, yMin: 0, yMax: 0.8, ao: 0.5, manchas: 0.14,
    });
    partes.push(h);
  }

  // FIRMA: las bayas de agraz, azul-moradas con su punto de brillo.
  const nBayas = Math.max(3, Math.round(9 * q));
  for (let i = 0; i < nBayas; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.3;
    const baya = new THREE.IcosahedronGeometry(0.038 + r() * 0.014, 0);
    poner(baya, [Math.cos(ang) * rad, 0.16 + r() * 0.42, Math.sin(ang) * rad]);
    hornearFollaje(baya, {
      base: '#1d1b38', sol: r() > 0.5 ? PAL.mortinoBaya : PAL.mortinoBaya2, luz: '#8f88d0',
      centro: [Math.cos(ang) * rad, 0.3, Math.sin(ang) * rad], radio: 0.05, ao: 0.3, manchas: 0,
    });
    partes.push(baya);
  }

  return fusionarSeguro(partes, 'mortino');
}

/* -------------------------------------------------------------------------- */
/*  ROMERILLO — cojín bajo de follaje fino                                      */
/* -------------------------------------------------------------------------- */

export function geomRomerillo({ q = 1 } = {}, seed = 7) {
  const r = rng(seed);
  const partes = [];
  const nRamitas = Math.max(6, Math.round(16 * q));
  for (let i = 0; i < nRamitas; i++) {
    const ang = i * AUREO;
    const rad = r() * 0.26;
    const largo = 0.26 + r() * 0.3;
    const ramita = new THREE.ConeGeometry(0.045, largo, 4, 1);
    apuntar(
      ramita,
      [Math.cos(ang) * rad, largo * 0.42, Math.sin(ang) * rad],
      [Math.cos(ang) * 0.32 + (r() - 0.5) * 0.28, 1, Math.sin(ang) * 0.32 + (r() - 0.5) * 0.28],
    );
    hornearFollaje(ramita, {
      base: '#3f4a20', sol: PAL.romerilloHojaSol, luz: '#d8e08e',
      centro: [0, 0.3, 0], radio: 0.45, yMin: 0, yMax: 0.62, ao: 0.5, manchas: 0.16,
    });
    partes.push(ramita);
  }
  if (q > 0.5) {
    const nFlor = Math.max(2, Math.round(5 * q));
    for (let i = 0; i < nFlor; i++) {
      const ang = r() * Math.PI * 2;
      const rad = r() * 0.24;
      const flor = new THREE.IcosahedronGeometry(0.032, 0);
      poner(flor, [Math.cos(ang) * rad, 0.34 + r() * 0.28, Math.sin(ang) * rad]);
      partes.push(pintarPlano(flor, PAL.romerilloFlor));
    }
  }
  return fusionarSeguro(partes, 'romerillo');
}

/* -------------------------------------------------------------------------- */
/*  SUELO — rocas con líquen + montículos de musgo                              */
/* -------------------------------------------------------------------------- */

/** Roca del páramo: pedrusco irregular con parches de líquen. */
export function geomRoca(seed = 8) {
  const r = rng(seed);
  const partes = [];
  const piedra = matojoHoja(0.3, seed, 0.34);
  poner(piedra, [0, 0.1, 0], [r(), r(), r()], [1 + r() * 0.4, 0.5 + r() * 0.2, 1 + r() * 0.4]);
  hornearFollaje(piedra, {
    base: '#4a4a42', sol: PAL.rocaSol, luz: '#c4c4b4',
    centro: [0, 0.05, 0], radio: 0.4, yMin: 0, yMax: 0.32, ao: 0.5, manchas: 0.14,
  });
  partes.push(piedra);
  const nLiquen = 2 + Math.round(r() * 2);
  for (let i = 0; i < nLiquen; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.2;
    const parche = matojoHoja(0.07 + r() * 0.05, seed + i * 7, 0.5);
    poner(parche, [Math.cos(ang) * rad, 0.17 + r() * 0.05, Math.sin(ang) * rad], [0, 0, 0], [1.4, 0.35, 1.4]);
    hornearFollaje(parche, {
      base: '#6a7844', sol: r() > 0.5 ? PAL.liquen : PAL.liquen2, luz: '#dfe6b4',
      centro: [0, 0.2, 0], radio: 0.3, ao: 0.3, manchas: 0.2,
    });
    partes.push(parche);
  }
  return fusionarSeguro(partes, 'roca');
}

/** Montículo de musgo húmedo (domo bajo e irregular). */
export function geomMusgo(seed = 9) {
  const r = rng(seed);
  const domo = matojoHoja(0.28, seed, 0.3);
  poner(domo, [0, 0.02, 0], [0, 0, 0], [1 + r() * 0.5, 0.4 + r() * 0.18, 1 + r() * 0.5]);
  hornearFollaje(domo, {
    base: '#2b3a1c', sol: PAL.musgoSol, luz: '#b6c886',
    centro: [0, 0, 0], radio: 0.32, yMin: 0, yMax: 0.22, ao: 0.45, manchas: 0.22,
  });
  return fusionarSeguro([domo], 'musgo');
}

/* -------------------------------------------------------------------------- */
/*  DISTRIBUCIÓN — bosquetes, claros, sotobosque y borde (NO una grilla)       */
/* -------------------------------------------------------------------------- */

/*
 * El DR §"La disposición" es tajante: los árboles no crecen en cuadrícula NI en
 * anillos regulares. La versión anterior sembraba cada especie en un ANILLO
 * concéntrico con reparto angular parejo (`uniforme: true`) → se leía como un
 * decorado de teatro alrededor del Ent.
 *
 * Ahora: BOSQUETES. Cada especie elige unos pocos núcleos alrededor del claro y
 * sus matas caen cerca de ellos (dispersión gaussiana). Un campo de ruido decide
 * la densidad → aparecen claros de verdad. El sotobosque se agolpa en el BORDE
 * de los bosquetes, que es donde crece en el bosque real.
 */

function tinteInstancia(r, amt) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.4;
  const cl = (v) => Math.max(0.72, Math.min(1.16, v));
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

/** Gaussiana estándar por Box-Muller (para dispersar alrededor de un núcleo). */
function gauss(r) {
  const u = Math.max(1e-6, r());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/**
 * Siembra `n` matas en BOSQUETES dentro del anillo [rMin, rMax] alrededor del
 * Ent, respetando los claros del campo de ruido y una distancia mínima entre
 * matas (nada de matas encajadas unas en otras).
 */
function sembrarBosquete(n, rMin, rMax, r, opts = {}) {
  if (n <= 0) return [];
  const nucleos = Math.max(1, opts.nucleos ?? Math.ceil(n / 5));
  const disper = opts.disper ?? 1.5;
  const distMin = opts.distMin ?? 0.7;
  const eMin = opts.eMin ?? 0.85;
  const eMax = opts.eMax ?? 1.2;
  const claros = opts.claros ?? 0.35;

  // Núcleos de bosquete: repartidos con jitter fuerte (no equiespaciados).
  const centros = [];
  for (let i = 0; i < nucleos; i++) {
    const ang = (i / nucleos) * Math.PI * 2 + (r() - 0.5) * 1.9;
    const rad = rMin + (rMax - rMin) * (0.25 + r() * 0.6);
    centros.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
  }

  const arr = [];
  const intentos = n * 26;
  for (let i = 0; i < intentos && arr.length < n; i++) {
    const c = centros[Math.floor(r() * centros.length) % centros.length];
    const x = c[0] + gauss(r) * disper;
    const z = c[1] + gauss(r) * disper;
    const rad = Math.hypot(x, z);
    if (rad < rMin || rad > rMax) continue;
    // Claros: el campo de ruido apaga zonas → el bosque respira.
    if (ruidoFbm(x * 0.16 + 40, 0, z * 0.16 + 40) < claros * 0.55) continue;
    // Distancia mínima: nada de matas incrustadas.
    let choca = false;
    for (let k = 0; k < arr.length; k++) {
      const q = arr[k].pos;
      if ((q[0] - x) ** 2 + (q[2] - z) ** 2 < distMin * distMin) { choca = true; break; }
    }
    if (choca) continue;
    arr.push({
      pos: [x, 0, z],
      rotY: r() * Math.PI * 2,
      // Inclinación sutil por instancia: ningún árbol real está a plomo.
      inclina: [(r() - 0.5) * (opts.inclina ?? 0.1), (r() - 0.5) * (opts.inclina ?? 0.1)],
      escala: eMin + r() * (eMax - eMin),
      tint: tinteInstancia(r, opts.varia ?? 0.12),
    });
  }
  return arr;
}

/**
 * Todas las instancias de flora. El Ent manda en el centro: nada se le encima
 * y los árboles del cortejo quedan más lejos y más bajos que él.
 */
export function distribucionFlora(conteos, seed = 707) {
  const c = conteos;
  return {
    // Frailejonar: bosquetes densos en el anillo interior-medio. Es lo primero
    // que se ve y lo que dice "esto es páramo".
    frailejon: sembrarBosquete(c.frailejon, 3.4, 11, rng(seed + 1), {
      nucleos: 5, disper: 1.7, distMin: 0.78, eMin: 0.78, eMax: 1.34, varia: 0.15, claros: 0.3, inclina: 0.14,
    }),
    frailejonFlor: sembrarBosquete(c.frailejonFlor, 4, 10, rng(seed + 2), {
      nucleos: 3, disper: 1.9, distMin: 0.9, eMin: 0.9, eMax: 1.22, varia: 0.1, claros: 0.3, inclina: 0.12,
    }),
    // Sotobosque: se agolpa en el borde de los bosquetes.
    mortino: sembrarBosquete(c.mortino, 3, 12.5, rng(seed + 3), {
      nucleos: 4, disper: 1.8, distMin: 0.7, eMin: 0.78, eMax: 1.25, varia: 0.14, claros: 0.4,
    }),
    romerillo: sembrarBosquete(c.romerillo, 2.6, 12.5, rng(seed + 4), {
      nucleos: 5, disper: 1.9, distMin: 0.62, eMin: 0.75, eMax: 1.3, varia: 0.16, claros: 0.42,
    }),
    // Suelo.
    roca: sembrarBosquete(c.roca, 1.8, 12, rng(seed + 5), {
      nucleos: 4, disper: 2.4, distMin: 0.85, eMin: 0.65, eMax: 1.6, varia: 0.12, claros: 0.25,
    }),
    musgo: sembrarBosquete(c.musgo, 1.1, 10, rng(seed + 6), {
      nucleos: 4, disper: 2.2, distMin: 0.6, eMin: 0.7, eMax: 1.7, varia: 0.14, claros: 0.2,
    }),
    // El cortejo leñoso: bosquetes en el anillo exterior, velados por la niebla.
    // Cada especie tiene SU rincón (no se mezclan parejo) → se lee agrupamiento.
    quenua: sembrarBosquete(c.quenua, 6.5, 13, rng(seed + 7), {
      nucleos: 2, disper: 1.9, distMin: 2.0, eMin: 0.85, eMax: 1.2, varia: 0.1, claros: 0.2, inclina: 0.12,
    }),
    gaque: sembrarBosquete(c.gaque, 8, 14, rng(seed + 8), {
      nucleos: 2, disper: 1.6, distMin: 2.2, eMin: 0.9, eMax: 1.12, varia: 0.08, claros: 0.2,
    }),
    encenillo: sembrarBosquete(c.encenillo, 9, 16, rng(seed + 9), {
      nucleos: 2, disper: 2.1, distMin: 2.1, eMin: 0.85, eMax: 1.12, varia: 0.09, claros: 0.2, inclina: 0.1,
    }),
    aliso: sembrarBosquete(c.aliso, 10, 17.5, rng(seed + 10), {
      nucleos: 2, disper: 2.2, distMin: 2.3, eMin: 0.9, eMax: 1.14, varia: 0.09, claros: 0.2,
    }),
  };
}
