/*
 * floraParamo.geom — la GEOMETRÍA del ECOSISTEMA que rodea al Ent de la queñua.
 *
 * El Ent (queñua) es EL árbol mayor y sigue siendo el foco; esto es el páramo que
 * lo acompaña para que el claro se sienta un bosque altoandino VIVO y no un árbol
 * solo. Especies reales del páramo/bosque altoandino colombiano, cada una con su
 * identidad inequívoca:
 *
 *   · Frailejón (Espeletia)      — el ícono: columna con enagua de hojas muertas
 *                                  y ROSETA plateada afelpada. Viene en EDADES
 *                                  (joven al ras / adulto / viejo de tronco alto)
 *                                  y crece en COLONIAS: el frailejonal es un
 *                                  PAISAJE con gradiente de edad, no clones.
 *   · Yarumo plateado/blanco     — Cecropia telealba: tronco pálido esbelto y copa
 *     (Cecropia telealba)          en sombrilla de hojas palmeadas de ENVÉS BLANCO.
 *   · Roble andino               — Quercus humboldtii: tronco robusto fisurado y
 *     (Quercus humboldtii)         copa ANCHA que es MASA de hojas (con bellotas).
 *   · Encenillo (Weinmannia)     — árbol de niebla: tronco rojizo torcido, copa
 *                                  oscura compacta y barbas de musgo colgando.
 *   · Aliso (Alnus acuminata)    — tronco gris claro esbelto, copa cónica verde
 *                                  fresca; el vecino más alto (aun así < Ent).
 *   · Gaque (Clusia)             — un domo DENSO de hoja gruesa verde-lustrosa.
 *   · Mortiño (Vaccinium         — arbusto bajo con BAYAS azul-moradas (agraz andino).
 *     meridionale)
 *   · Romerillo                  — mata baja de follaje fino amarillo-verde.
 *   · Rocas con líquen + musgo   — el suelo del páramo.
 *
 * CALIBRE de copa (2026-07-16): los árboles del cortejo dejaron los icosaedros
 * literales — cada copa es una MASA de hojas con huecos y borde mordido
 * (`sembrarFollaje` + `matojoNube` con normales RADIALES + `hornearFollaje` con
 * AO/gradiente/contraluz), la misma técnica del queñual de la toma A. Los troncos
 * son `tuboOrganico` con conicidad, arruga y corteza horneada — nada de cilindros
 * de catálogo. Todo pasa por el TALLER compartido (`sombreadoVegetal`), la casa
 * canónica del kit: cero duplicados caseros, `fusionarSeguro` es la única fusión.
 *
 * TÉCNICA tier-safe (DR §3): cada especie (y cada EDAD del frailejón) se FUSIONA
 * en UNA sola geometría (tronco + follaje + detalles) con color horneado en
 * vertexColors, y se dibuja con UN InstancedMesh → una draw-call por banco por
 * más matas que haya. Cero assets externos: todo procedural, corre headless.
 *
 * El componente r3f (`FloraParamo.jsx`) consume esto: instancia, ubica y le pone
 * luz. Aquí viven SOLO los datos y las mallas (nada de WebGL).
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
  curvaTronco,
  sembrarFollaje,
  matojoNube,
} from './sombreadoVegetal.js';

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Cuántas matas de cada especie (tier-safe). 'alto' puebla un ecosistema pleno;
 * 'medio' es frugal; 'bajo' deja lo mínimo para que AÚN se lea "páramo" (unos
 * frailejones, un par de árboles, rocas y musgo) si algo fuerza el 3D. Cada
 * banco es UN InstancedMesh → estos números son instancias, no draw-calls. El
 * frailejonal viene por EDADES (tres bancos + el que florece) para que el
 * paisaje tenga gradiente de edad, no clones.
 */
/*
 * NOTA (rediseño 2026-07-16, dos-mundos): el frailejón es la firma del PÁRAMO
 * (mundo aparte). Aquí, en el BOSQUE andino/subandino de biodiversidad, queda
 * solo como un ACENTO raro del filo alto (la transición hacia el páramo de
 * arriba) — el grueso de la variedad lo llevan los árboles nativos (yarumo,
 * roble, encenillo, aliso, gaque) MÁS el dosel multiespecie (DoselBiodiverso:
 * guadua, nogal, cedro, cámbulo, gualanday, siete cueros, helecho, heliconia,
 * quiche). Por eso se subieron los árboles y se bajaron los frailejones.
 */
export const FLORA_TIER = {
  alto: {
    frailejonJoven: 4, frailejon: 4, frailejonViejo: 2, frailejonFlor: 2,
    yarumo: 5, roble: 5, encenillo: 6,
    aliso: 5, gaque: 4, mortino: 14, romerillo: 14, roca: 9, musgo: 12, niebla: 3,
  },
  medio: {
    frailejonJoven: 2, frailejon: 3, frailejonViejo: 1, frailejonFlor: 1,
    yarumo: 3, roble: 3, encenillo: 3,
    aliso: 3, gaque: 2, mortino: 8, romerillo: 8, roca: 5, musgo: 6, niebla: 0,
  },
  bajo: {
    frailejonJoven: 1, frailejon: 2, frailejonViejo: 0, frailejonFlor: 0,
    yarumo: 2, roble: 2, encenillo: 1,
    aliso: 1, gaque: 0, mortino: 3, romerillo: 3, roca: 2, musgo: 3, niebla: 0,
  },
};

/** Conteos de flora para un tier (desconocido → frugal, nunca el más caro). */
export const floraDeTier = (tier) => FLORA_TIER[tier] || FLORA_TIER.medio;

/*
 * Factor de DETALLE geométrico por tier: escala cuántas hojas/matojos lleva cada
 * mata. Menos detalle en gama baja = menos vértices por instancia (que se
 * multiplican por el número de matas).
 */
export const CALIDAD_TIER = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadDeTier = (tier) => CALIDAD_TIER[tier] ?? CALIDAD_TIER.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del páramo (colores horneados en vertexColors)                      */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Frailejón
  frailejonTronco: '#6f5c40', // tallo bajo la enagua
  frailejonSeco: '#9a7f57', // enagua: marcescentes pajizas (arriba, recientes)
  frailejonSeco2: '#67502f', // marcescentes viejas curtidas (abajo, oscuras)
  frailejonSeco3: '#7f6640', // tono intermedio dorado-marrón (variedad)
  frailejonPlata: '#d7dccf', // roseta centro: tomento plateado-blanco (la firma)
  frailejonPlata2: '#a9b593', // hojas externas: plateado-salvia apagado (viejas)
  frailejonCorazon: '#e9eee2', // cogollo velloso central (el punto más pálido)
  frailejonFlor: '#e6c84e', // capítulos amarillos
  frailejonTallo: '#93a06a', // escapo floral

  // Yarumo plateado / blanco (Cecropia telealba)
  yarumoTronco: '#bcbfb2', // tronco pálido anillado
  yarumoRama: '#a9ac9f',
  yarumoEnves: '#e2e7dc', // envés BLANCO de la hoja palmeada (la firma)
  yarumoHaz: '#7f9070', // dejo verde del haz

  // Roble andino (Quercus humboldtii)
  robleTronco: '#6a5c4a', // corteza gris-parda fisurada
  robleGrieta: '#453a2c', // fondo de la fisura
  robleCresta: '#83745e', // lomo expuesto de la corteza
  robleHoja: '#43593b', // hoja coriácea verde oscuro (penumbra)
  robleHoja2: '#5d7847', // hoja al sol
  robleLuz: '#a8b775', // contraluz de borde
  robleBellota: '#7a5a34', // bellota
  robleCapa: '#54432a', // capuchón de la bellota

  // Encenillo (Weinmannia tomentosa)
  encenilloTronco: '#6d4535', // corteza rojiza
  encenilloGrieta: '#3f281e',
  encenilloCresta: '#8a5a44',
  encenilloHoja: '#37502f', // copa oscura compacta (penumbra)
  encenilloHoja2: '#4d6844', // al sol
  encenilloLuz: '#93a86f', // contraluz tímido (árbol sombrío)
  encenilloMusgo: '#93a877', // velo de musgo del árbol de niebla

  // Aliso (Alnus acuminata)
  alisoTronco: '#9a9a8f', // corteza gris clara
  alisoGrieta: '#6f6f64',
  alisoCresta: '#b5b5a8',
  alisoHoja: '#4f6d3d', // verde fresco (penumbra)
  alisoHoja2: '#6d8c50', // al sol
  alisoLuz: '#c9d67f', // contraluz fresco

  // Gaque (Clusia)
  gaqueTronco: '#57493a',
  gaqueGrieta: '#372e23',
  gaqueCresta: '#6d5c48',
  gaqueHoja: '#2f4a2d', // verde muy oscuro lustroso (penumbra)
  gaqueHoja2: '#456339', // al sol
  gaqueLuz: '#7fa25b', // brillo de hoja gruesa

  // Mortiño (Vaccinium meridionale)
  mortinoHoja: '#3f5a3a',
  mortinoHoja2: '#517048',
  mortinoBrote: '#7a4536', // brote rojizo nuevo
  mortinoBaya: '#33305c', // baya azul-morada (agraz)
  mortinoBaya2: '#3d3768',

  // Romerillo
  romerilloHoja: '#79883f',
  romerilloHoja2: '#8a9a4e',
  romerilloFlor: '#d8c24a',

  // Suelo
  roca: '#7c7c70',
  liquen: '#9aa86a', // líquen pálido sobre la piedra
  liquen2: '#b7c08a',
  musgo: '#4c5c34',
  musgo2: '#5a6a3e',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades de construcción (kit/taller compartido + ayudas locales)        */
/* -------------------------------------------------------------------------- */

/** Color plano horneado (alias del taller — todas las partes DEBEN traer color). */
const pintar = pintarPlano;

/*
 * La fusión canónica del taller, PRESERVANDO las normales que cada parte trae:
 * las copas-masa llevan normales RADIALES (matojoNube) que son lo que las hace
 * leerse como masa suave de hojas — recalcular normales las devolvería a
 * poliedro facetado. Desindexa, valida atributos y TRUENA si el merge da null
 * (la trampa que ya apagó seis especies sin un solo error en consola).
 */
const fusionar = (partes, etiqueta = 'floraParamo') => fusionarSeguro(partes, etiqueta, { preservarNormales: true });

/** Pequeña variación determinista de color (para que un bosque no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/**
 * Hornea un GRADIENTE a lo largo del eje Y local (base→punta): cada vértice toma
 * un color según su altura entre `y0` y `y1`. Sirve para el TOMENTO del frailejón:
 * hoja plateada en la base y casi blanca en la punta → toda la roseta se lee
 * frosteada/afelpada (la pelusa), no como piedra facetada de un solo tono.
 */
function pintarGradiente(geo, colBase, colPunta, y0, y1) {
  const a = colBase instanceof THREE.Color ? colBase : new THREE.Color(colBase);
  const b = colPunta instanceof THREE.Color ? colPunta : new THREE.Color(colPunta);
  const pos = geo.attributes.position;
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color();
  const span = (y1 - y0) || 1;
  for (let i = 0; i < n; i++) {
    let t = (pos.getY(i) - y0) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    c.copy(a).lerp(b, Math.pow(t, 0.7)); // sesga hacia la punta pálida
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/**
 * Pétalo/hoja CARNOSA: un elipsoide de PUNTA REDONDA que nace en su base (origen)
 * y se extiende por +Y. Es la clave contra el look "cerda": una hoja gruesa y
 * roma, no un cono puntudo. Se orienta con `apuntar` (que lleva +Y hacia `dir`).
 * `ancho`/`grosor` son SEMI-ejes (mitad del ancho/espesor); `largo` es el total.
 */
function petalo(ancho, largo, grosor, wSeg = 6, hSeg = 3) {
  const g = new THREE.SphereGeometry(1, wSeg, hSeg);
  // escala a elipsoide y sube su base al origen (span y ∈ [0, largo]).
  poner(g, [0, largo / 2, 0], [0, 0, 0], [ancho, largo / 2, grosor]);
  return g;
}

/**
 * COPA-MASA: la técnica del queñual para cualquier árbol del cortejo. Cada
 * lóbulo {c, radio} se llena con matojos-nube (normales radiales) sembrados con
 * huecos y borde mordido, y se hornea AO + gradiente + contraluz. El resultado
 * se lee como masa de hojas con el cielo colándose — nunca como icosaedro literal.
 *
 * @param {{c:[number,number,number], radio:number}[]} lobulos
 * @param {object} o  {base, sol, luz, q, seed, achatado?, huecos?, mordida?,
 *                     ao?, manchas?, densidad?, distMin?}
 * @returns {THREE.BufferGeometry[]} una geometría horneada por lóbulo
 */
function copaMasa(lobulos, o) {
  const {
    base, sol, luz, q = 1, seed = 1,
    achatado = 0.74, huecos = 0.42, mordida = 0.36,
    ao = 0.62, manchas = 0.14, densidad = 10,
  } = o;
  const copas = [];
  for (let i = 0; i < lobulos.length; i++) {
    const lb = lobulos[i];
    const puntos = sembrarFollaje({
      centro: lb.c,
      radio: lb.radio,
      achatado,
      n: Math.max(4, Math.round(densidad * q * lb.radio)),
      semilla: seed * 13 + i * 3,
      huecos,
      mordida,
      distMin: (o.distMin ?? 0.3) * lb.radio,
    });
    const matojos = puntos.map((p, k) => {
      const m = matojoNube((0.28 + 0.16 * p.esc) * lb.radio, seed * 17 + i * 5 + k, 0.5);
      poner(m, p.pos, p.giro, [1, 0.82, 1]);
      return m;
    });
    if (!matojos.length) {
      const m = matojoNube(lb.radio * 0.7, seed * 17 + i * 5, 0.5);
      poner(m, lb.c, [0, 0, 0], [1, 0.82, 1]);
      matojos.push(m);
    }
    const copa = fusionar(matojos, 'copa-masa');
    hornearFollaje(copa, {
      base, sol, luz, centro: lb.c, radio: lb.radio * 1.2, ao, manchas,
    });
    copas.push(copa);
  }
  return copas;
}

/**
 * TRONCO orgánico horneado: una `curvaTronco` (inclinación/sinuosidad/torsión) +
 * `tuboOrganico` (conicidad + arruga de corteza) + `hornearCorteza`. Devuelve la
 * geometría Y la curva (para colgar la copa de su punta). Nada de cilindros.
 */
function troncoHorneado({
  H, r0, r1, inclina = 0.1, sinuoso = 0.09, giro = 0, arruga = 0.15,
  raigon = 0.42, q = 1, corteza, hastaLiquen = 0.4, liquen = PAL.liquen,
}, seed) {
  const curva = curvaTronco({ altura: H, inclina, sinuoso, giro }, seed);
  const geo = tuboOrganico(curva, {
    tubular: Math.max(8, Math.round(16 * q)),
    radial: Math.max(6, Math.round(8 * q)),
    taper: taperTronco(r0, r1, raigon),
    arruga,
    semilla: seed * 3.1,
  });
  hornearCorteza(geo, {
    grieta: corteza.grieta,
    cuerpo: corteza.cuerpo,
    cresta: corteza.cresta,
    liquen,
    escalaGrano: corteza.escalaGrano ?? 4.2,
    hastaLiquen,
  });
  return { geo, curva };
}

/* -------------------------------------------------------------------------- */
/*  FRAILEJÓN (Espeletia) — el ícono del páramo                                */
/* -------------------------------------------------------------------------- */

/*
 * Silueta de FRAILE: una columna VESTIDA de arriba abajo con la ENAGUA de hojas
 * muertas (marcescentes) —láminas anchas y secas superpuestas como tejas, no
 * púas— que le dan CUERPO (sin ella sería un palo), coronada por la ROSETA: un
 * cogollo DENSO de hojas carnosas y afelpadas (tomento plateado-blanco),
 * apretadas en espiral áurea sobre una cúpula. Esa bola velluda plateada + la
 * falda de hojas secas es lo que lo hace inequívoco. Con `flor`, un escapo con
 * racimo de capítulos amarillos asoma de la roseta.
 *
 * La EDAD manda la silueta (Espeletia crece ~1 cm/año): `edad`∈(0..1] —
 *   · ~0.25 JOVEN: columna muy corta, roseta casi al ras, enagua apenas;
 *   · ~0.6  ADULTO: columna media vestida de enagua, roseta plena;
 *   · ~0.95 VIEJO: columna alta con hábito largo de marcescentes.
 * Un frailejonal es un PAISAJE con gradiente de edad: se instancian los tres
 * bancos mezclados (distribucionFlora) y NO se lee clonado.
 */
export function geomFrailejon({ flor = false, q = 1, edad = 0.6 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const e = Math.max(0.12, Math.min(1, edad));

  // La columna crece con la edad; la roseta es casi constante (el joven es "casi
  // pura roseta al ras", el viejo un hábito alto coronado por la misma cabeza).
  const Ht = 0.14 + e * 1.62 + r() * 0.16;
  const cy = Ht + 0.05; // la roseta se posa como una cabeza sobre la columna
  const rosF = 1.06 - e * 0.16; // la roseta joven, un pelo más grande en relativo

  // 1) Tallo columnar — casi todo oculto por la enagua.
  const tronco = new THREE.CylinderGeometry(0.11, 0.155, Ht, 7, 1);
  poner(tronco, [0, Ht / 2, 0]);
  partes.push(pintar(tronco, PAL.frailejonTronco));

  // 2) ENAGUA (el HÁBITO): láminas secas ANCHAS que cuelgan pegadas al tallo,
  //    superpuestas como tejas de la base a la roseta. Cuanto más abajo, más
  //    viejas y oscuras. El número de anillos escala con la altura (el viejo
  //    lleva hábito largo; el joven, apenas un faldón).
  const anillos = Math.max(2, Math.round((Ht / 0.24) * q));
  const porAnillo = Math.max(6, Math.round(10 * q));
  for (let a = 0; a < anillos; a++) {
    const f = a / anillos; // 0 base(vieja) → 1 bajo la roseta(reciente)
    const y = 0.1 + f * (Ht - 0.06);
    const rad = 0.15;
    for (let i = 0; i < porAnillo; i++) {
      const ang = (i / porAnillo) * Math.PI * 2 + a * 0.55;
      const largo = 0.32 + r() * 0.16;
      // lámina seca ancha (6 lados, aplanada) colgando casi a plomo y algo afuera.
      const hoja = new THREE.ConeGeometry(0.11, largo, 6, 1);
      apuntar(
        hoja,
        [Math.cos(ang) * rad, y, Math.sin(ang) * rad],
        [Math.cos(ang) * 0.32, -1, Math.sin(ang) * 0.32],
        [1, 1, 0.5],
      );
      // pajiza arriba (reciente) → curtida oscura abajo (vieja), con variedad.
      const tono = f > 0.55
        ? (r() > 0.5 ? PAL.frailejonSeco : PAL.frailejonSeco3)
        : (r() > 0.5 ? PAL.frailejonSeco3 : PAL.frailejonSeco2);
      partes.push(pintar(hoja, variar(tono, r, 0.12)));
    }
  }

  // 3) ROSETA — la FIRMA. Cogollo afelpado: HOJAS CARNOSAS (elipsoides de punta
  //    redonda, nunca cerdas) en espiral áurea sobre una cúpula, erguidas al
  //    centro y recostadas al borde, muy densas → una bola velluda plateada.
  //    Tomento horneado en gradiente (base salvia → punta casi blanca).
  const nRoseta = Math.max(18, Math.round(38 * q));
  const wSeg = Math.max(5, Math.round(6 * q));
  const hSeg = Math.max(3, Math.round(4 * q));
  const plataInt = new THREE.Color(PAL.frailejonPlata);
  const plataExt = new THREE.Color(PAL.frailejonPlata2);
  const hojaRoseta = (f, ang, extraTilt = 0) => {
    const posR = (0.02 + f * 0.12) * rosF; // nacen sobre una cúpula, no de un punto
    const posY = cy - f * 0.1 * rosF; // borde más bajo → domo redondo
    const tilt = 0.2 + f * 0.62 + (r() - 0.5) * 0.09 + extraTilt; // cuenco 11°→47°
    const s = Math.sin(tilt);
    const largo = (0.27 + (1 - f) * 0.13 + r() * 0.05) * rosF; // cortas y llenas
    const hoja = petalo((0.1 + f * 0.02) * rosF, largo, 0.06, wSeg, hSeg);
    const base = variar(plataInt.clone().lerp(plataExt, f), r, 0.05);
    pintarGradiente(hoja, base, PAL.frailejonCorazon, 0, largo);
    apuntar(
      hoja,
      [Math.cos(ang) * posR, posY, Math.sin(ang) * posR],
      [Math.cos(ang) * s, Math.cos(tilt), Math.sin(ang) * s],
    );
    partes.push(hoja);
  };
  for (let i = 0; i < nRoseta; i++) {
    hojaRoseta(i / nRoseta, i * GOLDEN + (r() - 0.5) * 0.18);
  }
  // capa de relleno: espiral desfasada, un pelo más erguida → tapa los huecos y
  // hace que el domo se lea LLENO y velludo (no una estrella con agujeros).
  const nRelleno = Math.max(8, Math.round(18 * q));
  for (let i = 0; i < nRelleno; i++) {
    hojaRoseta(((i + 0.5) / nRelleno) * 0.85, i * GOLDEN + 1.7 + (r() - 0.5) * 0.2, -0.1);
  }
  // corona interior: pocas hojas cortas y ERGUIDAS, del blanco más pálido, que
  // tapan el centro (sin hueco oscuro) → cogollo lleno y afelpado.
  const nCorona = Math.max(5, Math.round(10 * q));
  for (let i = 0; i < nCorona; i++) {
    const ang = i * GOLDEN + 1.3;
    const tilt = 0.1 + r() * 0.14;
    const s = Math.sin(tilt);
    const largoC = (0.16 + r() * 0.05) * rosF;
    const hoja = petalo(0.072 * rosF, largoC, 0.052, wSeg, hSeg);
    pintarGradiente(hoja, variar(PAL.frailejonPlata, r, 0.04), '#f3f6ee', 0, largoC);
    apuntar(
      hoja,
      [Math.cos(ang) * 0.025, cy + 0.04, Math.sin(ang) * 0.025],
      [Math.cos(ang) * s, Math.cos(tilt), Math.sin(ang) * s],
    );
    partes.push(hoja);
  }
  // Yema vellosa central (el punto más pálido, afelpado) — cierra el cogollo.
  const corazon = new THREE.IcosahedronGeometry(0.07 * rosF, 0);
  poner(corazon, [0, cy + 0.07, 0], [0, 0, 0], [1, 0.85, 1]);
  partes.push(pintar(corazon, PAL.frailejonCorazon));

  // 4) Escapo floral (solo en flor): vara CORTA que asoma de la roseta con un
  //    racimo apretado de capítulos amarillos (no un poste pelado).
  if (flor) {
    const tallo = new THREE.CylinderGeometry(0.03, 0.052, 0.5, 5, 1);
    poner(tallo, [0.05, cy + 0.24, 0], [0, 0, 0.1]);
    partes.push(pintar(tallo, PAL.frailejonTallo));
    const nCap = Math.max(5, Math.round(9 * q));
    for (let i = 0; i < nCap; i++) {
      const ang = (i / nCap) * Math.PI * 2 + r();
      const rad = 0.05 + r() * 0.1;
      const cap = new THREE.IcosahedronGeometry(0.05 + r() * 0.028, 0);
      poner(cap, [0.06 + Math.cos(ang) * rad, cy + 0.44 + r() * 0.11, Math.sin(ang) * rad], [0, 0, 0], [1, 0.72, 1]);
      partes.push(pintar(cap, variar(PAL.frailejonFlor, r, 0.08)));
    }
  }

  return fusionar(partes, 'frailejon');
}

/* -------------------------------------------------------------------------- */
/*  YARUMO PLATEADO / BLANCO (Cecropia telealba)                               */
/* -------------------------------------------------------------------------- */

/*
 * Pionera esbelta: tronco pálido y recto, ramas en candelabro arriba y una copa
 * en SOMBRILLA de hojas palmeadas (mano de 7 lóbulos) cuyo ENVÉS es blanco-plata.
 * Desde abajo se ve ese blanco: la firma inconfundible del yarumo. (No lleva
 * copa-masa: su silueta ES la sombrilla de manos, no un follaje mullido.)
 */
export function geomYarumo({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];
  const H = 3.4;

  const { geo, curva } = troncoHorneado({
    H, r0: 0.13, r1: 0.06, inclina: 0.05, sinuoso: 0.06, giro: r() * 6, arruga: 0.08,
    raigon: 0.3, q, hastaLiquen: 0.3, liquen: PAL.liquen,
    corteza: { grieta: '#9a9d90', cuerpo: PAL.yarumoTronco, cresta: '#d0d3c6', escalaGrano: 3 },
  }, seed + 1);
  partes.push(geo);

  // Ramas en candelabro (pocas, arriba).
  const nRamas = Math.max(2, Math.round(3 * q));
  const top = curva.getPointAt(1);
  const puntas = [[top.x, H + 0.05, top.z]];
  for (let i = 0; i < nRamas; i++) {
    const ang = (i / nRamas) * Math.PI * 2 + 0.4;
    const largo = 0.7 + r() * 0.3;
    const dir = [Math.cos(ang) * 0.7, 0.7, Math.sin(ang) * 0.7];
    const base = [top.x + Math.cos(ang) * 0.05, H - 0.35 + i * 0.06, top.z + Math.sin(ang) * 0.05];
    const rama = new THREE.CylinderGeometry(0.03, 0.05, largo, 5, 1);
    apuntar(rama, [base[0] + dir[0] * largo * 0.3, base[1] + dir[1] * largo * 0.3, base[2] + dir[2] * largo * 0.3], dir);
    partes.push(pintar(rama, PAL.yarumoRama));
    puntas.push([base[0] + dir[0] * largo, base[1] + dir[1] * largo, base[2] + dir[2] * largo]);
  }

  // Hojas palmeadas: discos aplanados de 7 lóbulos, envés blanco, colgando.
  const porPunta = Math.max(2, Math.round(3 * q));
  for (const p of puntas) {
    for (let i = 0; i < porPunta; i++) {
      const ang = (i / porPunta) * Math.PI * 2 + r();
      const rad = 0.18 + r() * 0.12;
      const hoja = new THREE.ConeGeometry(0.42, 0.09, 7, 1); // 7-gono chato = "mano"
      apuntar(
        hoja,
        [p[0] + Math.cos(ang) * rad, p[1] - 0.05 - r() * 0.08, p[2] + Math.sin(ang) * rad],
        [Math.cos(ang) * 0.4, 0.9, Math.sin(ang) * 0.4],
        [1, 0.5, 1],
      );
      partes.push(pintar(hoja, variar(PAL.yarumoEnves, r, 0.05)));
    }
  }

  return fusionar(partes, 'yarumo');
}

/* -------------------------------------------------------------------------- */
/*  ROBLE ANDINO (Quercus humboldtii) — el único roble nativo de Colombia      */
/* -------------------------------------------------------------------------- */

/*
 * Árbol robusto de robledal altoandino: tronco grueso de corteza gris-parda
 * fisurada y una copa ANCHA y densa —MASA de hoja coriácea verde oscuro con
 * huecos— con bellotas. Imponente pero SIEMPRE menor que el Ent.
 */
export function geomRoble({ q = 1 } = {}, seed = 3) {
  const r = rng(seed);
  const partes = [];
  const H = 2.4;

  const { geo, curva } = troncoHorneado({
    H, r0: 0.23, r1: 0.1, inclina: 0.06, sinuoso: 0.08, giro: r() * 6, arruga: 0.18,
    raigon: 0.5, q,
    corteza: { grieta: PAL.robleGrieta, cuerpo: PAL.robleTronco, cresta: PAL.robleCresta, escalaGrano: 4.4 },
  }, seed + 1);
  partes.push(geo);
  const top = curva.getPointAt(1);

  // Ramas gruesas bajas que abren la copa ancha.
  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const ang = (i / nRamas) * Math.PI * 2 + 0.5;
    const largo = 0.85 + r() * 0.3;
    const rama = new THREE.CylinderGeometry(0.055, 0.095, largo, 6, 1);
    apuntar(rama, [top.x + Math.cos(ang) * 0.3, H - 0.5, top.z + Math.sin(ang) * 0.3], [Math.cos(ang) * 0.85, 0.55, Math.sin(ang) * 0.85]);
    partes.push(pintar(rama, PAL.robleTronco));
  }

  // Copa ANCHA: domo central + corona de lóbulos alrededor (masa de hojas).
  const lobs = [{ c: [top.x, top.y + 0.55, top.z], radio: 0.9 }];
  const nL = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.6;
    const rad = 0.6 + r() * 0.5;
    lobs.push({
      c: [Math.cos(ang) * rad, H + 0.1 + r() * 0.7, Math.sin(ang) * rad],
      radio: 0.55 + r() * 0.32,
    });
  }
  copaMasa(lobs, {
    base: PAL.robleHoja, sol: PAL.robleHoja2, luz: PAL.robleLuz,
    q, seed: seed + 7, achatado: 0.82, huecos: 0.44, mordida: 0.4, ao: 0.66, manchas: 0.15,
  }).forEach((cc) => partes.push(cc));

  // Bellotas (unas pocas, cuelgan del borde de la copa).
  if (q > 0.5) {
    const nBel = Math.max(2, Math.round(4 * q));
    for (let i = 0; i < nBel; i++) {
      const ang = r() * Math.PI * 2;
      const rad = 0.7 + r() * 0.5;
      const y = H + 0.2 + r() * 0.5;
      const bellota = new THREE.IcosahedronGeometry(0.06, 0);
      poner(bellota, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [0, 0, 0], [1, 1.4, 1]);
      partes.push(pintar(bellota, PAL.robleBellota));
      const capa = new THREE.SphereGeometry(0.05, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
      poner(capa, [Math.cos(ang) * rad, y + 0.07, Math.sin(ang) * rad]);
      partes.push(pintar(capa, PAL.robleCapa));
    }
  }

  return fusionar(partes, 'roble');
}

/* -------------------------------------------------------------------------- */
/*  ENCENILLO (Weinmannia tomentosa) — el árbol de la niebla                   */
/* -------------------------------------------------------------------------- */

/*
 * Copa oscura, compacta e irregular —masa de hojas sombría— sobre tronco rojizo
 * algo torcido, con barbas de musgo colgando (vive envuelto en niebla). Más
 * estrecho y sombrío que el roble.
 */
export function geomEncenillo({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];
  const H = 2.3;

  const { geo, curva } = troncoHorneado({
    H, r0: 0.15, r1: 0.07, inclina: 0.16, sinuoso: 0.16, giro: r() * 6, arruga: 0.17,
    raigon: 0.42, q, hastaLiquen: 0.9, liquen: PAL.encenilloMusgo,
    corteza: { grieta: PAL.encenilloGrieta, cuerpo: PAL.encenilloTronco, cresta: PAL.encenilloCresta, escalaGrano: 4.2 },
  }, seed + 1);
  partes.push(geo);
  const top = curva.getPointAt(1);

  // Copa estrecha y alta: lóbulos apilados que suben poco a poco.
  const lobs = [{ c: [top.x, top.y + 0.45, top.z], radio: 0.62 }];
  const nL = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nL; i++) {
    const f = i / nL;
    const ang = r() * Math.PI * 2;
    const rad = 0.15 + r() * 0.42;
    lobs.push({
      c: [Math.cos(ang) * rad, H + 0.1 + f * 0.9 + r() * 0.3, Math.sin(ang) * rad],
      radio: 0.4 + r() * 0.28,
    });
  }
  copaMasa(lobs, {
    base: PAL.encenilloHoja, sol: PAL.encenilloHoja2, luz: PAL.encenilloLuz,
    q, seed: seed + 7, achatado: 0.78, huecos: 0.4, mordida: 0.34, ao: 0.68, manchas: 0.16,
  }).forEach((cc) => partes.push(cc));

  // Barbas de musgo/usnea colgando del borde de la copa (el velo de la niebla).
  const nBarbas = Math.max(2, Math.round(5 * q));
  for (let i = 0; i < nBarbas; i++) {
    const lb = lobs[i % lobs.length];
    const ang = r() * Math.PI * 2;
    const largo = 0.28 + r() * 0.3;
    const barba = new THREE.ConeGeometry(0.04, largo, 4, 1);
    apuntar(
      barba,
      [lb.c[0] + Math.cos(ang) * lb.radio * 0.6, lb.c[1] - lb.radio * 0.5 - largo * 0.35, lb.c[2] + Math.sin(ang) * lb.radio * 0.6],
      [Math.cos(ang) * 0.12, -1, Math.sin(ang) * 0.12],
    );
    partes.push(pintar(barba, variar(PAL.encenilloMusgo, r, 0.14)));
  }

  return fusionar(partes, 'encenillo');
}

/* -------------------------------------------------------------------------- */
/*  ALISO (Alnus acuminata) — el vecino alto de corteza clara                  */
/* -------------------------------------------------------------------------- */

/*
 * Tronco recto y esbelto de corteza gris clara, copa CÓNICA-ovalada de verde
 * fresco —masa de hojas que se estrecha hacia arriba—. Es el árbol más alto del
 * cortejo (crece rápido) pero no llega al Ent.
 */
export function geomAliso({ q = 1 } = {}, seed = 5) {
  const r = rng(seed);
  const partes = [];
  const H = 3.2;

  const { geo, curva } = troncoHorneado({
    H, r0: 0.12, r1: 0.055, inclina: 0.05, sinuoso: 0.07, giro: r() * 6, arruga: 0.1,
    raigon: 0.34, q, hastaLiquen: 0.5, liquen: PAL.liquen2,
    corteza: { grieta: PAL.alisoGrieta, cuerpo: PAL.alisoTronco, cresta: PAL.alisoCresta, escalaGrano: 3.4 },
  }, seed + 1);
  partes.push(geo);
  const top = curva.getPointAt(1);

  // Copa cónica: lóbulos que se estrechan y sesgan hacia arriba desde el fuste.
  const lobs = [];
  const nL = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nL; i++) {
    const f = i / (nL - 1); // 0 abajo → 1 punta
    const ang = r() * Math.PI * 2;
    const rad = (0.62 - f * 0.5) * (0.4 + r() * 0.7);
    lobs.push({
      c: [top.x + Math.cos(ang) * rad, H - 1.0 + f * 2.1 + r() * 0.15, top.z + Math.sin(ang) * rad],
      radio: (0.52 - f * 0.24) + r() * 0.12,
    });
  }
  copaMasa(lobs, {
    base: PAL.alisoHoja, sol: PAL.alisoHoja2, luz: PAL.alisoLuz,
    q, seed: seed + 7, achatado: 0.82, huecos: 0.42, mordida: 0.36, ao: 0.62, manchas: 0.15,
  }).forEach((cc) => partes.push(cc));

  return fusionar(partes, 'aliso');
}

/* -------------------------------------------------------------------------- */
/*  GAQUE (Clusia) — un domo denso de hoja gruesa lustrosa                       */
/* -------------------------------------------------------------------------- */

/*
 * Copa REDONDA densa y baja —un domo compacto de hoja gruesa verde muy oscuro
 * (casi lustrosa)— sobre tronco corto y firme. Sólido y macizo.
 */
export function geomGaque({ q = 1 } = {}, seed = 6) {
  const r = rng(seed);
  const partes = [];
  const H = 1.9;

  const { geo, curva } = troncoHorneado({
    H, r0: 0.18, r1: 0.11, inclina: 0.04, sinuoso: 0.06, giro: r() * 6, arruga: 0.14,
    raigon: 0.5, q, hastaLiquen: 0.35, liquen: PAL.liquen,
    corteza: { grieta: PAL.gaqueGrieta, cuerpo: PAL.gaqueTronco, cresta: PAL.gaqueCresta, escalaGrano: 4 },
  }, seed + 1);
  partes.push(geo);
  const top = curva.getPointAt(1);

  // Domo bajo y ancho: un lóbulo grande central + pocos de relleno pegados.
  const lobs = [{ c: [top.x, top.y + 0.45, top.z], radio: 1.0 }];
  const nL = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.5;
    const rad = 0.4 + r() * 0.4;
    lobs.push({
      c: [Math.cos(ang) * rad, H + 0.3 + r() * 0.45, Math.sin(ang) * rad],
      radio: 0.5 + r() * 0.28,
    });
  }
  copaMasa(lobs, {
    base: PAL.gaqueHoja, sol: PAL.gaqueHoja2, luz: PAL.gaqueLuz,
    q, seed: seed + 7, achatado: 0.7, huecos: 0.34, mordida: 0.3, ao: 0.7, manchas: 0.12, densidad: 11,
  }).forEach((cc) => partes.push(cc));

  return fusionar(partes, 'gaque');
}

/* -------------------------------------------------------------------------- */
/*  MORTIÑO (Vaccinium meridionale) — arbusto de agraz con bayas azules         */
/* -------------------------------------------------------------------------- */

/*
 * Mata baja de hojitas verdes con brotes rojizos y —la firma— BAYAS azul-moradas
 * (el agraz andino) salpicadas entre el follaje. La fronda es masa menuda de
 * hojas (matojos-nube pequeños), no bolas facetadas.
 */
export function geomMortino({ q = 1 } = {}, seed = 7) {
  const r = rng(seed);
  const partes = [];

  const lobs = [];
  const nBlobs = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nBlobs; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.3;
    lobs.push({
      c: [Math.cos(ang) * rad, 0.2 + r() * 0.42, Math.sin(ang) * rad],
      radio: 0.2 + r() * 0.16,
    });
  }
  copaMasa(lobs, {
    base: PAL.mortinoHoja, sol: PAL.mortinoHoja2, luz: '#9ab06a',
    q, seed: seed + 5, achatado: 0.8, huecos: 0.34, mordida: 0.32, ao: 0.58, manchas: 0.18, densidad: 8,
  }).forEach((cc) => partes.push(cc));

  // Brotes rojizos nuevos (puntas tiernas).
  const nBrote = Math.max(1, Math.round(3 * q));
  for (let i = 0; i < nBrote; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.28;
    const brote = new THREE.ConeGeometry(0.03, 0.12, 4, 1);
    apuntar(brote, [Math.cos(ang) * rad, 0.42 + r() * 0.3, Math.sin(ang) * rad], [(r() - 0.5) * 0.4, 1, (r() - 0.5) * 0.4]);
    partes.push(pintar(brote, variar(PAL.mortinoBrote, r, 0.1)));
  }

  // Bayas azul-moradas (la firma del agraz).
  const nBayas = Math.max(3, Math.round(10 * q));
  for (let i = 0; i < nBayas; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.32;
    const y = 0.15 + r() * 0.45;
    const baya = new THREE.IcosahedronGeometry(0.04 + r() * 0.015, 0);
    poner(baya, [Math.cos(ang) * rad, y, Math.sin(ang) * rad]);
    partes.push(pintar(baya, variar(r() > 0.5 ? PAL.mortinoBaya : PAL.mortinoBaya2, r, 0.1)));
  }

  return fusionar(partes, 'mortino');
}

/* -------------------------------------------------------------------------- */
/*  ROMERILLO — mata baja de follaje fino                                       */
/* -------------------------------------------------------------------------- */

/*
 * Cojín bajo de follaje FINO amarillo-verde (hojita de escama tipo romero de
 * páramo), a veces con puntos de flor amarilla. Relleno del sotobosque. Su
 * identidad ES el manojo de ramitas finas, así que se queda en conos delgados.
 */
export function geomRomerillo({ q = 1 } = {}, seed = 8) {
  const r = rng(seed);
  const partes = [];

  const nRamitas = Math.max(6, Math.round(14 * q));
  for (let i = 0; i < nRamitas; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.28;
    const largo = 0.28 + r() * 0.32;
    const ramita = new THREE.ConeGeometry(0.05, largo, 4, 1);
    apuntar(
      ramita,
      [Math.cos(ang) * rad, largo * 0.4, Math.sin(ang) * rad],
      [Math.cos(ang) * 0.35 + (r() - 0.5) * 0.3, 1, Math.sin(ang) * 0.35 + (r() - 0.5) * 0.3],
    );
    partes.push(pintar(ramita, variar(r() > 0.5 ? PAL.romerilloHoja : PAL.romerilloHoja2, r, 0.1)));
  }
  if (q > 0.5) {
    const nFlor = Math.max(2, Math.round(5 * q));
    for (let i = 0; i < nFlor; i++) {
      const ang = r() * Math.PI * 2;
      const rad = r() * 0.26;
      const flor = new THREE.IcosahedronGeometry(0.035, 0);
      poner(flor, [Math.cos(ang) * rad, 0.35 + r() * 0.3, Math.sin(ang) * rad]);
      partes.push(pintar(flor, PAL.romerilloFlor));
    }
  }

  return fusionar(partes, 'romerillo');
}

/* -------------------------------------------------------------------------- */
/*  SUELO — rocas con líquen + montículos de musgo                              */
/* -------------------------------------------------------------------------- */

/** Roca baja gris con parches de líquen pálido (piedra del páramo). */
export function geomRoca(seed = 9) {
  const r = rng(seed);
  const partes = [];
  const piedra = new THREE.IcosahedronGeometry(0.3, 0);
  poner(piedra, [0, 0.12, 0], [r(), r(), r()], [1 + r() * 0.4, 0.55 + r() * 0.2, 1 + r() * 0.4]);
  partes.push(pintar(piedra, variar(PAL.roca, r, 0.08)));
  // Líquen encima.
  const nLiquen = 2 + Math.round(r() * 2);
  for (let i = 0; i < nLiquen; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.22;
    const parche = new THREE.IcosahedronGeometry(0.07 + r() * 0.05, 0);
    poner(parche, [Math.cos(ang) * rad, 0.2 + r() * 0.06, Math.sin(ang) * rad], [0, 0, 0], [1.3, 0.4, 1.3]);
    partes.push(pintar(parche, variar(r() > 0.5 ? PAL.liquen : PAL.liquen2, r, 0.1)));
  }
  return fusionar(partes, 'roca');
}

/** Montículo de musgo húmedo (domo bajo). */
export function geomMusgo(seed = 10) {
  const r = rng(seed);
  const domo = new THREE.SphereGeometry(0.28, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
  poner(domo, [0, 0, 0], [0, 0, 0], [1 + r() * 0.5, 0.45 + r() * 0.2, 1 + r() * 0.5]);
  return pintar(domo, variar(r() > 0.5 ? PAL.musgo : PAL.musgo2, r, 0.1));
}

/* -------------------------------------------------------------------------- */
/*  DISTRIBUCIÓN biogeográfica alrededor del Ent                               */
/* -------------------------------------------------------------------------- */

/*
 * Estratos concéntricos (el Ent en el centro, 0,0,0). La cámara ORBITA, así que
 * la composición es un anillo por estrato (no un frente fijo):
 *   · frailejonar (tres edades entremezcladas) + sotobosque + suelo → anillo
 *     interior-medio (al frente visual);
 *   · árboles (roble, encenillo, aliso, yarumo, gaque) → anillo exterior,
 *     velados por la niebla → dan fondo y hacen que el Ent RESALTE como el mayor.
 * Devuelve, por banco, instancias {pos, rotY, escala, tint, [tiltX, tiltZ]}.
 */
function tinteInstancia(r, amt) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.4;
  const cl = (v) => Math.max(0.7, Math.min(1.16, v));
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

function sembrar(n, rMin, rMax, r, opts = {}) {
  const arr = [];
  const eMin = opts.eMin ?? 0.9;
  const eMax = opts.eMax ?? 1.15;
  for (let i = 0; i < n; i++) {
    // Árboles (uniforme): reparto angular parejo + leve jitter → no se solapan.
    // Sotobosque/frailejonar (agrupado): ángulo aleatorio → matorral natural.
    const ang = opts.uniforme
      ? (i / Math.max(1, n)) * Math.PI * 2 + (r() - 0.5) * 0.7
      : r() * Math.PI * 2;
    const rad = rMin + (rMax - rMin) * (opts.haciaAfuera ? Math.sqrt(r()) : r());
    const it = {
      pos: [Math.cos(ang) * rad, 0, Math.sin(ang) * rad],
      rotY: r() * Math.PI * 2,
      escala: eMin + r() * (eMax - eMin),
      tint: tinteInstancia(r, opts.varia ?? 0.12),
    };
    // Ladeo por instancia (solo especies con `lean`): unos grados de cabeceo para
    // que el frailejonal no se lea clonado (cada mata mira distinto). El pivote
    // está en la base → el ladeo no despega la mata del suelo. Los r() se corren
    // SOLO cuando hay lean, para no alterar el RNG de las demás especies.
    if (opts.lean) {
      it.tiltX = (r() - 0.5) * 2 * opts.lean;
      it.tiltZ = (r() - 0.5) * 2 * opts.lean;
    }
    arr.push(it);
  }
  return arr;
}

/** Todas las instancias de flora para unos conteos dados. */
export function distribucionFlora(conteos, seed = 707) {
  const c = conteos;
  return {
    // Frailejonal: TRES edades entremezcladas en el mismo anillo interior-medio,
    // agrupadas, con mucha variación de tamaño + ladeo por instancia (`lean`) →
    // un paisaje con gradiente de edad, nada clonado. Los jóvenes se acercan más
    // al claro (rMin menor); los viejos quedan un poco más afuera.
    frailejonJoven: sembrar(c.frailejonJoven, 3.4, 9.5, rng(seed + 1), { eMin: 0.78, eMax: 1.12, varia: 0.13, lean: 0.14 }),
    frailejon: sembrar(c.frailejon, 3.8, 10.5, rng(seed + 12), { eMin: 0.86, eMax: 1.22, varia: 0.14, lean: 0.15 }),
    frailejonViejo: sembrar(c.frailejonViejo, 4.4, 11, rng(seed + 13), { eMin: 0.9, eMax: 1.3, varia: 0.14, lean: 0.17 }),
    frailejonFlor: sembrar(c.frailejonFlor, 4.5, 9.5, rng(seed + 2), { eMin: 0.9, eMax: 1.2, varia: 0.1, lean: 0.12 }),
    // Sotobosque.
    mortino: sembrar(c.mortino, 4, 12, rng(seed + 3), { eMin: 0.8, eMax: 1.2, varia: 0.12 }),
    romerillo: sembrar(c.romerillo, 3, 12, rng(seed + 4), { eMin: 0.8, eMax: 1.25, varia: 0.14 }),
    // Suelo.
    roca: sembrar(c.roca, 2, 11, rng(seed + 5), { eMin: 0.7, eMax: 1.5, varia: 0.1 }),
    musgo: sembrar(c.musgo, 1.2, 9, rng(seed + 6), { eMin: 0.7, eMax: 1.6, varia: 0.12 }),
    // Árboles de fondo (anillo exterior, reparto parejo, velados por niebla).
    gaque: sembrar(c.gaque, 8.5, 14, rng(seed + 7), { eMin: 0.9, eMax: 1.1, uniforme: true, varia: 0.08 }),
    roble: sembrar(c.roble, 9.5, 16, rng(seed + 8), { eMin: 0.92, eMax: 1.15, uniforme: true, varia: 0.08 }),
    encenillo: sembrar(c.encenillo, 10, 17, rng(seed + 9), { eMin: 0.85, eMax: 1.1, uniforme: true, varia: 0.08 }),
    yarumo: sembrar(c.yarumo, 10, 17, rng(seed + 10), { eMin: 0.9, eMax: 1.15, uniforme: true, varia: 0.06 }),
    aliso: sembrar(c.aliso, 11, 19, rng(seed + 11), { eMin: 0.9, eMax: 1.12, uniforme: true, varia: 0.08 }),
  };
}
